import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, AlertCircle, CheckCircle2 } from 'lucide-react';

const COLORS = [
  { id: 'red', name: 'Rojo', hex: '#EF4444' },
  { id: 'blue', name: 'Azul', hex: '#3B82F6' },
  { id: 'green', name: 'Verde', hex: '#10B981' },
  { id: 'yellow', name: 'Amarillo', hex: '#F59E0B' },
  { id: 'purple', name: 'Morado', hex: '#8B5CF6' },
  { id: 'orange', name: 'Naranja', hex: '#F97316' },
];

const SHAPES = [
  { id: 'circle', name: 'Círculo', icon: '●' },
  { id: 'square', name: 'Cuadrado', icon: '■' },
  { id: 'triangle', name: 'Triángulo', icon: '▲' },
  { id: 'star', name: 'Estrella', icon: '★' },
];

const ShapesModule = memo(({ addPoints }) => {
  const [target, setTarget] = useState(null);
  const [options, setOptions] = useState([]);
  const [feedback, setFeedback] = useState(null); // 'success', 'error'
  const [dwellProgress, setDwellProgress] = useState({}); // { optionId: progress }
  const [streak, setStreak] = useState(0);

  const generateLevel = useCallback(() => {
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const randomShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const newTarget = { color: randomColor, shape: randomShape };
    
    let newOptions = [{ ...newTarget, id: Math.random() }];
    
    while (newOptions.length < 6) {
      const c = COLORS[Math.floor(Math.random() * COLORS.length)];
      const s = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      if (!newOptions.find(o => o.color.id === c.id && o.shape.id === s.id)) {
        newOptions.push({ color: c, shape: s, id: Math.random() });
      }
    }
    
    newOptions = newOptions.sort(() => Math.random() - 0.5);
    
    setTarget(newTarget);
    setOptions(newOptions);
    setFeedback(null);
    setDwellProgress({});
  }, []);

  useEffect(() => {
    generateLevel();
  }, [generateLevel]);

  // Interaction Loop (Decouplado de React render loop)
  useEffect(() => {
    if (!target || feedback) return;

    const checkCollisions = () => {
      const newProgress = { ...dwellProgress };
      let updated = false;

      // Obtener cursores actualizados de la variable global
      const handData = window.latestHandData || { cursors: [] };
      const cursors = handData.cursors || [];

      options.forEach(opt => {
        const element = document.getElementById(`opt-${opt.id}`);
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const hitArea = {
          left: rect.left - 20,
          right: rect.right + 20,
          top: rect.top - 20,
          bottom: rect.bottom + 20
        };

        const isHit = cursors.some(c => 
          c && c.isVisible &&
          c.x >= hitArea.left && c.x <= hitArea.right &&
          c.y >= hitArea.top && c.y <= hitArea.bottom
        );

        if (isHit) {
          updated = true;
          const current = newProgress[opt.id] || 0;
          const next = current + 0.08; 
          
          if (next >= 1) {
            handleSelection(opt);
            return;
          }
          newProgress[opt.id] = next;
        } else if (newProgress[opt.id]) {
          updated = true;
          newProgress[opt.id] = Math.max(0, newProgress[opt.id] - 0.1);
        }
      });

      if (updated) setDwellProgress(newProgress);
    };

    const interval = setInterval(checkCollisions, 50);
    return () => clearInterval(interval);
  }, [options, target, feedback, dwellProgress]);

  const handleSelection = (opt) => {
    const isCorrect = opt.color.id === target.color.id && opt.shape.id === target.shape.id;
    
    if (isCorrect) {
      setFeedback('success');
      addPoints(50 + (streak * 10));
      setStreak(s => s + 1);
      setTimeout(generateLevel, 1500);
    } else {
      setFeedback('error');
      setStreak(0);
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  if (!target) return null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-between px-6 py-4 overflow-hidden bg-black/20 backdrop-blur-sm">
      {/* Instruction Header */}
      <div className="w-full flex flex-col items-center gap-2 shrink-0">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass-dark px-8 py-3 rounded-[24px] border border-white/10 shadow-xl flex items-center gap-4"
        >
          <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.4em]">Toca el</p>
          <h2 className="text-2xl md:text-3xl font-display font-black italic uppercase tracking-tighter" style={{ color: target.color.hex }}>
            {target.shape.name} {target.color.name}
          </h2>
          <AnimatePresence>
            {streak > 1 && (
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                className="flex items-center gap-1 text-amber-400 font-black italic uppercase text-[10px] ml-2"
              >
                <Star size={12} fill="currentColor" className="animate-pulse" />
                ×{streak}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Options Grid — fills remaining space */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center py-3">
        <div className="grid grid-cols-3 gap-4 w-full max-w-4xl h-full" style={{ gridTemplateRows: 'repeat(2, minmax(0, 1fr))' }}>
          {options.map((opt) => (
            <motion.div
              key={opt.id}
              id={`opt-${opt.id}`}
              whileHover={{ scale: 1.03 }}
              className={`relative glass rounded-[28px] border-4 flex items-center justify-center shadow-xl transition-all duration-300 ${
                feedback === 'success' && opt.color.id === target.color.id && opt.shape.id === target.shape.id
                  ? 'border-green-500 scale-105 shadow-green-500/40 bg-green-500/10'
                  : feedback === 'error' && dwellProgress[opt.id] > 0.5
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-white/5'
              }`}
              style={{ color: opt.color.hex }}
            >
              <span className="text-6xl md:text-7xl drop-shadow-2xl select-none">{opt.shape.icon}</span>

              {dwellProgress[opt.id] > 0 && (
                <svg className="absolute inset-0 w-full h-full p-2 -rotate-90 pointer-events-none">
                  <circle
                    cx="50%" cy="50%" r="45%"
                    fill="none"
                    stroke="white"
                    strokeWidth="4"
                    strokeDasharray="283"
                    strokeDashoffset={283 * (1 - dwellProgress[opt.id])}
                    className="opacity-40"
                  />
                </svg>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom hint */}
      <p className="shrink-0 text-[9px] font-black uppercase tracking-[0.3em] text-white/20 pb-1">
        Mueve tu mano sobre la opción correcta
      </p>

      {/* Feedback Overlay */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className={`px-10 py-8 rounded-[48px] glass-dark border-4 flex flex-col items-center gap-4 shadow-[0_0_100px_rgba(0,0,0,0.8)] ${
              feedback === 'success' ? 'border-green-500/50' : 'border-red-500/50'
            }`}>
              {feedback === 'success' ? (
                <>
                  <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={64} className="text-green-500" />
                  </div>
                  <h3 className="text-4xl font-display font-black text-green-500 italic uppercase">¡Muy bien!</h3>
                </>
              ) : (
                <>
                  <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertCircle size={64} className="text-red-500" />
                  </div>
                  <h3 className="text-4xl font-display font-black text-red-500 italic uppercase">¡Intenta de nuevo!</h3>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default ShapesModule;
