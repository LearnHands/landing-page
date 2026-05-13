import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, CheckCircle2, RotateCcw, ArrowRight } from 'lucide-react';

const PLANETS = [
  { id: 'mercury', name: 'Mercurio', color: '#9CA3AF', size: 40, distance: 120, fact: 'Es el planeta más pequeño y cercano al Sol.', quiz: '¿Cuál es el planeta más pequeño?', order: 1 },
  { id: 'venus', name: 'Venus', color: '#FCD34D', size: 55, distance: 180, fact: 'Es el planeta más caliente del sistema solar.', quiz: '¿Cuál es el planeta más caliente?', order: 2 },
  { id: 'earth', name: 'Tierra', color: '#3B82F6', size: 60, distance: 250, fact: 'Nuestro hogar, el único con vida conocida.', quiz: '¿En qué planeta vivimos?', order: 3 },
  { id: 'mars', name: 'Marte', color: '#EF4444', size: 50, distance: 320, fact: 'Conocido como el planeta rojo.', quiz: '¿Qué planeta es rojo?', order: 4 },
  { id: 'jupiter', name: 'Júpiter', color: '#D97706', size: 90, distance: 420, fact: 'Es el planeta más grande de todos.', quiz: '¿Cuál es el planeta más grande?', order: 5 },
  { id: 'saturn', name: 'Saturno', color: '#F59E0B', size: 80, distance: 540, fact: 'Famoso por sus hermosos anillos.', quiz: '¿Qué planeta tiene anillos?', order: 6, hasRings: true },
  { id: 'uranus', name: 'Urano', color: '#60A5FA', size: 70, distance: 640, fact: 'Es un gigante de hielo muy frío.', quiz: '¿Qué planeta es azul claro?', order: 7 },
  { id: 'neptune', name: 'Neptuno', color: '#1D4ED8', size: 70, distance: 740, fact: 'Es el planeta más alejado del Sol.', quiz: '¿Cuál es el planeta más lejano?', order: 8 },
];

const SolarModule = ({ cursors, addPoints }) => {
  const [mode, setMode] = useState('EXPLORE'); // EXPLORE, QUIZ
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [targetPlanet, setTargetPlanet] = useState(null);
  const [dwellProgress, setDwellProgress] = useState({});
  const [streak, setStreak] = useState(0);

  // Initialize Quiz
  const startQuiz = useCallback(() => {
    const randomPlanet = PLANETS[Math.floor(Math.random() * PLANETS.length)];
    setTargetPlanet(randomPlanet);
    setMode('QUIZ');
    setSelectedPlanet(null);
  }, []);

  // Interaction Loop
  useEffect(() => {
    const checkCollisions = () => {
      const newProgress = { ...dwellProgress };
      let updated = false;

      PLANETS.forEach(planet => {
        const element = document.getElementById(`planet-${planet.id}`);
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const isHit = cursors.some(c => 
          c.x >= rect.left - 40 && c.x <= rect.right + 40 &&
          c.y >= rect.top - 40 && c.y <= rect.bottom + 40
        );

        if (isHit) {
          updated = true;
          const current = newProgress[planet.id] || 0;
          const next = current + 0.05; // Dwell time ~0.8s
          
          if (next >= 1) {
            handlePlanetSelect(planet);
            newProgress[planet.id] = 0;
          } else {
            newProgress[planet.id] = next;
          }
        } else if (newProgress[planet.id]) {
          updated = true;
          newProgress[planet.id] = Math.max(0, newProgress[planet.id] - 0.1);
        }
      });

      if (updated) setDwellProgress(newProgress);
    };

    const interval = setInterval(checkCollisions, 50);
    return () => clearInterval(interval);
  }, [cursors, dwellProgress, mode, targetPlanet]);

  const handlePlanetSelect = (planet) => {
    if (mode === 'QUIZ') {
      if (planet.id === targetPlanet.id) {
        setSelectedPlanet(planet);
        addPoints(100);
        setStreak(s => s + 1);
        setTimeout(() => {
          setSelectedPlanet(null);
          startQuiz();
        }, 3000);
      } else {
        setStreak(0);
        // Visual feedback for error handled in render
      }
    } else {
      setSelectedPlanet(planet);
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#020205] flex items-center justify-center">
      {/* Background Stars */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div key={i} className="absolute w-1 h-1 bg-white rounded-full animate-pulse" 
               style={{ top: `${Math.random()*100}%`, left: `${Math.random()*100}%`, animationDelay: `${Math.random()*5}s` }} />
        ))}
      </div>

      {/* Sun */}
      <div className="absolute w-40 h-40 bg-orange-500 rounded-full blur-2xl opacity-20" />
      <div className="absolute w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-full shadow-[0_0_80px_#f59e0b]" />

      {/* Orbits & Planets */}
      <div className="relative w-full h-full flex items-center justify-center scale-75 md:scale-100">
        {PLANETS.map((planet) => (
          <React.Fragment key={planet.id}>
            {/* Orbit */}
            <div 
              className="absolute border border-white/5 rounded-full pointer-events-none"
              style={{ width: planet.distance * 2, height: planet.distance * 2 }}
            />
            
            {/* Planet Container (Animated Rotation) */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10 + planet.distance/10, repeat: Infinity, ease: "linear" }}
              className="absolute flex items-center justify-center"
              style={{ width: planet.distance * 2, height: planet.distance * 2 }}
            >
              {/* The Planet itself */}
              <div 
                id={`planet-${planet.id}`}
                className="absolute right-0 group cursor-pointer"
                style={{ width: planet.size, height: planet.size, transform: 'translateX(50%)' }}
              >
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  className="w-full h-full rounded-full shadow-2xl relative"
                  style={{ 
                    background: `radial-gradient(circle at 30% 30%, ${planet.color}, #000)`,
                    boxShadow: `0 0 20px ${planet.color}44`
                  }}
                >
                  {planet.hasRings && (
                    <div className="absolute inset-0 border-[6px] border-amber-200/20 rounded-full scale-[2] -rotate-45" />
                  )}

                  {/* Dwell Progress Indicator */}
                  {dwellProgress[planet.id] > 0 && (
                    <svg className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] -rotate-90">
                      <circle cx="50%" cy="50%" r="48%" fill="none" stroke="white" strokeWidth="2"
                              strokeDasharray="100" strokeDashoffset={100 * (1 - dwellProgress[planet.id])} />
                    </svg>
                  )}
                </motion.div>
                
                {/* Planet Name Label */}
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">
                  {planet.name}
                </span>
              </div>
            </motion.div>
          </React.Fragment>
        ))}
      </div>

      {/* Mode UI Overlay */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-full max-w-xl text-center space-y-4">
        <AnimatePresence mode="wait">
          {mode === 'EXPLORE' ? (
            <motion.div key="expl" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                 className="glass-dark p-6 rounded-3xl border border-white/10 flex flex-col items-center gap-4">
              <h2 className="text-3xl font-display font-black italic uppercase text-gradient">Explora el Sistema Solar</h2>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Toca un planeta para conocer sus secretos</p>
              <button onClick={startQuiz} className="px-6 py-2 bg-purple-600 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-purple-500 transition-all flex items-center gap-2">
                Empezar Desafío <ArrowRight size={12} />
              </button>
            </motion.div>
          ) : (
            <motion.div key="quiz" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                 className="glass-dark p-6 rounded-3xl border border-white/10 flex flex-col items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center animate-pulse">❓</div>
                <h2 className="text-2xl font-display font-black italic uppercase tracking-tighter">
                  {targetPlanet.quiz}
                </h2>
              </div>
              <p className="text-purple-400 text-[10px] font-black uppercase tracking-widest">Toca el planeta correcto</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Planet Info Modal */}
      <AnimatePresence>
        {selectedPlanet && (
          <motion.div 
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="absolute right-8 top-1/2 -translate-y-1/2 w-80 glass-dark p-8 rounded-[40px] border border-white/10 shadow-2xl space-y-8 z-50"
          >
            <div className="flex flex-col items-center gap-6">
              <div className="w-32 h-32 rounded-full shadow-2xl relative" style={{ background: `radial-gradient(circle at 30% 30%, ${selectedPlanet.color}, #000)` }}>
                {selectedPlanet.hasRings && (
                  <div className="absolute inset-0 border-[8px] border-amber-200/20 rounded-full scale-150 -rotate-45" />
                )}
              </div>
              <div className="text-center">
                <h3 className="text-4xl font-display font-black italic uppercase tracking-tighter" style={{ color: selectedPlanet.color }}>{selectedPlanet.name}</h3>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Planeta #{selectedPlanet.order}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4 items-start bg-white/5 p-4 rounded-2xl">
                <Info size={20} className="text-purple-400 shrink-0" />
                <p className="text-xs text-white/60 leading-relaxed font-medium">{selectedPlanet.fact}</p>
              </div>
            </div>

            {mode === 'EXPLORE' && (
              <button 
                onClick={() => setSelectedPlanet(null)}
                className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Cerrar Info
              </button>
            )}

            {mode === 'QUIZ' && selectedPlanet.id === targetPlanet.id && (
              <div className="flex flex-col items-center gap-2 text-green-500">
                <CheckCircle2 size={40} className="animate-bounce" />
                <span className="text-[10px] font-black uppercase">¡Excelente!</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Streak Indicator */}
      {streak > 0 && mode === 'QUIZ' && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 text-amber-400 font-black italic text-xs uppercase tracking-widest">
           <RotateCcw size={14} className="animate-spin-slow" /> Racha Actual: {streak}
        </div>
      )}
    </div>
  );
};

export default SolarModule;
