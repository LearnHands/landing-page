import React, { useRef, useEffect } from 'react';

const LayeredEngine = ({ children, videoRef, isLoaded, error }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    let animId;
    
    // Trail position storage for smoothing
    const trails = [
      { x: 0, y: 0, initialized: false },
      { x: 0, y: 0, initialized: false }
    ];

    const updateLoop = () => {
      const data = window.latestHandData || { landmarks: [], cursors: [], gestures: [] };
      const cursors = data.cursors || [];
      const gestures = data.gestures || [];
      const landmarks = data.landmarks || [];

      // A. DIBUJAR LANDMARKS EN CANVAS NATIVO
      const canvas = canvasRef.current;
      if (canvas && isLoaded) {
        if (videoRef?.current) {
          const vw = videoRef.current.videoWidth;
          const vh = videoRef.current.videoHeight;
          if (vw && vh) {
            if (canvas.width !== vw || canvas.height !== vh) {
              canvas.width = vw;
              canvas.height = vh;
            }
          }
        }

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

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
      }

      // B. ACTUALIZAR CURSORES VIRTUALES DIRECTAMENTE EN EL DOM (Butter smooth, zero React lag)
      for (let i = 0; i < 2; i++) {
        const cursor = cursors[i];
        const gesture = gestures[i];
        
        const containerEl = document.getElementById(`virtual-cursor-container-${i}`);
        const trailEl = document.getElementById(`virtual-cursor-trail-${i}`);
        const dotEl = document.getElementById(`virtual-cursor-dot-${i}`);
        const pingEl = document.getElementById(`virtual-cursor-ping-${i}`);
        const labelEl = document.getElementById(`virtual-cursor-label-${i}`);

        if (cursor && cursor.isVisible) {
          // Posición del contenedor principal
          if (containerEl) {
            containerEl.style.left = `${cursor.x}px`;
            containerEl.style.top = `${cursor.y}px`;
            containerEl.style.display = 'block';
          }

          // Posición de la estela con filtro de suavizado LERP
          const trail = trails[i];
          if (!trail.initialized) {
            trail.x = cursor.x;
            trail.y = cursor.y;
            trail.initialized = true;
          } else {
            trail.x += (cursor.x - trail.x) * 0.18;
            trail.y += (cursor.y - trail.y) * 0.18;
          }

          if (trailEl) {
            trailEl.style.left = `${trail.x}px`;
            trailEl.style.top = `${trail.y}px`;
            trailEl.style.display = 'block';
          }

          // Estilos dinámicos del cursor en base a la pinza
          if (dotEl) {
            if (gesture?.isPinching) {
              dotEl.style.transform = 'scale(0.85)';
              dotEl.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
              dotEl.style.borderColor = '#ffffff';
              dotEl.style.boxShadow = '0 0 35px white';
              if (pingEl) pingEl.style.display = 'block';
            } else {
              dotEl.style.transform = 'scale(1)';
              dotEl.style.backgroundColor = i === 0 ? 'rgba(124, 58, 237, 0.25)' : 'rgba(236, 72, 153, 0.25)';
              dotEl.style.borderColor = i === 0 ? '#7C3AED' : '#EC4899';
              dotEl.style.boxShadow = i === 0 ? '0 0 20px rgba(124, 58, 237, 0.5)' : '0 0 20px rgba(236, 72, 153, 0.5)';
              if (pingEl) pingEl.style.display = 'none';
            }
          }

          // Texto descriptivo del gesto actual
          if (labelEl) {
            labelEl.textContent = gesture?.isIndexUp 
              ? '☝️ Dibujando' 
              : gesture?.isOpenHand 
              ? '✋ Pausa' 
              : gesture?.isPinching 
              ? '🤏 Agarrar' 
              : `🖐️ Mano ${i + 1}`;
          }
        } else {
          // Ocultar elementos si no se detecta la mano
          if (containerEl) containerEl.style.display = 'none';
          if (trailEl) trailEl.style.display = 'none';
          trails[i].initialized = false;
        }
      }

      animId = requestAnimationFrame(updateLoop);
    };

    animId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animId);
  }, [isLoaded, videoRef]);

  return (
    <div className="fixed inset-0 bg-[#03030b] overflow-hidden">
      {/* 1. Video Layer (Mirrored) */}
      <div className="absolute inset-0 z-0">
        <video 
          ref={videoRef} 
          className="w-full h-full object-cover opacity-60 grayscale brightness-90 scale-x-[-1]" 
          autoPlay 
          playsInline 
          muted
        />
      </div>

      {/* 2. Overlay Layer (Glassmorphism) */}
      <div className="absolute inset-0 z-10 bg-black/20 backdrop-blur-[2px] pointer-events-none" />

      {/* 3. Landmarks Layer (Neon) */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none scale-x-[-1] opacity-60" 
      />

      {/* 4. UI Layer (Transparent Content) */}
      <div className="absolute inset-0 z-30 flex flex-col">
        {children}
      </div>

      {/* 5. Virtual Cursors Layer (DOM absolute placeholders) */}
      {/* Mano 1 (Violeta) */}
      <div id="virtual-cursor-trail-0" className="fixed z-[9999] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 hidden w-8 h-8 rounded-full bg-white/5 border border-white/10" />
      <div id="virtual-cursor-container-0" className="fixed z-[10000] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 hidden">
        <div id="virtual-cursor-dot-0" className="w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center bg-purple-500/25 border-purple-500 shadow-[0_0_20px_rgba(124,58,237,0.5)]">
          <div id="virtual-cursor-ping-0" className="w-2 h-2 bg-purple-600 rounded-full animate-ping hidden" />
        </div>
        <div id="virtual-cursor-label-0" className="absolute -top-14 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-white italic drop-shadow-xl bg-black/40 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/10">🖐️ Mano 1</div>
      </div>

      {/* Mano 2 (Rosa) */}
      <div id="virtual-cursor-trail-1" className="fixed z-[9999] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 hidden w-8 h-8 rounded-full bg-white/5 border border-white/10" />
      <div id="virtual-cursor-container-1" className="fixed z-[10000] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 hidden">
        <div id="virtual-cursor-dot-1" className="w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center bg-pink-500/25 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.5)]">
          <div id="virtual-cursor-ping-1" className="w-2 h-2 bg-pink-600 rounded-full animate-ping hidden" />
        </div>
        <div id="virtual-cursor-label-1" className="absolute -top-14 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-white italic drop-shadow-xl bg-black/40 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/10">🖐️ Mano 2</div>
      </div>

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
