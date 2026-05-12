import React, { useRef, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

const COLORS = ['#7C3AED', '#06B6D4', '#EC4899', '#10B981', '#F97316', '#FFFFFF'];

const DrawingModule = ({ cursor, gestures, addPoints }) => {
  const canvasRef = useRef(null);
  const [color, setColor] = useState(COLORS[0]);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!canvasRef.current || !cursor.isVisible) return;

    const ctx = canvasRef.current.getContext('2d');
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Scale coordinates to canvas resolution
    const x = (cursor.x - rect.left) * (canvasRef.current.width / rect.width);
    const y = (cursor.y - rect.top) * (canvasRef.current.height / rect.height);

    if (gestures.isIndexUp && !gestures.isOpenHand) {
      if (!isDrawing) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
        lastPos.current = { x, y };
      } else {
        ctx.lineTo(x, y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        
        // Add points occasionally while drawing
        if (Math.random() > 0.95) addPoints(1);
      }
    } else {
      setIsDrawing(false);
    }
  }, [cursor, gestures, color, isDrawing, addPoints]);

  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  return (
    <div className="w-full h-full flex relative overflow-hidden">
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
      <div className="flex-1 relative bg-black/10">
        <canvas 
          ref={canvasRef} 
          width={1920} 
          height={1080} 
          className="w-full h-full object-contain cursor-none" 
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
};

export default DrawingModule;
