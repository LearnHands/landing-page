import { useState, useEffect, useRef } from 'react';

const PINCH_THRESHOLD = 0.08;
const GESTURE_HISTORY_LIMIT = 3; // Number of frames to confirm a gesture

const distance2D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const isFingerExt = (tip, pip) => tip.y < pip.y;

export const useGestures = (multiHandLandmarks) => {
  const [gestures, setGestures] = useState([]);
  const historyRef = useRef([]); // Stores last N frames of raw gestures

  useEffect(() => {
    if (!multiHandLandmarks || multiHandLandmarks.length === 0) {
      if (gestures.length > 0) {
        setGestures([]);
        historyRef.current = [];
      }
      return;
    }

    const currentFrameGestures = multiHandLandmarks.map((landmarks, i) => {
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const indexPip = landmarks[6];
      const middleTip = landmarks[12];
      const middlePip = landmarks[10];
      const ringTip = landmarks[16];
      const ringPip = landmarks[14];
      const pinkyTip = landmarks[20];
      const pinkyPip = landmarks[18];

      const dist = distance2D(thumbTip, indexTip);
      const isPinchingRaw = dist < PINCH_THRESHOLD;

      const indexExt = isFingerExt(indexTip, indexPip);
      const middleExt = isFingerExt(middleTip, middlePip);
      const ringExt = isFingerExt(ringTip, ringPip);
      const pinkyExt = isFingerExt(pinkyTip, pinkyPip);

      const isOpenHandRaw = indexExt && middleExt && ringExt && pinkyExt;
      const isIndexUpRaw = indexExt && !middleExt && !ringExt && !pinkyExt;

      return {
        isPinchingRaw,
        isOpenHandRaw,
        isIndexUpRaw,
        indexTip,
        landmarks
      };
    });

    // Update history
    historyRef.current.push(currentFrameGestures);
    if (historyRef.current.length > GESTURE_HISTORY_LIMIT) {
      historyRef.current.shift();
    }

    // Debounced result: only return true if gesture is consistent in history
    const debouncedGestures = currentFrameGestures.map((raw, handIdx) => {
      const history = historyRef.current.map(h => h[handIdx]).filter(Boolean);
      
      const countPinch = history.filter(h => h.isPinchingRaw).length;
      const countOpen = history.filter(h => h.isOpenHandRaw).length;
      const countIndex = history.filter(h => h.isIndexUpRaw).length;

      const threshold = Math.ceil(GESTURE_HISTORY_LIMIT / 2);

      return {
        isPinching: countPinch >= threshold,
        isOpenHand: countOpen >= threshold,
        isIndexUp: countIndex >= threshold,
        indexTip: raw.indexTip,
        landmarks: raw.landmarks
      };
    });

    setGestures(debouncedGestures);
  }, [multiHandLandmarks]);

  return gestures;
};
