import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Palette, Music, Puzzle, Play, ArrowLeft, Trash2, Trophy, Monitor, Power, LogOut, RefreshCcw
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
import CalibrationOverlay from './components/hub/CalibrationOverlay';

import puceLogo from './assets/puce.png';

const SCORE_KEY = 'edumotion_score';
const CALIBRATION_KEY = 'edumotion_calibration';

// --- COMPONENTE HAND BUTTON (DWELL CLICK) ---
const HandButton = ({ children, onClick, cursors = [], dwellMs = 1000, className = "", variant = "purple" }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const buttonRef = useRef(null);
  const lastTimeRef = useRef(null);
  const frameRef = useRef(null);

  // We use a dedicated frame loop for the button hit detection to be independent of state delays
  useEffect(() => {
    const checkHit = () => {
      if (!buttonRef.current) {
        frameRef.current = requestAnimationFrame(checkHit);
        return;
      }
      
      const rect = buttonRef.current.getBoundingClientRect();
      // Add a 20px "padding" to the hit area to make it easier to hit
      const hitRect = {
        left: rect.left - 20,
        right: rect.right + 20,
        top: rect.top - 20,
        bottom: rect.bottom + 20
      };

      const isOver = cursors.some(c => 
        c.x >= hitRect.left && c.x <= hitRect.right && 
        c.y >= hitRect.top && c.y <= hitRect.bottom
      );

      if (isOver) {
        if (!isHovered) {
          setIsHovered(true);
          lastTimeRef.current = Date.now();
        } else {
          const now = Date.now();
          const delta = now - lastTimeRef.current;
          const newProgress = Math.min(progress + delta / dwellMs, 1);
          setProgress(newProgress);
          
          if (newProgress >= 1) {
            onClick?.();
            setIsHovered(false);
            setProgress(0);
          }
          lastTimeRef.current = now;
        }
      } else {
        if (isHovered) {
          // Slow reset instead of instant to be more forgiving
          const newProgress = Math.max(progress - 0.05, 0);
          setProgress(newProgress);
          if (newProgress === 0) setIsHovered(false);
        }
      }

      frameRef.current = requestAnimationFrame(checkHit);
    };

    frameRef.current = requestAnimationFrame(checkHit);
    return () => cancelAnimationFrame(frameRef.current);
  }, [cursors, isHovered, progress, dwellMs, onClick]);

  const reset = () => {
    setIsHovered(false);
    setProgress(0);
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
  const [calibration, setCalibration] = useState(() => {
    const saved = localStorage.getItem(CALIBRATION_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [isCalibrating, setIsCalibrating] = useState(false);
  
  const videoRef = useRef(null);
  const { isLoaded, landmarks, initMediaPipe, error } = useMediaPipe();
  const gestures = useGestures(landmarks);
  const cursors = useHandCursor(landmarks, calibration);

  useEffect(() => {
    initMediaPipe(videoRef.current);
  }, [initMediaPipe]);

  useEffect(() => {
    if (isLoaded && !calibration && !isCalibrating) {
      setIsCalibrating(true);
    }
  }, [isLoaded, calibration, isCalibrating]);

  const handleCalibrationComplete = (newBounds) => {
    setCalibration(newBounds);
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify(newBounds));
    setIsCalibrating(false);
  };

  const level = useMemo(() => Math.floor(score / 100) + 1, [score]);

  const addPoints = (p) => {
    setScore(prev => {
      const newScore = prev + p;
      localStorage.setItem(SCORE_KEY, newScore.toString());
      return newScore;
    });
  };

  return (
    <LayeredEngine videoRef={videoRef} landmarks={landmarks} cursors={cursors} gestures={gestures} isLoaded={isLoaded} error={error}>
      <AnimatePresence>
        {isCalibrating && <CalibrationOverlay landmarks={landmarks} onComplete={handleCalibrationComplete} />}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view === 'HOME' && (
          <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 flex flex-col items-center justify-center p-20">
            {/* Logo PUCE */}
            <div className="absolute top-12 left-12 flex items-center gap-4">
              <img src={puceLogo} alt="PUCE Logo" className="h-12 w-auto drop-shadow-lg" />
              <div className="h-8 w-[1px] bg-white/20" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Sede Santo Domingo</span>
            </div>

            <div className="glass p-16 rounded-[80px] border border-white/10 flex flex-col items-center gap-12 text-center max-w-2xl w-full shadow-2xl relative">
              <div className="absolute -top-12 w-24 h-24 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center text-5xl shadow-2xl animate-bounce-slow border border-white/20">🖐️</div>
              <div className="space-y-4">
                <h2 className="text-6xl font-display font-black tracking-tighter italic uppercase text-gradient">EduMotion Hub</h2>
                <p className="text-white/40 font-black uppercase tracking-[0.4em] text-[10px] italic">Plataforma Educativa de Movimiento Natural</p>
              </div>
              
              <div className="flex flex-col items-center gap-6 w-full">
                <HandButton cursors={cursors} onClick={() => setView('MENU')} className="px-20 py-10 text-2xl w-full max-w-md h-32" dwellMs={800}>
                  <Play fill="white" size={32} /> COMENZAR
                </HandButton>
                <div className="flex gap-4">
                  <HandButton cursors={cursors} onClick={() => setIsCalibrating(true)} className="px-6 py-3 text-[9px]" variant="cyan" dwellMs={600}>
                    <RefreshCcw size={12} /> Recalibrar
                  </HandButton>
                  <HandButton cursors={cursors} onClick={onExit} className="px-6 py-3 text-[9px]" variant="red" dwellMs={600}>
                    <LogOut size={12} /> Salir
                  </HandButton>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'MENU' && (
          <motion.div key="menu" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="flex-1 flex flex-col items-center justify-center p-12">
            <div className="absolute top-12 left-12 flex items-center gap-6">
               <HandButton cursors={cursors} onClick={() => setView('HOME')} className="p-4" variant="red" dwellMs={600}><ArrowLeft/></HandButton>
               <img src={puceLogo} alt="PUCE Logo" className="h-10 w-auto opacity-60" />
            </div>
            
            <h2 className="text-5xl font-display font-black mb-16 italic text-gradient tracking-tighter uppercase underline decoration-purple-500/30 decoration-8 underline-offset-[16px]">Módulos de Aprendizaje</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-6xl">
              <MenuCard icon={<Palette size={48} />} title="Pizarra" color="purple" cursors={cursors} onSelect={() => { setView('GAME'); setCurrentGame('PIZARRA'); }} />
              <MenuCard icon={<Music size={48} />} title="Piano" color="cyan" cursors={cursors} onSelect={() => { setView('GAME'); setCurrentGame('PIANO'); }} />
              <MenuCard icon={<Puzzle size={48} />} title="Puzzle" color="orange" cursors={cursors} onSelect={() => { setView('GAME'); setCurrentGame('PUZZLE'); }} />
            </div>
          </motion.div>
        )}

        {view === 'GAME' && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
            {/* Game Header */}
            <div className="h-20 glass-dark border-b border-white/10 flex items-center justify-between px-12 z-[100]">
              <div className="flex items-center gap-8">
                <HandButton cursors={cursors} onClick={() => setView('MENU')} className="p-4" variant="red" dwellMs={800}><ArrowLeft size={20}/></HandButton>
                <div className="flex items-center gap-4">
                  <img src={puceLogo} alt="PUCE Logo" className="h-8 w-auto" />
                  <div className="flex flex-col">
                      <span className="text-[12px] font-black uppercase tracking-[0.4em] text-purple-400 italic">EduMotion Hub</span>
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Módulo: {currentGame}</span>
                  </div>
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
              {currentGame === 'PIZARRA' && <DrawingModule cursor={cursors[0] || {}} gestures={gestures[0] || {}} addPoints={addPoints} />}
              {currentGame === 'PIANO' && <PianoModule cursors={cursors} gestures={gestures} addPoints={addPoints} />}
              {currentGame === 'PUZZLE' && <PuzzleModule cursors={cursors} gestures={gestures} addPoints={addPoints} />}
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

const MenuCard = ({ icon, title, color, onSelect, cursors }) => (
  <div className="group relative">
    <HandButton cursors={cursors} onClick={onSelect} className="w-full aspect-square rounded-[60px] flex flex-col items-center justify-center gap-8" variant={color} dwellMs={1000}>
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
