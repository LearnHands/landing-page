import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import {
  Palette, Music, Puzzle, Heart, Zap, Sparkles, LogIn, Monitor,
  Download, CheckCircle, Cpu, Wifi, WifiOff, BookOpen, Gamepad2,
  Compass, Shield, Award, Globe, Square, Circle,
} from 'lucide-react';
import SystemHub from './SystemHub';
import puceLogo from './assets/puce.png';
import DashboardSection from './components/DashboardSection';

const DESKTOP_REPO  = 'https://github.com/GrupoUnoEmprendimiento/LearnHandsEscritorio';
const RELEASES_URL  = 'https://github.com/GrupoUnoEmprendimiento/LearnHandsEscritorio/releases/latest';
const GITHUB_LINK   = 'https://github.com/GrupoUnoEmprendimiento/LearnHands';
const APP_VERSION   = '2.1.0';

const GithubIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.28 1.15-.28 2.35 0 3.5-.73 1.02-1.08 2.25-1 3.5 0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

// ── All 10 desktop modules ──────────────────────────────────────────────────
const MODULES = [
  { icon: <Palette />,   color: 'purple',  title: 'Pizarra Digital',    desc: 'Dibuja y pinta con el dedo índice en el aire sobre un lienzo digital de resolución completa.' },
  { icon: <Music />,     color: 'cyan',    title: 'Piano Gestual',      desc: 'Piano de 2 octavas con notas sostenidas: detecta cada yema de dedo individualmente sobre las teclas.' },
  { icon: <Puzzle />,    color: 'orange',  title: 'Rompecabezas',       desc: 'Arrastra piezas con pinza a su posición exacta. Dificultad progresiva de 2×2 a 3×3.' },
  { icon: <div className="flex gap-1 items-end"><Circle size={22}/><Square size={16}/></div>, color: 'emerald', title: 'Colores y Formas', desc: 'Clasifica figuras por color y forma, desarrollando percepción visual y coordinación.' },
  { icon: <Compass />,   color: 'cyan',    title: 'Constelaciones',     desc: 'Conecta estrellas con el dedo para trazar constelaciones reales del cielo nocturno.' },
  { icon: <Gamepad2 />,  color: 'orange',  title: 'Balls Crush',        desc: 'Breakout gestual con power-ups, múltiples bolas y niveles de dificultad creciente.' },
  { icon: <BookOpen />,  color: 'purple',  title: 'Sílabas',            desc: 'Atrapa sílabas en el aire y arrástralas a su posición. 12 palabras ordenadas de 2 a 3 sílabas.' },
  { icon: <Shield />,    color: 'emerald', title: 'Eco-Guardián',       desc: 'Clasifica residuos en orgánico, reciclable y peligroso. Conciencia ambiental gamificada.' },
  { icon: <Award />,     color: 'orange',  title: 'Ábaco Matemático',   desc: 'Selecciona burbujas numéricas con pinza para alcanzar una suma objetivo. 9 niveles de dificultad.' },
  { icon: <span className="text-2xl">🪐</span>, color: 'cyan', title: 'Sistema Solar', desc: 'Explora los 8 planetas con zoom y paneo por gestos. Tarjetas educativas interactivas para cada planeta.' },
];

const COLOR_MAP = {
  purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  text: 'text-purple-400',  glow: 'group-hover:shadow-purple-500/20'  },
  cyan:    { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    text: 'text-cyan-400',    glow: 'group-hover:shadow-cyan-500/20'    },
  orange:  { bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  text: 'text-orange-400',  glow: 'group-hover:shadow-orange-500/20'  },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'group-hover:shadow-emerald-500/20' },
};

// ── Feature comparison rows ─────────────────────────────────────────────────
const COMPARISON = [
  { label: 'Módulos de aprendizaje',   demo: '3 básicos',    full: '10 módulos completos', highlight: true },
  { label: 'Detección de manos (IA)',  demo: 'Estándar',     full: 'GPU acelerada (30fps)',  highlight: false },
  { label: 'Dificultad progresiva',    demo: 'No',           full: 'Sí, por módulo',         highlight: false },
  { label: 'Sistema Solar 3D',         demo: 'No',           full: 'Sí, interactivo',        highlight: true },
  { label: 'Funciona sin internet',    demo: 'No',           full: 'Sí (offline)',           highlight: false },
  { label: 'Sistema de puntos',        demo: 'Básico',       full: 'Completo + niveles',     highlight: false },
  { label: 'Sonido sintetizado',       demo: 'Parcial',      full: 'Todas las notas sostenidas', highlight: false },
  { label: 'Actualizaciones',          demo: 'Manual',       full: 'Auto desde GitHub',      highlight: false },
];

// ══════════════════════════════════════════════════════════════════════════════
const App = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#03030b] text-white selection:bg-purple-500/30 font-sans overflow-x-hidden scroll-smooth relative">
      <Routes>
        <Route path="/" element={
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10">

            {/* Background blobs */}
            <div className="fixed inset-0 z-0 pointer-events-none">
              <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[140px] rounded-full animate-pulse" />
              <div className="absolute bottom-[10%] right-[5%] w-[45%] h-[45%] bg-cyan-600/10 blur-[140px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
              <div className="absolute top-[60%] left-[20%] w-[30%] h-[30%] bg-orange-600/6 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '4s' }} />
            </div>

            {/* ── Navbar ──────────────────────────────────────────────────── */}
            <nav className="fixed top-0 w-full z-50 glass-dark py-4 px-8 flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-6">
                <img src={puceLogo} alt="PUCE Logo" className="h-10 w-auto" />
                <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center text-lg shadow-lg">🖐️</div>
                  <span className="font-display text-xl tracking-tighter font-black uppercase tracking-[0.1em]">LearnHands</span>
                </div>
              </div>
              <div className="hidden md:flex gap-8 text-xs font-black uppercase tracking-widest text-white/40 items-center">
                <a href="#mision"   className="hover:text-white transition-colors">Misión</a>
                <a href="#modulos"  className="hover:text-white transition-colors">Módulos</a>
                <a href="#descarga" className="hover:text-white transition-colors">Descargar</a>
                <a href="#dashboard" className="hover:text-white transition-colors">Métricas</a>
                <a href={GITHUB_LINK} target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-2 border-l border-white/10 pl-8">
                  <GithubIcon size={14} /> GitHub
                </a>
                <button onClick={() => navigate('/hub')} className="px-6 py-2 bg-purple-600 text-white rounded-full font-bold hover:bg-purple-500 transition-all text-[9px] uppercase tracking-widest flex items-center gap-2">
                  <LogIn size={14} /> Demo Web
                </button>
              </div>
            </nav>

            {/* ── Hero ────────────────────────────────────────────────────── */}
            <header className="relative pt-48 pb-24 px-8 flex flex-col items-center text-center">
              <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
                className="mb-6 px-5 py-1.5 glass rounded-full border border-white/10 text-[9px] font-black uppercase tracking-[0.35em] text-purple-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
                Fe y Alegría Ecuador · Plataforma Educativa
              </motion.div>

              <h1 className="text-6xl md:text-8xl font-display leading-[0.95] mb-8 font-black tracking-tighter italic text-gradient uppercase">
                Aprendizaje sin Mouse
              </h1>
              <p className="max-w-2xl text-lg text-white/40 mb-12 italic">
                Controla todo con tus manos. Inteligencia artificial para detectar gestos en tiempo real, sin teclado ni ratón.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-24 font-black uppercase tracking-widest text-xs">
                <a href="#descarga" className="px-10 py-5 bg-white text-black rounded-3xl flex items-center gap-3 hover:bg-purple-500 hover:text-white transition-all shadow-2xl">
                  <Download size={16} /> Descargar App
                </a>
                <button onClick={() => navigate('/hub')} className="px-10 py-5 glass rounded-3xl flex items-center gap-3 border border-white/10 hover:border-white/30 transition-all">
                  Probar Demo Web
                </button>
              </div>

              {/* Preview card */}
              <section className="w-full max-w-4xl rounded-[40px] overflow-hidden border border-white/10 glass-dark p-1 relative shadow-2xl shadow-purple-500/10">
                <div className="bg-white/5 rounded-[38px] overflow-hidden p-12 text-center">
                  <div className="text-xs font-black text-purple-400 uppercase tracking-widest mb-6 italic">LearnHands AI Engine v{APP_VERSION}</div>
                  <div className="aspect-video bg-black/40 rounded-3xl border border-white/5 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-cyan-500/10 animate-pulse" />
                    <motion.div animate={{ y:[0,-10,0] }} transition={{ duration:4, repeat:Infinity }} className="text-9xl drop-shadow-[0_0_20px_rgba(168,85,247,0.3)] z-10">🖐️</motion.div>
                    <button onClick={() => navigate('/hub')} className="absolute bottom-10 px-8 py-3 bg-purple-600 rounded-xl font-bold text-xs uppercase tracking-widest z-10 hover:scale-105 transition-all">
                      Abrir Demo Web →
                    </button>
                  </div>
                </div>
              </section>
            </header>

            {/* ── Misión ──────────────────────────────────────────────────── */}
            <section id="mision" className="py-24 px-8 max-w-5xl mx-auto scroll-mt-20">
              <h2 className="text-3xl md:text-5xl font-display font-black mb-12 text-center underline decoration-purple-500 decoration-4 underline-offset-[12px] uppercase italic">
                Misión e Inclusión
              </h2>
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6 text-lg text-white/50 leading-relaxed italic">
                  <p>"Nuestra misión es facilitar el aprendizaje interactivo para niños con retos motrices o en etapas iniciales de desarrollo."</p>
                  <p>"Eliminamos las barreras físicas de entrada, convirtiendo el movimiento natural del cuerpo en una herramienta pedagógica."</p>
                </div>
                <div className="glass p-8 rounded-[40px] border border-white/10 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-purple-400">Objetivos Clave</h3>
                  <ObjectiveItem icon={<Heart className="text-purple-500"/>}   title="Inclusión Digital" />
                  <ObjectiveItem icon={<Zap className="text-cyan-500"/>}       title="Zero Mouse / Zero Keyboard" />
                  <ObjectiveItem icon={<Sparkles className="text-orange-500"/>} title="Aprendizaje Lúdico" />
                </div>
              </div>
            </section>

            {/* ── Módulos (web preview, 3 cards) ──────────────────────────── */}
            <section id="modulos" className="py-24 px-8 max-w-7xl mx-auto scroll-mt-20">
              <h2 className="text-center text-4xl font-display font-black mb-4 italic text-gradient tracking-tighter uppercase">
                Módulos de Aprendizaje
              </h2>
              <p className="text-center text-white/30 text-sm mb-20 font-black uppercase tracking-widest">
                10 módulos disponibles en la versión escritorio
              </p>
              <div className="grid md:grid-cols-3 gap-12 mb-12">
                <FeatureCard icon={<Palette className="text-purple-400"/>}  title="Pizarra Interactiva"   desc="Sistema de dibujo por gestos. Usa el índice para crear trazos sobre un lienzo digital." />
                <FeatureCard icon={<Music className="text-cyan-400"/>}      title="Piano Gestual"          desc="Piano virtual con notas sostenidas. Detecta cada yema de dedo individualmente sobre las teclas." />
                <FeatureCard icon={<Puzzle className="text-orange-400"/>}   title="Rompecabezas Lógico"   desc="Arrastra piezas con pinza hasta ensamblar la imagen. Dificultad progresiva 2×2 a 3×3." />
              </div>
              <div className="flex justify-center">
                <a href="#descarga" className="px-8 py-3 glass rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white hover:border-white/30 transition-all flex items-center gap-2">
                  Ver los 10 módulos → <span className="text-purple-400">Versión Completa</span>
                </a>
              </div>
            </section>

            {/* ════════════════════════════════════════════════════════════════
                SECCIÓN DE DESCARGA
            ════════════════════════════════════════════════════════════════ */}
            <section id="descarga" className="py-32 px-8 scroll-mt-20 relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent pointer-events-none" />

              <div className="max-w-6xl mx-auto">
                {/* Badge + Title */}
                <div className="flex flex-col items-center text-center mb-20">
                  <span className="mb-6 px-5 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-[9px] font-black uppercase tracking-[0.35em] text-purple-400 flex items-center gap-2">
                    <Monitor size={10} /> Aplicación de Escritorio para Windows
                  </span>
                  <h2 className="text-4xl md:text-6xl font-display font-black italic tracking-tighter uppercase mb-6 text-gradient">
                    Versión Completa
                  </h2>
                  <p className="max-w-2xl text-white/40 text-base leading-relaxed mb-8">
                    La experiencia total de LearnHands: 10 módulos educativos, detección de manos por IA acelerada por GPU, dificultad progresiva y funcionamiento completamente offline. Diseñada para instalarse en aulas de Fe y Alegría Ecuador.
                  </p>

                  {/* Download CTA */}
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <a href={RELEASES_URL} target="_blank" rel="noreferrer"
                      className="group flex items-center gap-4 px-10 py-5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl font-black uppercase tracking-widest text-sm hover:from-purple-500 hover:to-indigo-500 transition-all shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105">
                      <Download size={20} className="group-hover:animate-bounce" />
                      Descargar Instalador (.exe)
                    </a>
                    <a href={DESKTOP_REPO} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 px-8 py-5 glass rounded-3xl border border-white/10 hover:border-white/30 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-all">
                      <GithubIcon size={14} /> Código Fuente
                    </a>
                  </div>

                  <p className="mt-5 text-[9px] text-white/25 font-black uppercase tracking-widest">
                    Windows 10/11 · Requiere webcam · Instalador NSIS · Sin dependencias externas
                  </p>
                </div>

                {/* ── Comparison table ──────────────────────────────────── */}
                <div className="grid md:grid-cols-2 gap-6 mb-20">
                  {/* Demo Web */}
                  <div className="glass rounded-[36px] border border-white/10 overflow-hidden">
                    <div className="px-8 py-5 border-b border-white/10 flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center">
                        <Wifi size={16} className="text-white/40" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Actual</p>
                        <h3 className="text-sm font-black uppercase tracking-wider text-white/60">Demo Web</h3>
                      </div>
                    </div>
                    <div className="px-8 py-6 space-y-4">
                      {COMPARISON.map(row => (
                        <div key={row.label} className="flex items-center justify-between gap-4">
                          <span className="text-[10px] font-black uppercase tracking-wider text-white/30">{row.label}</span>
                          <span className="text-[10px] font-bold text-white/25 text-right">{row.demo}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Full desktop */}
                  <div className="glass rounded-[36px] border border-purple-500/30 overflow-hidden shadow-2xl shadow-purple-500/10 relative">
                    <div className="absolute top-4 right-4 px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-[8px] font-black uppercase tracking-widest text-purple-400">
                      Recomendado
                    </div>
                    <div className="px-8 py-5 border-b border-purple-500/20 flex items-center gap-3" style={{ background:'rgba(139,92,246,0.06)' }}>
                      <div className="w-8 h-8 bg-purple-500/10 rounded-xl flex items-center justify-center">
                        <WifiOff size={16} className="text-purple-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400/60">Completo</p>
                        <h3 className="text-sm font-black uppercase tracking-wider text-purple-300">App Escritorio</h3>
                      </div>
                    </div>
                    <div className="px-8 py-6 space-y-4">
                      {COMPARISON.map(row => (
                        <div key={row.label} className="flex items-center justify-between gap-4">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${row.highlight ? 'text-white/70' : 'text-white/40'}`}>{row.label}</span>
                          <div className="flex items-center gap-1.5 text-right">
                            <CheckCircle size={10} className="text-purple-400 flex-shrink-0" />
                            <span className={`text-[10px] font-bold ${row.highlight ? 'text-purple-300' : 'text-white/50'}`}>{row.full}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── All 10 modules grid ───────────────────────────────── */}
                <div className="text-center mb-12">
                  <h3 className="text-2xl md:text-3xl font-display font-black italic uppercase tracking-tighter mb-3">
                    Los 10 Módulos
                  </h3>
                  <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Incluidos en la versión de escritorio</p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {MODULES.map((mod, i) => {
                    const c = COLOR_MAP[mod.color];
                    return (
                      <motion.div key={i} whileHover={{ y:-6, scale:1.02 }} transition={{ type:'spring', stiffness:300, damping:20 }}
                        className={`group p-5 rounded-[28px] border ${c.border} ${c.bg} flex flex-col gap-3 shadow-xl hover:shadow-2xl ${c.glow} transition-all`}>
                        <div className={`w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center ${c.text} border ${c.border}`}>
                          {mod.icon}
                        </div>
                        <div>
                          <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${c.text} mb-1.5`}>{mod.title}</h4>
                          <p className="text-[9px] text-white/30 leading-relaxed">{mod.desc}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* ── Requirements ─────────────────────────────────────── */}
                <div className="mt-16 glass rounded-[36px] border border-white/10 p-8 grid sm:grid-cols-3 gap-8 text-center">
                  {[
                    { icon: <Monitor size={22} className="text-purple-400"/>, title: 'Sistema Operativo', detail: 'Windows 10 / 11\n64 bits' },
                    { icon: <Cpu size={22} className="text-cyan-400"/>,       title: 'Hardware',          detail: 'CPU i3+ / Ryzen 3+\nWebcam integrada o USB' },
                    { icon: <WifiOff size={22} className="text-orange-400"/>, title: 'Conexión',          detail: 'Sin internet necesario\nIA local en el dispositivo' },
                  ].map(req => (
                    <div key={req.title} className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">{req.icon}</div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/40">{req.title}</p>
                      <p className="text-[11px] text-white/60 font-medium whitespace-pre-line leading-relaxed">{req.detail}</p>
                    </div>
                  ))}
                </div>

                {/* ── Install steps ─────────────────────────────────────── */}
                <div className="mt-12 flex flex-col sm:flex-row gap-4 items-stretch justify-center">
                  {[
                    { n: '01', t: 'Descargar',  d: 'Descarga el instalador .exe desde el botón superior' },
                    { n: '02', t: 'Instalar',   d: 'Ejecuta el instalador y sigue los pasos del asistente' },
                    { n: '03', t: 'Conectar',   d: 'Conecta tu webcam y abre LearnHands para empezar' },
                  ].map(step => (
                    <div key={step.n} className="flex-1 glass rounded-[28px] border border-white/10 p-6 flex flex-col gap-3 text-center">
                      <span className="text-4xl font-display font-black italic text-gradient opacity-60">{step.n}</span>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">{step.t}</h4>
                      <p className="text-[9px] text-white/30 leading-relaxed">{step.d}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Dashboard de Métricas ────────────────────────────────────── */}
            <section id="dashboard" className="py-24 px-8 max-w-6xl mx-auto scroll-mt-20 border-t border-white/5">
              <DashboardSection />
            </section>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <footer className="py-20 border-t border-white/5 text-center text-white/10 text-[10px] font-black uppercase tracking-[0.4em] flex flex-col items-center gap-6 px-8">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <a href={RELEASES_URL} target="_blank" rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-3 glass px-6 py-3 rounded-full border border-white/5 text-white/30">
                  <Download size={14} /> Descargar App Escritorio
                </a>
                <a href={GITHUB_LINK} target="_blank" rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-3 glass px-6 py-3 rounded-full border border-white/5">
                  <GithubIcon size={14} /> Repositorio Web
                </a>
                <a href={DESKTOP_REPO} target="_blank" rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-3 glass px-6 py-3 rounded-full border border-white/5">
                  <GithubIcon size={14} /> Repositorio Escritorio
                </a>
              </div>
              <p>© 2024 Grupo Uno Emprendimiento · Fe y Alegría Ecuador · PUCE Sede Quito</p>
            </footer>

          </motion.div>
        } />
        <Route path="/hub" element={<SystemHub onExit={() => navigate('/')} />} />
      </Routes>
    </div>
  );
};

// ── Atomic components ──────────────────────────────────────────────────────────
const ObjectiveItem = ({ icon, title }) => (
  <div className="flex gap-4 items-center bg-white/5 p-4 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all shadow-inner">{icon}</div>
    <span className="text-sm font-bold text-white/50 group-hover:text-white transition-colors uppercase tracking-widest text-[10px]">{title}</span>
  </div>
);

const FeatureCard = ({ icon, title, desc }) => (
  <motion.div whileHover={{ y:-15 }} className="p-12 rounded-[50px] glass hover:bg-white/5 border border-white/10 transition-all flex flex-col gap-8 items-center text-center shadow-2xl">
    <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-4xl shadow-inner animate-float">{icon}</div>
    <div className="space-y-4">
      <h3 className="text-xs font-black uppercase tracking-[0.4em] italic text-white/90 underline decoration-purple-500/40 decoration-4 underline-offset-8">{title}</h3>
      <p className="text-white/20 text-[10px] leading-relaxed font-light">{desc}</p>
    </div>
  </motion.div>
);

export default App;
