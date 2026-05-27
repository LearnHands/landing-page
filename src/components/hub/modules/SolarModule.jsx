import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Sparkles, AlertTriangle, ArrowRight, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import HandButton from '../HandButton';

// Constelaciones y datos educativos
const CONSTELLATIONS = [
  {
    id: 'osamayor',
    name: 'Osa Mayor',
    stars: [
      { x: 20, y: 30, name: 'Merak' },
      { x: 30, y: 32, name: 'Dubhe' },
      { x: 38, y: 40, name: 'Megrez' },
      { x: 45, y: 43, name: 'Alioth' },
      { x: 48, y: 55, name: 'Mizar' },
      { x: 62, y: 56, name: 'Alkaid' },
      { x: 72, y: 42, name: 'Phad' },
      { x: 60, y: 34, name: 'Merak' }
    ],
    fact: 'Es una de las constelaciones más famosas del cielo norteño. Sus dos estrellas finales apuntan directo a la Estrella Polar para ubicar el Norte.',
    symbol: '🐻'
  },
  {
    id: 'orion',
    name: 'Constelación de Orión',
    stars: [
      { x: 35, y: 25, name: 'Betelgeuse' },
      { x: 65, y: 28, name: 'Bellatrix' },
      { x: 46, y: 48, name: 'Alnitak' },
      { x: 50, y: 48, name: 'Alnilam' },
      { x: 54, y: 48, name: 'Mintaka' },
      { x: 40, y: 68, name: 'Saiph' },
      { x: 60, y: 65, name: 'Rigel' }
    ],
    fact: 'Representa al gran cazador de la mitología. En su centro se encuentran las famosas "Tres Marías" o Cinturón de Orión.',
    symbol: '🏹'
  },
  {
    id: 'casiopea',
    name: 'Casiopea',
    stars: [
      { x: 20, y: 45, name: 'Segin' },
      { x: 35, y: 55, name: 'Ruchbah' },
      { x: 50, y: 40, name: 'Gamma Cas' },
      { x: 65, y: 58, name: 'Shedar' },
      { x: 80, y: 43, name: 'Caph' }
    ],
    fact: 'Se reconoce fácilmente en el cielo por su brillante forma de "W" o "M". Representa a una vanidosa reina de la mitología griega.',
    symbol: '👑'
  },
  {
    id: 'cruzdesur',
    name: 'La Cruz del Sur',
    stars: [
      { x: 50, y: 20, name: 'Gacrux' },
      { x: 35, y: 50, name: 'Mimosa' },
      { x: 50, y: 78, name: 'Acrux' },
      { x: 65, y: 50, name: 'Imai' },
      { x: 54, y: 56, name: 'Ginan' }
    ],
    fact: 'Es la constelación más pequeña del cielo, pero la más importante del hemisferio sur, ya que sirve para ubicar la dirección al Polo Sur.',
    symbol: '⛵'
  },
  {
    id: 'alineacion',
    name: 'Alineación Planetaria',
    stars: [
      { x: 20, y: 50, name: 'Sol' },
      { x: 35, y: 45, name: 'Mercurio' },
      { x: 50, y: 55, name: 'Venus' },
      { x: 65, y: 42, name: 'Tierra' },
      { x: 80, y: 52, name: 'Marte' }
    ],
    fact: 'Ocurre cuando varios planetas se posicionan en línea desde el Sol en sus órbitas. ¡Un maravilloso desfile espacial!',
    symbol: '🪐'
  }
];

const SolarModule = memo(({ addPoints }) => {
  const canvasRef = useRef(null);
  const [level, setLevel] = useState(0);
  const [gameState, setGameState] = useState('PLAYING'); // PLAYING, WIN
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [warningActive, setWarningActive] = useState(false);
  const [warningTimer, setWarningTimer] = useState(0);

  const audioCtxRef = useRef(null);
  const frameRef = useRef(null);

  // Estado del juego en Ref para lectura a 60 FPS
  const stateRef = useRef({
    level: 0,
    gameState: 'PLAYING',
    connectedIndices: [],
    stars: [],
    meteors: [],
    particles: [],
    sparkTimer: 0,
    warningTimer: 0
  });

  const currentConstellation = CONSTELLATIONS[level];

  // Sincronizar constelación en ref
  useEffect(() => {
    stateRef.current.level = level;
    stateRef.current.stars = CONSTELLATIONS[level].stars;
    stateRef.current.connectedIndices = [];
    stateRef.current.gameState = 'PLAYING';
    
    // Inicializar meteoros según nivel
    const meteorCount = 2 + Math.floor(level * 0.8);
    const newMeteors = [];
    for (let i = 0; i < meteorCount; i++) {
      newMeteors.push({
        id: i,
        x: Math.random() * 100,
        y: 25 + Math.random() * 50,
        vx: (0.15 + Math.random() * 0.2) * (Math.random() < 0.5 ? 1 : -1),
        vy: (Math.random() - 0.5) * 0.05,
        size: 25 + Math.random() * 25,
        angle: Math.random() * 360,
        spin: (Math.random() - 0.5) * 4
      });
    }
    stateRef.current.meteors = newMeteors;
    stateRef.current.particles = [];
  }, [level]);

  // Sintetizador de audio Web Audio API
  const playSound = useCallback((type, stepIdx = 0) => {
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

      if (type === 'connect') {
        // Nota musical ascendente según el paso
        const scale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33];
        const freq = scale[stepIdx % scale.length];
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'break') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.4);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === 'win') {
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = freq;
          o.connect(g);
          g.connect(ctx.destination);
          g.gain.setValueAtTime(0, now + i * 0.08);
          g.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.03);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
          o.start(now + i * 0.08);
          o.stop(now + i * 0.08 + 0.45);
        });
      }
    } catch (e) {
      console.warn("Audio failed", e);
    }
  }, [soundEnabled]);

  // Avanzar nivel
  const handleNextLevel = () => {
    setGameState('PLAYING');
    setLevel(prev => (prev + 1) % CONSTELLATIONS.length);
  };

  // Bucle de físicas y renderizado en Canvas a 60 FPS
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const runLoop = () => {
      const screenW = canvas.width;
      const screenH = canvas.height;
      
      // Limpiar con fondo semi-transparente para ver la cámara
      ctx.clearRect(0, 0, screenW, screenH);
      ctx.fillStyle = 'rgba(6, 6, 16, 0.3)';
      ctx.fillRect(0, 0, screenW, screenH);

      const state = stateRef.current;

      // Dibujar estrellas de fondo sutiles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      for (let i = 0; i < 30; i++) {
        const x = (Math.sin(i * 4523) * 0.5 + 0.5) * screenW;
        const y = (Math.cos(i * 1238) * 0.5 + 0.5) * screenH;
        const size = Math.abs(Math.sin(Date.now() / 1000 + i)) * 2 + 1;
        ctx.fillRect(x, y, size, size);
      }

      // LEER POSICIONES DE CURSOR DE LA VARIABLE GLOBAL
      const handData = window.latestHandData || { cursors: [], gestures: [] };
      const cursors = handData.cursors || [];
      const gestures = handData.gestures || [];

      // Mapear cursores válidos a píxeles locales
      const activeCursors = cursors.filter(c => c && c.isVisible);

      // Actualizar meteoritos
      state.meteors.forEach(m => {
        m.x += m.vx;
        m.y += m.vy;
        m.angle += m.spin;

        // Rebotes o reaparición en los bordes
        if (m.x < -10) { m.x = 110; }
        if (m.x > 110) { m.x = -10; }
        if (m.y < 15 || m.y > 85) { m.vy *= -1; }

        // Render meteorito (Jagged polygon)
        const px = (m.x / 100) * screenW;
        const py = (m.y / 100) * screenH;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate((m.angle * Math.PI) / 180);

        // Sombrilla de brillo rojo espacial
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
        
        ctx.fillStyle = 'rgba(40, 20, 20, 0.85)';
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;

        ctx.beginPath();
        const pts = 8;
        for (let j = 0; j < pts; j++) {
          const angleRad = (j * 2 * Math.PI) / pts;
          const radius = m.size * (0.85 + Math.sin(j * 12.3 + m.id) * 0.15);
          const rx = Math.cos(angleRad) * radius;
          const ry = Math.sin(angleRad) * radius;
          if (j === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cráteres internos sutiles
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.beginPath();
        ctx.arc(-m.size/4, -m.size/5, m.size/5, 0, Math.PI * 2);
        ctx.arc(m.size/3, m.size/4, m.size/6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Dibujar línea punteada guía del trazado total
      if (state.gameState === 'PLAYING') {
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.15)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        state.stars.forEach((star, idx) => {
          const sx = (star.x / 100) * screenW;
          const sy = (star.y / 100) * screenH;
          if (idx === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        });
        ctx.stroke();
        ctx.setLineDash([]); // Reset
      }

      // Dibujar líneas ya conectadas de la constelación
      ctx.strokeStyle = '#22D3EE'; // Cyan neón
      ctx.lineWidth = 5;
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'rgba(34, 211, 238, 0.6)';
      ctx.beginPath();
      state.connectedIndices.forEach((starIdx, seqIdx) => {
        const star = state.stars[starIdx];
        if (!star) return;
        const sx = (star.x / 100) * screenW;
        const sy = (star.y / 100) * screenH;
        if (seqIdx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();

      // Dibujar línea activa desde la última estrella al cursor de la mano
      if (state.gameState === 'PLAYING' && state.connectedIndices.length > 0 && activeCursors.length > 0) {
        const lastStarIdx = state.connectedIndices[state.connectedIndices.length - 1];
        const lastStar = state.stars[lastStarIdx];
        const cursor = activeCursors[0];
        
        const startX = (lastStar.x / 100) * screenW;
        const startY = (lastStar.y / 100) * screenH;

        ctx.strokeStyle = 'rgba(167, 139, 250, 0.8)'; // Morado eléctrico
        ctx.lineWidth = 3.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(167, 139, 250, 0.7)';
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(cursor.x, cursor.y);
        ctx.stroke();
      }

      // Dibujar estrellas de la constelación
      state.stars.forEach((star, idx) => {
        const sx = (star.x / 100) * screenW;
        const sy = (star.y / 100) * screenH;
        const isConnected = state.connectedIndices.includes(idx);
        const isNextTarget = state.gameState === 'PLAYING' && state.connectedIndices.length === idx;

        // Efecto pulso para la siguiente estrella objetivo
        const pulse = isNextTarget ? 1 + Math.sin(Date.now() / 150) * 0.18 : 1.0;
        const radius = (isConnected ? 12 : 9) * pulse;

        ctx.save();
        ctx.shadowBlur = isConnected ? 25 : (isNextTarget ? 30 : 5);
        ctx.shadowColor = isConnected ? '#22D3EE' : (isNextTarget ? '#A78BFA' : 'rgba(255,255,255,0.2)');

        // Cuerpo de la estrella
        ctx.fillStyle = isConnected ? '#FFFFFF' : (isNextTarget ? '#D8B4FE' : '#3F3F46');
        ctx.strokeStyle = isConnected ? '#22D3EE' : (isNextTarget ? '#A78BFA' : '#18181B');
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Brillo interno de estrella de 4 puntas
        if (isConnected || isNextTarget) {
          ctx.fillStyle = '#FFF';
          ctx.beginPath();
          ctx.moveTo(sx, sy - radius * 1.5);
          ctx.lineTo(sx + radius * 0.4, sy - radius * 0.4);
          ctx.lineTo(sx + radius * 1.5, sy);
          ctx.lineTo(sx + radius * 0.4, sy + radius * 0.4);
          ctx.lineTo(sx, sy + radius * 1.5);
          ctx.lineTo(sx - radius * 0.4, sy + radius * 0.4);
          ctx.lineTo(sx - radius * 1.5, sy);
          ctx.lineTo(sx - radius * 0.4, sy - radius * 0.4);
          ctx.closePath();
          ctx.fill();
        }

        // Texto con el orden (número) de la estrella
        ctx.shadowBlur = 0;
        ctx.fillStyle = isConnected ? '#22D3EE' : (isNextTarget ? '#E9D5FF' : '#A1A1AA');
        ctx.font = 'black italic 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(idx + 1, sx, sy - radius - 8);

        // Nombre de la estrella secundario
        if (star.name) {
          ctx.font = '500 9px sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.fillText(star.name, sx, sy + radius + 14);
        }

        ctx.restore();
      });

      // ACTUALIZAR PARTÍCULAS (Explosiones y chispas)
      state.particles = state.particles.map(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        return p;
      }).filter(p => p.alpha > 0);

      // Dibujar partículas
      state.particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      ctx.globalAlpha = 1.0; // Reset alpha

      // CONTROL DE COLISIONES DE TRAZADO (1 mano es suficiente)
      if (state.gameState === 'PLAYING' && activeCursors.length > 0) {
        const cursor = activeCursors[0];
        const nextTargetIdx = state.connectedIndices.length;

        // 1. Colisión con la estrella objetivo
        if (nextTargetIdx < state.stars.length) {
          const targetStar = state.stars[nextTargetIdx];
          const tx = (targetStar.x / 100) * screenW;
          const ty = (targetStar.y / 100) * screenH;
          const distToTarget = Math.hypot(cursor.x - tx, cursor.y - ty);

          if (distToTarget < 32) {
            state.connectedIndices.push(nextTargetIdx);
            playSound('connect', nextTargetIdx);

            // Partículas de éxito en estrella
            for (let k = 0; k < 12; k++) {
              state.particles.push({
                x: tx,
                y: ty,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                size: 2 + Math.random() * 4,
                color: '#22D3EE',
                alpha: 1.0,
                decay: 0.03
              });
            }

            // Validar si completó la constelación
            if (state.connectedIndices.length === state.stars.length) {
              state.gameState = 'WIN';
              setGameState('WIN');
              playSound('win');
              addPoints(150);

              // Gran explosión cósmica en el centro
              for (let k = 0; k < 50; k++) {
                state.particles.push({
                  x: screenW / 2 + (Math.random() - 0.5) * 100,
                  y: screenH / 2 + (Math.random() - 0.5) * 100,
                  vx: (Math.random() - 0.5) * 15,
                  vy: (Math.random() - 0.5) * 15,
                  size: 3 + Math.random() * 6,
                  color: k % 2 === 0 ? '#E9D5FF' : '#22D3EE',
                  alpha: 1.0,
                  decay: 0.015
                });
              }
            }
          }
        }

        // 2. Colisión con meteoritos (Rompe la línea activa)
        if (state.connectedIndices.length > 0 && state.gameState === 'PLAYING') {
          let hitMeteor = false;
          state.meteors.forEach(m => {
            const mx = (m.x / 100) * screenW;
            const my = (m.y / 100) * screenH;
            
            // Distancia del cursor al meteorito
            const dist = Math.hypot(cursor.x - mx, cursor.y - my);
            if (dist < m.size + 15) {
              hitMeteor = true;
            }
          });

          if (hitMeteor) {
            playSound('break');
            
            // Chispas de error rojas/moradas en la posición del dedo
            for (let k = 0; k < 25; k++) {
              state.particles.push({
                x: cursor.x,
                y: cursor.y,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                size: 3 + Math.random() * 5,
                color: '#EF4444',
                alpha: 1.0,
                decay: 0.04
              });
            }

            // Resetear progreso de dibujo
            state.connectedIndices = [];
            state.warningTimer = 40; // Activa aviso de advertencia visual
          }
        }
      }

      // Animación de advertencia
      if (state.warningTimer > 0) {
        state.warningTimer -= 1;
        setWarningActive(true);
      } else {
        setWarningActive(false);
      }

      frameRef.current = requestAnimationFrame(runLoop);
    };

    frameRef.current = requestAnimationFrame(runLoop);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [level, addPoints, playSound]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-transparent flex items-center justify-center select-none">
      
      {/* Canvas principal para estrellas, líneas y meteoritos */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full z-10 pointer-events-none" 
      />

      {/* Control Mute (Top Right) */}
      <button 
        onClick={() => setSoundEnabled(prev => !prev)}
        className="absolute top-4 right-12 z-50 p-4 glass rounded-2xl border border-white/10 text-white/40 hover:text-white transition-all hover:scale-105"
      >
        {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
      </button>

      {/* Banner Superior de Instrucciones */}
      <div className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 text-center z-20 w-full max-w-lg px-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-dark px-8 py-4 rounded-[28px] border border-white/10 shadow-2xl flex flex-col items-center gap-2"
        >
          <div className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.4em] mb-1">Navegador Estelar</div>
          <h2 className="text-3xl md:text-4xl font-display font-black uppercase italic tracking-wider text-gradient flex items-center gap-3">
            <Compass className="text-cyan-400 animate-spin-slow" size={24} /> {currentConstellation.name}
          </h2>
        </motion.div>
      </div>

      {/* Alerta de choque con meteorito */}
      <AnimatePresence>
        {warningActive && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-red-950/80 border border-red-500/40 text-red-300 px-8 py-5 rounded-3xl flex items-center gap-4 shadow-[0_0_50px_rgba(239,68,68,0.25)] backdrop-blur-md"
          >
            <AlertTriangle className="text-red-500 animate-bounce" size={32} />
            <div className="flex flex-col">
              <span className="text-sm font-black uppercase tracking-wider">¡Línea rota!</span>
              <span className="text-[10px] uppercase font-bold text-red-400/80">Chocaste con un asteroide. Comienza de nuevo.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tarjeta de constelación completada */}
      <AnimatePresence>
        {gameState === 'WIN' && (
          <motion.div 
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-[22%] left-1/2 -translate-x-1/2 w-full max-w-md z-40 glass-dark p-8 rounded-[40px] border border-white/10 shadow-2xl space-y-6 bg-black/60 backdrop-blur-lg flex flex-col items-center"
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="text-6xl animate-pulse">{currentConstellation.symbol}</div>
              <h3 className="text-3xl font-display font-black italic uppercase text-gradient">¡Completado!</h3>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400">Constelación revelada con éxito</p>
            </div>

            <div className="bg-white/5 border border-white/5 p-5 rounded-2xl">
              <p className="text-xs text-white/70 leading-relaxed font-semibold italic text-center">
                "{currentConstellation.fact}"
              </p>
            </div>

            <HandButton 
              onClick={handleNextLevel}
              className="px-12 py-5 text-xs w-full"
              variant="cyan"
              dwellMs={800}
            >
              SIGUIENTE MAPA <ArrowRight size={16} />
            </HandButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pie de instrucciones */}
      {gameState === 'PLAYING' && (
        <div className="absolute bottom-6 flex items-center gap-6 glass px-8 py-3.5 rounded-[24px] border border-white/10 animate-pulse z-20">
          <span className="text-2xl">👉</span>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 italic">
            Toca el número 1 para iniciar, conecta los puntos en orden y esquiva los meteoros
          </p>
        </div>
      )}
    </div>
  );
});

export default SolarModule;
