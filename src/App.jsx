import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, Palette, Music, Puzzle, Cpu, Zap, Heart, 
  Play, X, Monitor, ArrowLeft, Eraser, Trash2, Layers, 
  Hand 
} from 'lucide-react';
import LiveHandTracker from './components/LiveHandTracker';

// Icono de GitHub Manual para evitar errores de librería
const GithubIcon = ({ size = 20 }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" 
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.28 1.15-.28 2.35 0 3.5-.73 1.02-1.08 2.25-1 3.5 0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const App = () => {
  const [isLive, setIsLive] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('MENU'); // MENU, DRAW, PIANO, PUZZLE
  const [handPos, setHandPos] = useState(null); // { x, y, isPinching }
  const lastActionTime = useRef(0);
  const CLICK_COOLDOWN = 800; 

  const downloadLink = "https://drive.google.com/drive/folders/1PWRW1HKfjc5-y0pY89uucKQQTns8jPLd?usp=drive_link";
  const githubLink = "https://github.com/Yanickmaila26/EduMotion";
  const containerRef = useRef(null);

  const triggerAction = (action) => {
    const now = Date.now();
    if (now - lastActionTime.current > CLICK_COOLDOWN) {
      lastActionTime.current = now;
      action();
    }
  };

  return (
    <div className="min-h-screen bg-[#03030b] text-white selection:bg-purple-500/30 font-sans overflow-x-hidden">
      
      {/* --- BACKGROUND DECORATION --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[5%] w-[35%] h-[35%] bg-cyan-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-[40%] left-[30%] w-[20%] h-[20%] bg-indigo-600/5 blur-[100px] rounded-full" />
      </div>

      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full z-50 glass-dark py-4 px-8 flex justify-between items-center border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-purple-500/20">🖐️</div>
          <span className="font-display text-2xl tracking-tighter font-black uppercase">EduMotion</span>
        </div>
        <div className="hidden md:flex gap-8 text-xs font-black uppercase tracking-widest text-white/40 items-center">
          <a href="#features" className="hover:text-white transition-colors">Características</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">Tecnología</a>
          <a href={githubLink} target="_blank" className="hover:text-white transition-colors flex items-center gap-2">
            <GithubIcon size={14} /> GitHub
          </a>
          <a href="#download" className="hover:text-white transition-colors text-purple-400 font-bold">Descargar</a>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <header className="relative pt-40 pb-20 px-8 flex flex-col items-center text-center z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-purple-400 tracking-[0.2em] uppercase mb-8">
          <Zap size={12} /> Tecnología Gestual de Vanguardia
        </motion.div>

        <h1 className="text-6xl md:text-8xl font-display leading-[0.95] mb-8 font-black tracking-tighter">
          Aprende con tus <br />
          <span className="text-gradient">manos en el aire</span>
        </h1>

        <p className="max-w-2xl text-lg text-white/40 mb-12 leading-relaxed">
          EduMotion es una experiencia educativa inclusiva que utiliza Inteligencia Artificial para detectar tus gestos. 
          Interactúa con módulos de arte, música y lógica sin tocar el ratón ni el teclado.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <a href={downloadLink} target="_blank" className="group px-8 py-4 bg-white text-black font-black rounded-2xl flex items-center gap-3 hover:bg-purple-500 hover:text-white transition-all shadow-2xl shadow-white/10">
            <Download size={18} /> DESCARGAR VERSIÓN PC
          </a>
          <a href="#demo" className="px-8 py-4 glass rounded-2xl font-black text-xs tracking-widest flex items-center gap-3 hover:bg-white/10 transition-all border border-white/10 uppercase">
            Probar Demo Online
          </a>
        </div>

        {/* --- INTERACTIVE DEMO CONTAINER --- */}
        <motion.div id="demo" ref={containerRef} className="w-full max-w-5xl rounded-[40px] overflow-hidden border border-white/10 shadow-2xl shadow-purple-500/20 bg-[#060611] relative">
          
          <div className="bg-purple-600/20 border-b border-purple-500/20 px-6 py-2 flex items-center justify-center gap-3 text-[9px] font-black uppercase tracking-[0.3em] text-purple-300">
            <Monitor size={12} /> Navega usando el gesto de pinza (unir pulgar e índice)
          </div>

          <div className="aspect-video relative overflow-hidden flex items-center justify-center">
            
            <LiveHandTracker key={isLive ? "active-session" : "idle-session"} active={isLive} onHandUpdate={setHandPos} />
            
            <AnimatePresence>
                {isLive && handPos && (
                    <motion.div 
                        className="absolute z-[100] pointer-events-none"
                        style={{ left: `${handPos.x * 100}%`, top: `${handPos.y * 100}%` }}
                        initial={{ scale: 0 }}
                        animate={{ scale: handPos.isPinching ? 0.8 : 1 }}
                        exit={{ scale: 0 }}
                    >
                        <div className={`w-8 h-8 rounded-full border-2 ${handPos.isPinching ? 'border-white bg-white/40' : 'border-purple-500 bg-purple-500/20'} shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-colors`} />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                <AnimatePresence mode="wait">
                    {!isLive ? (
                        <motion.div key="start-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-8">
                            <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 4, repeat: Infinity }} className="text-9xl drop-shadow-[0_0_40px_rgba(168,85,247,0.5)]">🖐️</motion.div>
                            <button onClick={() => setIsLive(true)} className="pointer-events-auto px-10 py-4 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-2xl flex items-center gap-3 shadow-2xl shadow-purple-500/40 transition-all active:scale-95 uppercase tracking-widest text-sm">
                                <Play size={20} fill="currentColor" /> Comenzar Demo
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div key="interactive-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full relative">
                            
                            <BackButton 
                                label={currentScreen === 'MENU' ? 'Cerrar Demo' : 'Volver al Menú'}
                                active={handPos?.isPinching}
                                isHovered={handPos && handPos.x < 0.25 && handPos.y < 0.15}
                                onAction={() => triggerAction(() => {
                                    if (currentScreen === 'MENU') setIsLive(false);
                                    else setCurrentScreen('MENU');
                                })}
                            />

                            <div className="w-full h-full flex items-center justify-center">
                                {currentScreen === 'MENU' && (
                                    <div className="grid grid-cols-3 gap-8 w-full max-w-4xl p-12 pointer-events-auto">
                                        <DemoMenuCard 
                                            icon={<Palette size={40} />} title="Pizarra" color="purple" 
                                            active={handPos?.isPinching} 
                                            isHovered={handPos && handPos.x > 0.1 && handPos.x < 0.35 && handPos.y > 0.3 && handPos.y < 0.7}
                                            onSelect={() => triggerAction(() => setCurrentScreen('DRAW'))}
                                        />
                                        <DemoMenuCard 
                                            icon={<Music size={40} />} title="Piano" color="cyan" 
                                            active={handPos?.isPinching}
                                            isHovered={handPos && handPos.x > 0.37 && handPos.x < 0.62 && handPos.y > 0.3 && handPos.y < 0.7}
                                            onSelect={() => triggerAction(() => setCurrentScreen('PIANO'))}
                                        />
                                        <DemoMenuCard 
                                            icon={<Puzzle size={40} />} title="Puzzle" color="orange" 
                                            active={handPos?.isPinching}
                                            isHovered={handPos && handPos.x > 0.65 && handPos.x < 0.9 && handPos.y > 0.3 && handPos.y < 0.7}
                                            onSelect={() => triggerAction(() => setCurrentScreen('PUZZLE'))}
                                        />
                                    </div>
                                )}
                                {currentScreen === 'DRAW' && <ViewDrawing />}
                                {currentScreen === 'PIANO' && <ViewPiano />}
                                {currentScreen === 'PUZZLE' && <ViewPuzzle />}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent h-[200%] w-full animate-[scan_4s_linear_infinite]" />
                <div className="absolute bottom-6 right-6 flex flex-col items-end gap-1">
                    <div className="glass px-3 py-1 rounded border-white/5 text-[8px] font-mono text-white/40 flex items-center gap-2">
                        <span>FPS</span> <span className="text-green-400">60.0</span>
                    </div>
                </div>
            </div>
          </div>
        </motion.div>
      </header>

      {/* --- FEATURES SECTION --- */}
      <section id="features" className="py-24 px-8 max-w-7xl mx-auto z-10 relative">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Palette className="text-purple-400" />}
            title="Pizarra Mágica"
            desc="Dibuja en el aire con tu dedo índice. Elige colores y crea trazos dinámicos con fluidez."
          />
          <FeatureCard 
            icon={<Music className="text-cyan-400" />}
            title="Piano Gestual"
            desc="Siente la música. Toca teclas virtuales detectando la posición de cada uno de tus dedos."
          />
          <FeatureCard 
            icon={<Puzzle className="text-orange-400" />}
            title="Desafíos de Lógica"
            desc="Usa el gesto de pinza para agarrar, mover y soltar piezas en rompecabezas interactivos."
          />
        </div>
      </section>

      {/* --- TECHNOLOGY SECTION --- */}
      <section id="how-it-works" className="py-24 px-8 bg-white/2 flex flex-col md:flex-row items-center gap-16 max-w-7xl mx-auto rounded-[60px] border border-white/5 my-20">
        <div className="md:w-1/2">
          <h2 className="text-4xl md:text-6xl font-display mb-8 font-black tracking-tight">Potenciado por <br /><span className="text-gradient uppercase">AI de Google</span></h2>
          <div className="space-y-6">
            <TechItem 
              icon={<Cpu size={24} />} 
              title="Procesamiento en Tiempo Real" 
              desc="Detección de 21 puntos clave de la mano a 30 cuadros por segundo para una latencia imperceptible." 
            />
            <TechItem 
              icon={<Zap size={24} />} 
              title="Sin Sensores Externos" 
              desc="No requiere guantes ni hardware costoso. Solo la cámara web de tu laptop o computadora." 
            />
            <TechItem 
              icon={<Heart size={24} />} 
              title="Diseño Inclusivo" 
              desc="Pensado específicamente para la educación especial y el desarrollo motriz de niños." 
            />
          </div>
        </div>
        <div className="md:w-1/2 grid grid-cols-2 gap-4">
           <div className="space-y-4 pt-12">
              <img src="https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80" className="rounded-3xl border border-white/10 grayscale hover:grayscale-0 transition-all duration-700 w-full object-cover h-48" alt="Tech" />
              <div className="h-40 glass rounded-3xl p-6 flex flex-col justify-end">
                <p className="text-xs font-bold text-white/30 uppercase tracking-widest">MediaPipe Engine</p>
                <p className="text-2xl font-display text-white font-black italic">v0.4.1</p>
              </div>
           </div>
           <div className="space-y-4">
              <div className="h-48 bg-gradient-to-br from-purple-600/40 to-indigo-600/40 rounded-3xl border border-white/10 p-6 flex flex-col justify-end">
                <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Detección</p>
                <p className="text-3xl font-display text-white font-black">100% Offline</p>
              </div>
              <img src="https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80" className="rounded-3xl border border-white/10 grayscale hover:grayscale-0 transition-all duration-700 w-full object-cover h-48" alt="UI" />
           </div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section id="download" className="py-32 px-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-purple-600/10 blur-[150px] rounded-full scale-50" />
        <h2 className="text-5xl md:text-7xl font-display mb-8 z-10 relative font-black tracking-tighter italic">¿Listo para probar el futuro?</h2>
        <p className="text-white/20 mb-12 max-w-xl mx-auto z-10 relative text-sm tracking-widest uppercase">Descarga la versión beta para Windows y comienza a explorar una nueva forma de aprender.</p>
        <div className="flex justify-center z-10 relative">
          <a 
            href={downloadLink} 
            target="_blank" 
            className="px-12 py-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl font-black text-xl hover:scale-105 transition-transform shadow-2xl shadow-purple-500/40 flex items-center gap-4 border border-white/20"
          >
            <Download size={24} /> DESCARGAR VERSIÓN BETA (PC)
          </a>
        </div>
        <div className="mt-12 flex justify-center gap-8 text-white/10 text-[10px] font-black uppercase tracking-widest">
            <span>Windows 10/11</span>
            <span>Camera Required</span>
            <span>Beta v1.0.0</span>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-12 border-t border-white/5 text-center text-white/10 text-[10px] font-black uppercase tracking-[0.4em] flex flex-col items-center gap-4">
        <a href={githubLink} target="_blank" className="hover:text-white transition-colors flex items-center gap-2 font-bold">
            <GithubIcon size={14} /> Código Fuente en GitHub
        </a>
        <p>© 2024 EduMotion Ecuador • Proyecto para Fe y Alegría</p>
      </footer>
    </div>
  );
};

const BackButton = ({ label, isHovered, active, onAction }) => {
    useEffect(() => {
        if (isHovered && active) onAction();
    }, [isHovered, active]);

    return (
        <div className={`absolute top-6 left-6 pointer-events-auto px-6 py-3 glass rounded-2xl border-2 transition-all flex items-center gap-3 font-black uppercase tracking-widest text-[10px] z-[60] ${isHovered ? 'bg-red-500/20 border-red-500 scale-110 text-white' : 'bg-black/40 border-white/10 text-white/40'}`}>
            <ArrowLeft size={16} /> {label}
        </div>
    );
};

const DemoMenuCard = ({ icon, title, color, isHovered, active, onSelect }) => {
    useEffect(() => {
        if (isHovered && active) onSelect();
    }, [isHovered, active]);

    return (
        <div className={`p-8 rounded-[32px] border-2 transition-all flex flex-col items-center gap-4 ${isHovered ? `bg-${color}-500/20 border-${color}-500 scale-105` : 'bg-black/40 border-white/5 scale-100'}`}>
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center bg-white/5 ${isHovered ? `text-${color}-400` : 'text-white/20'}`}>{icon}</div>
            <span className={`font-black uppercase tracking-widest text-[10px] ${isHovered ? 'text-white' : 'text-white/20'}`}>{title}</span>
        </div>
    );
};

const ViewDrawing = () => (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full flex items-center justify-center p-12">
        <div className="w-full h-full glass rounded-[40px] border-white/10 relative overflow-hidden flex flex-col bg-black/40">
            <div className="h-16 border-b border-white/5 flex items-center px-8 gap-4 bg-white/5">
                <div className="w-6 h-6 rounded-full bg-purple-500 shadow-[0_0_15px_#A855F7]" />
                <div className="w-6 h-6 rounded-full bg-cyan-500" />
                <div className="ml-auto flex gap-2">
                    <div className="p-2 glass rounded-lg"><Eraser size={12}/></div>
                    <div className="p-2 glass rounded-lg"><Trash2 size={12}/></div>
                </div>
            </div>
            <div className="flex-1 flex items-center justify-center text-white/5 italic text-[10px] font-black tracking-[0.5em] uppercase">Canvas Virtual Activo</div>
        </div>
    </motion.div>
);

const ViewPiano = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full h-full flex flex-col items-center justify-center p-12">
        <div className="flex gap-2 h-48 w-full max-w-2xl items-end justify-center bg-black/40 p-4 rounded-[32px] border border-white/5">
            {[...Array(10)].map((_, i) => (
                <div key={i} className={`flex-1 rounded-b-xl border-x border-b border-white/10 transition-all ${i % 3 === 0 ? 'bg-cyan-500/20 h-full border-cyan-500/50' : 'bg-white/5 h-[80%]'}`} />
            ))}
        </div>
        <div className="mt-8 text-[9px] font-black text-cyan-400 uppercase tracking-[0.3em]">Sintetizador Gestual Activo</div>
    </motion.div>
);

const ViewPuzzle = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full h-full flex items-center justify-center p-12">
        <div className="grid grid-cols-3 gap-4 w-full max-w-sm p-6 glass rounded-[32px] border-white/10 bg-black/40">
            {[...Array(9)].map((_, i) => (
                <div key={i} className={`aspect-square rounded-2xl border flex items-center justify-center text-xl ${i === 4 ? 'border-orange-500 bg-orange-500/20 text-orange-400' : 'border-white/5 bg-white/5 text-white/5'}`}>
                    {i === 4 ? <Layers /> : i + 1}
                </div>
            ))}
        </div>
    </motion.div>
);

const FeatureCard = ({ icon, title, desc }) => (
  <motion.div whileHover={{ y: -10 }} className="p-10 rounded-[40px] glass hover:bg-white/5 border border-white/10 transition-all flex flex-col gap-6 items-center">
    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-3xl">{icon}</div>
    <h3 className="text-[12px] font-black uppercase tracking-[0.3em]">{title}</h3>
    <p className="text-white/20 text-[11px] leading-relaxed text-center">{desc}</p>
  </motion.div>
);

const TechItem = ({ icon, title, desc }) => (
  <div className="flex gap-4">
    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">{icon}</div>
    <div><h4 className="font-bold mb-1 text-sm uppercase tracking-widest">{title}</h4><p className="text-xs text-white/30 leading-relaxed">{desc}</p></div>
  </div>
);

export default App;
