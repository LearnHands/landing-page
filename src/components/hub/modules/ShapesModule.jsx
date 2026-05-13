import React, { useState, useEffect, useCallback, useRef } from 'react';
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

const ShapesModule = ({ cursors, addPoints }) => {
  const [target, setTarget] = useState(null);
  const [options, setOptions] = useState([]);
  const [feedback, setFeedback] = useState(null); // 'success', 'error'
  const [dwellProgress, setDwellProgress] = useState({}); // { optionId: progress }
  const [streak, setStreak] = useState(0);

  const generateLevel = useCallback(() => {
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const randomShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const newTarget = { color: randomColor, shape: randomShape };
    
    // Generate 6 options, ensuring at least one is the target
    let newOptions = [{ ...newTarget, id: Math.random() }];
    
    while (newOptions.length < 6) {
      const c = COLORS[Math.floor(Math.random() * COLORS.length)];
      const s = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      // Avoid duplicates
      if (!newOptions.find(o => o.color.id === c.id && o.shape.id === s.id)) {
        newOptions.push({ color: c, shape: s, id: Math.random() });
      }
    }
    
    // Shuffle
    newOptions = newOptions.sort(() => Math.random() - 0.5);
    
    setTarget(newTarget);
    setOptions(newOptions);
    setFeedback(null);
    setDwellProgress({});
  }, []);

  useEffect(() => {
    generateLevel();
  }, [generateLevel]);

  // Interaction Loop
  useEffect(() => {
    if (!target || feedback) return;

    const checkCollisions = () => {
      const newProgress = { ...dwellProgress };
      let updated = false;

      options.forEach(opt => {
        const element = document.getElementById(`opt-${opt.id}`);
        if (!element) return;

        const rect = element.getBoundingClientRect();
        // Add padding for easier hitting
        const hitArea = {
          left: rect.left - 20,
          right: rect.right + 20,
          top: rect.top - 20,
          bottom: rect.bottom + 20
        };

        const isHit = cursors.some(c => 
          c.x >= hitArea.left && c.x <= hitArea.right &&
          c.y >= hitArea.top && c.y <= hitArea.bottom
        );

        if (isHit) {
          updated = true;
          const current = newProgress[opt.id] || 0;
          const next = current + 0.08; // Fast dwell (~0.5s)
          
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
  }, [cursors, options, target, feedback, dwellProgress]);

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
    <div className="w-full h-full flex flex-col items-center p-12 overflow-hidden bg-black/20 backdrop-blur-sm">
      {/* Instruction Header */}
      <div className="text-center space-y-6 mb-16">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass-dark px-12 py-6 rounded-[30px] border border-white/10 shadow-2xl"
        >
          <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Instrucción</p>
          <h2 className="text-4xl md:text-5xl font-display font-black italic uppercase tracking-tighter">
            Toca el <span style={{ color: target.color.hex }}>{target.shape.name} {target.color.name}</span>
          </h2>
        </motion.div>
        
        {/* Streak Indicator */}
        <AnimatePresence>
          {streak > 1 && (
            <motion.div 
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="flex items-center justify-center gap-2 text-amber-400 font-black italic uppercase text-xs"
            >
              <Star size={16} fill="currentColor" className="animate-pulse" />
              Racha x{streak}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-12 max-w-5xl w-full">
        {options.map((opt) => (
          <motion.div
            key={opt.id}
            id={`opt-${opt.id}`}
            whileHover={{ scale: 1.05 }}
            className={`relative aspect-square glass rounded-[40px] border-4 flex items-center justify-center text-8xl shadow-2xl transition-all duration-300 ${
              feedback === 'success' && opt.color.id === target.color.id && opt.shape.id === target.shape.id 
                ? 'border-green-500 scale-110 shadow-green-500/40 bg-green-500/10' 
                : feedback === 'error' && dwellProgress[opt.id] > 0.5
                ? 'border-red-500 bg-red-500/10'
                : 'border-white/5'
            }`}
            style={{ color: opt.color.hex }}
          >
            {/* Shape Rendering */}
            <span className="drop-shadow-2xl">{opt.shape.icon}</span>
            
            {/* Dwell Progress Ring */}
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

      {/* Feedback Overlay */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className={`p-12 rounded-[60px] glass-dark border-4 flex flex-col items-center gap-6 shadow-[0_0_100px_rgba(0,0,0,0.8)] ${
              feedback === 'success' ? 'border-green-500/50' : 'border-red-500/50'
            }`}>
              {feedback === 'success' ? (
                <>
                  <div className="w-32 h-32 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={80} className="text-green-500" />
                  </div>
                  <h3 className="text-5xl font-display font-black text-green-500 italic uppercase">¡Muy bien!</h3>
                </>
              ) : (
                <>
                  <div className="w-32 h-32 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertCircle size={80} className="text-red-500" />
                  </div>
                  <h3 className="text-5xl font-display font-black text-red-500 italic uppercase">¡Intenta de nuevo!</h3>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Visual Aid (Bouncing Hint after 8s) */}
      <AnimatePresence>
        {!feedback && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 0.3 }}
            className="mt-auto pb-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20"
          >
            Mueve tu mano sobre la opción correcta
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShapesModule;
