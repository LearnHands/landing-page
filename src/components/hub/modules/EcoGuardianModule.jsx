import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Heart, Trophy, RefreshCw, Volume2, VolumeX, Sparkles } from 'lucide-react';
import HandButton from '../HandButton';

const ITEMS = [
  { symbol: '🍎', name: 'Manzana',    type: 'ORGANIC' },
  { symbol: '🍌', name: 'Plátano',    type: 'ORGANIC' },
  { symbol: '🐟', name: 'Pescado',    type: 'ORGANIC' },
  { symbol: '🍂', name: 'Hoja Seca',  type: 'ORGANIC' },
  { symbol: '🧴', name: 'Botella',    type: 'RECYCLABLE' },
  { symbol: '🥤', name: 'Lata',       type: 'RECYCLABLE' },
  { symbol: '📦', name: 'Caja Cartón',type: 'RECYCLABLE' },
  { symbol: '📰', name: 'Periódico',  type: 'RECYCLABLE' },
  { symbol: '🔋', name: 'Batería',    type: 'HAZARDOUS' },
  { symbol: '💡', name: 'Foco Roto',  type: 'HAZARDOUS' },
  { symbol: '💨', name: 'Aerosol',    type: 'HAZARDOUS' },
  { symbol: '☣️', name: 'Tóxico',    type: 'HAZARDOUS' }
];

const BINS = [
  { id: 'ORGANIC',    name: 'Orgánico',   color: '#10B981', glow: 'rgba(16, 185, 129, 0.4)',  label: '🟢 Verde' },
  { id: 'RECYCLABLE', name: 'Reciclable', color: '#3B82F6', glow: 'rgba(59, 130, 246, 0.4)',  label: '🔵 Azul' },
  { id: 'HAZARDOUS',  name: 'Peligroso',  color: '#EF4444', glow: 'rgba(239, 110, 110, 0.4)', label: '🔴 Rojo' }
];

// Returns the bin ID if (pixelX, pixelY) is inside a bin's bounding rect (+ margin).
const hitTestBins = (pixelX, pixelY, margin = 30) => {
  for (const bin of BINS) {
    const el = document.getElementById(`eco-bin-${bin.id}`);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (
      pixelX >= r.left  - margin && pixelX <= r.right  + margin &&
      pixelY >= r.top   - margin && pixelY <= r.bottom + margin
    ) return bin.id;
  }
  return null;
};

const EcoGuardianModule = memo(({ addPoints }) => {
  const [score,        setScore]        = useState(0);
  const [lives,        setLives]        = useState(3);
  const [streak,       setStreak]       = useState(0);
  const [gameState,    setGameState]    = useState('PLAYING');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [items,        setItems]        = useState([]);
  const [particles,    setParticles]    = useState([]);

  const audioCtxRef    = useRef(null);
  const frameRef       = useRef(null);
  const spawnTimerRef  = useRef(null);
  const idCounter      = useRef(0);

  const stateRef = useRef({
    score: 0, lives: 3, streak: 0,
    gameState: 'PLAYING',
    items: [],
    particles: [],
    dragging: {}   // { handIdx: itemId }
  });

  const syncStates = useCallback(() => {
    const s = stateRef.current;
    setScore(s.score);
    setLives(s.lives);
    setStreak(s.streak);
    setGameState(s.gameState);
  }, []);

  const addPointsRef    = useRef(addPoints);
  addPointsRef.current  = addPoints;
  const playSoundRef    = useRef(null);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const playSound = useCallback((type) => {
    if (!soundEnabledRef.current) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc      = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === 'sort_ok') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(); osc.stop(ctx.currentTime + 0.22);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(); osc.stop(ctx.currentTime + 0.32);
      } else if (type === 'grab') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.08);
        gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start(); osc.stop(ctx.currentTime + 0.09);
      } else if (type === 'gameover') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.6);
        gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start(); osc.stop(ctx.currentTime + 0.62);
      }
    } catch (e) {
      console.warn('Audio failed', e);
    }
  }, []);
  playSoundRef.current = playSound;

  const spawnItem = useCallback(() => {
    const s = stateRef.current;
    if (s.gameState !== 'PLAYING') return;

    const baseTemplate = ITEMS[Math.floor(Math.random() * ITEMS.length)];
    idCounter.current += 1;

    const speedScale = 0.28 + Math.min(s.score * 0.00012, 0.22);
    const newItem = {
      id:        idCounter.current,
      ...baseTemplate,
      x:         18 + Math.random() * 64,
      y:         -10,
      speed:     speedScale + Math.random() * 0.08,
      isGrabbed: false,
      grabbedBy: null,
      pulse:     1.0
    };

    s.items.push(newItem);
    setItems([...s.items]);
  }, []);

  useEffect(() => {
    spawnTimerRef.current = setInterval(() => {
      const s = stateRef.current;
      if (s.items.length < 5 && s.gameState === 'PLAYING') spawnItem();
    }, 1800);
    return () => clearInterval(spawnTimerRef.current);
  }, [spawnItem]);

  const resetGame = () => {
    const s = stateRef.current;
    s.score = 0; s.lives = 3; s.streak = 0;
    s.gameState = 'PLAYING';
    s.items = []; s.particles = []; s.dragging = {};
    setScore(0); setLives(3); setStreak(0);
    setGameState('PLAYING'); setItems([]); setParticles([]);
  };

  // Resolve a sort: removes item from list, updates score/lives, spawns particles
  const resolveSort = (s, item, binId, filteredItems, itemIdx) => {
    const bin = BINS.find(b => b.id === binId);
    if (!bin) return;

    filteredItems.splice(itemIdx, 1);
    delete s.dragging[item.grabbedBy];

    if (binId === item.type) {
      const combo = s.streak >= 5 ? 2 : 1;
      s.score  += 50 * combo;
      s.streak += 1;
      addPointsRef.current(50 * combo);
      playSoundRef.current('sort_ok');
      for (let k = 0; k < 15; k++) {
        s.particles.push({
          x: item.x, y: 80,
          vx: (Math.random() - 0.5) * 6, vy: -4 - Math.random() * 4,
          gravity: 0.15, decay: 0.03, alpha: 1.0, color: bin.color
        });
      }
    } else {
      s.lives  = Math.max(0, s.lives - 1);
      s.streak = 0;
      playSoundRef.current('error');
      for (let k = 0; k < 15; k++) {
        s.particles.push({
          x: item.x, y: 80,
          vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
          decay: 0.04, alpha: 1.0, color: '#EF4444'
        });
      }
      if (s.lives === 0) {
        s.gameState = 'GAMEOVER';
        playSoundRef.current('gameover');
      }
    }
  };

  useEffect(() => {
    const updatePhysics = () => {
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const s = stateRef.current;

      if (s.gameState !== 'PLAYING') {
        frameRef.current = requestAnimationFrame(updatePhysics);
        return;
      }

      const handData = window.latestHandData || { cursors: [], gestures: [] };
      const cursors  = handData.cursors  || [];
      const gestures = handData.gestures || [];

      const mappedCursors = cursors.map(c => ({
        x: (c.x / screenW) * 100,
        y: (c.y / screenH) * 100,
        // keep pixel coords for getBoundingClientRect comparisons
        px: c.x,
        py: c.y,
        isVisible: c.isVisible
      }));

      // Particles
      s.particles = s.particles.map(p => ({
        ...p, x: p.x + p.vx, y: p.y + p.vy,
        vy: p.vy + (p.gravity || 0), alpha: p.alpha - p.decay
      })).filter(p => p.alpha > 0);

      let changed = false;

      // Move items; auto-snap grabbed items that enter the correct bin zone
      const nextItems = s.items.map(item => {
        const itemCopy = { ...item };
        if (itemCopy.isGrabbed && itemCopy.grabbedBy !== null) {
          const cursor = mappedCursors[itemCopy.grabbedBy];
          if (cursor && cursor.isVisible) {
            itemCopy.x    = cursor.x;
            itemCopy.y    = cursor.y;
            itemCopy.pulse = 1.2;
            // Auto-snap: if the item is over a bin while being held, sort immediately
            const hoveredBin = hitTestBins(cursor.px, cursor.py, 30);
            if (hoveredBin) {
              itemCopy.pendingBin = hoveredBin; // signal to post-map resolver
            } else {
              itemCopy.pendingBin = null;
            }
          } else {
            itemCopy.isGrabbed = false;
            itemCopy.grabbedBy = null;
            itemCopy.pulse     = 1.0;
          }
          changed = true;
        } else {
          itemCopy.y    += itemCopy.speed;
          itemCopy.pulse = 1.0;
          changed = true;
        }
        return itemCopy;
      });

      // Remove items that fall off screen (lose a life)
      const filteredItems = nextItems.filter(item => {
        if (item.y > 102) {
          s.lives  = Math.max(0, s.lives - 1);
          s.streak = 0;
          playSoundRef.current('error');
          for (let k = 0; k < 10; k++) {
            s.particles.push({
              x: item.x, y: 98,
              vx: (Math.random() - 0.5) * 2, vy: -2 - Math.random() * 3,
              gravity: 0.1, decay: 0.04, alpha: 1.0, color: '#EF4444'
            });
          }
          if (s.lives === 0) {
            s.gameState = 'GAMEOVER';
            playSoundRef.current('gameover');
          }
          changed = true;
          return false;
        }
        return true;
      });

      // Resolve auto-snaps (items that were hovering over a bin while grabbed)
      for (let i = filteredItems.length - 1; i >= 0; i--) {
        const item = filteredItems[i];
        if (item.isGrabbed && item.pendingBin) {
          resolveSort(s, item, item.pendingBin, filteredItems, i);
          changed = true;
          break; // at most one snap per frame to avoid double-processing
        }
      }

      // Process grab / release gestures
      mappedCursors.forEach((cursor, handIdx) => {
        if (!cursor.isVisible) return;
        const isPinching = gestures[handIdx]?.isPinching;
        const grabbedId  = s.dragging[handIdx];

        if (isPinching) {
          if (grabbedId === undefined) {
            // Find the closest free item within grab radius (14% screen)
            let closestItem = null;
            let minDist     = 14;
            filteredItems.forEach(item => {
              if (item.isGrabbed) return;
              const d = Math.hypot(item.x - cursor.x, item.y - cursor.y);
              if (d < minDist) { minDist = d; closestItem = item; }
            });
            if (closestItem) {
              closestItem.isGrabbed = true;
              closestItem.grabbedBy = handIdx;
              s.dragging[handIdx]   = closestItem.id;
              playSoundRef.current('grab');
              changed = true;
            }
          }
        } else {
          // Pinch released — check if item is over a bin and sort it
          if (grabbedId !== undefined) {
            const itemIdx = filteredItems.findIndex(item => item.id === grabbedId);
            if (itemIdx !== -1) {
              const item    = filteredItems[itemIdx];
              const itemPxX = (item.x / 100) * screenW;
              const itemPxY = (item.y / 100) * screenH;
              const binId   = hitTestBins(itemPxX, itemPxY, 40);

              if (binId) {
                resolveSort(s, item, binId, filteredItems, itemIdx);
              } else {
                // Drop freely
                item.isGrabbed = false;
                item.grabbedBy = null;
                changed        = true;
              }
            }
            delete s.dragging[handIdx];
          }
        }
      });

      s.items = filteredItems;
      setItems([...filteredItems]);
      setParticles([...s.particles]);
      if (changed) syncStates();

      frameRef.current = requestAnimationFrame(updatePhysics);
    };

    frameRef.current = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(frameRef.current);
  }, []); // Stable loop

  return (
    <div className="w-full h-full relative overflow-hidden select-none flex flex-col items-center justify-center">

      <button
        onClick={() => setSoundEnabled(prev => !prev)}
        className="absolute top-4 right-12 z-50 p-4 glass rounded-2xl border border-white/10 text-white/40 hover:text-white transition-all hover:scale-105"
      >
        {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
      </button>

      {/* Header */}
      <div className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 text-center z-10 w-full max-w-lg px-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-dark px-8 py-4 rounded-[28px] border border-white/10 shadow-2xl flex flex-col items-center gap-2"
        >
          <div className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-1">Ciencias Naturales</div>
          <h2 className="text-3xl md:text-4xl font-display font-black uppercase italic tracking-wider text-gradient flex items-center gap-3">
            <Shield className="text-emerald-400 animate-pulse" size={24} /> Eco-Guardián
          </h2>
        </motion.div>

        <div className="flex gap-6 z-20">
          <div className="glass px-5 py-2 rounded-2xl border border-white/10 flex items-center gap-2">
            {[...Array(3)].map((_, i) => (
              <Heart
                key={i}
                size={18}
                className={i < lives ? 'text-red-500 fill-red-500 animate-pulse' : 'text-white/20'}
              />
            ))}
          </div>
          {streak >= 5 && (
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20"
            >
              <Sparkles size={12} fill="currentColor" className="animate-spin-slow" /> COMBO X2
            </motion.div>
          )}
        </div>
      </div>

      {/* Falling items */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {items.map(item => (
          <div
            key={item.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-shadow"
            style={{ left: `${item.x}%`, top: `${item.y}%`, scale: item.pulse }}
          >
            <motion.div
              animate={{ scale: item.isGrabbed ? 1.2 : 1.0, rotate: item.isGrabbed ? [0, -5, 5, 0] : 0 }}
              transition={item.isGrabbed ? { repeat: Infinity, duration: 0.5 } : {}}
              className={`w-16 h-16 rounded-[22px] border-2 flex flex-col items-center justify-center shadow-2xl transition-all duration-200 bg-black/50 ${
                item.isGrabbed
                  ? 'border-white bg-white/10 shadow-[0_0_30px_rgba(255,255,255,0.4)] ring-4 ring-white/15'
                  : 'border-white/10 text-white'
              }`}
            >
              <span className="text-3xl">{item.symbol}</span>
              <span className="text-[7px] font-black uppercase tracking-wider text-white/50 leading-none mt-1">
                {item.name}
              </span>
            </motion.div>
          </div>
        ))}
      </div>

      {/* Recycling bins — IDs used for getBoundingClientRect hit-testing */}
      <div className="absolute bottom-[20%] left-0 right-0 z-10 px-6 flex justify-around items-end">
        {BINS.map(bin => (
          <div key={bin.id} className="flex flex-col items-center gap-3 w-[26%]">
            <motion.div
              id={`eco-bin-${bin.id}`}
              whileHover={{ scale: 1.02 }}
              className="w-full h-32 rounded-[32px] border-4 border-dashed flex flex-col items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden bg-black/60"
              style={{ borderColor: bin.color, boxShadow: `0 0 25px ${bin.glow}` }}
            >
              <div
                className="absolute inset-x-0 bottom-0 h-1/2 opacity-25"
                style={{ background: `linear-gradient(to top, ${bin.color}, transparent)` }}
              />
              <span className="text-4xl filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                {bin.id === 'ORGANIC' ? '🥬' : bin.id === 'RECYCLABLE' ? '🍾' : '⚠️'}
              </span>
              <span
                className="text-xs md:text-sm font-display font-black italic uppercase tracking-wider z-10"
                style={{ color: bin.color }}
              >
                {bin.name}
              </span>
            </motion.div>
            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest italic">
              Depósito {bin.label}
            </span>
          </div>
        ))}
      </div>

      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none z-30">
        {particles.map((p, idx) => (
          <div
            key={idx}
            className="absolute w-2 h-2 rounded-full"
            style={{
              left: `${p.x}%`, top: `${p.y}%`,
              backgroundColor: p.color, opacity: p.alpha,
              transform: 'translate(-50%, -50%)',
              boxShadow: `0 0 10px ${p.color}`
            }}
          />
        ))}
      </div>

      {/* Game Over overlay */}
      <AnimatePresence>
        {gameState === 'GAMEOVER' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center"
          >
            <div className="mb-6 text-6xl animate-bounce">🌍☠️</div>
            <h2 className="text-5xl font-display font-black text-gradient uppercase italic tracking-tighter mb-2">
              Fin de Partida
            </h2>
            <p className="text-white/60 font-black uppercase tracking-[0.2em] text-xs mb-8">
              Tu puntaje final es: {score} Puntos
            </p>
            <HandButton onClick={resetGame} className="px-12 py-5 text-xs max-w-xs w-full" variant="emerald" dwellMs={800}>
              <RefreshCw size={14} className="mr-2" /> VOLVER A INTENTAR
            </HandButton>
          </motion.div>
        )}
      </AnimatePresence>

      {gameState === 'PLAYING' && (
        <div className="absolute bottom-6 flex items-center gap-6 glass px-8 py-3.5 rounded-[24px] border border-white/10 animate-pulse z-30">
          <span className="text-2xl">🤏</span>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 italic">
            Pellizca la basura y llévala al tacho correcto — ¡suéltala o acércala al borde!
          </p>
        </div>
      )}
    </div>
  );
});

export default EcoGuardianModule;
