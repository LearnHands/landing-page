import { useState, useEffect, useRef, useCallback } from 'react';

// Singleton to prevent re-initialization conflicts
let globalHandsInstance = null;
let globalHandsPromise = null;

// --- GESTURE & CURSOR MATH HELPERS ---
const distance2D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const isFingerExt = (tip, pip) => tip.y < pip.y;

const calculateGestures = (multiHandLandmarks) => {
  if (!multiHandLandmarks || multiHandLandmarks.length === 0) return [];
  return multiHandLandmarks.map((landmarks) => {
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
    const isPinching = dist < 0.08;

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
        
        const now = Date.now();
        if (now - lastUpdateRef.current < 16) return; // 60 FPS support
        lastUpdateRef.current = now;

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
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      });

      if (videoRef.current && isActiveRef.current) {
        videoRef.current.srcObject = stream;
        try { await videoRef.current.play(); } catch (e) {}
      }

      const process = async () => {
        if (!isActiveRef.current || !globalHandsInstance) return;
        if (videoRef.current && videoRef.current.readyState >= 2 && !isProcessingRef.current) {
          isProcessingRef.current = true;
          try { await globalHandsInstance.send({ image: videoRef.current }); } catch (e) {}
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
