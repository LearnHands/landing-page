import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook to initialize and manage MediaPipe Hands
 */
export const useMediaPipe = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState(null);
  const [landmarks, setLandmarks] = useState([]);
  
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const videoRef = useRef(null);
  const isActiveRef = useRef(false);

  const initMediaPipe = useCallback(async (videoElement) => {
    if (!videoElement) return;
    videoRef.current = videoElement;
    isActiveRef.current = true;

    try {
      // Load scripts dynamically if not present
      if (!window.Hands) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js';
          script.crossOrigin = 'anonymous';
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load MediaPipe Hands script'));
          document.head.appendChild(script);
        });
      }

      const Hands = window.Hands;
      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });

      hands.onResults((results) => {
        if (!isActiveRef.current) return;

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          setLandmarks(results.multiHandLandmarks[0]);
          setIsDetecting(true);
        } else {
          setLandmarks([]);
          setIsDetecting(false);
        }
      });

      handsRef.current = hands;

      // Initialize camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
        };
      }

      // Start processing loop
      const process = async () => {
        if (!isActiveRef.current || !handsRef.current) return;
        if (videoRef.current && videoRef.current.readyState >= 2) {
          try {
            await handsRef.current.send({ image: videoRef.current });
          } catch (e) {
            console.error('MediaPipe send error:', e);
          }
        }
        if (isActiveRef.current) {
          requestAnimationFrame(process);
        }
      };

      process();
      setIsLoaded(true);
    } catch (err) {
      console.error('MediaPipe init error:', err);
      setError(err.message);
    }
  }, []);

  const stopMediaPipe = useCallback(() => {
    isActiveRef.current = false;
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (handsRef.current) {
      try {
        handsRef.current.close();
      } catch (e) {
        console.error('Error closing MediaPipe:', e);
      }
      handsRef.current = null;
    }
    setIsLoaded(false);
    setIsDetecting(false);
    setLandmarks([]);
  }, []);

  useEffect(() => {
    return () => stopMediaPipe();
  }, [stopMediaPipe]);

  return {
    isLoaded,
    isDetecting,
    error,
    landmarks,
    initMediaPipe,
    stopMediaPipe
  };
};
