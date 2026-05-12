import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const INITIAL_PIECES = [
  { id: 1, x: 20, y: 75, color: '#7C3AED', emoji: '🌟', slotId: 1, placed: false },
  { id: 2, x: 50, y: 75, color: '#06B6D4', emoji: '🎨', slotId: 2, placed: false },
  { id: 3, x: 80, y: 75, color: '#EC4899', emoji: '🎮', slotId: 3, placed: false },
];

const SLOTS = [
  { id: 1, x: 25, y: 35 },
  { id: 2, x: 50, y: 35 },
  { id: 3, x: 75, y: 35 }
];

const PuzzleModule = ({ cursor, gestures, addPoints }) => {
  const [pieces, setPieces] = useState(INITIAL_PIECES);
  const [draggedId, setDraggedId] = useState(null);

  useEffect(() => {
    if (!cursor.isVisible) return;

    const cursorPct = {
      x: (cursor.x / window.innerWidth) * 100,
      y: (cursor.y / window.innerHeight) * 100
    };

    if (gestures.isPinching) {
      if (!draggedId) {
        // Find piece near cursor
        const target = pieces.find(p => !p.placed && Math.hypot(p.x - cursorPct.x, p.y - cursorPct.y) < 10);
        if (target) setDraggedId(target.id);
      } else {
        // Move dragged piece
        setPieces(prev => prev.map(p => 
          p.id === draggedId ? { ...p, x: cursorPct.x, y: cursorPct.y } : p
        ));
      }
    } else if (draggedId) {
      // Release piece
      const p = pieces.find(x => x.id === draggedId);
      const s = SLOTS.find(x => x.id === p.slotId);
      
      if (s && Math.hypot(p.x - s.x, p.y - s.y) < 10) {
        // Successful placement
        setPieces(prev => prev.map(x => 
          x.id === draggedId ? { ...x, x: s.x, y: s.y, placed: true } : x
        ));
        addPoints(50);
      } else {
        // Reset position if not placed
        const original = INITIAL_PIECES.find(x => x.id === draggedId);
        setPieces(prev => prev.map(x => 
          x.id === draggedId ? { ...x, x: original.x, y: original.y } : x
        ));
      }
      setDraggedId(null);
    }
  }, [cursor, gestures, pieces, draggedId, addPoints]);

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Target Slots */}
      <div className="absolute top-0 inset-x-0 h-1/2 flex justify-center items-center pointer-events-none">
        <div className="flex gap-24">
          {SLOTS.map(s => (
            <div 
              key={s.id} 
              className={`w-48 h-48 rounded-[60px] border-4 border-dashed transition-all duration-500 flex flex-col items-center justify-center gap-2 ${
                pieces.find(p => p.slotId === s.id && p.placed)
                ? 'border-green-500/50 bg-green-500/5 scale-95'
                : 'border-white/5 bg-white/2'
              }`}
            >
              <div className="text-8xl font-display font-black text-white/5 italic">{s.id}</div>
              <div className="text-[10px] font-black text-white/10 uppercase tracking-widest">Colocar aquí</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pieces */}
      {pieces.map(p => (
        <motion.div 
          key={p.id}
          animate={{ 
            left: `${p.x}%`, 
            top: `${p.y}%`,
            scale: draggedId === p.id ? 1.2 : 1,
            rotate: draggedId === p.id ? 5 : 0,
            opacity: p.placed ? 0.6 : 1,
            filter: p.placed ? 'grayscale(0.5)' : 'none'
          }}
          className={`absolute w-44 h-44 rounded-[60px] border-4 border-white/20 flex flex-col items-center justify-center gap-3 shadow-2xl z-20 transform -translate-x-1/2 -translate-y-1/2 transition-shadow ${
            draggedId === p.id ? 'z-50 shadow-white/30' : ''
          }`}
          style={{ backgroundColor: p.color }}
        >
          <div className="text-8xl drop-shadow-xl">{p.emoji}</div>
          {p.placed && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-[60px] border-4 border-green-500 animate-pulse">
                <span className="text-white font-black text-4xl">✓</span>
            </div>
          )}
        </motion.div>
      ))}

      {/* Tutorial Tooltip */}
      {!draggedId && pieces.some(p => !p.placed) && (
        <div className="absolute bottom-12 w-full flex justify-center">
            <div className="glass px-8 py-4 rounded-2xl border border-white/10 flex items-center gap-4 animate-bounce">
                <span className="text-2xl">🤏</span>
                <span className="text-xs font-black uppercase tracking-widest text-white/60">Haz pinza para arrastrar las piezas</span>
            </div>
        </div>
      )}
    </div>
  );
};

export default PuzzleModule;
