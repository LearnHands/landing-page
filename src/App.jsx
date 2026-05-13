import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { 
  Palette, Music, Puzzle, Heart, Zap, Sparkles, LogIn, Monitor, ChevronRight
} from 'lucide-react';
import SystemHub from './SystemHub';
import puceLogo from './assets/puce.png';

// --- CONFIGURACIÓN ---
const githubLink = "https://github.com/GrupoUnoEmprendimiento/EduMotion";

// Icono de GitHub Manual
const GithubIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.28 1.15-.28 2.35 0 3.5-.73 1.02-1.08 2.25-1 3.5 0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const App = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#03030b] text-white selection:bg-purple-500/30 font-sans overflow-x-hidden scroll-smooth relative">
      <Routes>
        <Route path="/" element={
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10">
            {/* Fondo Decorativo Mejorado */}
            <div className="fixed inset-0 z-0 pointer-events-none">
              <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[140px] rounded-full animate-pulse" />
              <div className="absolute bottom-[10%] right-[5%] w-[45%] h-[45%] bg-cyan-600/10 blur-[140px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <nav className="fixed top-0 w-full z-50 glass-dark py-4 px-8 flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-6">
                <img src={puceLogo} alt="PUCE Logo" className="h-10 w-auto" />
                <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center text-lg shadow-lg">🖐️</div>
                  <span className="font-display text-xl tracking-tighter font-black uppercase tracking-[0.1em]">EduMotion</span>
                </div>
              </div>
              <div className="hidden md:flex gap-8 text-xs font-black uppercase tracking-widest text-white/40 items-center">
                <a href="#mision" className="hover:text-white transition-colors">Misión</a>
                <a href="#modulos" className="hover:text-white transition-colors">Características</a>
                <a href={githubLink} target="_blank" className="hover:text-white transition-colors flex items-center gap-2 border-l border-white/10 pl-8">
                  <GithubIcon size={14} /> GitHub
                </a>
                <button onClick={() => navigate('/hub')} className="px-6 py-2 bg-purple-600 text-white rounded-full font-bold hover:bg-purple-500 transition-all text-[9px] uppercase tracking-widest flex items-center gap-2">
                  <LogIn size={14} /> Abrir Aplicación
                </button>
              </div>
            </nav>

            <header className="relative pt-48 pb-24 px-8 flex flex-col items-center text-center">
              <h1 className="text-6xl md:text-8xl font-display leading-[0.95] mb-8 font-black tracking-tighter italic text-gradient uppercase">Aprendizaje sin Mouse</h1>
              <p className="max-w-2xl text-lg text-white/40 mb-12 italic">Controla todo con tus manos. Inclusión tecnológica para Fe y Alegría Ecuador.</p>
              <div className="flex flex-col sm:flex-row gap-4 mb-24 font-black uppercase tracking-widest text-xs">
                <button onClick={() => navigate('/hub')} className="px-10 py-5 bg-white text-black rounded-3xl flex items-center gap-3 hover:bg-purple-500 hover:text-white transition-all shadow-2xl">
                  Comenzar Experiencia
                </button>
                <a href="#mision" className="px-10 py-5 glass rounded-3xl flex items-center gap-3 border border-white/10">
                  Más Información
                </a>
              </div>

              {/* Demo Preview Section */}
              <section className="w-full max-w-4xl rounded-[40px] overflow-hidden border border-white/10 glass-dark p-1 relative shadow-2xl shadow-purple-500/10">
                  <div className="bg-white/5 rounded-[38px] overflow-hidden p-12 text-center">
                      <div className="text-xs font-black text-purple-400 uppercase tracking-widest mb-6 italic">EduMotion AI Engine v2.0</div>
                      <div className="aspect-video bg-black/40 rounded-3xl border border-white/5 flex items-center justify-center relative overflow-hidden group">
                          <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-cyan-500/10 animate-pulse" />
                          <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity }} className="text-9xl drop-shadow-[0_0_20px_rgba(168,85,247,0.3)] z-10">🖐️</motion.div>
                          <button onClick={() => navigate('/hub')} className="absolute bottom-10 px-8 py-3 bg-purple-600 rounded-xl font-bold text-xs uppercase tracking-widest z-10 hover:scale-105 transition-all">
                              Acceder al Programa Real
                          </button>
                      </div>
                  </div>
              </section>
            </header>

            {/* Misión e Inclusión */}
            <section id="mision" className="py-24 px-8 max-w-5xl mx-auto scroll-mt-20">
                <h2 className="text-3xl md:text-5xl font-display font-black mb-12 text-center underline decoration-purple-500 decoration-4 underline-offset-[12px] uppercase italic">Misión e Inclusión</h2>
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6 text-lg text-white/50 leading-relaxed italic">
                        <p>"Nuestra misión es facilitar el aprendizaje interactivo para niños con retos motrices o en etapas iniciales de desarrollo."</p>
                        <p>"Eliminamos las barreras físicas de entrada, convirtiendo el movimiento natural del cuerpo en una herramienta pedagógica."</p>
                    </div>
                    <div className="glass p-8 rounded-[40px] border border-white/10 space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-purple-400">Objetivos Clave</h3>
                        <ObjectiveItem icon={<Heart className="text-purple-500" />} title="Inclusión Digital" />
                        <ObjectiveItem icon={<Zap className="text-cyan-500" />} title="Zero Mouse / Zero Keyboard" />
                        <ObjectiveItem icon={<Sparkles className="text-orange-500" />} title="Aprendizaje Lúdico" />
                    </div>
                </div>
            </section>

            {/* Módulos */}
            <section id="modulos" className="py-24 px-8 max-w-7xl mx-auto">
              <h2 className="text-center text-4xl font-display font-black mb-20 italic text-gradient tracking-tighter uppercase">Módulos Web Hub</h2>
              <div className="grid md:grid-cols-3 gap-12">
                <FeatureCard icon={<Palette className="text-purple-400" />} title="Pizarra Interactiva" desc="Sistema de dibujo por gestos. Utiliza el índice para crear trazos sobre un lienzo digital infinito." />
                <FeatureCard icon={<Music className="text-cyan-400" />} title="Sintetizador Gestual" desc="Piano virtual que reacciona a la posición de tus dedos en el espacio tridimensional." />
                <FeatureCard icon={<Puzzle className="text-orange-400" />} title="Rompecabezas Lógico" desc="Módulo de manipulación de objetos mediante el gesto de pinza para el desarrollo motriz." />
              </div>
            </section>

            <footer className="py-20 border-t border-white/5 text-center text-white/10 text-[10px] font-black uppercase tracking-[0.4em] flex flex-col items-center gap-6">
              <a href={githubLink} target="_blank" className="hover:text-white transition-colors flex items-center gap-3 glass px-6 py-3 rounded-full border border-white/5 uppercase">
                  <GithubIcon size={16} /> Ver Repositorio Oficial
              </a>
              <p>© 2024 Grupo Uno Emprendimiento • Fe y Alegría Ecuador</p>
            </footer>
          </motion.div>
        } />
        <Route path="/hub" element={<SystemHub onExit={() => navigate('/')} />} />
      </Routes>
    </div>
  );
};

// --- COMPONENTES ATÓMICOS ---

const ObjectiveItem = ({ icon, title }) => (
    <div className="flex gap-4 items-center bg-white/5 p-4 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all shadow-inner">{icon}</div>
        <span className="text-sm font-bold text-white/50 group-hover:text-white transition-colors uppercase tracking-widest text-[10px]">{title}</span>
    </div>
);

const FeatureCard = ({ icon, title, desc }) => (
  <motion.div whileHover={{ y: -15 }} className="p-12 rounded-[50px] glass hover:bg-white/5 border border-white/10 transition-all flex flex-col gap-8 items-center text-center shadow-2xl">
    <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-4xl shadow-inner animate-float">{icon}</div>
    <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-[0.4em] italic text-white/90 underline decoration-purple-500/40 decoration-4 underline-offset-8">{title}</h3>
        <p className="text-white/20 text-[10px] leading-relaxed font-light">{desc}</p>
    </div>
  </motion.div>
);

export default App;
