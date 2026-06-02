import { useState, useEffect, useRef, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// Singleton — one HandLandmarker instance for the app's lifetime
let handLandmarkerPromise = null;
let handLandmarkerInstance = null;

// --- GESTURE & CURSOR MATH HELPERS ---
const distance3D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z - b.z) * 0.5);

// Robust extension: tip must be clearly further from the MCP knuckle than the PIP joint.
const isFingerExt = (tip, pip, mcp) => {
  const tipToMcp = distance3D(tip, mcp);
  const pipToMcp = distance3D(pip, mcp);
  return tipToMcp > pipToMcp * 1.1;
};

let lastPinchStates = [false, false];

const calculateGestures = (allLandmarks, handednessList) => {
  if (!allLandmarks || allLandmarks.length === 0) {
    lastPinchStates = [false, false];
    return [];
  }
  return allLandmarks.map((landmarks, handIdx) => {
    const confidence = handednessList?.[handIdx]?.[0]?.score ?? 1;
    if (confidence < 0.5) {
      lastPinchStates[handIdx] = false;
      return { isPinching: false, isOpenHand: false, isIndexUp: false, indexTip: landmarks[8], landmarks };
    }

    const thumbTip  = landmarks[4];
    const indexTip  = landmarks[8];
    const indexPip  = landmarks[6];
    const indexMcp  = landmarks[5];
    const middleTip = landmarks[12];
    const middlePip = landmarks[10];
    const middleMcp = landmarks[9];
    const ringTip   = landmarks[16];
    const ringPip   = landmarks[14];
    const ringMcp   = landmarks[13];
    const pinkyTip  = landmarks[20];
    const pinkyPip  = landmarks[18];
    const pinkyMcp  = landmarks[17];

    const dist = distance3D(thumbTip, indexTip);

    // Hysteresis: harder to start a pinch (0.085) than to keep one (0.12)
    const wasPinching = lastPinchStates[handIdx] || false;
    const threshold = wasPinching ? 0.12 : 0.085;
    const isPinching = dist < threshold;
    lastPinchStates[handIdx] = isPinching;

    const indexExt  = isFingerExt(indexTip,  indexPip,  indexMcp);
    const middleExt = isFingerExt(middleTip, middlePip, middleMcp);
    const ringExt   = isFingerExt(ringTip,   ringPip,   ringMcp);
    const pinkyExt  = isFingerExt(pinkyTip,  pinkyPip,  pinkyMcp);

    const isOpenHand = indexExt && middleExt && ringExt && pinkyExt;
    const isIndexUp  = indexExt && !middleExt && !ringExt && !pinkyExt;

    return { isPinching, isOpenHand, isIndexUp, indexTip, landmarks };
  });
};

const calculateCursors = (allLandmarks, videoEl) => {
  if (!allLandmarks || allLandmarks.length === 0) return [];

  const vw = videoEl?.videoWidth || 1280;
  const vh = videoEl?.videoHeight || 720;
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  const scale = Math.max(screenW / vw, screenH / vh);
  const scaledW = vw * scale;
  const scaledH = vh * scale;
  const offsetX = (scaledW - screenW) / 2;
  const offsetY = (scaledH - screenH) / 2;

  return allLandmarks.map((landmarks) => {
    const indexTip = landmarks[8];
    if (!indexTip) return { x: 0, y: 0, isVisible: false };

    // Flip X to mirror the video (video is CSS scale-x-[-1])
    const normX = 1 - indexTip.x;
    const normY = indexTip.y;

    const targetX = normX * scaledW - offsetX;
    const targetY = normY * scaledH - offsetY;

    return {
      x: Math.max(0, Math.min(screenW, targetX)),
      y: Math.max(0, Math.min(screenH, targetY)),
      isVisible: true
    };
  });
};

// Convert tasks-vision flat NormalizedLandmark[] (21 per hand) into the same
// nested array format the rest of the app expects: [[{x,y,z}×21], ...]
const convertLandmarks = (result) => {
  if (!result?.landmarks?.length) return [];
  return result.landmarks; // tasks-vision already returns [{x,y,z}] per hand
};

export const useMediaPipe = () => {
  const [data, setData] = useState({
    isLoaded: false,
    isDetecting: false,
    error: null
  });

  const videoRef = useRef(null);
  const isActiveRef = useRef(false);
  const rafRef = useRef(null);

  const stopMediaPipe = useCallback(() => {
    isActiveRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    lastPinchStates = [false, false];
    window.latestHandData = { landmarks: [], cursors: [], gestures: [] };
    setData(prev => ({ ...prev, isDetecting: false }));
  }, []);

  const initMediaPipe = useCallback(async (videoElement) => {
    if (!videoElement || isActiveRef.current) return;
    videoRef.current = videoElement;
    isActiveRef.current = true;

    try {
      // Build the HandLandmarker once for the whole app session
      if (!handLandmarkerPromise) {
        handLandmarkerPromise = (async () => {
          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
          );
          return HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numHands: 2,
            minHandDetectionConfidence: 0.45,
            minHandPresenceConfidence: 0.45,
            minTrackingConfidence: 0.45
          });
        })();
      }

      handLandmarkerInstance = await handLandmarkerPromise;
      if (!isActiveRef.current) return;

      // Open webcam
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });

      if (!isActiveRef.current) return;
      videoRef.current.srcObject = stream;
      try { await videoRef.current.play(); } catch (_) {}

      setData(prev => ({ ...prev, isLoaded: true }));

      let lastTimestamp = -1;

      const process = () => {
        if (!isActiveRef.current) return;

        const video = videoRef.current;
        if (video && video.readyState >= 2) {
          const nowMs = performance.now();
          // tasks-vision requires strictly increasing timestamps
          if (nowMs > lastTimestamp) {
            lastTimestamp = nowMs;
            const result = handLandmarkerInstance.detectForVideo(video, nowMs);

            const landmarks = convertLandmarks(result);
            const cursors   = calculateCursors(landmarks, video);
            const gestures  = calculateGestures(landmarks, result.handedness);

            window.latestHandData = { landmarks, cursors, gestures };

            const found = landmarks.length > 0;
            setData(prev => {
              if (prev.isDetecting === found) return prev;
              return { ...prev, isDetecting: found };
            });
          }
        }

        rafRef.current = requestAnimationFrame(process);
      };

      rafRef.current = requestAnimationFrame(process);
    } catch (err) {
      if (isActiveRef.current) {
        setData(prev => ({ ...prev, error: err.message, isLoaded: true }));
      }
    }
  }, []);

  useEffect(() => {
    return () => stopMediaPipe();
  }, [stopMediaPipe]);

  return { ...data, initMediaPipe, stopMediaPipe };
};
