import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Volume2, VolumeX, Trophy, Heart, Zap, Sparkles } from 'lucide-react';

// --- CONFIGURACIÓN DE AUDIO SINTÉTICO (Web Audio API) ---
class GameSoundController {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.1, slideTo = null) {
    if (this.muted) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
      }

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio playback failed", e);
    }
  }

  playBounce() {
    this.playTone(220, 'triangle', 0.12);
  }

  playWall() {
    this.playTone(180, 'sine', 0.06);
  }

  playHitBrick(hp) {
    this.playTone(400 + hp * 80, 'sine', 0.08);
  }

  playBreakBrick() {
    this.playTone(600, 'square', 0.18, 100);
  }

  playPowerup() {
    const now = this.ctx ? this.ctx.currentTime : 0;
    this.playTone(300, 'triangle', 0.08);
    setTimeout(() => this.playTone(450, 'triangle', 0.08), 80);
    setTimeout(() => this.playTone(600, 'triangle', 0.15), 160);
  }

  playLaser() {
    this.playTone(880, 'sawtooth', 0.1, 220);
  }

  playLevelUp() {
    this.playTone(440, 'sine', 0.1);
    setTimeout(() => this.playTone(554.37, 'sine', 0.1), 100);
    setTimeout(() => this.playTone(659.25, 'sine', 0.1), 200);
    setTimeout(() => this.playTone(880, 'sine', 0.3), 300);
  }

  playGameOver() {
    this.playTone(300, 'sawtooth', 0.4, 50);
  }
}

const soundCtrl = new GameSoundController();

// --- CONSTANTES DEL JUEGO ---
const V_WIDTH = 800;
const V_HEIGHT = 800;

const POWERUPS = {
  MULTI: { id: 'multi', label: 'Multi-Pelotas', color: '#10B981', symbol: '🍒' },
  FIRE: { id: 'fire', label: 'Bola de Fuego', color: '#EF4444', symbol: '🔥' },
  LASER: { id: 'laser', label: 'Súper Láser', color: '#F59E0B', symbol: '⚡' },
  WIDE: { id: 'wide', label: 'Barra Gigante', color: '#3B82F6', symbol: '↔️' },
};

const BricksModule = ({ cursors = [], gestures = [], addPoints }) => {
  const canvasRef = useRef(null);
  
  // Estados del juego React
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState('START'); // START, PLAYING, GAMEOVER, WIN
  const [muted, setMuted] = useState(false);
  const [activePowerupLabel, setActivePowerupLabel] = useState(null);
  const [baseSpeed, setBaseSpeed] = useState(7); // NUEVO: Control de velocidad

  // Referencias mutables para el ciclo Canvas (evita renderizados excesivos)
  const stateRef = useRef({
    gameState: 'START',
    paddle: { x: V_WIDTH / 2, y: V_HEIGHT - 60, w: 140, targetW: 140, h: 20 },
    balls: [],
    bricks: [],
    particles: [],
    powerups: [],
    lasers: [],
    laserTimer: 0,
    powerupTimer: null,
    activePowerups: {}, // { [type]: duration_ms }
    score: 0,
    level: 1,
    lives: 3,
    cursors: [],
    gestures: [],
    aimAngle: -Math.PI / 2, // Apuntado por defecto arriba
    lastTime: 0,
    lastPointsAwarded: 0,
    baseSpeed: 7, // NUEVO: Control de velocidad
  });

  // Mantener actualizadas las variables reactivas en las referencias mutables
  useEffect(() => {
    stateRef.current.cursors = cursors;
    stateRef.current.gestures = gestures;
  }, [cursors, gestures]);

  // Sincronizar estado mutable con el visual reactivo
  const syncReactState = useCallback(() => {
    const s = stateRef.current;
    if (s.score !== score) setScore(s.score);
    if (s.level !== level) setLevel(s.level);
    if (s.lives !== lives) setLives(s.lives);
    if (s.gameState !== gameState) setGameState(s.gameState);

    // Actualizar etiquetas visuales de powerups activos
    const active = Object.keys(s.activePowerups).filter(k => s.activePowerups[k] > 0);
    if (active.length > 0) {
      const labels = active.map(k => POWERUPS[k]?.label).join(' + ');
      setActivePowerupLabel(labels);
    } else {
      setActivePowerupLabel(null);
    }
  }, [score, level, lives, gameState]);

  // Alternar volumen
  const toggleMute = () => {
    soundCtrl.muted = !soundCtrl.muted;
    setMuted(soundCtrl.muted);
  };

  // Cambiar velocidad dinámicamente
  const handleSpeedChange = (newSpeed) => {
    setBaseSpeed(newSpeed);
    const s = stateRef.current;
    s.baseSpeed = newSpeed;
    
    s.balls.forEach(ball => {
      ball.speed = newSpeed;
      if (!ball.isDocked) {
        const currentSpeed = Math.hypot(ball.vx, ball.vy);
        if (currentSpeed > 0) {
          ball.vx = (ball.vx / currentSpeed) * newSpeed;
          ball.vy = (ball.vy / currentSpeed) * newSpeed;
        }
      }
    });
  };

  // --- GENERACIÓN DE LADRILLOS PARA EL NIVEL ---
  const generateBricks = useCallback((lvl) => {
    const cols = 8;
    const rows = Math.min(3 + lvl, 6);
    const brickW = V_WIDTH / cols - 8;
    const brickH = 26;
    const startY = 120;
    const newBricks = [];

    const colors = [
      '#EF4444', // Rojo
      '#F97316', // Naranja
      '#F59E0B', // Amarillo
      '#10B981', // Verde
      '#3B82F6', // Azul
      '#8B5CF6', // Morado
    ];

    for (let r = 0; r < rows; r++) {
      const hp = Math.max(1, Math.floor((rows - r) * 0.8) + Math.floor(lvl * 0.5));
      const rowColor = colors[r % colors.length];

      for (let c = 0; c < cols; c++) {
        // Tipos de bloques especiales aleatorios (20% de probabilidad)
        let type = 'normal';
        const rand = Math.random();
        if (rand < 0.05) type = 'MULTI';
        else if (rand < 0.10) type = 'FIRE';
        else if (rand < 0.15) type = 'LASER';
        else if (rand < 0.20) type = 'WIDE';

        newBricks.push({
          id: `${r}-${c}-${Math.random()}`,
          x: c * (brickW + 8) + 4,
          y: startY + r * (brickH + 8),
          w: brickW,
          h: brickH,
          hp: hp,
          maxHp: hp,
          color: rowColor,
          type: type,
        });
      }
    }
    return newBricks;
  }, []);

  // --- INICIAR JUEGO / REINICIAR ---
  const initGame = useCallback((lvl = 1) => {
    soundCtrl.init();
    const s = stateRef.current;
    s.gameState = 'PLAYING';
    s.level = lvl;
    s.score = lvl === 1 ? 0 : s.score;
    s.lives = lvl === 1 ? 3 : s.lives;
    s.bricks = generateBricks(lvl);
    s.balls = [{
      x: V_WIDTH / 2,
      y: V_HEIGHT - 90,
      vx: 0,
      vy: 0,
      radius: 10,
      speed: s.baseSpeed,
      isDocked: true,
      isFire: false,
    }];
    s.particles = [];
    s.powerups = [];
    s.lasers = [];
    s.activePowerups = {};
    s.paddle.w = 140;
    s.paddle.targetW = 140;
    s.aimAngle = -Math.PI / 2;

    if (lvl > 1) {
      soundCtrl.playLevelUp();
    }
    syncReactState();
  }, [generateBricks, syncReactState]);

  // --- CONTROL DEL CICLO DEL JUEGO (CANVAS LOOP) ---
  useEffect(() => {
    let animId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const updatePhysics = (dt) => {
      const s = stateRef.current;
      if (s.gameState !== 'PLAYING') return;

      // Multiplicador de velocidad basado en el tiempo transcurrido (para mantener 60 FPS lógicos)
      const speedMultiplier = dt * 60; 

      // 1. CONTROL DE PADDLE SUAVE CON GESTOS O MOUSE
      let targetX = s.paddle.x;
      if (s.cursors && s.cursors.length > 0) {
        // Mapeo gestual: escalar de forma responsiva
        const cX = (s.cursors[0].x / window.innerWidth) * V_WIDTH;
        
        // Inicializar si no existe
        if (s.smoothedCursorX === undefined) {
          s.smoothedCursorX = cX;
        }
        
        // Filtro paso bajo suave para eliminar saltos y vibración de MediaPipe
        s.smoothedCursorX = s.smoothedCursorX * 0.75 + cX * 0.25;
        
        targetX = Math.max(s.paddle.w / 2, Math.min(V_WIDTH - s.paddle.w / 2, s.smoothedCursorX));
      } else {
        // Resetear smoothedCursorX si se pierden los cursores
        s.smoothedCursorX = undefined;
      }

      // Interpolar posición del paddle suave e independiente de los FPS
      const paddleLerp = 1 - Math.exp(-22 * dt);
      s.paddle.x += (targetX - s.paddle.x) * paddleLerp;

      // Suavizar cambio de tamaño del paddle (powerups)
      const widthLerp = 1 - Math.exp(-8 * dt);
      s.paddle.w += (s.paddle.targetW - s.paddle.w) * widthLerp;

      // Actualizar temporizadores de powerups
      Object.keys(s.activePowerups).forEach(key => {
        if (s.activePowerups[key] > 0) {
          s.activePowerups[key] -= dt * 1000;
          if (s.activePowerups[key] <= 0) {
            delete s.activePowerups[key];
            if (key === 'WIDE') s.paddle.targetW = 140;
          }
        }
      });

      // 2. DISPARAR PELOTA DESDE PADDLE (Aim & Shoot)
      const primaryBall = s.balls.find(b => b.isDocked);
      if (primaryBall) {
        primaryBall.x = s.paddle.x;
        primaryBall.y = s.paddle.y - primaryBall.radius - 2;

        // Calcular ángulo de apuntado basado en posición de la mano
        if (s.cursors && s.cursors.length > 0) {
          const cX = (s.cursors[0].x / window.innerWidth) * V_WIDTH;
          const cY = (s.cursors[0].y / window.innerHeight) * V_HEIGHT;
          // Apuntar desde el centro del paddle hacia el cursor de la mano
          const angle = Math.atan2(cY - primaryBall.y, cX - primaryBall.x);
          // Limitar ángulo para no disparar excesivamente hacia los lados o hacia abajo
          if (angle < -Math.PI * 0.85 || angle > -Math.PI * 0.15) {
            s.aimAngle = angle;
          } else {
            // Clampar a un rango superior
            s.aimAngle = Math.max(-Math.PI * 0.85, Math.min(-Math.PI * 0.15, angle));
          }
        } else {
          // Si no hay manos, oscila el ángulo de forma atractiva
          s.aimAngle = -Math.PI / 2 + Math.sin(Date.now() / 300) * 0.8;
        }

        // Detectar gesto de pellizco 🤏 para lanzar o dwell prolongado si no hay gestos
        const isPinching = s.gestures && s.gestures[0]?.isPinching;
        
        if (isPinching) {
          primaryBall.isDocked = false;
          primaryBall.vx = Math.cos(s.aimAngle) * primaryBall.speed;
          primaryBall.vy = Math.sin(s.aimAngle) * primaryBall.speed;
          soundCtrl.playBounce();
        }
      }

      // 3. FÍSICA Y MOVIMIENTO DE PELOTAS
      s.balls.forEach((ball, bIdx) => {
        if (ball.isDocked) return;

        // Propiedad Bola de Fuego
        ball.isFire = !!s.activePowerups.FIRE;

        // Mover bola escalado por el multiplicador de velocidad
        ball.x += ball.vx * speedMultiplier;
        ball.y += ball.vy * speedMultiplier;

        // Colisión con límites izquierdo y derecho
        if (ball.x - ball.radius < 0) {
          ball.x = ball.radius;
          ball.vx = Math.abs(ball.vx); // Rebote limpio a la derecha
          soundCtrl.playWall();
        } else if (ball.x + ball.radius > V_WIDTH) {
          ball.x = V_WIDTH - ball.radius;
          ball.vx = -Math.abs(ball.vx); // Rebote limpio a la izquierda
          soundCtrl.playWall();
        }

        // Colisión con techo
        if (ball.y - ball.radius < 0) {
          ball.y = ball.radius;
          ball.vy = Math.abs(ball.vy); // Rebote limpio abajo
          soundCtrl.playWall();
        }

        // Caída al fondo (Perder pelota)
        if (ball.y - ball.radius > V_HEIGHT) {
          s.balls.splice(bIdx, 1);
          return;
        }

        // Colisión con el Paddle
        const pTop = s.paddle.y;
        const pLeft = s.paddle.x - s.paddle.w / 2;
        const pRight = s.paddle.x + s.paddle.w / 2;

        if (
          ball.vy > 0 &&
          ball.y + ball.radius >= pTop &&
          ball.y - ball.radius <= pTop + s.paddle.h &&
          ball.x >= pLeft - 5 &&
          ball.x <= pRight + 5
        ) {
          // Rebote dinámico basado en dónde golpea el paddle (ángulo variable)
          const hitPos = (ball.x - s.paddle.x) / (s.paddle.w / 2); // -1.0 a 1.0
          const angle = -Math.PI / 2 + hitPos * 1.0; // Desviación máxima de 1.0 radianes
          
          ball.vx = Math.sin(angle) * ball.speed;
          ball.vy = -Math.abs(Math.cos(angle) * ball.speed);
          
          // Re-posicionar bola encima del paddle para evitar atascos
          ball.y = pTop - ball.radius;
          soundCtrl.playBounce();
        }

        // Colisión con Ladrillos
        s.bricks.forEach((brick, brIdx) => {
          if (brick.hp <= 0) return;

          // Encontrar coordenadas del ladrillo
          const bLeft = brick.x;
          const bRight = brick.x + brick.w;
          const bTop = brick.y;
          const bBottom = brick.y + brick.h;

          // Detección AABB simple con el radio de la pelota
          const closestX = Math.max(bLeft, Math.min(ball.x, bRight));
          const closestY = Math.max(bTop, Math.min(ball.y, bBottom));
          const dist = Math.hypot(ball.x - closestX, ball.y - closestY);

          if (dist < ball.radius) {
            // Daño al bloque
            const damage = ball.isFire ? 3 : 1;
            brick.hp -= damage;
            s.score += 10;
            addPoints(10);

            // Sonido e impacto de partículas
            if (brick.hp > 0) {
              soundCtrl.playHitBrick(brick.hp);
              // Generar chispas de daño
              spawnParticles(closestX, closestY, brick.color, 8);
            } else {
              soundCtrl.playBreakBrick();
              s.score += 50;
              addPoints(50);
              // Gran explosión de partículas
              spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 24);

              // Soltar un Power-up (30% de probabilidad en bloques destruidos)
              if (Math.random() < 0.3 || brick.type !== 'normal') {
                const types = Object.keys(POWERUPS);
                const dropType = brick.type !== 'normal' ? brick.type : types[Math.floor(Math.random() * types.length)];
                s.powerups.push({
                  x: brick.x + brick.w / 2,
                  y: brick.y + brick.h / 2,
                  type: dropType,
                  vy: 3,
                  size: 20
                });
              }
            }

            // Si es bola normal (no fuego), rebota en los ladrillos
            if (!ball.isFire) {
              // Determinar en qué cara del ladrillo colisionó para invertir la velocidad correcta
              const fromLeft = ball.x < bLeft;
              const fromRight = ball.x > bRight;
              const fromTop = ball.y < bTop;
              const fromBottom = ball.y > bBottom;

              if (fromLeft || fromRight) {
                ball.vx *= -1;
                ball.x += ball.vx * 0.5; // empujoncito
              }
              if (fromTop || fromBottom) {
                ball.vy *= -1;
                ball.y += ball.vy * 0.5; // empujoncito
              }
            }
          }
        });
      });

      // 4. ACTUALIZACIÓN DE LÁSERES (POWERUP LASER)
      if (s.activePowerups.LASER) {
        s.laserTimer += dt * 1000;
        // Auto-disparar cada 350ms
        if (s.laserTimer > 350) {
          s.laserTimer = 0;
          s.lasers.push(
            { x: s.paddle.x - s.paddle.w / 3, y: s.paddle.y, vy: -12 },
            { x: s.paddle.x + s.paddle.w / 3, y: s.paddle.y, vy: -12 }
          );
          soundCtrl.playLaser();
        }
      }

      // Mover láseres y detectar impactos
      s.lasers.forEach((laser, lIdx) => {
        laser.y += laser.vy * speedMultiplier;

        // Limpiar fuera de límites
        if (laser.y < 0) {
          s.lasers.splice(lIdx, 1);
          return;
        }

        // Colisión láser con bloques
        s.bricks.forEach((brick) => {
          if (brick.hp <= 0) return;
          if (
            laser.x >= brick.x &&
            laser.x <= brick.x + brick.w &&
            laser.y >= brick.y &&
            laser.y <= brick.y + brick.h
          ) {
            brick.hp -= 1;
            s.score += 5;
            addPoints(5);
            s.lasers.splice(lIdx, 1);
            spawnParticles(laser.x, laser.y, '#F59E0B', 6);
            if (brick.hp <= 0) {
              soundCtrl.playBreakBrick();
              s.score += 50;
              addPoints(50);
              spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 20);
            } else {
              soundCtrl.playHitBrick(brick.hp);
            }
          }
        });
      });

      // 5. CAÍDA Y OBTENCIÓN DE POWER-UPS
      s.powerups.forEach((pu, puIdx) => {
        pu.y += pu.vy * speedMultiplier;

        // Fuera de límites
        if (pu.y > V_HEIGHT) {
          s.powerups.splice(puIdx, 1);
          return;
        }

        // Colisión con Paddle
        const pTop = s.paddle.y;
        const pLeft = s.paddle.x - s.paddle.w / 2;
        const pRight = s.paddle.x + s.paddle.w / 2;

        if (
          pu.y + pu.size / 2 >= pTop &&
          pu.y - pu.size / 2 <= pTop + s.paddle.h &&
          pu.x >= pLeft &&
          pu.x <= pRight
        ) {
          // Activar Power-up
          s.powerups.splice(puIdx, 1);
          applyPowerup(pu.type);
          return;
        }
      });

      // 6. ACTUALIZACIÓN DE PARTÍCULAS
      s.particles.forEach((p, pIdx) => {
        p.x += p.vx * speedMultiplier;
        p.y += p.vy * speedMultiplier;
        p.vy += 0.15 * speedMultiplier; // Gravedad
        p.life -= dt;
        p.alpha = Math.max(0, p.life / p.maxLife);

        if (p.life <= 0) {
          s.particles.splice(pIdx, 1);
        }
      });

      // 7. VERIFICACIÓN DE CONDICIONES DE JUEGO (VICTORIA / DERROTA)
      // Si no quedan pelotas y el juego está activo, se resta una vida
      if (s.balls.length === 0) {
        s.lives -= 1;
        if (s.lives <= 0) {
          s.gameState = 'GAMEOVER';
          soundCtrl.playGameOver();
        } else {
          // Crear nueva bola acoplada al paddle
          s.balls.push({
            x: s.paddle.x,
            y: s.paddle.y - 30,
            vx: 0,
            vy: 0,
            radius: 10,
            speed: s.baseSpeed,
            isDocked: true,
            isFire: false,
          });
          soundCtrl.playGameOver(); // Sonido triste por la vida perdida
        }
      }

      // Ladrillos limpios -> ¡Ganaste!
      const activeBricks = s.bricks.filter(b => b.hp > 0);
      if (activeBricks.length === 0) {
        s.gameState = 'WIN';
        soundCtrl.playLevelUp();
      }

      syncReactState();
    };

    // --- UTILIDADES AUXILIARES ---
    const spawnParticles = (x, y, color, count) => {
      const s = stateRef.current;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 4.5;
        const life = 0.4 + Math.random() * 0.6;
        s.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5, // Impulso inicial hacia arriba
          color,
          radius: 2 + Math.random() * 3.5,
          life,
          maxLife: life,
          alpha: 1,
        });
      }
    };

    const applyPowerup = (type) => {
      const s = stateRef.current;
      soundCtrl.playPowerup();

      if (type === 'MULTI') {
        // Duplicar pelotas activas, si no hay acoplada, lanzar 5 pelotas en abanico
        const baseBalls = [...s.balls];
        if (baseBalls.length === 1 && baseBalls[0].isDocked) {
          const main = baseBalls[0];
          main.isDocked = false;
          main.vx = 0;
          main.vy = -main.speed;
        }

        // Crear 4 pelotas extras en diferentes direcciones
        for (let i = 0; i < 4; i++) {
          const angle = -Math.PI / 2 + (i - 1.5) * 0.4;
          s.balls.push({
            x: s.paddle.x,
            y: s.paddle.y - 30,
            vx: Math.sin(angle) * s.baseSpeed,
            vy: -Math.abs(Math.cos(angle) * s.baseSpeed),
            radius: 10,
            speed: s.baseSpeed,
            isDocked: false,
            isFire: false,
          });
        }
      } else {
        // Duraciones para otros powerups: 10 a 15 segundos
        const duration = type === 'WIDE' ? 15000 : type === 'FIRE' ? 10000 : 12000;
        s.activePowerups[type] = duration;

        if (type === 'WIDE') {
          s.paddle.targetW = 240; // Expandir
        }
      }
      syncReactState();
    };

    // --- RENDERIZADO DEL ESCENARIO ---
    const draw = () => {
      const s = stateRef.current;
      ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

      // A. FONDO CYBER NEON CON CUADRÍCULA
      ctx.fillStyle = '#06060c';
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

      // Dibujar grilla neon difuminada
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < V_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, V_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < V_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(V_WIDTH, y);
        ctx.stroke();
      }

      // B. RENDER DE LADRILLOS
      s.bricks.forEach((brick) => {
        if (brick.hp <= 0) return;

        // Efecto Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = brick.color;

        // Gradiente interno del bloque
        const grad = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.h);
        grad.addColorStop(0, brick.color);
        grad.addColorStop(1, 'rgba(0,0,0,0.4)');

        ctx.fillStyle = grad;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.5;

        // Ladrillo redondeado
        const r = 6; // radio de bordes
        ctx.beginPath();
        ctx.moveTo(brick.x + r, brick.y);
        ctx.lineTo(brick.x + brick.w - r, brick.y);
        ctx.quadraticCurveTo(brick.x + brick.w, brick.y, brick.x + brick.w, brick.y + r);
        ctx.lineTo(brick.x + brick.w, brick.y + brick.h - r);
        ctx.quadraticCurveTo(brick.x + brick.w, brick.y + brick.h, brick.x + brick.w - r, brick.y + brick.h);
        ctx.lineTo(brick.x + r, brick.y + brick.h);
        ctx.quadraticCurveTo(brick.x, brick.y + brick.h, brick.x, brick.y + brick.h - r);
        ctx.lineTo(brick.x, brick.y + r);
        ctx.quadraticCurveTo(brick.x, brick.y, brick.x + r, brick.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Si es bloque especial, añadir ícono o símbolo
        if (brick.type !== 'normal') {
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#fff';
          ctx.font = 'black 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(POWERUPS[brick.type]?.symbol || '', brick.x + brick.w - 14, brick.y + 10);
        }

        // Escribir número de HP de vida en el centro
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(brick.hp.toString(), brick.x + brick.w / 2, brick.y + brick.h / 2);
      });

      // C. RENDER DE PADDLE NEON
      ctx.shadowBlur = 20;
      ctx.shadowColor = s.activePowerups.LASER ? '#F59E0B' : '#8B5CF6';
      
      const pGrad = ctx.createLinearGradient(
        s.paddle.x - s.paddle.w / 2,
        s.paddle.y,
        s.paddle.x + s.paddle.w / 2,
        s.paddle.y
      );
      if (s.activePowerups.LASER) {
        pGrad.addColorStop(0, '#D97706');
        pGrad.addColorStop(0.5, '#F59E0B');
        pGrad.addColorStop(1, '#D97706');
      } else {
        pGrad.addColorStop(0, '#6D28D9');
        pGrad.addColorStop(0.5, '#A78BFA');
        pGrad.addColorStop(1, '#6D28D9');
      }

      ctx.fillStyle = pGrad;
      ctx.beginPath();
      // Dibujar paddle en forma de cápsula futurista
      ctx.roundRect(s.paddle.x - s.paddle.w / 2, s.paddle.y, s.paddle.w, s.paddle.h, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // D. RENDER DE LÍNEA DE APUNTADO
      const pBall = s.balls.find(b => b.isDocked);
      if (pBall) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(255,255,255,0.6)';
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);

        const lineLen = 160;
        const targetX = pBall.x + Math.cos(s.aimAngle) * lineLen;
        const targetY = pBall.y + Math.sin(s.aimAngle) * lineLen;

        ctx.beginPath();
        ctx.moveTo(pBall.x, pBall.y);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
        ctx.setLineDash([]); // Resetear

        // Punta de flecha de apuntado
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(targetX, targetY, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // E. RENDER DE PELOTAS
      s.balls.forEach((ball) => {
        ctx.shadowBlur = 15;
        ctx.shadowColor = ball.isFire ? '#EF4444' : '#06B6D4';

        const ballGrad = ctx.createRadialGradient(
          ball.x - 3,
          ball.y - 3,
          2,
          ball.x,
          ball.y,
          ball.radius
        );
        if (ball.isFire) {
          ballGrad.addColorStop(0, '#FFFFFF');
          ballGrad.addColorStop(0.3, '#F59E0B');
          ballGrad.addColorStop(1, '#EF4444');
        } else {
          ballGrad.addColorStop(0, '#FFFFFF');
          ballGrad.addColorStop(0.3, '#22D3EE');
          ballGrad.addColorStop(1, '#0891B2');
        }

        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // F. RENDER DE LÁSERES
      s.lasers.forEach((laser) => {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#F59E0B';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(laser.x - 2, laser.y, 4, 15);
      });

      // G. RENDER DE POWER-UPS CAYENDO
      s.powerups.forEach((pu) => {
        const info = POWERUPS[pu.type];
        if (!info) return;

        ctx.shadowBlur = 12;
        ctx.shadowColor = info.color;

        // Esfera luminosa de poder
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.strokeStyle = info.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, pu.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Símbolo del emoji/icono central
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(info.symbol, pu.x, pu.y);
      });

      // H. RENDER DE PARTÍCULAS
      s.particles.forEach((p) => {
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0; // Resetear
      ctx.shadowBlur = 0;
    };

    // --- BUCLE CENTRAL (GAME LOOP) ---
    const tick = (timestamp) => {
      if (!stateRef.current.lastTime) stateRef.current.lastTime = timestamp;
      const elapsed = Math.min(0.03, (timestamp - stateRef.current.lastTime) / 1000); // Clampar
      stateRef.current.lastTime = timestamp;

      updatePhysics(elapsed);
      draw();

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [addPoints, syncReactState]);

  // Limpiar temporizadores si se desmonta
  useEffect(() => {
    return () => {
      if (stateRef.current.powerupTimer) clearTimeout(stateRef.current.powerupTimer);
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-black/20 backdrop-blur-sm relative overflow-hidden select-none">
      
      {/* Marcador superior y Controles */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-4 glass px-8 py-3 rounded-2xl border border-white/10 z-10">
        <div className="flex gap-8 text-xs font-black uppercase tracking-widest text-white/60">
          <div className="flex items-center gap-2">
            <Trophy size={14} className="text-purple-400" />
            Puntos: <span className="text-white font-bold text-sm ml-1">{score}</span>
          </div>
          <div className="flex items-center gap-2">
            <Heart size={14} className="text-red-500 fill-red-500 animate-pulse" />
            Vidas:{' '}
            <span className="text-white font-bold text-sm ml-1 flex gap-1">
              {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
                <span key={i}>❤️</span>
              ))}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10 shadow-inner">
            <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider">Velocidad:</span>
            <input 
              type="range" 
              min="4" 
              max="15" 
              step="0.5" 
              value={baseSpeed} 
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))} 
              className="w-20 accent-purple-500 cursor-pointer h-1.5 bg-white/20 rounded-lg appearance-none transition-all hover:bg-white/30" 
            />
            <span className="text-white font-bold text-xs min-w-[20px] text-center">{baseSpeed}</span>
          </div>

          <div className="text-xs font-black uppercase text-purple-400 tracking-wider">
            Nivel: <span className="text-white font-bold text-sm ml-1">{level}</span>
          </div>
          
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl glass hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>

      {/* CANVAS DEL JUEGO */}
      <div className="relative border border-white/10 rounded-[30px] overflow-hidden shadow-2xl bg-black max-w-[80vh] aspect-square w-full">
        <canvas
          ref={canvasRef}
          width={V_WIDTH}
          height={V_HEIGHT}
          className="w-full h-full object-contain cursor-none"
        />

        {/* --- PANTALLAS DE ESTADOS --- */}
        <AnimatePresence>
          {gameState === 'START' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="glass-dark p-12 rounded-[50px] border border-white/10 flex flex-col items-center gap-8 max-w-lg shadow-[0_0_80px_rgba(139,92,246,0.3)]"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-[30px] flex items-center justify-center text-5xl shadow-2xl animate-float">
                  🎮
                </div>
                <div className="space-y-3">
                  <h2 className="text-4xl font-display font-black tracking-tighter italic uppercase text-gradient">
                    Balls Crush
                  </h2>
                  <p className="text-xs font-black text-white/40 uppercase tracking-[0.3em]">
                    Bricks Breaker Gestural
                  </p>
                  <p className="text-[10px] text-white/50 leading-relaxed max-w-sm italic">
                    Desliza tu mano 🖐️ para mover la barra. Apunta con tu mano y realiza el pellizco 🤏 para lanzar/disparar. ¡Destruye todos los bloques!
                  </p>
                </div>

                <button
                  onClick={() => initGame(1)}
                  className="px-10 py-5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-3 border border-white/10 shadow-lg text-white"
                >
                  <Play fill="white" size={14} /> Comenzar Juego
                </button>
              </motion.div>
            </motion.div>
          )}

          {gameState === 'GAMEOVER' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center text-center z-20"
            >
              <div className="glass p-12 rounded-[40px] border border-white/10 flex flex-col items-center gap-6 max-w-md">
                <span className="text-7xl animate-pulse">💀</span>
                <h3 className="text-4xl font-display font-black text-red-500 italic uppercase">
                  Juego Terminado
                </h3>
                <p className="text-white/40 text-[10px] uppercase tracking-widest">
                  Lograste acumular {score} puntos en EduMotion
                </p>
                <button
                  onClick={() => initGame(1)}
                  className="px-8 py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg text-white"
                >
                  <RotateCcw size={14} /> Intentar de Nuevo
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'WIN' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center text-center z-20"
            >
              <div className="glass p-12 rounded-[40px] border border-white/10 flex flex-col items-center gap-6 max-w-md">
                <span className="text-7xl animate-bounce">🏆</span>
                <h3 className="text-4xl font-display font-black text-green-500 italic uppercase">
                  ¡Nivel Completado!
                </h3>
                <p className="text-white/40 text-[10px] uppercase tracking-widest">
                  ¡Excelente puntería y control gestual!
                </p>
                <button
                  onClick={() => initGame(level + 1)}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg text-white"
                >
                  <Play fill="white" size={12} /> Avanzar al Nivel {level + 1}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Indicador de Powerup Activo flotando */}
        {activePowerupLabel && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-300 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg animate-pulse z-10">
            <Zap size={10} className="fill-amber-300" />
            Poder: {activePowerupLabel}
          </div>
        )}
      </div>

      {/* Indicador inferior de ayuda gestual */}
      {gameState === 'PLAYING' && (
        <div className="mt-4 flex items-center gap-4 text-white/30 text-[9px] font-black uppercase tracking-widest glass px-6 py-2.5 rounded-full border border-white/5 animate-pulse">
          <Sparkles size={12} className="text-purple-400" />
          <span>Control: Mano izquierda/derecha para deslizar • Pellizco 🤏 para lanzar</span>
        </div>
      )}
    </div>
  );
};

export default BricksModule;
