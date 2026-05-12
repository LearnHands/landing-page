import React, { useEffect, useRef, useState } from 'react';

const LiveHandTracker = ({ active = false, onHandUpdate }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  useEffect(() => {
    if (!active) return;

    let hands = null;
    let isActive = true;
    let localStream = null;

    const init = async () => {
      if (!window.Hands) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js';
          script.crossOrigin = 'anonymous';
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }

      if (!window.drawConnectors) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js';
          script.crossOrigin = 'anonymous';
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }

      const Hands = window.Hands;
      hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      hands.onResults((results) => {
        if (!isActive || !canvasRef.current) return;
        
        const canvasCtx = canvasRef.current.getContext('2d');
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];
          
          // Dibujar en canvas
          window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, { color: '#A78BFA', lineWidth: 2 });
          window.drawLandmarks(canvasCtx, landmarks, { color: '#06B6D4', lineWidth: 1, radius: 2 });

          // Lógica de Gesto de Pinza (Pinch)
          const thumbTip = landmarks[4];
          const indexTip = landmarks[8];
          const distance = Math.sqrt(
            Math.pow(thumbTip.x - indexTip.x, 2) + 
            Math.pow(thumbTip.y - indexTip.y, 2)
          );

          const isPinching = distance < 0.08;
          
          // Enviar datos al padre (invertimos X para modo espejo)
          if (onHandUpdate) {
            onHandUpdate({
              x: 1 - indexTip.x, // Modo espejo
              y: indexTip.y,
              isPinching
            });
          }
        } else {
            if (onHandUpdate) onHandUpdate(null);
        }
        canvasCtx.restore();
      });

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        localStream = stream;
        if (videoRef.current && isActive) {
          videoRef.current.srcObject = stream;
          setIsCameraActive(true);
        }
      } catch (err) { console.error(err); }

      setIsLoaded(true);

      const process = async () => {
        if (!isActive) return;
        if (videoRef.current && videoRef.current.readyState >= 2) {
          try { await hands.send({ image: videoRef.current }); } catch (e) {}
        }
        if (isActive) requestAnimationFrame(process);
      };
      process();
    };

    init();

    return () => {
      isActive = false;
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      if (hands) try { hands.close(); } catch (e) {}
    };
  }, [active]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden rounded-[32px]">
      <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale brightness-50 scale-x-[-1]" />
      <canvas ref={canvasRef} width="640" height="480" className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none scale-x-[-1]" />
      {!isLoaded && active && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-[#0A0A1A]">
          <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default LiveHandTracker;
