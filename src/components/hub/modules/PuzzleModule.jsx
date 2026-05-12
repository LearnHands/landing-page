import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, CheckCircle } from 'lucide-react';

const GRID_SIZE = 2; // 2x2 for kids
const TILE_COUNT = GRID_SIZE * GRID_SIZE;

const PuzzleModule = ({ cursors, gestures, addPoints }) => {
  const [imageUrl, setImageUrl] = useState(`https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80`); 
  const [tiles, setTiles] = useState([]);
  const [isWon, setIsWon] = useState(false);
  const [draggingStates, setDraggingStates] = useState({});

  const initializePuzzle = useCallback(() => {
    const newTiles = [];
    for (let i = 0; i < TILE_COUNT; i++) {
      const row = Math.floor(i / GRID_SIZE);
      const col = i % GRID_SIZE;
      
      newTiles.push({
        id: i,
        correctRow: row,
        correctCol: col,
        // Start scattered at the very bottom
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

  useEffect(() => {
    if (cursors.length === 0 || tiles.length === 0) return;

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
          
          // Slot positions (Centered at 50,40)
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

    if (piecesUpdated) setTiles(nextTiles);
    setDraggingStates(newDraggingStates);

    if (nextTiles.length > 0 && nextTiles.every(t => t.placed) && !isWon) {
      setIsWon(true);
      addPoints(500);
    }
  }, [cursors, gestures, tiles, draggingStates, isWon, addPoints]);

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
            <button onClick={initializePuzzle} className="px-12 py-6 bg-purple-600 rounded-[30px] font-black uppercase tracking-[0.4em] text-xs hover:scale-110 transition-all flex items-center gap-4">
               <RefreshCw size={18} /> Otro Puzzle
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
            zIndex: Object.values(draggingStates).includes(t.id) ? 50 : 20
          }}
          className={`absolute w-[15vw] aspect-square rounded-2xl overflow-hidden border-2 transform -translate-x-1/2 -translate-y-1/2 cursor-none shadow-2xl ${
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
};

export default PuzzleModule;
