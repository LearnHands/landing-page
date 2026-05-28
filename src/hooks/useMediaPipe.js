import { useState, useEffect, useRef, useCallback } from 'react';

// Singleton to prevent re-initialization conflicts
let globalHandsInstance = null;
let globalHandsPromise = null;

// --- GESTURE & CURSOR MATH HELPERS ---
const distance3D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z - b.z) * 0.5);

// Robust extension: tip must be clearly further from the MCP knuckle than the PIP joint.
// Works regardless of hand orientation (up/down/sideways), unlike pure Y-axis comparison.
const isFingerExt = (tip, pip, mcp) => {
  const tipToMcp = distance3D(tip, mcp);
  const pipToMcp = distance3D(pip, mcp);
  return tipToMcp > pipToMcp * 1.1;
};

let lastPinchStates = [false, false];

const calculateGestures = (multiHandLandmarks, multiHandedness) => {
  if (!multiHandLandmarks || multiHandLandmarks.length === 0) {
    lastPinchStates = [false, false];
    return [];
  }
  return multiHandLandmarks.map((landmarks, handIdx) => {
    // Skip low-confidence detections to reduce ghost gestures
    const confidence = multiHandedness?.[handIdx]?.score ?? 1;
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

const calculateCursors = (multiHandLandmarks, videoEl) => {
  if (!multiHandLandmarks || multiHandLandmarks.length === 0) return [];

  const vw = videoEl?.videoWidth || 1280;
  const vh = videoEl?.videoHeight || 720;
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  // Replicate CSS object-cover transform to map normalized hand coords to screen pixels
  const scale = Math.max(screenW / vw, screenH / vh);
  const scaledW = vw * scale;
  const scaledH = vh * scale;
  const offsetX = (scaledW - screenW) / 2;
  const offsetY = (scaledH - screenH) / 2;

  return multiHandLandmarks.map((landmarks) => {
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

export const useMediaPipe = () => {
  const [data, setData] = useState({
    isLoaded: false,
    isDetecting: false,
    error: null
  });

  const videoRef = useRef(null);
  const isActiveRef = useRef(false);
  const isProcessingRef = useRef(false);

  const stopMediaPipe = useCallback(() => {
    isActiveRef.current = false;
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
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
      if (!globalHandsPromise) {
        globalHandsPromise = (async () => {
          const scripts = [
            'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js',
            'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'
          ];

          for (const src of scripts) {
            if (!document.querySelector(`script[src="${src}"]`)) {
              await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.crossOrigin = 'anonymous';
                script.onload = resolve;
                script.onerror = () => reject(new Error(`Failed to load ${src}`));
                document.head.appendChild(script);
              });
            }
          }

          const Hands = window.Hands;
          const instance = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
          });

          instance.setOptions({
            maxNumHands: 2,
            modelComplexity: 0,
            minDetectionConfidence: 0.45,
            minTrackingConfidence: 0.45
          });

          await instance.initialize();
          return instance;
        })();
      }

      globalHandsInstance = await globalHandsPromise;
      if (!isActiveRef.current) return;

      globalHandsInstance.onResults((results) => {
        if (!isActiveRef.current || !results) return;

        const found = !!(results.multiHandLandmarks && results.multiHandLandmarks.length > 0);
        const landmarks = found ? [...results.multiHandLandmarks] : [];

        const cursors  = calculateCursors(landmarks, videoRef.current);
        const gestures = calculateGestures(landmarks, results.multiHandedness);

        window.latestHandData = { landmarks, cursors, gestures };

        setData(prev => {
          if (prev.isDetecting === found && prev.isLoaded) return prev;
          return { ...prev, isDetecting: found, isLoaded: true };
        });
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });

      if (videoRef.current && isActiveRef.current) {
        videoRef.current.srcObject = stream;
        try { await videoRef.current.play(); } catch (e) {}
      }

      const offscreenCanvas = document.createElement('canvas');
      const offscreenCtx = offscreenCanvas.getContext('2d');

      // Tight detection loop: chain the next frame immediately after MediaPipe finishes
      // (not on the next vsync), maximising gesture update rate within browser limits.
      const process = () => {
        if (!isActiveRef.current || !globalHandsInstance) return;

        if (videoRef.current && videoRef.current.readyState >= 2 && !isProcessingRef.current) {
          isProcessingRef.current = true;
          try {
            const vw = videoRef.current.videoWidth;
            const vh = videoRef.current.videoHeight;
            if (vw && vh) {
              // 160px → ~4× fewer pixels than 320px; MediaPipe processes proportionally faster
              const targetW = 160;
              const targetH = Math.round(targetW / (vw / vh));
              if (offscreenCanvas.width !== targetW || offscreenCanvas.height !== targetH) {
                offscreenCanvas.width  = targetW;
                offscreenCanvas.height = targetH;
              }
              offscreenCtx.drawImage(videoRef.current, 0, 0, targetW, targetH);
              globalHandsInstance.send({ image: offscreenCanvas })
                .catch(e => console.warn('MediaPipe send error:', e))
                .finally(() => {
                  isProcessingRef.current = false;
                  // Start the next frame immediately — no waiting for the next vsync
                  if (isActiveRef.current) requestAnimationFrame(process);
                });
              return; // next RAF already scheduled in finally
            } else {
              isProcessingRef.current = false;
            }
          } catch (e) {
            console.warn('MediaPipe frame error:', e);
            isProcessingRef.current = false;
          }
        }

        // Video not ready or busy — retry on the next frame
        if (isActiveRef.current) requestAnimationFrame(process);
      };

      process();
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
