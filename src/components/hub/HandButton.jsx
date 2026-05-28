import React, { useState, useEffect, useRef } from 'react';

const HandButton = ({ children, onClick, dwellMs = 1000, className = "", variant = "purple" }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const buttonRef = useRef(null);
  const frameRef = useRef(null);

  // All RAF-internal values live in refs to avoid stale closures.
  // The useEffect has [] deps — it never restarts due to state/prop changes.
  const isHoveredRef = useRef(false);
  const progressRef  = useRef(0);
  const lastTimeRef  = useRef(null);
  const cooldownRef  = useRef(false);
  const onClickRef   = useRef(onClick);
  onClickRef.current = onClick;            // always latest, no dep needed
  const dwellMsRef   = useRef(dwellMs);
  dwellMsRef.current = dwellMs;

  useEffect(() => {
    const fire = () => {
      onClickRef.current?.();
      progressRef.current  = 0;
      isHoveredRef.current = false;
      setProgress(0);
      setIsHovered(false);
      cooldownRef.current = true;
      // Brief cooldown prevents double-fire from a single gesture
      setTimeout(() => {
        cooldownRef.current = false;
        frameRef.current = requestAnimationFrame(checkHit);
      }, 600);
    };

    const checkHit = () => {
      if (cooldownRef.current) return;

      if (!buttonRef.current) {
        frameRef.current = requestAnimationFrame(checkHit);
        return;
      }

      const rect = buttonRef.current.getBoundingClientRect();
      // Expand hit area for easier gesture targeting
      const hitRect = {
        left:   rect.left   - 40,
        right:  rect.right  + 40,
        top:    rect.top    - 40,
        bottom: rect.bottom + 40
      };

      let isPointingOver = false;
      let isPinchingOver = false;

      const handData = window.latestHandData || { cursors: [], gestures: [] };
      const cursors  = handData.cursors  || [];
      const gestures = handData.gestures || [];

      cursors.forEach((c, i) => {
        if (!c || !c.isVisible) return;
        const isOver = c.x >= hitRect.left && c.x <= hitRect.right &&
                       c.y >= hitRect.top  && c.y <= hitRect.bottom;
        if (isOver) {
          isPointingOver = true;
          if (gestures[i]?.isPinching) isPinchingOver = true;
        }
      });

      if (isPinchingOver) {
        fire();
        return;
      }

      if (isPointingOver) {
        if (!isHoveredRef.current) {
          isHoveredRef.current = true;
          setIsHovered(true);
          lastTimeRef.current = Date.now();
        } else {
          const now   = Date.now();
          const delta = now - (lastTimeRef.current ?? now);
          lastTimeRef.current = now;
          const newProgress = Math.min(progressRef.current + delta / dwellMsRef.current, 1);
          progressRef.current = newProgress;
          setProgress(newProgress);
          if (newProgress >= 1) {
            fire();
            return;
          }
        }
      } else {
        if (isHoveredRef.current) {
          const newProgress = Math.max(progressRef.current - 0.05, 0);
          progressRef.current = newProgress;
          setProgress(newProgress);
          if (newProgress === 0) {
            isHoveredRef.current = false;
            setIsHovered(false);
          }
        }
      }

      frameRef.current = requestAnimationFrame(checkHit);
    };

    frameRef.current = requestAnimationFrame(checkHit);
    return () => cancelAnimationFrame(frameRef.current);
  }, []); // Stable loop — never restarts; all live values are in refs

  const variants = {
    purple:  "from-purple-600 to-indigo-600",
    cyan:    "from-cyan-500 to-teal-500",
    orange:  "from-orange-500 to-amber-500",
    red:     "from-red-600 to-rose-600",
    emerald: "from-emerald-500 to-teal-600"
  };

  return (
    <button
      ref={buttonRef}
      className={`relative overflow-hidden transition-all duration-300 ${isHovered ? 'scale-110 shadow-[0_0_40px_rgba(124,58,237,0.4)]' : ''} ${className} bg-gradient-to-br ${variants[variant] || variants.purple} text-white font-black uppercase tracking-widest rounded-2xl shadow-xl border border-white/10`}
    >
      <div className="relative z-10 flex items-center justify-center gap-3">{children}</div>
      {isHovered && (
        <div
          className="absolute inset-0 bg-white/20 origin-left"
          style={{ transform: `scaleX(${progress})` }}
        />
      )}
    </button>
  );
};

export default HandButton;
