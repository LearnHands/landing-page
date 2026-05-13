import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const LayeredEngine = ({ children, videoRef, landmarks, cursors, gestures, isLoaded, error }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isLoaded || !canvasRef.current || !landmarks) return;

    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Draw landmarks for all hands with safety checks
    if (landmarks.length > 0) {
      landmarks.forEach((handLandmarks, i) => {
        const color = i === 0 ? '#7C3AED' : '#EC4899';
        
        if (window.drawConnectors && window.HAND_CONNECTIONS) {
          window.drawConnectors(ctx, handLandmarks, window.HAND_CONNECTIONS, { color, lineWidth: 4 });
        }
        
        if (window.drawLandmarks) {
          window.drawLandmarks(ctx, handLandmarks, { color: '#06B6D4', lineWidth: 1, radius: 2 });
        }
      });
    }
  }, [landmarks, isLoaded]);

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

      {/* 5. Virtual Cursors Layer */}
      {cursors.map((cursor, i) => (
        <React.Fragment key={i}>
          {/* Cursor Trail (Ghost effect) */}
          <motion.div 
            animate={{ left: cursor.x, top: cursor.y }}
            transition={{ type: 'spring', damping: 25, stiffness: 200, mass: 0.5 }}
            className="fixed z-[9999] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/5 border border-white/10"
          />
          
          <div 
            className="fixed z-[10000] pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: cursor.x, top: cursor.y }}
          >
            <motion.div 
              animate={{ 
                scale: gestures[i]?.isPinching ? 0.8 : 1,
                backgroundColor: gestures[i]?.isPinching ? 'rgba(255, 255, 255, 0.9)' : (i === 0 ? 'rgba(124, 58, 237, 0.3)' : 'rgba(236, 72, 153, 0.3)'),
                borderColor: gestures[i]?.isPinching ? '#ffffff' : (i === 0 ? '#7C3AED' : '#EC4899'),
                boxShadow: gestures[i]?.isPinching ? '0 0 40px white' : (i === 0 ? '0 0 20px rgba(124, 58, 237, 0.6)' : '0 0 20px rgba(236, 72, 153, 0.6)')
              }}
              className="w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center"
            >
              {gestures[i]?.isPinching && <div className="w-2 h-2 bg-purple-600 rounded-full animate-ping" />}
            </motion.div>
            
            <div className="absolute -top-14 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-white italic drop-shadow-xl bg-black/40 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/10">
              {gestures[i]?.isIndexUp ? '☝️ Dibujando' : gestures[i]?.isOpenHand ? '✋ Pausa' : gestures[i]?.isPinching ? '🤏 Agarrar' : `🖐️ Mano ${i + 1}`}
            </div>
          </div>
        </React.Fragment>
      ))}

      {/* Loading & Error Screen */}
      {(!isLoaded || error) && (
        <div className="absolute inset-0 z-[100] bg-[#03030b] flex flex-col items-center justify-center p-12 text-center">
          {error ? (
            <div className="space-y-6 max-w-md">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-display font-black text-red-500 uppercase italic">Error de Inicialización</h2>
              <p className="text-white/40 text-xs font-bold leading-relaxed">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-8" />
              <p className="text-purple-400 font-black uppercase tracking-[0.4em] text-[10px] italic">Iniciando Sensor IA...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LayeredEngine;
