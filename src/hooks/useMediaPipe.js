import { useState, useEffect, useRef, useCallback } from 'react';

// Singleton to prevent re-initialization conflicts
let globalHandsInstance = null;
let globalHandsPromise = null;

export const useMediaPipe = () => {
  // Minimize hooks to 1 state and 4 refs for total stability
  const [data, setData] = useState({
    isLoaded: false,
    isDetecting: false,
    landmarks: [],
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
    setData(prev => ({ ...prev, isDetecting: false, landmarks: [] }));
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
            maxNumHands: 1,
            modelComplexity: 0,
            minDetectionConfidence: 0.4,
            minTrackingConfidence: 0.4
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
        if (now - lastUpdateRef.current < 40) return; // 25 FPS stable
        lastUpdateRef.current = now;

        const found = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;
        
        // Single atomic state update
        setData(prev => ({
          ...prev,
          isDetecting: found,
          landmarks: found ? [...results.multiHandLandmarks] : [],
          isLoaded: true
        }));
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
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
