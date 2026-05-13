import { useMemo } from 'react';

const BASE_LERP = 0.12; // Un poco más reactivo
const FAST_LERP = 0.35; // Más veloz en desplazamientos largos

export const useHandCursor = (multiHandLandmarks, calibration = null) => {
  const cursors = useMemo(() => {
    if (!multiHandLandmarks || multiHandLandmarks.length === 0) {
      return [];
    }

    return multiHandLandmarks.map((landmarks) => {
      const indexTip = landmarks[8];
      if (!indexTip) return { x: 0, y: 0, isVisible: false };

      // 1. Normalized values (Mirrored)
      let normX = 1 - indexTip.x;
      let normY = indexTip.y;

      // 2. Calibration Mapping (Bulletproof)
      if (calibration) {
        // Ensure min is actually min and max is actually max
        const minX = Math.min(calibration.minX, calibration.maxX);
        const maxX = Math.max(calibration.minX, calibration.maxX);
        const minY = Math.min(calibration.minY, calibration.maxY);
        const maxY = Math.max(calibration.minY, calibration.maxY);

        const dx = maxX - minX;
        const dy = maxY - minY;
        
        if (dx > 0.05) normX = (normX - minX) / dx;
        if (dy > 0.05) normY = (normY - minY) / dy;
      }

      // 3. Scale to Screen (Clamped to avoid getting stuck outside bounds)
      const targetX = Math.max(-0.1, Math.min(1.1, normX)) * window.innerWidth;
      const targetY = Math.max(-0.1, Math.min(1.1, normY)) * window.innerHeight;

      // We pass the raw target coordinates. Smoothness should be handled by Framer Motion in LayeredEngine, not by state loops.
      return {
        x: targetX,
        y: targetY,
        isVisible: true
      };
    });
  }, [multiHandLandmarks, calibration]);

  return cursors;
};
