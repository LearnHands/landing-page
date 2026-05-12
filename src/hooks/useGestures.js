import { useMemo, useState, useEffect, useRef } from 'react';

const PINCH_THRESHOLD = 0.07;

const distance2D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const isFingerExt = (tip, pip) => tip.y < pip.y;

export const useGestures = (landmarks) => {
  const [gestures, setGestures] = useState({
    isPinching: false,
    isOpenHand: false,
    isIndexUp: false,
    pinchStrength: 0
  });

  const lastPinchState = useRef(false);
  const pinchTimeout = useRef(null);

  useEffect(() => {
    if (!landmarks || landmarks.length < 21) {
      setGestures({
        isPinching: false,
        isOpenHand: false,
        isIndexUp: false,
        pinchStrength: 0
      });
      return;
    }

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
    const newPinching = dist < PINCH_THRESHOLD;

    // 2. EXTENDED FINGERS
    const indexExt = isFingerExt(indexTip, indexPip);
    const middleExt = isFingerExt(middleTip, middlePip);
    const ringExt = isFingerExt(ringTip, ringPip);
    const pinkyExt = isFingerExt(pinkyTip, pinkyPip);

    // 3. HAND STATES
    const isOpenHand = indexExt && middleExt && ringExt && pinkyExt;
    const isIndexUp = indexExt && !middleExt && !ringExt && !pinkyExt;

    // Debounce pinch to avoid flickering
    if (newPinching !== lastPinchState.current) {
      if (pinchTimeout.current) clearTimeout(pinchTimeout.current);
      pinchTimeout.current = setTimeout(() => {
        setGestures(prev => ({
          ...prev,
          isPinching: newPinching,
          isOpenHand,
          isIndexUp,
          pinchStrength
        }));
        lastPinchState.current = newPinching;
      }, newPinching ? 0 : 150);
    } else {
      setGestures({
        isPinching: lastPinchState.current,
        isOpenHand,
        isIndexUp,
        pinchStrength
      });
    }

    return () => {
      if (pinchTimeout.current) clearTimeout(pinchTimeout.current);
    };
  }, [landmarks]);

  return gestures;
};
