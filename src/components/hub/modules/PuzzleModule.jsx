import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, CheckCircle } from 'lucide-react';
import HandButton from '../HandButton';

const GRID_SIZE = 2; // 2x2 for kids
const TILE_COUNT = GRID_SIZE * GRID_SIZE;

const PuzzleModule = memo(({ addPoints }) => {
  const [imageUrl, setImageUrl] = useState(`https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80`); 
  const [tiles, setTiles] = useState([]);
  const [isWon, setIsWon] = useState(false);
  const [draggingStates, setDraggingStates] = useState({});

  const tilesRef = useRef([]);
  const draggingStatesRef = useRef({});
  const isWonRef = useRef(false);

  useEffect(() => {
    tilesRef.current = tiles;
  }, [tiles]);

  useEffect(() => {
    draggingStatesRef.current = draggingStates;
  }, [draggingStates]);

  useEffect(() => {
    isWonRef.current = isWon;
  }, [isWon]);

  const initializePuzzle = useCallback(() => {
    const newTiles = [];
    for (let i = 0; i < TILE_COUNT; i++) {
      const row = Math.floor(i / GRID_SIZE);
      const col = i % GRID_SIZE;
      
      newTiles.push({
        id: i,
        correctRow: row,
        correctCol: col,
        x: 10 + Math.random() * 80, 
        y: 80 + Math.random() * 10,
        placed: false
      });
    }
    
    setTiles(newTiles);
    setIsWon(false);
    setDraggingStates({});
  }, []);

  useEffect(() => {
    initializePuzzle();
  }, [imageUrl, initializePuzzle]);

  // Ciclo de físicas y arrastre (Optimizando de re-renders de React)
  useEffect(() => {
    let animId;

    const updateLoop = () => {
      const handData = window.latestHandData || { cursors: [], gestures: [] };
      const cursors = handData.cursors || [];
      const gestures = handData.gestures || [];

      if (cursors.length > 0 && tilesRef.current.length > 0 && !isWonRef.current) {
        let piecesUpdated = false;
        const newDraggingStates = { ...draggingStatesRef.current };
        const nextTiles = [...tilesRef.current];

        cursors.forEach((cursor, handIdx) => {
          if (!cursor || !cursor.isVisible) return;
          const cursorPct = {
            x: (cursor.x / window.innerWidth) * 100,
            y: (cursor.y / window.innerHeight) * 100
          };

          const isPinching = gestures[handIdx]?.isPinching;
          const currentDraggedId = newDraggingStates[handIdx];

          if (isPinching) {
            if (currentDraggedId === undefined) {
              const target = nextTiles.find(t => !t.placed && Math.hypot(t.x - cursorPct.x, t.y - cursorPct.y) < 12);
              if (target && !Object.values(newDraggingStates).includes(target.id)) {
                newDraggingStates[handIdx] = target.id;
              }
            } else {
              const tileIdx = nextTiles.findIndex(t => t.id === currentDraggedId);
              if (tileIdx !== -1) {
                nextTiles[tileIdx] = { ...nextTiles[tileIdx], x: cursorPct.x, y: cursorPct.y };
                piecesUpdated = true;
              }
            }
          } else if (currentDraggedId !== undefined) {
            const tileIdx = nextTiles.findIndex(t => t.id === currentDraggedId);
            if (tileIdx !== -1) {
              const tile = nextTiles[tileIdx];
              
              const targetW = 32;
              const targetH = 32;
              const startX = 50 - (targetW / 2);
              const startY = 40 - (targetH / 2);
              
              const slotX = startX + (tile.correctCol * (targetW / GRID_SIZE)) + (targetW / (GRID_SIZE * 2));
              const slotY = startY + (tile.correctRow * (targetH / GRID_SIZE)) + (targetH / (GRID_SIZE * 2));
              
              if (Math.hypot(tile.x - slotX, tile.y - slotY) < 6) {
                nextTiles[tileIdx] = { ...tile, x: slotX, y: slotY, placed: true };
                addPoints(100);
              }
              piecesUpdated = true;
            }
            delete newDraggingStates[handIdx];
          }
        });

        if (piecesUpdated) {
          setTiles(nextTiles);
        }

        const statesChanged = 
          Object.keys(newDraggingStates).length !== Object.keys(draggingStatesRef.current).length ||
          Object.keys(newDraggingStates).some(k => newDraggingStates[k] !== draggingStatesRef.current[k]);
          
        if (statesChanged) {
          setDraggingStates(newDraggingStates);
        }

        if (nextTiles.length > 0 && nextTiles.every(t => t.placed)) {
          setIsWon(true);
          addPoints(500);
        }
      }

      animId = requestAnimationFrame(updateLoop);
    };

    animId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animId);
  }, [addPoints]);

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col items-center">
      {/* Target Grid area (Guiding Box) */}
      <div 
        className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32vw] aspect-square grid grid-cols-2 gap-2 p-2 glass border border-white/10 rounded-3xl opacity-20 pointer-events-none"
      >
        {Array.from({ length: TILE_COUNT }).map((_, i) => (
          <div key={i} className="bg-white/5 border border-white/5 rounded-xl" />
        ))}
      </div>

      <AnimatePresence>
        {isWon && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
            <CheckCircle size={100} className="text-green-400 mb-8" />
            <h2 className="text-5xl font-display font-black text-white italic mb-12 uppercase tracking-tighter">¡Lo lograste!</h2>
            <HandButton onClick={initializePuzzle} className="px-12 py-6 text-sm" variant="purple" dwellMs={800}>
               <RefreshCw size={18} /> Otro Puzzle
            </HandButton>
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
            zIndex: Object.values(draggingStates).includes(t.id) ? 50 : 20
          }}
          className={`absolute w-[15vw] aspect-square rounded-2xl overflow-hidden border-2 transform -translate-x-1/2 -translate-y-1/2 cursor-none shadow-2xl transition-all duration-100 ${
            t.placed ? 'border-green-500 shadow-green-500/20' : 'border-white/20 shadow-black'
          }`}
          style={{
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: `${GRID_SIZE * 100}% ${GRID_SIZE * 100}%`,
            backgroundPosition: `${(t.correctCol / (GRID_SIZE - 1)) * 100}% ${(t.correctRow / (GRID_SIZE - 1)) * 100}%`,
          }}
        >
          {t.placed && (
            <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center">
                <CheckCircle size={40} className="text-white/60" />
            </div>
          )}
        </motion.div>
      ))}

      {!isWon && (
        <div className="absolute bottom-12 flex items-center gap-6 glass px-8 py-4 rounded-[30px] border border-white/10 animate-bounce">
            <span className="text-3xl">🤏</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/60 italic">Usa pinza para mover las piezas</span>
        </div>
      )}
      
      <button onClick={() => setImageUrl(`https://images.unsplash.com/photo-${Date.now()}?w=800&q=80`)} className="absolute top-24 right-12 p-4 glass rounded-2xl border border-white/10 text-white/40 hover:text-white transition-all">
          <RefreshCw size={20} />
      </button>
    </div>
  );
});

export default PuzzleModule;
