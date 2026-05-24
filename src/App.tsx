import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Settings, X, Plus, Trash2, Eye, Instagram, Twitter, Mail, Heart } from 'lucide-react';

type SpiralType = 'archimedes' | 'hypnotic' | 'lissajous';

interface AppState {
  isRunning: boolean;
  spiralType: SpiralType;
  speed: number;
  phraseDuration: number;
  phrases: string[];
  showPanel: boolean;
  newPhrase: string;
}

const PANEL_WIDTH = 320;

const SPIRAL_LABELS: Record<SpiralType, string> = {
  archimedes: 'Classic',
  hypnotic: 'Vortex',
  lissajous: 'Hypnotic',
};

function useAnimationFrame(callback: (time: number) => void, running: boolean) {
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!running) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    startRef.current = 0;
    const loop = (time: number) => {
      if (!startRef.current) startRef.current = time;
      callback(time - startRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, callback]);
}

function drawSpiralPixels(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  width: number, height: number,
  turns: number,
  phase: number,
  bgDark: boolean,
  maxR: number,
  rFn: (normR: number) => number
) {
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;
  const TAU = Math.PI * 2;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const dx = px - cx;
      const dy = py - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      const idx = (py * width + px) * 4;

      if (r > maxR) {
        const v = bgDark ? 0 : 255;
        data[idx] = v; data[idx+1] = v; data[idx+2] = v; data[idx+3] = 255;
        continue;
      }

      const normR = r / maxR;
      let theta = Math.atan2(dy, dx) - phase;
      theta = ((theta % TAU) + TAU) % TAU;

      const expectedTheta = rFn(normR) * turns * TAU;
      const bandF = expectedTheta / Math.PI - theta / Math.PI;
      const band = Math.floor(bandF);
      const isWhite = (band % 2 + 2) % 2 === (bgDark ? 0 : 1);

      const v = isWhite ? 255 : 0;
      data[idx] = v; data[idx+1] = v; data[idx+2] = v; data[idx+3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

function drawArchimedes(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, speed: number) {
  const w = cx * 2, h = cy * 2;
  const phase = (t * speed * 0.0003) * Math.PI * 2;
  const maxR = Math.sqrt(cx * cx + cy * cy) * 1.1;
  drawSpiralPixels(ctx, cx, cy, w, h, 5, phase, true, maxR, (n) => n);
}

function drawVortex(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, speed: number) {
  const maxR = Math.sqrt(cx * cx + cy * cy) * 1.35;
  const rings = 18;
  const offset = (t * speed * 0.0003) % 1;

  ctx.clearRect(0, 0, cx * 2, cy * 2);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cx * 2, cy * 2);

  for (let ring = 0; ring < rings; ring++) {
    const frac = ((ring / rings) + offset) % 1;
    const r = maxR * frac;
    const spokes = 32;
    const angleOffset = frac * Math.PI * 2 * 3;

    ctx.beginPath();
    for (let i = 0; i <= spokes * 10; i++) {
      const theta = (i / (spokes * 10)) * Math.PI * 2 + angleOffset;
      const wobble = Math.sin(theta * spokes) * r * 0.04;
      const rr = r + wobble;
      const x = cx + rr * Math.cos(theta);
      const y = cy + rr * Math.sin(theta);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    const alpha = 0.3 + frac * 0.7;
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = 1 + frac * 1.5;
    ctx.stroke();
  }
}

function drawTunnel(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number, speed: number) {
  const w = cx * 2, h = cy * 2;
  const phase = -(t * speed * 0.0003) * Math.PI * 2;
  const maxR = Math.sqrt(cx * cx + cy * cy) * 1.1;
  drawSpiralPixels(ctx, cx, cy, w, h, 5, phase, false, maxR, (n) => n * n);
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [footerOpen, setFooterOpen] = useState(false);
  const [state, setState] = useState<AppState>({
    isRunning: false,
    spiralType: 'archimedes',
    speed: 1,
    phraseDuration: 5,
    phrases: [],
    showPanel: true,
    newPhrase: '',
  });
  const [currentPhrase, setCurrentPhrase] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const draw = useCallback((t: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const { spiralType, speed } = stateRef.current;
    if (spiralType === 'archimedes') drawArchimedes(ctx, cx, cy, t, speed);
    else if (spiralType === 'hypnotic') drawVortex(ctx, cx, cy, t, speed);
    else drawTunnel(ctx, cx, cy, t, speed);
  }, []);

  useAnimationFrame(draw, state.isRunning);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!state.isRunning) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [state.isRunning]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const main = canvas.parentElement;
      if (!main) return;
      const panelW = state.showPanel ? PANEL_WIDTH : 0;
      canvas.width = main.clientWidth - panelW;
      canvas.height = main.clientHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [state.showPanel]);

  useEffect(() => {
    if (!state.isRunning || state.phrases.length === 0) {
      setCurrentPhrase('');
      return;
    }
    const idx = phraseIndex % state.phrases.length;
    setCurrentPhrase(state.phrases[idx]);
    const ms = state.phraseDuration * 1000;
    const nextTimer = setTimeout(() => setPhraseIndex(i => i + 1), ms);
    return () => clearTimeout(nextTimer);
  }, [state.isRunning, phraseIndex, state.phrases, state.phraseDuration]);

  const toggle = () => {
    setState(s => ({ ...s, isRunning: !s.isRunning }));
    if (state.isRunning) {
      setPhraseIndex(0);
      setCurrentPhrase('');
    }
  };

  const addPhrase = () => {
    const trimmed = state.newPhrase.trim();
    if (!trimmed) return;
    setState(s => ({ ...s, phrases: [...s.phrases, trimmed], newPhrase: '' }));
  };

  const removePhrase = (i: number) =>
    setState(s => ({ ...s, phrases: s.phrases.filter((_, idx) => idx !== i) }));

  return (
    <div className="flex flex-col bg-brand-dark text-gray-200" style={{ height: '100dvh', overflow: 'hidden' }}>

      {/* Header */}
      <header className="bg-brand-dark border-b border-brand-mid shrink-0" style={{ zIndex: 30 }}>
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <span className="text-2xl font-bold text-brand-accent tracking-tight cursor-default select-none">
            Hypno<span className="text-gray-300">Spiral</span>
          </span>
          <nav className="flex gap-6 items-center">
            <a href="https://www.hypnosekinky.com/allmylinks" className="text-gray-300 hover:text-brand-accent transition-colors text-sm">
              Tous mes liens
            </a>
            <a href="https://hypnosekinky.com/rendez-vous" className="text-gray-300 hover:text-brand-accent transition-colors text-sm">
              Réserver une session
            </a>
            <a href="https://www.hypnosekinky.com/newsletter" className="text-gray-300 hover:text-brand-accent transition-colors text-sm">
              Newsletter
            </a>
          </nav>
        </div>
      </header>

      {/* Main spiral area — fills all remaining height */}
      <main className="relative overflow-hidden" style={{ flex: '1 1 0', minHeight: 0 }}>
        <canvas ref={canvasRef} style={{ display: 'block', position: 'absolute', top: 0, left: 0 }} />

        {state.isRunning && currentPhrase && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 10, right: state.showPanel ? PANEL_WIDTH : 0 }}
          >
            <p
              key={phraseIndex}
              className="text-white text-center font-bold uppercase select-none"
              style={{
                fontSize: 'clamp(2rem, 8vw, 10vw)',
                lineHeight: 1.1,
                letterSpacing: '0.08em',
                animation: `phraseFlow ${state.phraseDuration}s ease-in-out forwards`,
                maxWidth: '80vw',
                WebkitTextStroke: '0.04em #000',
                paintOrder: 'stroke fill',
                textShadow: [
                  '-3px -3px 0 #000',
                  ' 3px -3px 0 #000',
                  '-3px  3px 0 #000',
                  ' 3px  3px 0 #000',
                  '0 0 40px rgba(255,255,255,0.6)',
                ].join(','),
              }}
            >
              {currentPhrase}
            </p>
          </div>
        )}

        {/* Side panel */}
        <div className="absolute top-0 right-0 h-full flex" style={{ zIndex: 20 }}>
          {state.showPanel && (
            <div
              className="h-full overflow-y-auto flex flex-col"
              style={{
                width: `${PANEL_WIDTH}px`,
                background: 'rgba(50,51,71,0.95)',
                borderLeft: '1px solid rgba(170,168,248,0.15)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="p-6 flex-1 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-brand-accent font-bold text-sm tracking-widest uppercase">
                    Controls
                  </h2>
                  <button
                    onClick={() => setState(s => ({ ...s, showPanel: false }))}
                    className="text-gray-500 hover:text-brand-accent transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <button
                  onClick={toggle}
                  className="w-full py-4 rounded font-bold text-sm tracking-widest uppercase transition-all flex items-center justify-center gap-3"
                  style={{
                    background: state.isRunning ? 'rgba(170,168,248,0.1)' : '#aaa8f8',
                    color: state.isRunning ? '#aaa8f8' : '#323347',
                    border: state.isRunning ? '1px solid rgba(170,168,248,0.35)' : 'none',
                  }}
                >
                  {state.isRunning ? <><Square size={16} /> Stop</> : <><Play size={16} /> Start</>}
                </button>

                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-widest block mb-3">
                    Spiral Type
                  </label>
                  <div className="flex flex-col gap-2">
                    {(Object.keys(SPIRAL_LABELS) as SpiralType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => setState(s => ({ ...s, spiralType: type }))}
                        className="w-full px-4 py-3 rounded text-left text-sm font-semibold tracking-wide transition-all"
                        style={{
                          background: state.spiralType === type ? 'rgba(170,168,248,0.18)' : 'rgba(170,168,248,0.04)',
                          border: state.spiralType === type ? '1px solid rgba(170,168,248,0.5)' : '1px solid rgba(170,168,248,0.1)',
                          color: state.spiralType === type ? '#aaa8f8' : 'rgba(200,200,220,0.5)',
                        }}
                      >
                        {SPIRAL_LABELS[type]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-widest block mb-3">
                    Speed — {state.speed.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min={0.2}
                    max={3}
                    step={0.1}
                    value={state.speed}
                    onChange={e => setState(s => ({ ...s, speed: parseFloat(e.target.value) }))}
                    className="w-full"
                    style={{ cursor: 'pointer' }}
                  />
                </div>

                <div>
                  <label className="text-gray-400 text-xs uppercase tracking-widest block mb-3">
                    Phrase Duration — {state.phraseDuration}s
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={state.phraseDuration}
                    onChange={e => setState(s => ({ ...s, phraseDuration: parseInt(e.target.value) }))}
                    className="w-full"
                    style={{ cursor: 'pointer' }}
                  />
                  <div className="flex justify-between text-gray-600 text-xs mt-1">
                    <span>1s</span>
                    <span>10s</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <label className="text-gray-400 text-xs uppercase tracking-widest block mb-3">
                    Subliminal Phrases
                  </label>

                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={state.newPhrase}
                      onChange={e => setState(s => ({ ...s, newPhrase: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addPhrase()}
                      placeholder="Enter a phrase..."
                      className="flex-1 px-3 py-2 text-sm text-gray-200 rounded outline-none placeholder-gray-600"
                      style={{
                        background: 'rgba(170,168,248,0.06)',
                        border: '1px solid rgba(170,168,248,0.15)',
                      }}
                    />
                    <button
                      onClick={addPhrase}
                      className="px-3 py-2 rounded text-brand-accent transition-all hover:bg-brand-accent hover:text-brand-dark"
                      style={{ border: '1px solid rgba(170,168,248,0.3)' }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-1 min-h-0 overflow-y-auto flex-1">
                    {state.phrases.length === 0 && (
                      <p className="text-gray-600 text-xs italic text-center py-4">
                        No phrases yet
                      </p>
                    )}
                    {state.phrases.map((phrase, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-2 rounded group"
                        style={{
                          background: 'rgba(170,168,248,0.05)',
                          border: '1px solid rgba(170,168,248,0.08)',
                        }}
                      >
                        <span className="text-xs text-brand-accent/50 w-4 text-center shrink-0">{i + 1}</span>
                        <span className="text-sm text-gray-300 flex-1 truncate">{phrase}</span>
                        <button
                          onClick={() => removePhrase(i)}
                          className="text-gray-600 hover:text-brand-accent opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {!state.showPanel && (
            <div className="flex flex-col gap-2 p-3">
              <button
                onClick={() => setState(s => ({ ...s, showPanel: true }))}
                className="w-10 h-10 flex items-center justify-center rounded text-gray-400 hover:text-brand-accent transition-colors"
                style={{ background: 'rgba(50,51,71,0.8)', border: '1px solid rgba(170,168,248,0.15)' }}
                title="Open panel"
              >
                <Settings size={18} />
              </button>
              <button
                onClick={toggle}
                className="w-10 h-10 flex items-center justify-center rounded transition-all font-bold"
                style={{
                  background: state.isRunning ? 'rgba(170,168,248,0.15)' : '#aaa8f8',
                  color: state.isRunning ? '#aaa8f8' : '#323347',
                  border: state.isRunning ? '1px solid rgba(170,168,248,0.3)' : 'none',
                }}
                title={state.isRunning ? 'Stop' : 'Start'}
              >
                {state.isRunning ? <Square size={16} /> : <Play size={16} />}
              </button>
            </div>
          )}
        </div>

        {!state.showPanel && state.isRunning && (
          <div className="absolute bottom-4 left-4 text-gray-500 text-xs tracking-widest uppercase" style={{ zIndex: 20 }}>
            <Eye size={12} className="inline mr-1" />
            {SPIRAL_LABELS[state.spiralType]}
          </div>
        )}

        {/* Footer trigger bar — bottom 5% of the spiral area */}
        <div
          className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end pb-1 cursor-pointer footer-trigger"
          style={{ height: '5%', zIndex: 25 }}
          onMouseEnter={() => setFooterOpen(true)}
          onClick={() => setFooterOpen(v => !v)}
        >
          <div className="flex flex-col items-center gap-0.5 opacity-30 hover:opacity-70 transition-opacity duration-300">
            <div className="w-8 h-px bg-brand-accent" />
            <div className="w-5 h-px bg-brand-accent" />
          </div>
        </div>
      </main>

      {/* Footer overlay — slides up from bottom */}
      <div
        className="fixed left-0 right-0 bottom-0 footer-overlay"
        style={{
          zIndex: 40,
          transform: footerOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.4s cubic-bezier(0.32, 0, 0.24, 1)',
        }}
        onMouseLeave={() => setFooterOpen(false)}
      >
        <footer className="bg-brand-dark border-t border-brand-mid">
          <div className="max-w-6xl mx-auto px-4 py-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
              <div>
                <h3 className="text-brand-accent font-semibold mb-4 text-sm">Liens</h3>
                <ul className="space-y-2">
                  <li><a href="https://www.hypnosekinky.com/mentions-legales" className="text-gray-400 hover:text-brand-accent transition-colors text-sm">Mentions Légales</a></li>
                  <li><a href="https://www.hypnosekinky.com/about/terms" className="text-gray-400 hover:text-brand-accent transition-colors text-sm">Conditions et TGU</a></li>
                  <li><a href="https://www.hypnosekinky.com/questions-reponses" className="text-gray-400 hover:text-brand-accent transition-colors text-sm">FAQ Hypnose</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-brand-accent font-semibold mb-4 text-sm">Me suivre</h3>
                <div className="flex gap-4">
                  <a href="https://www.instagram.com/pupasgfed/" className="text-gray-400 hover:text-brand-accent transition-colors"><Instagram size={20} /></a>
                  <a href="https://x.com/pupasgfed" className="text-gray-400 hover:text-brand-accent transition-colors"><Twitter size={20} /></a>
                  <a href="https://www.hypnosekinky.com/newsletter" className="text-gray-400 hover:text-brand-accent transition-colors"><Mail size={20} /></a>
                </div>
              </div>
              <div>
                <h3 className="text-brand-accent font-semibold mb-4 text-sm">Voir plus d'hypnose kinky</h3>
                <a href="https://www.hypnosekinky.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-brand-accent transition-colors flex items-center gap-2 text-sm">
                  Visiter le site <Heart size={14} />
                </a>
              </div>
            </div>
            <div className="border-t border-brand-mid pt-5 text-center text-gray-500 text-xs">
              <p>HypnoSpiral © 2026 — @pupasgfed — tous les détails sur hypnosekinky.com</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
