import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, RefreshCw, Volume2, VolumeX, Sparkles } from 'lucide-react';
import HandButton from '../HandButton';

const TARGET_SUMS = [5, 10, 15, 20];

const MathAbacusModule = memo(({ addPoints }) => {
  const [level, setLevel] = useState(1); // 1 to 4 (Targets: 5, 10, 15, 20)
  const [targetSum, setTargetSum] = useState(5);
  const [currentSum, setCurrentSum] = useState(0);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [streak, setStreak] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bubbles, setBubbles] = useState([]);
  const [particles, setParticles] = useState([]);

  const audioCtxRef = useRef(null);
  const frameRef = useRef(null);
  const spawnTimerRef = useRef(null);
  const idCounter = useRef(0);

  // Estado mutable en Ref para correr a 60 FPS
  const stateRef = useRef({
    level: 1,
    targetSum: 5,
    selectedItems: [], // array de bubble objects seleccionados
    bubbles: [],
    particles: [],
    streak: 0,
    wasPinching: [false, false]
  });

  // Sincronizar estados visuales con React
  const syncReactStates = useCallback(() => {
    const s = stateRef.current;
    if (s.level !== level) setLevel(s.level);
    if (s.targetSum !== targetSum) setTargetSum(s.targetSum);
    if (s.streak !== streak) setStreak(s.streak);

    const sum = s.selectedItems.reduce((acc, curr) => acc + curr.value, 0);
    setCurrentSum(sum);
    setSelectedNumbers(s.selectedItems.map(item => item.value));
  }, [level, targetSum, streak]);

  // Sintetizar tonos de audio Web Audio API
  const playSound = useCallback((type, value = 0) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === 'select') {
        // Tono ascendente según el número seleccionado
        const baseFreq = 300 + value * 50;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
      } else if (type === 'deselect') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.14);
      } else if (type === 'match_ok') {
        // Triada triunfal
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = freq;
          o.connect(g);
          g.connect(ctx.destination);
          g.gain.setValueAtTime(0, now + i * 0.08);
          g.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
          o.start(now + i * 0.08);
          o.stop(now + i * 0.08 + 0.4);
        });
      } else if (type === 'overlimit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.38);
      }
    } catch (e) {
      console.warn("Audio failed", e);
    }
  }, [soundEnabled]);

  // Generar burbuja de número flotante
  const spawnBubble = useCallback(() => {
    const s = stateRef.current;
    idCounter.current += 1;

    // Generar un número razonable para la suma objetivo actual
    // Evitamos números mayores que targetSum
    const maxVal = Math.min(9, s.targetSum);
    
    // Algoritmo para ayudar al niño a completar la suma:
    // Si la suma actual es menor al objetivo, tenemos un 35% de chance de spawnear exactamente el número faltante
    const currentSumVal = s.selectedItems.reduce((acc, curr) => acc + curr.value, 0);
    const needed = s.targetSum - currentSumVal;
    let numberVal = Math.floor(Math.random() * maxVal) + 1;

    if (needed > 0 && needed <= 9 && Math.random() < 0.35) {
      numberVal = needed;
    }

    const speedScale = 0.28 + Math.random() * 0.16;
    const newBubble = {
      id: idCounter.current,
      value: numberVal,
      x: 15 + Math.random() * 70,
      y: 110, // Comienza abajo
      speed: speedScale,
      amplitude: 2 + Math.random() * 3, // Amplitud del vaivén senoidal
      frequency: 0.02 + Math.random() * 0.02,
      phase: Math.random() * Math.PI * 2,
      baseX: 15 + Math.random() * 70,
      radius: 35, // radio de colisión
      isSelected: false,
      pulse: 1.0,
      errorTimer: 0 // Para sacudida/shake en caso de error
    };
    
    // Registrar baseX para mantener la oscilación en torno al centro del spawn
    newBubble.baseX = newBubble.x;
    s.bubbles.push(newBubble);
    setBubbles([...s.bubbles]);
  }, []);

  // Intervalo de Spawning de Burbujas
  useEffect(() => {
    spawnTimerRef.current = setInterval(() => {
      const s = stateRef.current;
      if (s.bubbles.length < 7) {
        spawnBubble();
      }
    }, 2500);

    return () => clearInterval(spawnTimerRef.current);
  }, [spawnBubble]);

  // Actualizador principal de físicas a 60 FPS
  useEffect(() => {
    const updatePhysics = () => {
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const s = stateRef.current;

      // Obtener datos globales de la IA
      const handData = window.latestHandData || { cursors: [] };
      const cursors = handData.cursors || [];

      // Mapear cursores válidos a porcentajes
      const mappedCursors = cursors.filter(c => c && c.isVisible).map(c => ({
        x: (c.x / screenW) * 100,
        y: (c.y / screenH) * 100
      }));

      // 1. Partículas flotando y cayendo
      s.particles = s.particles.map(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        return p;
      }).filter(p => p.alpha > 0);

      // 2. Mover burbujas flotantes
      let changed = false;
      let activeBubbles = s.bubbles.map(b => {
        const bCopy = { ...b };
        
        // Mover hacia arriba
        bCopy.y -= bCopy.speed;

        // Oscilación horizontal senoidal
        const elapsedFrames = bCopy.phase + (110 - bCopy.y) * bCopy.frequency;
        bCopy.x = bCopy.baseX + Math.sin(elapsedFrames) * bCopy.amplitude;

        // Rebotes contra límites izquierdo y derecho
        if (bCopy.x < 10) bCopy.x = 10;
        if (bCopy.x > 90) bCopy.x = 90;

        // Reducir timer de sacudida de error
        if (bCopy.errorTimer > 0) {
          bCopy.errorTimer -= 1;
          changed = true;
        }

        return bCopy;
      }).filter(b => b.y > -15); // Eliminar burbujas que superan la parte superior

      // Si alguna burbuja se eliminó por superar el tope, marcamos cambios
      if (activeBubbles.length !== s.bubbles.length) {
        changed = true;
      }

      // 3. Chequear colisiones de cursor y pinch (selección mediante pinza)
      if (!s.wasPinching) {
        s.wasPinching = [false, false];
      }

      mappedCursors.forEach((cursor, handIdx) => {
        if (!cursor.isVisible) return;
        const isPinching = gestures[handIdx]?.isPinching;
        const startedPinching = isPinching && !s.wasPinching[handIdx];
        s.wasPinching[handIdx] = isPinching;

        if (startedPinching) {
          let hitBubble = null;
          activeBubbles.forEach(b => {
            const dx = b.x - cursor.x;
            const dy = b.y - cursor.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 7.0) { // Radio de colisión
              hitBubble = b;
            }
          });

          if (hitBubble) {
            changed = true;
            if (hitBubble.isSelected) {
              // Deseleccionar
              hitBubble.isSelected = false;
              s.selectedItems = s.selectedItems.filter(item => item.id !== hitBubble.id);
              playSound('deselect');
            } else {
              // Seleccionar
              hitBubble.isSelected = true;
              s.selectedItems.push(hitBubble);
              playSound('select', hitBubble.value);

              // Partículas al tocar la burbuja
              for (let k = 0; k < 10; k++) {
                s.particles.push({
                  x: hitBubble.x,
                  y: hitBubble.y,
                  vx: (Math.random() - 0.5) * 2,
                  vy: (Math.random() - 0.5) * 2,
                  decay: 0.03,
                  alpha: 1.0,
                  color: '#A78BFA'
                });
              }

              // VALIDAR SUMA ACTUAL
              const totalSum = s.selectedItems.reduce((acc, curr) => acc + curr.value, 0);
              
              if (totalSum === s.targetSum) {
                // ¡Suma Completada con éxito!
                playSound('match_ok');
                addPoints(70);
                s.streak += 1;

                // Estallido de todas las burbujas seleccionadas
                s.selectedItems.forEach(item => {
                  for (let k = 0; k < 15; k++) {
                    s.particles.push({
                      x: item.x,
                      y: item.y,
                      vx: (Math.random() - 0.5) * 4,
                      vy: (Math.random() - 0.5) * 4,
                      decay: 0.02,
                      alpha: 1.0,
                      color: '#34D399' // Verde éxito
                    });
                  }
                });

                // Eliminar burbujas seleccionadas del array de flotantes
                const selectedIds = s.selectedItems.map(item => item.id);
                activeBubbles = activeBubbles.filter(bubble => !selectedIds.includes(bubble.id));
                s.selectedItems = [];

                // Definir nueva suma objetivo o subir nivel
                const nextTargetIdx = Math.floor(Math.random() * TARGET_SUMS.length);
                const nextSum = TARGET_SUMS[nextTargetIdx];
                s.targetSum = nextSum;
                s.level = Math.max(1, nextTargetIdx + 1);

              } else if (totalSum > s.targetSum) {
                // ¡Superó el límite! (Error)
                playSound('overlimit');
                s.streak = 0;

                // Animar sacudida (shake)
                s.selectedItems.forEach(item => {
                  const actualBubble = activeBubbles.find(bubble => bubble.id === item.id);
                  if (actualBubble) {
                    actualBubble.isSelected = false;
                    actualBubble.errorTimer = 25; // 25 frames de shake
                  }
                });

                s.selectedItems = [];
              }
            }
          }
        }
      });

      s.bubbles = activeBubbles;
      setBubbles(activeBubbles);
      setParticles([...s.particles]);
      if (changed || activeBubbles.length > 0) {
        syncReactStates();
      }

      frameRef.current = requestAnimationFrame(updatePhysics);
    };

    frameRef.current = requestAnimationFrame(updatePhysics);
    return () => cancelAnimationFrame(frameRef.current);
  }, [addPoints, playSound, syncReactStates]);

  const resetGame = () => {
    const s = stateRef.current;
    s.level = 1;
    s.targetSum = 5;
    s.selectedItems = [];
    s.bubbles = [];
    s.particles = [];
    s.wasPinching = [false, false];

    setLevel(1);
    setTargetSum(5);
    setStreak(0);
    setCurrentSum(0);
    setSelectedNumbers([]);
    setBubbles([]);
    setParticles([]);
  };

  return (
    <div className="w-full h-full relative overflow-hidden select-none flex flex-col items-center">
      
      {/* Control Volumen (Top Right) */}
      <button 
        onClick={() => setSoundEnabled(prev => !prev)}
        className="absolute top-4 right-12 z-50 p-4 glass rounded-2xl border border-white/10 text-white/40 hover:text-white transition-all hover:scale-105"
      >
        {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
      </button>

      {/* Panel Superior: Meta y Suma Actual */}
      <div className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 text-center z-10 w-full max-w-lg px-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-dark px-10 py-5 rounded-[32px] border border-white/10 shadow-2xl flex flex-col items-center gap-3 bg-black/40 backdrop-blur-md"
        >
          <div className="text-[10px] font-black text-amber-400 uppercase tracking-[0.4em] mb-1">Ábaco Matemático</div>
          
          <div className="flex items-center gap-8">
            {/* Ecuación dinámica */}
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest leading-none">Ecuación</span>
              <span className="text-2xl font-display font-black text-white tracking-wide mt-1">
                {selectedNumbers.length > 0 ? selectedNumbers.join(' + ') : '0'} = {currentSum}
              </span>
            </div>
            
            <div className="h-8 w-[1px] bg-white/20" />

            {/* Suma Objetivo */}
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest leading-none">Objetivo</span>
              <span className="text-3xl font-display font-black text-amber-400 italic tracking-tighter mt-1 animate-pulse">
                {targetSum}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Racha / Combo Streak */}
        {streak > 1 && (
          <motion.div 
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="flex items-center gap-2 text-amber-400 text-[10px] font-black uppercase tracking-widest bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20"
          >
            <Sparkles size={12} fill="currentColor" /> ¡Racha de Sumas x{streak}!
          </motion.div>
        )}
      </div>

      {/* RENDER DE BURBUJAS DE NÚMEROS */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {bubbles.map(b => {
          const isErr = b.errorTimer > 0;

          return (
            <div
              key={b.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2`}
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                scale: b.pulse,
                transform: `translate(-50%, -50%) ${isErr ? `translate(${Math.sin(b.errorTimer * 1.5) * 6}px, 0)` : ''}`
              }}
            >
              <div 
                className={`w-20 h-20 rounded-full border-2 flex items-center justify-center font-display text-3xl font-black italic shadow-2xl transition-all duration-300 relative ${
                  b.isSelected 
                    ? 'bg-purple-500/80 border-white text-white shadow-[0_0_35px_#a78bfa]'
                    : isErr 
                      ? 'bg-red-500/30 border-red-500 text-red-400 shadow-red-500/30 animate-shake'
                      : 'bg-gradient-to-tr from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-white backdrop-blur-md shadow-cyan-500/10'
                }`}
              >
                {b.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* RENDER DE PARTÍCULAS EN DOM */}
      <div className="absolute inset-0 pointer-events-none z-30">
        {particles.map((p, idx) => (
          <div
            key={idx}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 text-2xl font-black select-none pointer-events-none"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              color: p.color,
              opacity: p.alpha,
              textShadow: `0 0 10px ${p.color}`,
              transform: `translate(-50%, -50%) scale(${0.5 + p.alpha * 0.7})`
            }}
          >
            ★
          </div>
        ))}
      </div>

      {/* Pie de instrucciones */}
      <div className="absolute bottom-6 flex items-center gap-6 glass px-8 py-3.5 rounded-[24px] border border-white/10 animate-pulse z-30">
        <span className="text-2xl">🖐️</span>
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 italic">
          Usa pinzas en el aire sobre los números para seleccionarlos. ¡Debes sumar exactamente el valor objetivo!
        </p>
      </div>
    </div>
  );
});

export default MathAbacusModule;
