import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Palette, Music, Puzzle, Play, ArrowLeft, Trash2, Trophy, LogOut, BookOpen, Circle, Square, Globe, Gamepad2, Compass, Shield, Award
} from 'lucide-react';

// Hooks
import { useMediaPipe } from './hooks/useMediaPipe';

// Components
import LayeredEngine from './components/hub/LayeredEngine';
import PianoModule from './components/hub/modules/PianoModule';
import DrawingModule from './components/hub/modules/DrawingModule';
import PuzzleModule from './components/hub/modules/PuzzleModule';
import ShapesModule from './components/hub/modules/ShapesModule';
import SolarModule from './components/hub/modules/SolarModule';
import BricksModule from './components/hub/modules/BricksModule';
import SyllablesModule from './components/hub/modules/SyllablesModule';
import EcoGuardianModule from './components/hub/modules/EcoGuardianModule';
import MathAbacusModule from './components/hub/modules/MathAbacusModule';
import HandButton from './components/hub/HandButton';

import puceLogo from './assets/puce.png';

const SCORE_KEY = 'learnhands_score';

const SystemHub = ({ onExit }) => {
  const [view, setView] = useState('HOME'); // HOME, MENU, GAME
  const [currentGame, setCurrentGame] = useState(null);
  const [score, setScore] = useState(() => parseInt(localStorage.getItem(SCORE_KEY) || '0', 10));

  const videoRef = useRef(null);
  const { isLoaded, initMediaPipe, error } = useMediaPipe();

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
    <LayeredEngine videoRef={videoRef} isLoaded={isLoaded} error={error} transparent={!(view === 'GAME' && currentGame === 'PIZARRA')}>
      <AnimatePresence mode="wait">
        {view === 'HOME' && (
          <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 flex flex-col items-center justify-center p-20">
            {/* Logo PUCE */}
            <div className="absolute top-12 left-12 flex items-center gap-6">
              <img src={puceLogo} alt="PUCE Logo" className="h-20 w-auto drop-shadow-lg" />
              <div className="h-12 w-[1px] bg-white/20" />
              <span className="text-xs font-black uppercase tracking-[0.3em] text-white/40">Sede Quito</span>
            </div>

            <div className="glass p-16 rounded-[80px] border border-white/10 flex flex-col items-center gap-12 text-center max-w-2xl w-full shadow-2xl relative bg-black/40 backdrop-blur-md">
              <div className="absolute -top-12 w-24 h-24 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center text-5xl shadow-2xl animate-bounce-slow border border-white/20">🖐️</div>
              <div className="space-y-4">
                <h2 className="text-6xl font-display font-black tracking-tighter italic uppercase text-gradient">LearnHands Hub</h2>
                <p className="text-white/40 font-black uppercase tracking-[0.4em] text-[10px] italic">Plataforma Educativa de Movimiento Natural</p>
              </div>

              <div className="flex flex-col items-center gap-6 w-full">
                <HandButton onClick={() => setView('MENU')} className="px-20 py-10 text-2xl w-full max-w-md h-32 animate-pulse" dwellMs={800}>
                  <Play fill="white" size={32} /> COMENZAR
                </HandButton>
                <div className="flex gap-4">
                  <HandButton onClick={onExit} className="px-12 py-3.5 text-[10px]" variant="red" dwellMs={600}>
                    <LogOut size={12} /> Salir
                  </HandButton>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'MENU' && (
          <motion.div key="menu" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="flex-1 flex flex-col items-center justify-center p-12">
            <div className="absolute top-12 left-12 flex items-center gap-8">
              <HandButton onClick={() => setView('HOME')} className="p-4" variant="red" dwellMs={600}><ArrowLeft /></HandButton>
              <img src={puceLogo} alt="PUCE Logo" className="h-16 w-auto drop-shadow-2xl" />
            </div>

            <h2 className="text-5xl font-display font-black mb-16 italic text-gradient tracking-tighter uppercase underline decoration-purple-500/30 decoration-8 underline-offset-[16px]">Módulos de Aprendizaje</h2>

            <div className="w-full max-w-6xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-16 justify-items-center">
                <MenuCard icon={<Palette />} title="Pizarra" color="purple" onSelect={() => { setView('GAME'); setCurrentGame('PIZARRA'); }} />
                <MenuCard icon={<Music />} title="Piano" color="cyan" onSelect={() => { setView('GAME'); setCurrentGame('PIANO'); }} />
                <MenuCard icon={<Puzzle />} title="Puzzle" color="orange" onSelect={() => { setView('GAME'); setCurrentGame('PUZZLE'); }} />
                <MenuCard icon={<div className="flex gap-1 items-end"><Circle size={40} className="text-white"/><Square size={30} className="text-white/40"/></div>} title="Colores" color="emerald" onSelect={() => { setView('GAME'); setCurrentGame('COLORES'); }} />
                <MenuCard icon={<Compass />} title="Constelación" color="cyan" onSelect={() => { setView('GAME'); setCurrentGame('SOLAR'); }} />
                <MenuCard icon={<Gamepad2 />} title="Balls Crush" color="orange" onSelect={() => { setView('GAME'); setCurrentGame('BRICKS'); }} />
                <MenuCard icon={<BookOpen />} title="Sílabas" color="purple" onSelect={() => { setView('GAME'); setCurrentGame('SILABAS'); }} />
                <MenuCard icon={<Shield />} title="Eco-Clasificador" color="emerald" onSelect={() => { setView('GAME'); setCurrentGame('ECO'); }} />
                <MenuCard icon={<Award />} title="Ábaco" color="orange" onSelect={() => { setView('GAME'); setCurrentGame('ABACUS'); }} />
              </div>
            </div>
          </motion.div>
        )}

        {view === 'GAME' && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
            {/* Game Content — fills all space above the footer bar */}
            <div className="flex-1 relative">
              {currentGame === 'PIZARRA' && <DrawingModule addPoints={addPoints} />}
              {currentGame === 'PIANO' && <PianoModule addPoints={addPoints} videoRef={videoRef} />}
              {currentGame === 'PUZZLE' && <PuzzleModule addPoints={addPoints} />}
              {currentGame === 'COLORES' && <ShapesModule addPoints={addPoints} />}
              {currentGame === 'SOLAR' && <SolarModule addPoints={addPoints} />}
              {currentGame === 'BRICKS' && <BricksModule addPoints={addPoints} />}
              {currentGame === 'SILABAS' && <SyllablesModule addPoints={addPoints} />}
              {currentGame === 'ECO' && <EcoGuardianModule addPoints={addPoints} />}
              {currentGame === 'ABACUS' && <MathAbacusModule addPoints={addPoints} />}
            </div>

            {/* Game Footer Bar (moved from top to bottom) */}
            <div className="h-16 glass-dark border-t border-white/10 flex items-center justify-between px-8 z-[100] bg-black/50 backdrop-blur-md">
              <div className="flex items-center gap-6">
                <HandButton onClick={() => setView('MENU')} className="p-3" variant="red" dwellMs={800}><ArrowLeft size={18} /></HandButton>
                <div className="flex items-center gap-3">
                  <img src={puceLogo} alt="PUCE Logo" className="h-9 w-auto" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 italic">LearnHands Hub</span>
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Módulo: {currentGame}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-5 items-center">
                <div className="glass px-4 py-2 rounded-xl flex items-center gap-3 border border-white/10 bg-black/20">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/50">IA Activa</span>
                </div>
                <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-4 py-2 rounded-xl border border-amber-500/30">
                  <Trophy size={14} className="text-amber-400" />
                  <span className="text-lg font-display font-black text-amber-400 italic">{score}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Score Widget — only on HOME/MENU; GAME has its own footer bar */}
      <div className={`fixed bottom-8 right-8 z-50 pointer-events-none transition-opacity ${view === 'GAME' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="glass p-6 rounded-[32px] border border-white/10 shadow-2xl flex items-center gap-6 bg-black/40 backdrop-blur-md">
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

const MenuCard = ({ icon, title, color, onSelect }) => (
  <div className="group relative w-52 md:w-56">
    <div className={`absolute -inset-1.5 bg-gradient-to-br opacity-20 group-hover:opacity-100 blur-md rounded-[38px] transition-all duration-500 pointer-events-none ${
      color === 'purple' ? 'from-purple-500 to-indigo-500 shadow-[0_0_20px_rgba(139,92,246,0.3)]' :
      color === 'cyan' ? 'from-cyan-400 to-teal-500 shadow-[0_0_20px_rgba(34,211,238,0.3)]' :
      color === 'orange' ? 'from-orange-500 to-amber-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]' :
      color === 'emerald' ? 'from-emerald-500 to-teal-600 shadow-[0_0_20px_rgba(16,185,129,0.3)]' :
      'from-purple-500 to-indigo-500 shadow-[0_0_20px_rgba(139,92,246,0.3)]'
    }`} />
    
    <HandButton 
      onClick={onSelect} 
      className="w-full aspect-[4/3] rounded-[36px] flex flex-col items-center justify-center gap-4 border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl"
      variant={color} 
      dwellMs={900}
    >
      <div className="p-4 bg-white/10 rounded-2xl group-hover:scale-110 transition-transform duration-500 ring-1 ring-white/15">
        {React.cloneElement(icon, { size: 36 })}
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="font-display text-xl md:text-2xl font-black italic tracking-tight uppercase text-white drop-shadow-md">{title}</span>
        <div className="w-10 h-1 bg-white/30 rounded-full group-hover:w-16 transition-all duration-500" />
      </div>
    </HandButton>
  </div>
);

export default SystemHub;
