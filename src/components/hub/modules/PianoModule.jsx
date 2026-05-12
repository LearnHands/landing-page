import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const NOTES = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do2'];
const FREQS = { 'Do': 261.6, 'Re': 293.6, 'Mi': 329.6, 'Fa': 349.2, 'Sol': 392.0, 'La': 440.0, 'Si': 493.8, 'Do2': 523.2 };

const PianoModule = ({ cursor, gestures, addPoints }) => {
  const [activeNote, setActiveNote] = useState('');
  const audioCtx = useRef(null);
  const activeKeys = useRef(new Set());

  const playNote = (note) => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    
    osc.type = 'sine';
    osc.frequency.value = FREQS[note];
    
    gain.gain.setValueAtTime(0.4, audioCtx.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.current.currentTime + 1);
    
    osc.start();
    osc.stop(audioCtx.current.currentTime + 1);
    
    setActiveNote(note);
    addPoints(1);
    setTimeout(() => setActiveNote(''), 400);
  };

  useEffect(() => {
    if (cursor.isVisible && cursor.y < window.innerHeight * 0.4) {
      const index = Math.floor((cursor.x / window.innerWidth) * NOTES.length);
      const note = NOTES[index];
      
      if (note && !activeKeys.current.has(note)) {
        playNote(note);
        activeKeys.current.add(note);
        setTimeout(() => activeKeys.current.delete(note), 600);
      }
    }
  }, [cursor]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="w-full flex gap-1 h-[40vh] bg-black/40 p-2 border-b border-white/10 backdrop-blur-md">
        {NOTES.map((n, i) => (
          <div 
            key={n} 
            className={`flex-1 rounded-b-[32px] border border-white/5 transition-all duration-300 flex items-end justify-center pb-12 ${
              activeNote === n 
              ? 'h-full bg-cyan-500/50 border-cyan-400 shadow-[0_0_60px_rgba(6,182,212,0.4)]' 
              : 'h-[95%] bg-white/5'
            }`}
          >
            <div className={`text-xs font-black uppercase tracking-widest transition-transform duration-300 ${
              activeNote === n ? 'text-white scale-150' : 'text-white/20'
            }`}>
              {n}
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center opacity-30 pointer-events-none">
        <motion.div 
          key={activeNote}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-[180px] font-display font-black text-cyan-400 italic tracking-tighter drop-shadow-[0_0_50px_rgba(6,182,212,0.3)]"
        >
          {activeNote || '🎹'}
        </motion.div>
      </div>
    </div>
  );
};

export default PianoModule;
