import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, CheckCircle, RefreshCcw } from 'lucide-react';

const CalibrationOverlay = ({ landmarks = [], onComplete }) => {
  const [step, setStep] = useState(1); // Saltar intro, ir directo a esquina
  const [bounds, setBounds] = useState({ minX: 0.1, minY: 0.1, maxX: 0.9, maxY: 0.9 });
  const [progress, setProgress] = useState(0);

  const steps = [
    { title: "Inicio", desc: "", icon: "" },
    { title: "Esquina Superior Izquierda", desc: "Mueve tu dedo índice a la esquina superior izquierda.", icon: "↖️" },
    { title: "Esquina Inferior Derecha", desc: "Ahora a la esquina inferior derecha.", icon: "↘️" },
    { title: "¡Listo!", desc: "Cargando Hub...", icon: <CheckCircle size={40} className="text-green-400" /> }
  ];

  useEffect(() => {
    if (step === 1 || step === 2) {
      const timer = setInterval(() => {
        if (landmarks.length > 0 && landmarks[0][8]) {
          const indexTip = landmarks[0][8];
          const normX = 1 - indexTip.x;
          const normY = indexTip.y;

          setProgress(prev => {
            const next = prev + 0.12; // Ultra rápido (~0.4 seg)
            if (next >= 1) {
              if (step === 1) {
                setBounds(b => ({ ...b, minX: normX, minY: normY }));
              } else {
                setBounds(b => ({ ...b, maxX: normX, maxY: normY }));
              }
              handleStepComplete();
              return 0;
            }
            return next;
          });
        }
      }, 50);
      return () => clearInterval(timer);
    }
  }, [step, landmarks]);

  const handleStepComplete = () => {
    setStep(prev => prev + 1);
    setProgress(0);
  };

  useEffect(() => {
    if (step === 3) {
      setTimeout(() => onComplete(bounds), 100); // Casi instantáneo
    }
  }, [step]);

  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-8">
      <AnimatePresence mode="wait">
        <motion.div 
          key={step}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          className="glass-dark p-10 rounded-[40px] border border-white/10 max-w-md w-full text-center space-y-6 shadow-2xl relative"
        >
          <div className="flex justify-center">
             <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center text-4xl border border-white/10">
                {steps[step].icon}
             </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-display font-black italic uppercase text-gradient">{steps[step].title}</h2>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{steps[step].desc}</p>
          </div>

          {(step === 1 || step === 2) && (
            <div className="space-y-3">
               <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-purple-500" style={{ width: `${progress * 100}%` }} />
               </div>
               <p className="text-[8px] font-black uppercase tracking-[0.3em] text-purple-400 animate-pulse">
                  Capturando...
               </p>
            </div>
          )}
          
          {step === 1 && <div className="fixed top-10 left-10 w-20 h-20 border-4 border-dashed border-purple-500/50 rounded-full animate-ping" />}
          {step === 2 && <div className="fixed bottom-10 right-10 w-20 h-20 border-4 border-dashed border-purple-500/50 rounded-full animate-ping" />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default CalibrationOverlay;
