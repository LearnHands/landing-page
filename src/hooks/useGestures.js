import { useState, useEffect, useRef } from 'react';

const PINCH_THRESHOLD = 0.07;

const distance2D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const isFingerExt = (tip, pip) => tip.y < pip.y;

export const useGestures = (multiHandLandmarks) => {
  const [gestures, setGestures] = useState([]);
  const lastPinchStates = useRef([]);
  const pinchTimeouts = useRef([]);

  useEffect(() => {
    if (!multiHandLandmarks || multiHandLandmarks.length === 0) {
      setGestures([]);
      return;
    }

    const newGestures = multiHandLandmarks.map((landmarks, index) => {
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const indexPip = landmarks[6];
      const middleTip = landmarks[12];
      const middlePip = landmarks[10];
      const ringTip = landmarks[16];
      const ringPip = landmarks[14];
      const pinkyTip = landmarks[20];
      const pinkyPip = landmarks[18];

      // 1. PINCH
      const dist = distance2D(thumbTip, indexTip);
      const pinchStrength = Math.max(0, 1 - dist / PINCH_THRESHOLD);
      const isPinchingRaw = dist < PINCH_THRESHOLD;

      // 2. EXTENDED FINGERS
      const indexExt = isFingerExt(indexTip, indexPip);
      const middleExt = isFingerExt(middleTip, middlePip);
      const ringExt = isFingerExt(ringTip, ringPip);
      const pinkyExt = isFingerExt(pinkyTip, pinkyPip);

      // 3. HAND STATES
      const isOpenHand = indexExt && middleExt && ringExt && pinkyExt;
      const isIndexUp = indexExt && !middleExt && !ringExt && !pinkyExt;

      return {
        isPinching: isPinchingRaw,
        isOpenHand,
        isIndexUp,
        pinchStrength,
        indexTip, // Helpful for collision
        landmarks // Keep for visualization
      };
    });

    setGestures(newGestures);
  }, [multiHandLandmarks]);

  return gestures;
};
