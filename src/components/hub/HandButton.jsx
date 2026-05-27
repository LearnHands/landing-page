import React, { useState, useEffect, useRef } from 'react';

const HandButton = ({ children, onClick, dwellMs = 1000, className = "", variant = "purple" }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const buttonRef = useRef(null);
  const lastTimeRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const checkHit = () => {
      if (!buttonRef.current) {
        frameRef.current = requestAnimationFrame(checkHit);
        return;
      }

      const rect = buttonRef.current.getBoundingClientRect();
      const hitRect = {
        left: rect.left - 40,
        right: rect.right + 40,
        top: rect.top - 40,
        bottom: rect.bottom + 40
      };

      let isPointingOver = false;
      let isPinchingOver = false;

      // Access latest cursors from global state
      const handData = window.latestHandData || { cursors: [], gestures: [] };
      const cursors = handData.cursors || [];
      const gestures = handData.gestures || [];

      cursors.forEach((c, i) => {
        if (!c || !c.isVisible) return;
        const isOver = c.x >= hitRect.left && c.x <= hitRect.right &&
                       c.y >= hitRect.top && c.y <= hitRect.bottom;
        
        if (isOver) {
          isPointingOver = true;
          const g = gestures[i];
          if (g?.isPinching) isPinchingOver = true;
        }
      });

      if (isPinchingOver) {
        onClick?.();
        setIsHovered(false);
        setProgress(0);
        // Delay next check to avoid rapid firing
        setTimeout(() => {
          frameRef.current = requestAnimationFrame(checkHit);
        }, 600);
        return;
      }

      if (isPointingOver) {
        if (!isHovered) {
          setIsHovered(true);
          lastTimeRef.current = Date.now();
        } else {
          const now = Date.now();
          const delta = now - lastTimeRef.current;
          const newProgress = Math.min(progress + delta / dwellMs, 1);
          setProgress(newProgress);

          if (newProgress >= 1) {
            onClick?.();
            setIsHovered(false);
            setProgress(0);
          }
          lastTimeRef.current = now;
        }
      } else {
        if (isHovered) {
          const newProgress = Math.max(progress - 0.05, 0);
          setProgress(newProgress);
          if (newProgress === 0) setIsHovered(false);
        }
      }

      frameRef.current = requestAnimationFrame(checkHit);
    };

    frameRef.current = requestAnimationFrame(checkHit);
    return () => cancelAnimationFrame(frameRef.current);
  }, [isHovered, progress, dwellMs, onClick]);

  const variants = {
    purple: "from-purple-600 to-indigo-600",
    cyan: "from-cyan-500 to-teal-500",
    orange: "from-orange-500 to-amber-500",
    red: "from-red-600 to-rose-600",
    emerald: "from-emerald-500 to-teal-600"
  };

  return (
    <button
      ref={buttonRef}
      className={`relative overflow-hidden transition-all duration-300 ${isHovered ? 'scale-110 shadow-[0_0_40px_rgba(124,58,237,0.4)]' : ''} ${className} bg-gradient-to-br ${variants[variant] || variants.purple} text-white font-black uppercase tracking-widest rounded-2xl shadow-xl border border-white/10`}
    >
      <div className="relative z-10 flex items-center justify-center gap-3">{children}</div>
      {isHovered && (
        <div className="absolute inset-0 bg-white/20 origin-left" style={{ transform: `scaleX(${progress})` }} />
      )}
    </button>
  );
};

export default HandButton;
