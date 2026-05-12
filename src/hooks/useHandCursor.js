import { useState, useEffect, useRef } from 'react';

const LERP_FACTOR = 0.5; // Increased for more responsive movement

export const useHandCursor = (multiHandLandmarks) => {
  const [cursors, setCursors] = useState([]);
  const lerpPositions = useRef([]);

  useEffect(() => {
    if (!multiHandLandmarks || multiHandLandmarks.length === 0) {
      if (cursors.length > 0) setCursors([]);
      return;
    }

    const nextCursors = multiHandLandmarks.map((landmarks, i) => {
      const indexTip = landmarks[8];
      if (!indexTip) return { x: 0, y: 0, isVisible: false };

      // Ensure coordinate space matches screen perfectly
      const targetX = (1 - indexTip.x) * window.innerWidth;
      const targetY = indexTip.y * window.innerHeight;

      if (!lerpPositions.current[i]) {
        lerpPositions.current[i] = { x: targetX, y: targetY };
      } else {
        // Smoothing (LERP)
        lerpPositions.current[i].x += (targetX - lerpPositions.current[i].x) * LERP_FACTOR;
        lerpPositions.current[i].y += (targetY - lerpPositions.current[i].y) * LERP_FACTOR;
      }

      return {
        x: lerpPositions.current[i].x,
        y: lerpPositions.current[i].y,
        isVisible: true
      };
    });

    setCursors(nextCursors);
  }, [multiHandLandmarks]);

  return cursors;
};
