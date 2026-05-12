import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Palette, Music, Puzzle, Play, ArrowLeft, Trash2, Trophy, Monitor, Power, LogOut
} from 'lucide-react';

// Hooks
import { useMediaPipe } from './hooks/useMediaPipe';
import { useGestures } from './hooks/useGestures';
import { useHandCursor } from './hooks/useHandCursor';

// Components
import LayeredEngine from './components/hub/LayeredEngine';
import PianoModule from './components/hub/modules/PianoModule';
import DrawingModule from './components/hub/modules/DrawingModule';
import PuzzleModule from './components/hub/modules/PuzzleModule';

const SCORE_KEY = 'edumotion_score';

// --- COMPONENTE HAND BUTTON (DWELL CLICK) ---
const HandButton = ({ children, onClick, cursor, dwellMs = 1000, className = "", variant = "purple" }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const startTime = useRef(null);
  const timerRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!cursor.isVisible || !buttonRef.current) {
      if (isHovered) reset();
      return;
    }
    
    const rect = buttonRef.current.getBoundingClientRect();
    const over = cursor.x >= rect.left && cursor.x <= rect.right && cursor.y >= rect.top && cursor.y <= rect.bottom;

    if (over && !isHovered) {
      setIsHovered(true);
      startTime.current = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime.current;
        const p = Math.min(elapsed / dwellMs, 1);
        setProgress(p);
        if (p >= 1) {
          clearInterval(timerRef.current);
          onClick?.();
          reset();
        }
      }, 16);
    } else if (!over && isHovered) {
      reset();
    }
    
    return () => { if(timerRef.current) clearInterval(timerRef.current); };
  }, [cursor, isHovered, dwellMs, onClick]);

  const reset = () => {
    setIsHovered(false);
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const variants = {
    purple: "from-purple-600 to-indigo-600",
    cyan: "from-cyan-500 to-teal-500",
    orange: "from-orange-500 to-amber-500",
    red: "from-red-600 to-rose-600",
    emerald: "from-emerald-500 to-teal-600"
  };

  return (
    <button
      ref={buttonRef}
      className={`relative overflow-hidden transition-all duration-300 ${isHovered ? 'scale-110 shadow-[0_0_40px_rgba(124,58,237,0.4)]' : ''} ${className} bg-gradient-to-br ${variants[variant] || variants.purple} text-white font-black uppercase tracking-widest rounded-2xl shadow-xl border border-white/10`}
    >
      <div className="relative z-10 flex items-center justify-center gap-3">{children}</div>
      {isHovered && (
        <div className="absolute inset-0 bg-white/20 origin-left" style={{ transform: `scaleX(${progress})` }} />
      )}
    </button>
  );
};

const SystemHub = ({ onExit }) => {
  const [view, setView] = useState('HOME'); // HOME, MENU, GAME
  const [currentGame, setCurrentGame] = useState(null);
  const [score, setScore] = useState(() => parseInt(localStorage.getItem(SCORE_KEY) || '0', 10));
  
  const videoRef = useRef(null);
  const { isLoaded, landmarks, initMediaPipe } = useMediaPipe();
  const gestures = useGestures(landmarks);
  const cursor = useHandCursor(landmarks);

  useEffect(() => {
    initMediaPipe(videoRef.current);
  }, [initMediaPipe]);

  const level = useMemo(() => Math.floor(score / 100) + 1, [score]);

  const addPoints = (p) => {
    setScore(prev => {
      const newScore = prev + p;
      localStorage.setItem(SCORE_KEY, newScore.toString());
      return newScore;
    });
  };

  return (
    <LayeredEngine videoRef={videoRef} landmarks={landmarks} cursor={cursor} gestures={gestures} isLoaded={isLoaded}>
      <AnimatePresence mode="wait">
        {view === 'HOME' && (
          <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 flex flex-col items-center justify-center p-20">
            <div className="glass p-16 rounded-[80px] border border-white/10 flex flex-col items-center gap-12 text-center max-w-2xl w-full shadow-2xl relative">
              <div className="absolute -top-12 w-24 h-24 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center text-5xl shadow-2xl animate-bounce-slow border border-white/20">🖐️</div>
              <div className="space-y-4">
                <h2 className="text-6xl font-display font-black tracking-tighter italic uppercase text-gradient">EduMotion Hub</h2>
                <p className="text-white/40 font-black uppercase tracking-[0.4em] text-[10px] italic">Plataforma Educativa de Movimiento Natural</p>
              </div>
              
              <div className="flex flex-col items-center gap-6 w-full">
                <HandButton cursor={cursor} onClick={() => setView('MENU')} className="px-16 py-8 text-xl w-full max-w-sm" dwellMs={1200}>
                  <Play fill="white" size={24} /> COMENZAR
                </HandButton>
                <HandButton cursor={cursor} onClick={onExit} className="px-8 py-4 text-[10px]" variant="red" dwellMs={800}>
                  <LogOut size={14} /> SALIR AL PORTAL
                </HandButton>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'MENU' && (
          <motion.div key="menu" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="flex-1 flex flex-col items-center justify-center p-12">
            <div className="absolute top-12 left-12">
               <HandButton cursor={cursor} onClick={() => setView('HOME')} className="p-4" variant="red" dwellMs={600}><ArrowLeft/></HandButton>
            </div>
            
            <h2 className="text-5xl font-display font-black mb-16 italic text-gradient tracking-tighter uppercase underline decoration-purple-500/30 decoration-8 underline-offset-[16px]">Módulos de Aprendizaje</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-6xl">
              <MenuCard icon={<Palette size={48} />} title="Pizarra" color="purple" cursor={cursor} onSelect={() => { setView('GAME'); setCurrentGame('PIZARRA'); }} />
              <MenuCard icon={<Music size={48} />} title="Piano" color="cyan" cursor={cursor} onSelect={() => { setView('GAME'); setCurrentGame('PIANO'); }} />
              <MenuCard icon={<Puzzle size={48} />} title="Puzzle" color="orange" cursor={cursor} onSelect={() => { setView('GAME'); setCurrentGame('PUZZLE'); }} />
            </div>
          </motion.div>
        )}

        {view === 'GAME' && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
            {/* Game Header */}
            <div className="h-20 glass-dark border-b border-white/10 flex items-center justify-between px-12 z-[100]">
              <div className="flex items-center gap-8">
                <HandButton cursor={cursor} onClick={() => setView('MENU')} className="p-4" variant="red" dwellMs={800}><ArrowLeft size={20}/></HandButton>
                <div className="flex flex-col">
                    <span className="text-[12px] font-black uppercase tracking-[0.4em] text-purple-400 italic">EduMotion Hub</span>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Módulo: {currentGame}</span>
                </div>
              </div>
              
              <div className="flex gap-8 items-center">
                <div className="glass px-6 py-3 rounded-2xl flex items-center gap-4 border border-white/10 shadow-xl">
                   <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/60">IA Activa</span>
                </div>
                <div className="flex items-center gap-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-6 py-3 rounded-2xl border border-amber-500/30">
                    <Trophy size={18} className="text-amber-400" />
                    <span className="text-xl font-display font-black text-amber-400 italic">{score}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 relative">
              {currentGame === 'PIZARRA' && <DrawingModule cursor={cursor} gestures={gestures} addPoints={addPoints} />}
              {currentGame === 'PIANO' && <PianoModule cursor={cursor} gestures={gestures} addPoints={addPoints} />}
              {currentGame === 'PUZZLE' && <PuzzleModule cursor={cursor} gestures={gestures} addPoints={addPoints} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Score Widget (Persistent) */}
      <div className="fixed bottom-8 right-8 z-50 pointer-events-none">
        <div className="glass p-6 rounded-[32px] border border-white/10 shadow-2xl flex items-center gap-6">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                <Trophy className="text-amber-400" size={24} />
            </div>
            <div className="flex flex-col">
                <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.3em]">Nivel {level}</span>
                <span className="text-2xl font-display font-black text-white italic tracking-tighter">{score} <span className="text-[10px] text-white/20 not-italic ml-1">PTS</span></span>
            </div>
        </div>
      </div>
    </LayeredEngine>
  );
};

const MenuCard = ({ icon, title, color, onSelect, cursor }) => (
  <div className="group relative">
    <HandButton cursor={cursor} onClick={onSelect} className="w-full aspect-square rounded-[60px] flex flex-col items-center justify-center gap-8" variant={color} dwellMs={1000}>
        <div className="p-8 bg-white/10 rounded-3xl group-hover:scale-110 transition-transform duration-500 shadow-inner">
            {icon}
        </div>
        <div className="flex flex-col items-center gap-2">
            <span className="font-display text-2xl font-black italic tracking-tight uppercase">{title}</span>
            <div className="w-12 h-1 bg-white/20 rounded-full" />
        </div>
    </HandButton>
  </div>
);

export default SystemHub;
