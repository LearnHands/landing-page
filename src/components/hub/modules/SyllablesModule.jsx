import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Trophy, BookOpen, Volume2, VolumeX } from 'lucide-react';

const WORDS = [
  { word: 'GATO', syllables: ['GA', 'TO'] },
  { word: 'PERRO', syllables: ['PE', 'RRO'] },
  { word: 'MANO', syllables: ['MA', 'NO'] },
  { word: 'LUNA', syllables: ['LU', 'NA'] },
  { word: 'CASA', syllables: ['CA', 'SA'] },
  { word: 'PATO', syllables: ['PA', 'TO'] },
  { word: 'LÁPIZ', syllables: ['LÁ', 'PIZ'] },
  { word: 'ESTRELLA', syllables: ['ES', 'TRE', 'LLA'] },
  { word: 'PLANETA', syllables: ['PLA', 'NE', 'TA'] },
  { word: 'PLÁTANO', syllables: ['PLÁ', 'TA', 'NO'] },
  { word: 'MANZANA', syllables: ['MAN', 'ZA', 'NA'] },
  { word: 'REGALO', syllables: ['RE', 'GA', 'LO'] }
];

const DISTRACTORS = [
  'MA', 'PA', 'LU', 'CA', 'PE', 'TA', 'BA', 'ZO',
  'LI', 'CO', 'RU', 'SA', 'TE', 'BO', 'FI', 'NO',
  'MI', 'DE', 'SU', 'JA', 'ME', 'NE', 'TI', 'PO'
];

const SyllablesModule = memo(({ addPoints }) => {
  const [wordIndex, setWordIndex] = useState(() => Math.floor(Math.random() * WORDS.length));
  const currentWord = WORDS[wordIndex];
  
  const [slots, setSlots] = useState(() => Array(currentWord.syllables.length).fill(null));
  const [bubbles, setBubbles] = useState([]);
  const [streak, setStreak] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [particles, setParticles] = useState([]);
  const [isWordWon, setIsWordWon] = useState(false);

  const audioCtxRef = useRef(null);
  const bubblesRef = useRef([]);
  const slotsRef = useRef([]);
  const draggingRef = useRef({}); // { handIdx: bubbleId }
  const spawnTimerRef = useRef(null);
  const frameRef = useRef(null);
  const bubbleIdCounter = useRef(0);

  // Sync refs to use inside requestAnimationFrame without re-binding loop
  useEffect(() => {
    bubblesRef.current = bubbles;
  }, [bubbles]);

  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  // Synthesize sound effects using Web Audio API
  const playSound = useCallback((type) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === 'snap') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.12);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'win') {
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = freq;
          o.connect(g);
          g.connect(ctx.destination);
          g.gain.setValueAtTime(0, now + i * 0.08);
          g.gain.linearRampToValueAtTime(0.25, now + i * 0.08 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.3);
          o.start(now + i * 0.08);
          o.stop(now + i * 0.08 + 0.35);
        });
      } else if (type === 'error') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(130, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn("Sound synthesis failed", e);
    }
  }, [soundEnabled]);

  // Create star explosion particles
  const spawnWinParticles = useCallback(() => {
    const newParticles = [];
    const colors = ['#A78BFA', '#06B6D4', '#EC4899', '#10B981', '#F59E0B'];
    for (let i = 0; i < 40; i++) {
      newParticles.push({
        id: Math.random(),
        x: 50 + (Math.random() - 0.5) * 40,
        y: 80 + (Math.random() - 0.5) * 15,
        vx: (Math.random() - 0.5) * 12,
        vy: -5 - Math.random() * 12,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 10 + Math.random() * 20,
        rotation: Math.random() * 360,
        spin: (Math.random() - 0.5) * 15
      });
    }
    setParticles(newParticles);
  }, []);

  // Set up Word Level
  const initWord = useCallback((idx) => {
    const nextIdx = idx !== undefined ? idx : Math.floor(Math.random() * WORDS.length);
    setWordIndex(nextIdx);
    setSlots(Array(WORDS[nextIdx].syllables.length).fill(null));
    setBubbles([]);
    draggingRef.current = {};
    setIsWordWon(false);
    setParticles([]);
  }, []);

  // Spawn bubbles logic
  const spawnBubble = useCallback(() => {
    if (isWordWon) return;

    const currentSyllables = WORDS[wordIndex].syllables;
    const missingSyllables = currentSyllables.filter((s, idx) => slotsRef.current[idx] === null);

    if (missingSyllables.length === 0) return;

    const isTarget = Math.random() < 0.65;
    let syllableText = '';

    if (isTarget && missingSyllables.length > 0) {
      syllableText = missingSyllables[Math.floor(Math.random() * missingSyllables.length)];
    } else {
      syllableText = DISTRACTORS[Math.floor(Math.random() * DISTRACTORS.length)];
    }

    bubbleIdCounter.current += 1;
    const newBubble = {
      id: bubbleIdCounter.current,
      text: syllableText,
      x: 15 + Math.random() * 70,
      y: -10,
      speed: 0.35 + Math.random() * 0.2,
      radius: 6,
      isGrabbed: false,
      grabbedBy: null,
      pulse: 1.0
    };

    setBubbles(prev => [...prev, newBubble]);
  }, [wordIndex, isWordWon]);

  // Periodic Spawning Loop
  useEffect(() => {
    spawnTimerRef.current = setInterval(() => {
      if (bubblesRef.current.length < 8 && !isWordWon) {
        spawnBubble();
      }
    }, 2200);

    return () => clearInterval(spawnTimerRef.current);
  }, [spawnBubble, isWordWon]);

  // Main game update loop (physics and collision detection)
  useEffect(() => {
    const updatePhysics = () => {
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      // Update particles positions
      setParticles(prevParticles => {
        if (prevParticles.length === 0) return prevParticles;
        return prevParticles
          .map(p => ({
            ...p,
            x: p.x + (p.vx / screenW) * 100,
            y: p.y + (p.vy / screenH) * 100,
            vy: p.vy + 0.3, // Gravity
            rotation: p.rotation + p.spin
          }))
          .filter(p => p.y < 105 && p.x > -5 && p.x < 105);
      });

      // LEER DATOS DE MANO DIRECTAMENTE DE WINDOW GLOBAL
      const handData = window.latestHandData || { cursors: [], gestures: [] };
      const cursors = handData.cursors || [];
      const gestures = handData.gestures || [];

      // Map cursor coordinates into percentage space
      const mappedCursors = cursors.map(c => ({
        x: (c.x / screenW) * 100,
        y: (c.y / screenH) * 100,
        isVisible: c.isVisible
      }));

      // Update falling bubbles
      setBubbles(prevBubbles => {
        let bubblesChanged = false;
        const nextBubbles = prevBubbles.map(b => {
          let bCopy = { ...b };
          
          if (bCopy.isGrabbed && bCopy.grabbedBy !== null) {
            const cursor = mappedCursors[bCopy.grabbedBy];
            if (cursor && cursor.isVisible) {
              bCopy.x = cursor.x;
              bCopy.y = cursor.y;
              bCopy.pulse = 1.15;

              // Check collision with correct slot while dragging
              const N = currentWord.syllables.length;
              for (let i = 0; i < N; i++) {
                if (slotsRef.current[i] !== null) continue;

                const slotEl = document.getElementById(`syllable-slot-${i}`);
                if (slotEl) {
                  const rect = slotEl.getBoundingClientRect();
                  const slotPixelX = rect.left + rect.width / 2;
                  const slotPixelY = rect.top + rect.height / 2;

                  const bubblePixelX = (bCopy.x / 100) * screenW;
                  const bubblePixelY = (bCopy.y / 100) * screenH;

                  const distToSlot = Math.hypot(bubblePixelX - slotPixelX, bubblePixelY - slotPixelY);

                  if (distToSlot < 80) {
                    if (currentWord.syllables[i] === bCopy.text) {
                      setSlots(prev => {
                        const copy = [...prev];
                        copy[i] = bCopy.text;
                        return copy;
                      });
                      playSound('snap');
                      addPoints(50);
                      
                      delete draggingRef.current[bCopy.grabbedBy];
                      bCopy.shouldRemove = true;
                      break;
                    }
                  }
                }
              }
            } else {
              bCopy.isGrabbed = false;
              bCopy.grabbedBy = null;
              bCopy.pulse = 1.0;
            }
            bubblesChanged = true;
          } else {
            bCopy.y += bCopy.speed;
            bCopy.pulse = 1.0;
            bubblesChanged = true;
          }
          return bCopy;
        }).filter(b => b.y < 108 && !b.shouldRemove);

        // Check for grabs
        mappedCursors.forEach((cursor, handIdx) => {
          if (!cursor.isVisible) return;
          const isPinching = gestures[handIdx]?.isPinching;
          const grabbedBubbleId = draggingRef.current[handIdx];

          if (isPinching) {
            if (grabbedBubbleId === undefined) {
              let closestBubble = null;
              let minDist = 9;

              nextBubbles.forEach(b => {
                if (b.isGrabbed) return;
                const d = Math.hypot(b.x - cursor.x, b.y - cursor.y);
                if (d < minDist) {
                  minDist = d;
                  closestBubble = b;
                }
              });

              if (closestBubble) {
                closestBubble.isGrabbed = true;
                closestBubble.grabbedBy = handIdx;
                draggingRef.current[handIdx] = closestBubble.id;
                bubblesChanged = true;
              }
            }
          } else {
            if (grabbedBubbleId !== undefined) {
              const bIdx = nextBubbles.findIndex(b => b.id === grabbedBubbleId);
              if (bIdx !== -1) {
                const bubble = nextBubbles[bIdx];
                const N = currentWord.syllables.length;
                let snapped = false;

                for (let i = 0; i < N; i++) {
                  if (slotsRef.current[i] !== null) continue;

                  const slotEl = document.getElementById(`syllable-slot-${i}`);
                  if (slotEl) {
                    const rect = slotEl.getBoundingClientRect();
                    const slotPixelX = rect.left + rect.width / 2;
                    const slotPixelY = rect.top + rect.height / 2;

                    const bubblePixelX = (bubble.x / 100) * screenW;
                    const bubblePixelY = (bubble.y / 100) * screenH;

                    const distToSlot = Math.hypot(bubblePixelX - slotPixelX, bubblePixelY - slotPixelY);

                    if (distToSlot < 80) {
                      if (currentWord.syllables[i] === bubble.text) {
                        setSlots(prev => {
                          const copy = [...prev];
                          copy[i] = bubble.text;
                          return copy;
                        });
                        playSound('snap');
                        addPoints(50);
                        
                        nextBubbles.splice(bIdx, 1);
                        snapped = true;
                        bubblesChanged = true;
                        break;
                      } else {
                        playSound('error');
                      }
                    }
                  } else {
                    // Fallback
                    const slotX = 50 + (i - (N - 1) / 2) * 15;
                    const slotY = 78;
                    const distToSlot = Math.hypot(bubble.x - slotX, bubble.y - slotY);

                    if (distToSlot < 8.5) {
                      if (currentWord.syllables[i] === bubble.text) {
                        setSlots(prev => {
                          const copy = [...prev];
                          copy[i] = bubble.text;
                          return copy;
                        });
                        playSound('snap');
                        addPoints(50);
                        
                        nextBubbles.splice(bIdx, 1);
                        snapped = true;
                        bubblesChanged = true;
                        break;
                      } else {
                        playSound('error');
                      }
                    }
                  }
                }

                if (!snapped) {
                  bubble.isGrabbed = false;
                  bubble.grabbedBy = null;
                  bubblesChanged = true;
                }
              }
              delete draggingRef.current[handIdx];
            }
          }
        });

        return bubblesChanged ? nextBubbles : prevBubbles;
      });

      frameRef.current = requestAnimationFrame(updatePhysics);
    };

    frameRef.current = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(frameRef.current);
  }, [currentWord, addPoints, playSound]);

  // Check for Word Win completion
  useEffect(() => {
    if (slots.length > 0 && slots.every(s => s !== null) && !isWordWon) {
      setIsWordWon(true);
      playSound('win');
      spawnWinParticles();
      addPoints(150);
      setStreak(prev => prev + 1);

      const timer = setTimeout(() => {
        initWord();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [slots, isWordWon, playSound, spawnWinParticles, addPoints, initWord]);

  return (
    <div className="w-full h-full relative overflow-hidden select-none flex flex-col items-center">
      
      {/* Sound Toggle (Top Right) */}
      <button 
        onClick={() => setSoundEnabled(prev => !prev)}
        className="absolute top-4 right-12 z-50 p-4 glass rounded-2xl border border-white/10 text-white/40 hover:text-white transition-all hover:scale-105"
      >
        {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
      </button>

      {/* Target Word Display Panel */}
      <div className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 text-center z-10 w-full max-w-lg px-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-dark px-10 py-5 rounded-[32px] border border-white/10 shadow-2xl flex flex-col items-center gap-2"
        >
          <div className="text-[10px] font-black text-purple-400 uppercase tracking-[0.4em] mb-1">Forma la Palabra</div>
          <h2 className="text-4xl md:text-5xl font-display font-black uppercase italic tracking-wider text-gradient">
            {currentWord.word}
          </h2>
        </motion.div>

        {streak > 1 && (
          <motion.div 
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="flex items-center gap-2 text-amber-400 text-[10px] font-black uppercase tracking-widest bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20"
          >
            <Star size={12} fill="currentColor" /> Racha x{streak}
          </motion.div>
        )}
      </div>

      {/* Falling Bubbles Container */}
      <div className="absolute inset-0 pointer-events-none z-20">
        {bubbles.map(b => (
          <div
            key={b.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-shadow"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              scale: b.pulse
            }}
          >
            <motion.div
              animate={{
                scale: b.isGrabbed ? 1.15 : 1,
                rotate: b.isGrabbed ? [0, -5, 5, 0] : 0
              }}
              transition={b.isGrabbed ? { repeat: Infinity, duration: 0.5 } : {}}
              className={`w-20 h-20 rounded-full border-2 flex items-center justify-center font-display text-2xl font-black italic shadow-2xl transition-all duration-300 ${
                b.isGrabbed 
                  ? 'bg-white/80 border-white text-purple-600 shadow-[0_0_40px_white] ring-4 ring-white/20' 
                  : 'bg-gradient-to-tr from-purple-500/30 to-indigo-500/20 border-purple-500/40 text-white shadow-purple-500/20 backdrop-blur-md'
              }`}
            >
              {b.text}
            </motion.div>
          </div>
        ))}
      </div>

      {/* Syllable Slots */}
      <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 z-10 flex gap-6">
        {currentWord.syllables.map((syl, i) => {
          return (
            <div 
              key={i} 
              className="flex flex-col items-center gap-3"
            >
              <motion.div
                id={`syllable-slot-${i}`}
                animate={{
                  borderColor: slots[i] ? '#22C55E' : '#A78BFA',
                  boxShadow: slots[i] ? '0 0 30px rgba(34, 197, 94, 0.4)' : '0 0 15px rgba(167, 139, 250, 0.1)',
                  scale: slots[i] ? 1.05 : 1
                }}
                className={`w-24 h-24 rounded-[30px] border-4 border-dashed flex items-center justify-center font-display text-3xl font-black italic transition-all duration-300 ${
                  slots[i] 
                    ? 'bg-green-500/10 border-solid text-green-400' 
                    : 'bg-black/40 text-white/10'
                }`}
              >
                {slots[i] || '?'}
              </motion.div>
              <span className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">
                Sílaba {i + 1}
              </span>
            </div>
          );
        })}
      </div>

      {/* Win Completion Overlay */}
      <AnimatePresence>
        {isWordWon && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
              className="mb-6"
            >
              <Trophy size={110} className="text-amber-400 drop-shadow-[0_0_30px_rgba(245,158,11,0.5)]" />
            </motion.div>
            <h2 className="text-5xl font-display font-black text-gradient uppercase italic tracking-tighter mb-2">
              ¡Genial!
            </h2>
            <p className="text-white/60 font-black uppercase tracking-[0.3em] text-xs">
              Palabra completada correctamente
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Star Particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 font-black"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: `${p.size}px`,
            color: p.color,
            transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`,
            textShadow: `0 0 10px ${p.color}`
          }}
        >
          ★
        </div>
      ))}

      {/* Footer Instructions Bar */}
      {!isWordWon && (
        <div className="absolute bottom-6 flex items-center gap-6 glass px-8 py-3.5 rounded-[24px] border border-white/10 animate-pulse z-30">
          <span className="text-2xl">🤏</span>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 italic">
            Usa pinza en el aire para atrapar una sílaba y arrástrala a su lugar
          </p>
        </div>
      )}
    </div>
  );
});

export default SyllablesModule;
