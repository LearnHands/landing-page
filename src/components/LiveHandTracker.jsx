import React, { useEffect, useRef, useState } from 'react';

const LiveHandTracker = ({ active = false, onHandUpdate }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!active) return;

    let hands = null;
    let isActive = true;
    let localStream = null;

    const init = async () => {
      // Cargar scripts si no existen
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
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });

      hands.onResults((results) => {
        if (!isActive || !canvasRef.current) return;
        
        const canvasCtx = canvasRef.current.getContext('2d');
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0];
          
          // Dibujar esqueleto (opcional, pero útil para feedback)
          window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, { color: '#7C3AED', lineWidth: 4 });
          window.drawLandmarks(canvasCtx, landmarks, { color: '#06B6D4', lineWidth: 1, radius: 2 });

          // --- LÓGICA DE GESTOS (Portado de useGestures.js) ---
          const distance2D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
          const isFingerExt = (tip, pip) => tip.y < pip.y;

          const thumbTip = landmarks[4];
          const indexTip = landmarks[8];
          const indexPip = landmarks[6];
          const middleTip = landmarks[12];
          const middlePip = landmarks[10];
          const ringTip = landmarks[16];
          const ringPip = landmarks[14];
          const pinkyTip = landmarks[20];
          const pinkyPip = landmarks[18];

          // 1. PINCH (Pulgar + Índice)
          const pinchDist = distance2D(thumbTip, indexTip);
          const isPinching = pinchDist < 0.07;

          // 2. DEDOS EXTENDIDOS
          const indexExt  = isFingerExt(indexTip, indexPip);
          const middleExt = isFingerExt(middleTip, middlePip);
          const ringExt   = isFingerExt(ringTip, ringPip);
          const pinkyExt  = isFingerExt(pinkyTip, pinkyPip);

          // 3. MANO ABIERTA
          const isOpenHand = indexExt && middleExt && ringExt && pinkyExt;

          // 4. ÍNDICE ARRIBA (Solo índice)
          const isIndexUp = indexExt && !middleExt && !ringExt && !pinkyExt;
          
          if (onHandUpdate) {
            onHandUpdate({
              x: 1 - indexTip.x, // Modo espejo
              y: indexTip.y,
              isPinching,
              isOpenHand,
              isIndexUp,
              landmarks // Enviamos landmarks por si se necesitan
            });
          }
        } else {
            if (onHandUpdate) onHandUpdate(null);
        }
        canvasCtx.restore();
      });

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } 
        });
        localStream = stream;
        if (videoRef.current && isActive) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) { console.error("Camera Error:", err); }

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
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Aumentamos la opacidad de la cámara para que el usuario se vea */}
      <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale brightness-75 scale-x-[-1]" />
      <canvas ref={canvasRef} width="1280" height="720" className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none scale-x-[-1]" />
      
      {!isLoaded && active && (
        <div className="absolute inset-0 flex items-center justify-center z-[100] bg-[#0A0A1A]">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto" />
            <p className="text-purple-400 font-black uppercase tracking-widest text-[10px]">Iniciando Sensor de Movimiento...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveHandTracker;
