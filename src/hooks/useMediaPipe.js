import { useState, useEffect, useRef, useCallback } from 'react';

// Singleton to prevent re-initialization conflicts
let globalHandsInstance = null;
let globalHandsPromise = null;

// --- GESTURE & CURSOR MATH HELPERS ---
const distance2D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const isFingerExt = (tip, pip) => tip.y < pip.y;

let lastPinchStates = [false, false];

const calculateGestures = (multiHandLandmarks) => {
  if (!multiHandLandmarks || multiHandLandmarks.length === 0) {
    lastPinchStates = [false, false];
    return [];
  }
  return multiHandLandmarks.map((landmarks, handIdx) => {
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
    
    // Histeresis: más fácil mantener la pinza (0.12) que iniciarla (0.085)
    const wasPinching = lastPinchStates[handIdx] || false;
    const threshold = wasPinching ? 0.12 : 0.085;
    const isPinching = dist < threshold;
    
    lastPinchStates[handIdx] = isPinching;

    const indexExt = isFingerExt(indexTip, indexPip);
    const middleExt = isFingerExt(middleTip, middlePip);
    const ringExt = isFingerExt(ringTip, ringPip);
    const pinkyExt = isFingerExt(pinkyTip, pinkyPip);

    const isOpenHand = indexExt && middleExt && ringExt && pinkyExt;
    const isIndexUp = indexExt && !middleExt && !ringExt && !pinkyExt;

    return {
      isPinching,
      isOpenHand,
      isIndexUp,
      indexTip,
      landmarks
    };
  });
};

const calculateCursors = (multiHandLandmarks, videoEl) => {
  if (!multiHandLandmarks || multiHandLandmarks.length === 0) return [];

  const vw = videoEl?.videoWidth || 1280;
  const vh = videoEl?.videoHeight || 720;
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  const scale = Math.max(screenW / vw, screenH / vh);
  const scaledW = vw * scale;
  const scaledH = vh * scale;

  const offsetX = (scaledW - screenW) / 2;
  const offsetY = (scaledH - screenH) / 2;

  return multiHandLandmarks.map((landmarks) => {
    const indexTip = landmarks[8];
    if (!indexTip) return { x: 0, y: 0, isVisible: false };

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
  const lastUpdateRef = useRef(0);

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
            maxNumHands: 2, // Permite detectar hasta 2 manos simultáneamente
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
        if (!isActiveRef.current) return;
        
        if (!results) return;
        const found = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;
        const landmarks = found ? [...results.multiHandLandmarks] : [];

        // Calcular cursores y gestos en base al videoRef
        const cursors = calculateCursors(landmarks, videoRef.current);
        const gestures = calculateGestures(landmarks);

        // Publicar a variable global en memoria
        window.latestHandData = { landmarks, cursors, gestures };
        
        // Actualizar estado de React solo si cambia la detección o carga para evitar renders innecesarios
        setData(prev => {
          if (prev.isDetecting === found && prev.isLoaded) return prev;
          return {
            ...prev,
            isDetecting: found,
            isLoaded: true
          };
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

      const process = async () => {
        if (!isActiveRef.current || !globalHandsInstance) return;
        if (videoRef.current && videoRef.current.readyState >= 2 && !isProcessingRef.current) {
          isProcessingRef.current = true;
          try {
            const vw = videoRef.current.videoWidth;
            const vh = videoRef.current.videoHeight;
            if (vw && vh) {
              const aspect = vw / vh;
              const targetW = 320;
              const targetH = Math.round(targetW / aspect);
              if (offscreenCanvas.width !== targetW || offscreenCanvas.height !== targetH) {
                offscreenCanvas.width = targetW;
                offscreenCanvas.height = targetH;
              }
              offscreenCtx.drawImage(videoRef.current, 0, 0, targetW, targetH);
              await globalHandsInstance.send({ image: offscreenCanvas });
            }
          } catch (e) {
            console.warn("MediaPipe send error:", e);
          }
          isProcessingRef.current = false;
        }
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

  return {
    ...data,
    initMediaPipe,
    stopMediaPipe
  };
};
