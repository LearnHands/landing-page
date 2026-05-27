import React, { useRef, useEffect, useState, memo } from 'react';
import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

const COLORS = ['#7C3AED', '#06B6D4', '#EC4899', '#10B981', '#F97316', '#FFFFFF'];

const DrawingModule = memo(({ addPoints }) => {
  const canvasRef = useRef(null);
  const [color, setColor] = useState(COLORS[0]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const colorRef = useRef(color);
  const isDrawingRef = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  // Ciclo de dibujo en canvas (Decouplado de re-renders de React)
  useEffect(() => {
    let animId;

    const drawLoop = () => {
      const handData = window.latestHandData || { cursors: [], gestures: [] };
      const cursor = handData.cursors[0];
      const gesture = handData.gestures[0];

      const canvas = canvasRef.current;
      if (canvas && cursor && cursor.isVisible) {
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        // Escalar coordenadas del cursor a la resolución interna del canvas
        const x = (cursor.x - rect.left) * (canvas.width / rect.width);
        const y = (cursor.y - rect.top) * (canvas.height / rect.height);

        if (gesture?.isIndexUp && !gesture?.isOpenHand) {
          if (!isDrawingRef.current) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            isDrawingRef.current = true;
            setIsDrawing(true);
            lastPos.current = { x, y };
          } else {
            ctx.lineTo(x, y);
            ctx.strokeStyle = colorRef.current;
            ctx.lineWidth = 14;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
            
            if (Math.random() > 0.95) addPoints(1);
          }
        } else {
          if (isDrawingRef.current) {
            isDrawingRef.current = false;
            setIsDrawing(false);
          }
        }
      } else {
        if (isDrawingRef.current) {
          isDrawingRef.current = false;
          setIsDrawing(false);
        }
      }

      animId = requestAnimationFrame(drawLoop);
    };

    animId = requestAnimationFrame(drawLoop);
    return () => cancelAnimationFrame(animId);
  }, [addPoints]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div className="w-full h-full flex relative overflow-hidden bg-transparent">
      {/* Sidebar Controls */}
      <aside className="w-24 glass-dark border-r border-white/5 flex flex-col items-center gap-8 py-12 z-20">
        <div className="text-[10px] font-black text-white/20 uppercase tracking-widest vertical-text mb-4">Colores</div>
        {COLORS.map(c => (
          <button 
            key={c} 
            onClick={() => setColor(c)}
            className={`w-12 h-12 rounded-full border-4 transition-all duration-300 ${
              color === c ? 'border-white scale-110 shadow-[0_0_20px_white]' : 'border-transparent opacity-40 hover:opacity-100'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
        
        <div className="mt-auto flex flex-col gap-4 items-center">
            <button 
              onClick={clearCanvas}
              className="p-4 bg-red-500/20 text-red-500 rounded-2xl border border-red-500/30 hover:bg-red-500 hover:text-white transition-all shadow-xl"
            >
              <Trash2 size={24} />
            </button>
            <div className="text-[8px] font-black text-white/20 uppercase tracking-widest">Borrar</div>
        </div>
      </aside>

      {/* Drawing Surface */}
      <div className="flex-1 relative bg-transparent">
        <canvas 
          ref={canvasRef} 
          width={1920} 
          height={1080} 
          className="w-full h-full object-contain cursor-none bg-transparent" 
        />
        
        {/* Helper text when not drawing */}
        {!isDrawing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
            <div className="text-center">
              <div className="text-[120px]">☝️</div>
              <div className="text-4xl font-display font-black uppercase tracking-widest italic">Usa tu dedo índice</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default DrawingModule;
