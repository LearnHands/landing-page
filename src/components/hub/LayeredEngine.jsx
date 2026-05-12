import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const LayeredEngine = ({ children, videoRef, landmarks, cursor, gestures, isLoaded }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isLoaded || !canvasRef.current || !landmarks) return;

    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Draw landmarks if drawing_utils are available
    if (window.drawConnectors && landmarks.length > 0) {
      window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, { color: '#7C3AED', lineWidth: 4 });
      window.drawLandmarks(ctx, landmarks, { color: '#06B6D4', lineWidth: 1, radius: 2 });
    }
  }, [landmarks, isLoaded]);

  // Load drawing utils
  useEffect(() => {
    if (!window.drawConnectors) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => console.log('Drawing utils loaded');
      document.head.appendChild(script);
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-[#03030b] overflow-hidden">
      {/* 1. Video Layer (Mirrored) */}
      <div className="absolute inset-0 z-0">
        <video 
          ref={videoRef} 
          className="w-full h-full object-cover opacity-30 grayscale brightness-75 scale-x-[-1]" 
          autoPlay 
          playsInline 
          muted
        />
      </div>

      {/* 2. Overlay Layer (Glassmorphism) */}
      <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-[2px] pointer-events-none" />

      {/* 3. Landmarks Layer (Neon) */}
      <canvas 
        ref={canvasRef} 
        width="1280" 
        height="720" 
        className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none scale-x-[-1] opacity-60" 
      />

      {/* 4. UI Layer (Transparent Content) */}
      <div className="absolute inset-0 z-30 flex flex-col">
        {children}
      </div>

      {/* 5. Virtual Cursor Layer */}
      {cursor.isVisible && (
        <div 
          className="fixed z-[10000] pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: cursor.x, top: cursor.y }}
        >
          <motion.div 
            animate={{ 
              scale: gestures.isPinching ? 0.8 : 1,
              backgroundColor: gestures.isPinching ? 'rgba(255, 255, 255, 0.8)' : 'rgba(124, 58, 237, 0.2)',
              borderColor: gestures.isPinching ? '#ffffff' : '#7C3AED',
              boxShadow: gestures.isPinching ? '0 0 30px white' : '0 0 15px rgba(124, 58, 237, 0.5)'
            }}
            className="w-10 h-10 rounded-full border-2 transition-all"
          />
          <div className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-white/60 italic drop-shadow-md">
            {gestures.isIndexUp ? '☝️ Dibujando' : gestures.isOpenHand ? '✋ Pausa' : gestures.isPinching ? '🤏 Pinza' : '🖐️ Activo'}
          </div>
        </div>
      )}

      {/* Loading Screen */}
      {!isLoaded && (
        <div className="absolute inset-0 z-[100] bg-[#03030b] flex flex-col items-center justify-center">
          <div className="w-24 h-24 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-8" />
          <p className="text-purple-400 font-black uppercase tracking-[0.4em] text-[10px] italic">Iniciando Sensor IA...</p>
        </div>
      )}
    </div>
  );
};

export default LayeredEngine;
