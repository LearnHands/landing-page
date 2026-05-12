import { useState, useEffect, useRef } from 'react';

const LERP_FACTOR = 0.25;

export const useHandCursor = (multiHandLandmarks) => {
  const [cursors, setCursors] = useState([]);
  const rawPositions = useRef([]);
  const lerpPositions = useRef([]);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!multiHandLandmarks || multiHandLandmarks.length === 0) {
      setCursors([]);
      rawPositions.current = [];
      return;
    }

    // Initialize raw positions if needed
    multiHandLandmarks.forEach((landmarks, i) => {
      const indexTip = landmarks[8];
      if (indexTip) {
        rawPositions.current[i] = {
          x: (1 - indexTip.x) * window.innerWidth,
          y: indexTip.y * window.innerHeight
        };
        
        if (!lerpPositions.current[i]) {
          lerpPositions.current[i] = { ...rawPositions.current[i] };
        }
      }
    });

    // Cleanup extra positions if hands are removed
    if (rawPositions.current.length > multiHandLandmarks.length) {
      rawPositions.current = rawPositions.current.slice(0, multiHandLandmarks.length);
      lerpPositions.current = lerpPositions.current.slice(0, multiHandLandmarks.length);
    }
  }, [multiHandLandmarks]);

  useEffect(() => {
    const loop = () => {
      const updatedCursors = lerpPositions.current.map((pos, i) => {
        const raw = rawPositions.current[i];
        if (!raw) return pos;

        pos.x += (raw.x - pos.x) * LERP_FACTOR;
        pos.y += (raw.y - pos.y) * LERP_FACTOR;

        return { x: pos.x, y: pos.y, isVisible: true };
      });

      setCursors(updatedCursors);
      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return cursors;
};
