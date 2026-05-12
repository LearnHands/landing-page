import { useState, useEffect, useRef } from 'react';

const LERP_FACTOR = 0.25;

export const useHandCursor = (landmarks) => {
  const [cursor, setCursor] = useState({ x: 0, y: 0, isVisible: false });
  const rawPos = useRef({ x: 0, y: 0 });
  const lerpPos = useRef({ x: 0, y: 0 });
  const frameRef = useRef(null);

  useEffect(() => {
    if (!landmarks || landmarks.length === 0) {
      setCursor(prev => ({ ...prev, isVisible: false }));
      return;
    }

    const indexTip = landmarks[8];
    if (indexTip) {
      // Mirror X
      rawPos.current = {
        x: (1 - indexTip.x) * window.innerWidth,
        y: indexTip.y * window.innerHeight
      };
      setCursor(prev => ({ ...prev, isVisible: true }));
    }
  }, [landmarks]);

  useEffect(() => {
    const loop = () => {
      lerpPos.current.x += (rawPos.current.x - lerpPos.current.x) * LERP_FACTOR;
      lerpPos.current.y += (rawPos.current.y - lerpPos.current.y) * LERP_FACTOR;

      setCursor(prev => ({
        ...prev,
        x: lerpPos.current.x,
        y: lerpPos.current.y
      }));

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return cursor;
};
