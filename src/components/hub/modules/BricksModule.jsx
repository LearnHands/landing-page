import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Volume2, VolumeX, Trophy, Heart, Zap, Sparkles } from 'lucide-react';
import HandButton from '../HandButton';

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

const POWERUPS = {
  MULTI: { id: 'multi', label: 'Multi-Pelotas', color: '#10B981', symbol: '🍒' },
  FIRE: { id: 'fire', label: 'Bola de Fuego', color: '#EF4444', symbol: '🔥' },
  LASER: { id: 'laser', label: 'Súper Láser', color: '#F59E0B', symbol: '⚡' },
  WIDE: { id: 'wide', label: 'Barra Gigante', color: '#3B82F6', symbol: '↔️' },
};

const BricksModule = memo(({ addPoints }) => {
  const canvasRef = useRef(null);
  
  // Estados del juego React
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState('START'); // START, PLAYING, GAMEOVER, WIN
  const [muted, setMuted] = useState(false);
  const [activePowerupLabel, setActivePowerupLabel] = useState(null);
  const [baseSpeed, setBaseSpeed] = useState(11); // Por defecto más ágil (11 en lugar de 7)

  // Referencias mutables para el ciclo Canvas (evita re-renders a 60 FPS)
  const stateRef = useRef({
    gameState: 'START',
    paddle: { x: window.innerWidth / 2, y: window.innerHeight - 80, w: 160, targetW: 160, h: 24 },
    balls: [],
    bricks: [],
    particles: [],
    powerups: [],
    lasers: [],
    laserTimer: 0,
    powerupTimer: null,
    activePowerups: {},
    score: 0,
    level: 1,
    lives: 3,
    aimAngle: -Math.PI / 2,
    lastTime: 0,
    lastPointsAwarded: 0,
    baseSpeed: 11,
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Sincronizar estado mutable con el visual reactivo
  const syncReactState = useCallback(() => {
    const s = stateRef.current;
    if (s.score !== score) setScore(s.score);
    if (s.level !== level) setLevel(s.level);
    if (s.lives !== lives) setLives(s.lives);
    if (s.gameState !== gameState) setGameState(s.gameState);

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

  // --- GENERACIÓN DE LADRILLOS PARA EL NIVEL (Ajustado dinámicamente al ancho de la pantalla) ---
  const generateBricks = useCallback((lvl, width) => {
    const cols = 8;
    const rows = Math.min(3 + lvl, 6);
    const brickW = width / cols - 12;
    const brickH = 28;
    const startY = 160; // Desplazado abajo para no tapar el marcador
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
        let type = 'normal';
        const rand = Math.random();
        if (rand < 0.05) type = 'MULTI';
        else if (rand < 0.10) type = 'FIRE';
        else if (rand < 0.15) type = 'LASER';
        else if (rand < 0.20) type = 'WIDE';

        newBricks.push({
          id: `${r}-${c}-${Math.random()}`,
          x: c * (brickW + 12) + 6,
          y: startY + r * (brickH + 12),
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
    
    s.width = window.innerWidth;
    s.height = window.innerHeight;

    s.gameState = 'PLAYING';
    s.level = lvl;
    s.score = lvl === 1 ? 0 : s.score;
    s.lives = lvl === 1 ? 3 : s.lives;
    s.bricks = generateBricks(lvl, s.width);
    
    s.paddle.y = s.height - 90;
    s.paddle.w = 160;
    s.paddle.targetW = 160;
    s.paddle.h = 24;

    s.balls = [{
      x: s.width / 2,
      y: s.paddle.y - 30,
      vx: 0,
      vy: 0,
      radius: 12,
      speed: s.baseSpeed,
      isDocked: true,
      isFire: false,
    }];
    s.particles = [];
    s.powerups = [];
    s.lasers = [];
    s.activePowerups = {};
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
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stateRef.current.width = window.innerWidth;
    stateRef.current.height = window.innerHeight;

    const ctx = canvas.getContext('2d');

    const updatePhysics = (dt) => {
      const s = stateRef.current;
      if (s.gameState !== 'PLAYING') return;

      const speedMultiplier = dt * 60; 

      // 1. LEER DATOS DE LA MANO DESDE WINDOW GLOBAL
      const handData = window.latestHandData || { cursors: [], gestures: [] };
      const cursors = handData.cursors || [];
      const gestures = handData.gestures || [];

      // CONTROL DE PADDLE SUAVE CON GESTOS (1:1 con la pantalla)
      let targetX = s.paddle.x;
      if (cursors && cursors.length > 0 && cursors[0]?.isVisible) {
        const cX = cursors[0].x;
        
        if (s.smoothedCursorX === undefined) {
          s.smoothedCursorX = cX;
        }
        
        // Filtro suave para eliminar la vibración
        s.smoothedCursorX = s.smoothedCursorX * 0.75 + cX * 0.25;
        targetX = Math.max(s.paddle.w / 2, Math.min(s.width - s.paddle.w / 2, s.smoothedCursorX));
      } else {
        s.smoothedCursorX = undefined;
      }

      const paddleLerp = 1 - Math.exp(-22 * dt);
      s.paddle.x += (targetX - s.paddle.x) * paddleLerp;

      const widthLerp = 1 - Math.exp(-8 * dt);
      s.paddle.w += (s.paddle.targetW - s.paddle.w) * widthLerp;

      // Actualizar temporizadores de powerups
      Object.keys(s.activePowerups).forEach(key => {
        if (s.activePowerups[key] > 0) {
          s.activePowerups[key] -= dt * 1000;
          if (s.activePowerups[key] <= 0) {
            delete s.activePowerups[key];
            if (key === 'WIDE') s.paddle.targetW = 160;
          }
        }
      });

      // 2. DISPARAR PELOTA DESDE PADDLE (Aim & Shoot con Pinza)
      const primaryBall = s.balls.find(b => b.isDocked);
      if (primaryBall) {
        primaryBall.x = s.paddle.x;
        primaryBall.y = s.paddle.y - primaryBall.radius - 2;

        if (cursors && cursors.length > 0 && cursors[0]?.isVisible) {
          const cX = cursors[0].x;
          const cY = cursors[0].y;
          const angle = Math.atan2(cY - primaryBall.y, cX - primaryBall.x);
          if (angle < -Math.PI * 0.85 || angle > -Math.PI * 0.15) {
            s.aimAngle = angle;
          } else {
            s.aimAngle = Math.max(-Math.PI * 0.85, Math.min(-Math.PI * 0.15, angle));
          }
        } else {
          s.aimAngle = -Math.PI / 2 + Math.sin(Date.now() / 300) * 0.8;
        }

        const isPinching = gestures && gestures[0]?.isPinching;
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

        ball.isFire = !!s.activePowerups.FIRE;

        ball.x += ball.vx * speedMultiplier;
        ball.y += ball.vy * speedMultiplier;

        // Rebotes en los límites laterales de la pantalla
        if (ball.x - ball.radius < 0) {
          ball.x = ball.radius;
          ball.vx = Math.abs(ball.vx);
          soundCtrl.playWall();
        } else if (ball.x + ball.radius > s.width) {
          ball.x = s.width - ball.radius;
          ball.vx = -Math.abs(ball.vx);
          soundCtrl.playWall();
        }

        // Rebote en el techo
        if (ball.y - ball.radius < 0) {
          ball.y = ball.radius;
          ball.vy = Math.abs(ball.vy);
          soundCtrl.playWall();
        }

        // Caída por abajo
        if (ball.y - ball.radius > s.height) {
          s.balls.splice(bIdx, 1);
          return;
        }

        // Rebote en el Paddle
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
          const hitPos = (ball.x - s.paddle.x) / (s.paddle.w / 2);
          const angle = -Math.PI / 2 + hitPos * 1.0;
          
          ball.vx = Math.sin(angle) * ball.speed;
          ball.vy = -Math.abs(Math.cos(angle) * ball.speed);
          
          ball.y = pTop - ball.radius;
          soundCtrl.playBounce();
        }

        // Ladrillos
        s.bricks.forEach((brick) => {
          if (brick.hp <= 0) return;

          const bLeft = brick.x;
          const bRight = brick.x + brick.w;
          const bTop = brick.y;
          const bBottom = brick.y + brick.h;

          const closestX = Math.max(bLeft, Math.min(ball.x, bRight));
          const closestY = Math.max(bTop, Math.min(ball.y, bBottom));
          const dist = Math.hypot(ball.x - closestX, ball.y - closestY);

          if (dist < ball.radius) {
            const damage = ball.isFire ? 3 : 1;
            brick.hp -= damage;
            s.score += 10;
            addPoints(10);

            if (brick.hp > 0) {
              soundCtrl.playHitBrick(brick.hp);
              spawnParticles(closestX, closestY, brick.color, 8);
            } else {
              soundCtrl.playBreakBrick();
              s.score += 50;
              addPoints(50);
              spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 24);

              if (Math.random() < 0.3 || brick.type !== 'normal') {
                const types = Object.keys(POWERUPS);
                const dropType = brick.type !== 'normal' ? brick.type : types[Math.floor(Math.random() * types.length)];
                s.powerups.push({
                  x: brick.x + brick.w / 2,
                  y: brick.y + brick.h / 2,
                  type: dropType,
                  vy: 3.5,
                  size: 20
                });
              }
            }

            if (!ball.isFire) {
              const fromLeft = ball.x < bLeft;
              const fromRight = ball.x > bRight;
              const fromTop = ball.y < bTop;
              const fromBottom = ball.y > bBottom;

              if (fromLeft || fromRight) {
                ball.vx *= -1;
                ball.x += ball.vx * 0.5;
              }
              if (fromTop || fromBottom) {
                ball.vy *= -1;
                ball.y += ball.vy * 0.5;
              }
            }
          }
        });
      });

      // 4. ACTUALIZACIÓN DE LÁSERES
      if (s.activePowerups.LASER) {
        s.laserTimer += dt * 1000;
        if (s.laserTimer > 350) {
          s.laserTimer = 0;
          s.lasers.push(
            { x: s.paddle.x - s.paddle.w / 3, y: s.paddle.y, vy: -12 },
            { x: s.paddle.x + s.paddle.w / 3, y: s.paddle.y, vy: -12 }
          );
          soundCtrl.playLaser();
        }
      }

      s.lasers.forEach((laser, lIdx) => {
        laser.y += laser.vy * speedMultiplier;

        if (laser.y < 0) {
          s.lasers.splice(lIdx, 1);
          return;
        }

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

        if (pu.y > s.height) {
          s.powerups.splice(puIdx, 1);
          return;
        }

        const pTop = s.paddle.y;
        const pLeft = s.paddle.x - s.paddle.w / 2;
        const pRight = s.paddle.x + s.paddle.w / 2;

        if (
          pu.y + pu.size / 2 >= pTop &&
          pu.y - pu.size / 2 <= pTop + s.paddle.h &&
          pu.x >= pLeft &&
          pu.x <= pRight
        ) {
          s.powerups.splice(puIdx, 1);
          applyPowerup(pu.type);
          return;
        }
      });

      // 6. ACTUALIZACIÓN DE PARTÍCULAS
      s.particles.forEach((p, pIdx) => {
        p.x += p.vx * speedMultiplier;
        p.y += p.vy * speedMultiplier;
        p.vy += 0.15 * speedMultiplier;
        p.life -= dt;
        p.alpha = Math.max(0, p.life / p.maxLife);

        if (p.life <= 0) {
          s.particles.splice(pIdx, 1);
        }
      });

      // 7. VERIFICACIÓN DE CONDICIONES
      if (s.balls.length === 0) {
        s.lives -= 1;
        if (s.lives <= 0) {
          s.gameState = 'GAMEOVER';
          soundCtrl.playGameOver();
        } else {
          s.balls.push({
            x: s.paddle.x,
            y: s.paddle.y - 30,
            vx: 0,
            vy: 0,
            radius: 12,
            speed: s.baseSpeed,
            isDocked: true,
            isFire: false,
          });
          soundCtrl.playGameOver();
        }
      }

      const activeBricks = s.bricks.filter(b => b.hp > 0);
      if (activeBricks.length === 0) {
        s.gameState = 'WIN';
        soundCtrl.playLevelUp();
      }

      syncReactState();
    };

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
          vy: Math.sin(angle) * speed - 1.5,
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
        const baseBalls = [...s.balls];
        if (baseBalls.length === 1 && baseBalls[0].isDocked) {
          const main = baseBalls[0];
          main.isDocked = false;
          main.vx = 0;
          main.vy = -main.speed;
        }

        for (let i = 0; i < 4; i++) {
          const angle = -Math.PI / 2 + (i - 1.5) * 0.4;
          s.balls.push({
            x: s.paddle.x,
            y: s.paddle.y - 30,
            vx: Math.sin(angle) * s.baseSpeed,
            vy: -Math.abs(Math.cos(angle) * s.baseSpeed),
            radius: 12,
            speed: s.baseSpeed,
            isDocked: false,
            isFire: false,
          });
        }
      } else {
        const duration = type === 'WIDE' ? 15000 : type === 'FIRE' ? 10000 : 12000;
        s.activePowerups[type] = duration;

        if (type === 'WIDE') {
          s.paddle.targetW = 260; 
        }
      }
      syncReactState();
    };

    // --- RENDERIZADO (Transparente para ver el feed de video detrás) ---
    const draw = () => {
      const s = stateRef.current;
      ctx.clearRect(0, 0, s.width, s.height);

      // Fondo semi-transparente cyber neon
      ctx.fillStyle = 'rgba(3, 3, 11, 0.25)';
      ctx.fillRect(0, 0, s.width, s.height);

      // Rejilla neón
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 45;
      for (let x = 0; x < s.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, s.height);
        ctx.stroke();
      }
      for (let y = 0; y < s.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(s.width, y);
        ctx.stroke();
      }

      // Ladrillos
      s.bricks.forEach((brick) => {
        if (brick.hp <= 0) return;

        ctx.shadowBlur = 10;
        ctx.shadowColor = brick.color;

        const grad = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.h);
        grad.addColorStop(0, brick.color);
        grad.addColorStop(1, 'rgba(0,0,0,0.5)');

        ctx.fillStyle = grad;
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 1.5;

        const r = 6;
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

        if (brick.type !== 'normal') {
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(POWERUPS[brick.type]?.symbol || '', brick.x + brick.w - 14, brick.y + 10);
        }

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'black 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(brick.hp.toString(), brick.x + brick.w / 2, brick.y + brick.h / 2);
      });

      // Paddle
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
      ctx.roundRect(s.paddle.x - s.paddle.w / 2, s.paddle.y, s.paddle.w, s.paddle.h, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Línea de apuntado
      const pBall = s.balls.find(b => b.isDocked);
      if (pBall) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(255,255,255,0.65)';
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);

        const lineLen = 170;
        const targetX = pBall.x + Math.cos(s.aimAngle) * lineLen;
        const targetY = pBall.y + Math.sin(s.aimAngle) * lineLen;

        ctx.beginPath();
        ctx.moveTo(pBall.x, pBall.y);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(targetX, targetY, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pelotas
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

      // Láseres
      s.lasers.forEach((laser) => {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#F59E0B';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(laser.x - 2, laser.y, 4, 15);
      });

      // Power-ups
      s.powerups.forEach((pu) => {
        const info = POWERUPS[pu.type];
        if (!info) return;

        ctx.shadowBlur = 12;
        ctx.shadowColor = info.color;

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.strokeStyle = info.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, pu.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(info.symbol, pu.x, pu.y);
      });

      // Partículas
      s.particles.forEach((p) => {
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
    };

    const tick = (timestamp) => {
      if (!stateRef.current.lastTime) stateRef.current.lastTime = timestamp;
      const elapsed = Math.min(0.03, (timestamp - stateRef.current.lastTime) / 1000);
      stateRef.current.lastTime = timestamp;

      updatePhysics(elapsed);
      draw();

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        stateRef.current.width = window.innerWidth;
        stateRef.current.height = window.innerHeight;
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [addPoints, syncReactState]);

  useEffect(() => {
    return () => {
      if (stateRef.current.powerupTimer) clearTimeout(stateRef.current.powerupTimer);
    };
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full flex flex-col select-none overflow-hidden bg-transparent">
      
      {/* Marcador Superior Flotante */}
      <div className="w-full flex items-center justify-between px-12 py-3 bg-black/40 backdrop-blur-md border-b border-white/5 z-10">
        <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-white/50">
          <div className="flex items-center gap-2">
            <Trophy size={14} className="text-purple-400 animate-bounce-slow" />
            Puntos: <span className="text-purple-400 font-black text-sm ml-1">{score}</span>
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
          <div className="flex items-center gap-3 bg-white/5 px-4 py-1.5 rounded-full border border-white/10 shadow-inner">
            <span className="text-[9px] font-black uppercase text-purple-400 tracking-wider">Velocidad:</span>
            <input 
              type="range" 
              min="7" 
              max="22" 
              step="0.5" 
              value={baseSpeed} 
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))} 
              className="w-20 accent-purple-500 cursor-pointer h-1.5 bg-white/20 rounded-lg appearance-none transition-all" 
            />
            <span className="text-white font-bold text-xs min-w-[20px] text-center">{baseSpeed}</span>
          </div>

          <div className="text-[10px] font-black uppercase text-purple-400 tracking-wider">
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

      {/* CANVAS DEL JUEGO COMPLETO */}
      <div className="flex-1 relative bg-transparent w-full h-full">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-none bg-transparent"
        />

        {/* --- PANTALLAS DE ESTADOS GESTUALES (HandButton) --- */}
        <AnimatePresence>
          {gameState === 'START' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center z-30"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="glass-dark p-12 rounded-[50px] border border-white/10 flex flex-col items-center gap-8 max-w-lg shadow-[0_0_80px_rgba(139,92,246,0.25)]"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-[30px] flex items-center justify-center text-5xl shadow-2xl animate-float">
                  🎮
                </div>
                <div className="space-y-3">
                  <h2 className="text-4xl font-display font-black tracking-tighter italic uppercase text-gradient">
                    Balls Crush
                  </h2>
                  <p className="text-xs font-black text-white/40 uppercase tracking-[0.3em]">
                    Destructor de Ladrillos Gestual
                  </p>
                  <p className="text-[10px] text-white/50 leading-relaxed max-w-sm italic">
                    Desliza tu mano 🖐️ para mover la barra lateralmente. Apunta con tu mano y realiza un pellizco 🤏 para lanzar o disparar.
                  </p>
                </div>

                <HandButton
                  onClick={() => initGame(1)}
                  className="px-12 py-5 text-sm"
                  variant="purple"
                  dwellMs={900}
                >
                  <Play fill="white" size={14} /> Comenzar Juego
                </HandButton>
              </motion.div>
            </motion.div>
          )}

          {gameState === 'GAMEOVER' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-center z-30"
            >
              <div className="glass p-12 rounded-[40px] border border-white/10 flex flex-col items-center gap-6 max-w-md">
                <span className="text-7xl animate-pulse">💀</span>
                <h3 className="text-4xl font-display font-black text-red-500 italic uppercase">
                  Juego Terminado
                </h3>
                <p className="text-white/50 text-xs uppercase tracking-widest font-black mb-4">
                  Obtuviste {score} puntos en LearnHands
                </p>
                <HandButton
                  onClick={() => initGame(1)}
                  className="px-10 py-5 text-xs"
                  variant="red"
                  dwellMs={900}
                >
                  <RotateCcw size={14} /> Intentar de Nuevo
                </HandButton>
              </div>
            </motion.div>
          )}

          {gameState === 'WIN' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center text-center z-30"
            >
              <div className="glass p-12 rounded-[40px] border border-white/10 flex flex-col items-center gap-6 max-w-md">
                <span className="text-7xl animate-bounce">🏆</span>
                <h3 className="text-4xl font-display font-black text-green-500 italic uppercase">
                  ¡Nivel Completado!
                </h3>
                <p className="text-white/40 text-[9px] uppercase tracking-widest font-black mb-4">
                  ¡Excelente control y puntería de manos!
                </p>
                <HandButton
                  onClick={() => initGame(level + 1)}
                  className="px-10 py-5 text-xs"
                  variant="emerald"
                  dwellMs={900}
                >
                  <Play fill="white" size={12} /> Avanzar al Nivel {level + 1}
                </HandButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {activePowerupLabel && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-300 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg animate-pulse z-10">
            <Zap size={10} className="fill-amber-300" />
            Poder: {activePowerupLabel}
          </div>
        )}
      </div>

      {gameState === 'PLAYING' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 text-white/30 text-[9px] font-black uppercase tracking-widest glass px-6 py-2.5 rounded-full border border-white/5 animate-pulse z-20">
          <Sparkles size={12} className="text-purple-400" />
          <span>Control: Desliza tu mano • Pellizco 🤏 para lanzar</span>
        </div>
      )}
    </div>
  );
});

export default BricksModule;
