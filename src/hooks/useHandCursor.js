import { useState, useEffect, useRef } from 'react';

const BASE_LERP = 0.2; // Base smoothing
const FAST_LERP = 0.6; // Responsive factor

export const useHandCursor = (multiHandLandmarks, calibration = null) => {
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

      // 1. Normalized values (Mirrored)
      let normX = 1 - indexTip.x;
      let normY = indexTip.y;

      // 2. Calibration Mapping (with safety for division by zero)
      if (calibration) {
        const { minX, minY, maxX, maxY } = calibration;
        const dx = maxX - minX;
        const dy = maxY - minY;
        
        if (Math.abs(dx) > 0.001) normX = (normX - minX) / dx;
        if (Math.abs(dy) > 0.001) normY = (normY - minY) / dy;
      }

      // 3. Scale to Screen (Clamped)
      const targetX = Math.max(0, Math.min(1, normX)) * window.innerWidth;
      const targetY = Math.max(0, Math.min(1, normY)) * window.innerHeight;

      if (!lerpPositions.current[i]) {
        lerpPositions.current[i] = { x: targetX, y: targetY };
      } else {
        // Adaptive Smoothing (LERP)
        const dx = Math.abs(targetX - lerpPositions.current[i].x);
        const dy = Math.abs(targetY - lerpPositions.current[i].y);
        const distance = Math.hypot(dx, dy);
        
        // Increase LERP factor if moving fast to reduce lag
        const factor = distance > 100 ? FAST_LERP : BASE_LERP;
        
        lerpPositions.current[i].x += (targetX - lerpPositions.current[i].x) * factor;
        lerpPositions.current[i].y += (targetY - lerpPositions.current[i].y) * factor;
      }

      return {
        x: lerpPositions.current[i].x,
        y: lerpPositions.current[i].y,
        isVisible: true
      };
    });

    setCursors(nextCursors);
  }, [multiHandLandmarks, calibration]);

  return cursors;
};
