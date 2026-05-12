import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, CheckCircle } from 'lucide-react';

const GRID_SIZE = 2; // 2x2 for kids
const TILE_COUNT = GRID_SIZE * GRID_SIZE;

const PuzzleModule = ({ cursors, gestures, addPoints }) => {
  const [imageUrl, setImageUrl] = useState(`https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80`); // Random art for kids
  const [tiles, setTiles] = useState([]);
  const [isWon, setIsWon] = useState(false);
  const [draggingStates, setDraggingStates] = useState({}); // { handIndex: tileId }

  const initializePuzzle = () => {
    const newTiles = [];
    for (let i = 0; i < TILE_COUNT; i++) {
      const row = Math.floor(i / GRID_SIZE);
      const col = i % GRID_SIZE;
      newTiles.push({
        id: i,
        correctRow: row,
        correctCol: col,
        // Start scattered at the bottom
        x: 20 + (i * 20), 
        y: 80,
        placed: false
      });
    }
    
    // Scramble initial positions
    const shuffled = newTiles.map(t => ({
        ...t,
        x: 15 + Math.random() * 70,
        y: 75 + Math.random() * 15
    }));
    
    setTiles(shuffled);
    setIsWon(false);
    setDraggingStates({});
  };

  useEffect(() => {
    initializePuzzle();
  }, [imageUrl]);

  useEffect(() => {
    if (cursors.length === 0) return;

    const newDraggingStates = { ...draggingStates };
    let piecesUpdated = false;
    const nextTiles = [...tiles];

    cursors.forEach((cursor, handIdx) => {
      const cursorPct = {
        x: (cursor.x / window.innerWidth) * 100,
        y: (cursor.y / window.innerHeight) * 100
      };

      const isPinching = gestures[handIdx]?.isPinching;
      const currentDraggedId = draggingStates[handIdx];

      if (isPinching) {
        if (currentDraggedId === undefined) {
          // Try to pick up a piece
          const target = nextTiles.find(t => !t.placed && Math.hypot(t.x - cursorPct.x, t.y - cursorPct.y) < 12);
          if (target && !Object.values(newDraggingStates).includes(target.id)) {
            newDraggingStates[handIdx] = target.id;
          }
        } else {
          // Move the piece
          const tileIdx = nextTiles.findIndex(t => t.id === currentDraggedId);
          if (tileIdx !== -1) {
            nextTiles[tileIdx] = { ...nextTiles[tileIdx], x: cursorPct.x, y: cursorPct.y };
            piecesUpdated = true;
          }
        }
      } else if (currentDraggedId !== undefined) {
        // Drop the piece
        const tileIdx = nextTiles.findIndex(t => t.id === currentDraggedId);
        if (tileIdx !== -1) {
          const tile = nextTiles[tileIdx];
          // Check if near correct slot
          const slotX = 50 - (GRID_SIZE * 10) + (tile.correctCol * 20) + 10;
          const slotY = 35 - (GRID_SIZE * 10) + (tile.correctRow * 20) + 10;
          
          if (Math.hypot(tile.x - slotX, tile.y - slotY) < 10) {
            nextTiles[tileIdx] = { ...tile, x: slotX, y: slotY, placed: true };
            addPoints(100);
          }
          piecesUpdated = true;
        }
        delete newDraggingStates[handIdx];
      }
    });

    if (piecesUpdated) setTiles(nextTiles);
    setDraggingStates(newDraggingStates);

    // Check win condition
    if (nextTiles.every(t => t.placed) && !isWon) {
      setIsWon(true);
      addPoints(500);
    }
  }, [cursors, gestures, tiles, draggingStates, isWon, addPoints]);

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col items-center">
      {/* Slots Area (Target Image) */}
      <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] aspect-square grid grid-cols-2 gap-2 p-2 glass border border-white/10 rounded-3xl opacity-20 pointer-events-none">
        {Array.from({ length: TILE_COUNT }).map((_, i) => (
          <div key={i} className="bg-white/5 border border-white/5 rounded-xl" />
        ))}
      </div>

      {/* Win Overlay */}
      <AnimatePresence>
        {isWon && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
            <CheckCircle size={120} className="text-green-400 mb-8" />
            <h2 className="text-6xl font-display font-black text-white italic mb-12 uppercase tracking-tighter">¡Puzzle Completado!</h2>
            <button onClick={initializePuzzle} className="px-12 py-6 bg-purple-600 rounded-[30px] font-black uppercase tracking-[0.4em] text-xs hover:scale-110 transition-all flex items-center gap-4">
               <RefreshCw size={18} /> Jugar de nuevo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tiles */}
      {tiles.map(t => (
        <motion.div 
          key={t.id}
          animate={{ 
            left: `${t.x}%`, 
            top: `${t.y}%`,
            scale: Object.values(draggingStates).includes(t.id) ? 1.1 : 1,
            zIndex: Object.values(draggingStates).includes(t.id) ? 50 : 20,
            boxShadow: Object.values(draggingStates).includes(t.id) ? '0 0 50px rgba(124, 58, 237, 0.5)' : '0 10px 30px rgba(0,0,0,0.5)'
          }}
          className={`absolute w-[18vw] aspect-square rounded-2xl overflow-hidden border-2 transform -translate-x-1/2 -translate-y-1/2 cursor-none ${
            t.placed ? 'border-green-500/50' : 'border-white/20'
          }`}
          style={{
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: `${GRID_SIZE * 100}% ${GRID_SIZE * 100}%`,
            backgroundPosition: `${(t.correctCol / (GRID_SIZE - 1)) * 100}% ${(t.correctRow / (GRID_SIZE - 1)) * 100}%`,
          }}
        >
          {t.placed && (
            <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center">
                <CheckCircle size={48} className="text-white/40" />
            </div>
          )}
        </motion.div>
      ))}

      {/* Instructions */}
      {!isWon && (
        <div className="absolute bottom-12 flex items-center gap-6 glass px-8 py-4 rounded-[30px] border border-white/10 animate-bounce">
            <span className="text-4xl">🤏</span>
            <span className="text-xs font-black uppercase tracking-widest text-white/60 italic">Haz pinza para ordenar la imagen</span>
        </div>
      )}
      
      <button onClick={() => setImageUrl(`https://images.unsplash.com/photo-${Date.now()}?w=800&q=80`)} className="absolute top-24 right-12 p-4 glass rounded-2xl border border-white/10 text-white/40 hover:text-white transition-all">
          <RefreshCw size={20} />
      </button>
    </div>
  );
};

export default PuzzleModule;
