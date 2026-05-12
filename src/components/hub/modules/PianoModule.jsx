import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const OCTAVES = 2;
const WHITE_NOTES = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
const BLACK_NOTES = { 'Do': 'Do#', 'Re': 'Re#', 'Fa': 'Fa#', 'Sol': 'Sol#', 'La': 'La#' };

const FREQS = {
  'Do': 261.6, 'Do#': 277.2, 'Re': 293.7, 'Re#': 311.1, 'Mi': 329.6, 'Fa': 349.2, 'Fa#': 370.0, 'Sol': 392.0, 'Sol#': 415.3, 'La': 440.0, 'La#': 466.2, 'Si': 493.9,
  'Do2': 523.3, 'Do#2': 554.4, 'Re2': 587.3, 'Re#2': 622.3, 'Mi2': 659.3, 'Fa2': 698.5, 'Fa#2': 740.0, 'Sol2': 784.0, 'Sol#2': 830.6, 'La2': 880.0, 'La#2': 932.3, 'Si2': 987.8
};

const PianoModule = ({ cursors, gestures, addPoints }) => {
  const [activeNotes, setActiveNotes] = useState(new Set());
  const audioCtx = useRef(null);
  const oscillators = useRef({});

  const whiteKeys = useMemo(() => {
    const keys = [];
    for (let o = 0; o < OCTAVES; o++) {
      WHITE_NOTES.forEach(n => keys.push(o === 0 ? n : n + '2'));
    }
    return keys;
  }, []);

  const playNote = (note) => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (oscillators.current[note]) return;

    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    
    osc.type = 'sine';
    osc.frequency.value = FREQS[note] || 440;
    
    gain.gain.setValueAtTime(0.3, audioCtx.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.current.currentTime + 0.8);
    
    osc.start();
    osc.stop(audioCtx.current.currentTime + 0.8);
    
    oscillators.current[note] = osc;
    setActiveNotes(prev => new Set([...prev, note]));
    addPoints(2);
    
    setTimeout(() => {
      delete oscillators.current[note];
      setActiveNotes(prev => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
    }, 400);
  };

  const keyRects = useRef([]);

  // Cache rects only once or when window resizes
  useEffect(() => {
    const updateRects = () => {
      const black = Array.from(document.querySelectorAll('.black-key')).map(el => ({
        note: el.dataset.note,
        rect: el.getBoundingClientRect(),
        isBlack: true
      }));
      const white = Array.from(document.querySelectorAll('.white-key')).map(el => ({
        note: el.dataset.note,
        rect: el.getBoundingClientRect(),
        isBlack: false
      }));
      keyRects.current = [...black, ...white];
    };
    
    // Delay slightly to ensure DOM is ready
    const timer = setTimeout(updateRects, 500);
    window.addEventListener('resize', updateRects);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRects);
    };
  }, []);

  useEffect(() => {
    if (gestures.length === 0) return;

    gestures.forEach((handGestures) => {
      // Use ALL 21 landmarks for "whole hand" detection
      const allPoints = handGestures.landmarks || [];

      allPoints.forEach(point => {
        if (!point) return;
        
        const x = (1 - point.x) * window.innerWidth;
        const y = point.y * window.innerHeight;

        // Check against cached rects
        for (const item of keyRects.current) {
          const r = item.rect;
          if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
            playNote(item.note);
            if (item.isBlack) break;
          }
        }
      });
    });
  }, [gestures]);

  return (
    <div className="w-full h-full flex flex-col select-none">
      {/* Piano Keys (Top) */}
      <div className="w-full h-[35vh] bg-black/60 p-2 border-b border-white/10 backdrop-blur-xl relative flex">
        {whiteKeys.map((n, i) => (
          <div key={n} className="flex-1 relative flex">
            {/* White Key */}
            <div 
              data-note={n}
              className={`white-key flex-1 rounded-b-[20px] border border-black/20 transition-all duration-200 flex items-end justify-center pb-8 ${
                activeNotes.has(n) 
                ? 'bg-gradient-to-t from-cyan-500 to-cyan-300 shadow-[0_0_40px_rgba(6,182,212,0.6)] h-full z-10' 
                : 'bg-white h-[95%]'
              }`}
            >
              <div className="text-[10px] font-black uppercase text-black/40">{n}</div>
            </div>

            {/* Black Key */}
            {BLACK_NOTES[n.replace('2', '')] && (
              <div 
                data-note={n.includes('2') ? BLACK_NOTES[n.replace('2', '')] + '2' : BLACK_NOTES[n]}
                className={`black-key absolute right-[-25%] top-0 w-1/2 h-[60%] rounded-b-xl border border-white/10 transition-all duration-200 z-20 ${
                  activeNotes.has(n.includes('2') ? BLACK_NOTES[n.replace('2', '')] + '2' : BLACK_NOTES[n])
                  ? 'bg-gradient-to-t from-purple-500 to-purple-400 shadow-[0_0_40px_rgba(168,85,247,0.6)] h-[65%]'
                  : 'bg-[#1a1a1a]'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Visual Feedback Area (Bottom) */}
      <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden pointer-events-none">
        <AnimatePresence>
            {activeNotes.size > 0 ? (
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0, y: 50 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 1.2, opacity: 0, y: -50 }}
                    className="flex flex-wrap justify-center gap-12"
                >
                    {Array.from(activeNotes).map(n => (
                        <div key={n} className="text-[140px] font-display font-black text-white italic tracking-tighter drop-shadow-[0_0_30px_rgba(6,182,212,0.8)]">
                            {n}
                        </div>
                    ))}
                </motion.div>
            ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} className="text-center space-y-6">
                    <div className="text-8xl animate-bounce-slow">🎹</div>
                    <div className="text-3xl font-display font-black text-white/40 italic tracking-[0.2em] uppercase">Usa tu mano para tocar</div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PianoModule;
