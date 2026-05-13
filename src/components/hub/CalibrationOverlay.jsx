import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CheckCircle, MousePointer2 } from 'lucide-react';

const CalibrationOverlay = ({ landmarks = [], onComplete }) => {
  const [step, setStep] = useState(0); 
  const [progress, setProgress] = useState(0);
  const samplesRef = useRef([]);
  const [bounds, setBounds] = useState({ minX: 0.1, minY: 0.1, maxX: 0.9, maxY: 0.9 });

  const steps = [
    { title: "Calibración de IA", desc: "Ajustemos el sensor a tu espacio de trabajo.", icon: "🎯" },
    { title: "Esquina Superior Izquierda", desc: "Mueve tu mano a la esquina superior izquierda del área donde quieras jugar.", icon: "↖️" },
    { title: "Esquina Inferior Derecha", desc: "Ahora mueve tu mano a la esquina inferior derecha.", icon: "↘️" },
    { title: "¡Calibrado!", desc: "Todo listo para jugar.", icon: <CheckCircle size={40} className="text-green-400" /> }
  ];

  // Logic to collect and average samples for more precision
  useEffect(() => {
    if (step === 1 || step === 2) {
      if (landmarks.length > 0 && landmarks[0][8]) {
        const indexTip = landmarks[0][8];
        const normX = 1 - indexTip.x;
        const normY = indexTip.y;
        
        samplesRef.current.push({ x: normX, y: normY });
        
        // Progress based on samples count (we want about 30 samples = ~1 sec at 30fps)
        const newProgress = Math.min(samplesRef.current.length / 30, 1);
        setProgress(newProgress);

        if (newProgress >= 1) {
          // Calculate average
          const avgX = samplesRef.current.reduce((acc, s) => acc + s.x, 0) / samplesRef.current.length;
          const avgY = samplesRef.current.reduce((acc, s) => acc + s.y, 0) / samplesRef.current.length;
          
          if (step === 1) {
            setBounds(b => ({ ...b, minX: avgX, minY: avgY }));
          } else {
            setBounds(b => ({ ...b, maxX: avgX, maxY: avgY }));
          }
          
          samplesRef.current = [];
          setStep(prev => prev + 1);
          setProgress(0);
        }
      }
    }
  }, [step, landmarks]);

  useEffect(() => {
    if (step === 3) {
      const timer = setTimeout(() => {
        onComplete(bounds);
      }, 1500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]); // Removed bounds and onComplete to avoid continuous timeout clearing from rapid re-renders

  // Current hand position for feedback
  const currentHandPos = landmarks[0]?.[8] ? {
    x: (1 - landmarks[0][8].x) * 100,
    y: landmarks[0][8].y * 100
  } : null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-8 overflow-hidden">
      {/* Hand Feedback Trace */}
      {currentHandPos && (
        <motion.div 
          className="fixed w-6 h-6 border-2 border-white/20 rounded-full z-0 pointer-events-none"
          animate={{ left: `${currentHandPos.x}%`, top: `${currentHandPos.y}%` }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        >
          <div className="absolute inset-0 bg-white/10 rounded-full animate-ping" />
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        <motion.div 
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.1 }}
          className="glass-dark p-12 rounded-[50px] border border-white/10 max-w-lg w-full text-center space-y-8 shadow-2xl relative z-10"
        >
          <div className="flex justify-center">
             <div className="w-24 h-24 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 rounded-[35px] flex items-center justify-center text-5xl border border-white/10 shadow-inner">
                {steps[step].icon}
             </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-display font-black italic uppercase text-gradient tracking-tight">{steps[step].title}</h2>
            <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] leading-relaxed px-4">{steps[step].desc}</p>
          </div>

          {step === 0 && (
            <div className="flex flex-col gap-4 pt-4">
              <button 
                onClick={() => setStep(1)}
                className="px-12 py-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-3xl font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-xl w-full flex items-center justify-center gap-3"
              >
                <Target size={18} /> Iniciar Calibración
              </button>
              <button 
                onClick={() => onComplete(null)}
                className="text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors py-2"
              >
                Omitir y usar valores por defecto
              </button>
            </div>
          )}

          {(step === 1 || step === 2) && (
            <div className="space-y-6 pt-4">
               <div className="relative h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 p-1">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }} 
                  />
               </div>
               <div className="flex justify-center items-center">
                 <div className="flex items-center gap-3 px-6 py-2 bg-purple-500/10 rounded-full border border-purple-500/20">
                   <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse shadow-[0_0_10px_#a855f7]" />
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400">
                      Mantén la posición...
                   </p>
                 </div>
               </div>
            </div>
          )}

          {step === 3 && (
            <div className="py-4 animate-pulse">
               <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">Iniciando EduMotion Hub...</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      
      {/* Visual Target Corners during steps */}
      <AnimatePresence>
        {step === 1 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-12 left-12 w-40 h-40 border-4 border-dashed border-purple-500/30 rounded-full flex items-center justify-center pointer-events-none"
          >
            <div className="w-4 h-4 bg-purple-500 rounded-full animate-ping" />
            <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full animate-spin-slow" />
          </motion.div>
        )}
        {step === 2 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-12 right-12 w-40 h-40 border-4 border-dashed border-purple-500/30 rounded-full flex items-center justify-center pointer-events-none"
          >
            <div className="w-4 h-4 bg-purple-500 rounded-full animate-ping" />
            <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full animate-spin-slow" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalibrationOverlay;
