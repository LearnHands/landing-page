import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart2, TrendingUp, Clock, Activity, Calendar, User,
  RefreshCw, Award, AlertTriangle, ChevronRight, CheckCircle
} from 'lucide-react';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

export default function DashboardSection() {
  const [metrics, setMetrics] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentFilter, setStudentFilter] = useState('ALL');
  const [dashboardTab, setDashboardTab] = useState('summary');
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch list of students
      const resStudents = await fetch(`${API_URL}/api/teacher/students`);
      if (!resStudents.ok) throw new Error('Error al obtener lista de alumnos');
      const dataStudents = await resStudents.json();
      setStudents(dataStudents);

      // Fetch all metrics
      const resMetrics = await fetch(`${API_URL}/api/teacher/metrics`);
      if (!resMetrics.ok) throw new Error('Error al obtener el historial de métricas');
      const dataMetrics = await resMetrics.json();
      setMetrics(dataMetrics);
    } catch (err) {
      console.error('[Dashboard] Error fetching analytics:', err);
      setError('No se pudo conectar con el servidor de base de datos. Asegúrate de que el backend esté iniciado.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedSuccess(false);
    try {
      const res = await fetch(`${API_URL}/api/teacher/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });
      if (res.ok) {
        setSeedSuccess(true);
        setTimeout(() => setSeedSuccess(false), 3000);
        await fetchData();
      } else {
        throw new Error('Fallo al generar los datos semilla');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  // ── Data Processing ────────────────────────────────────────────────────────
  const filteredMetrics = useMemo(() => {
    if (studentFilter === 'ALL') return metrics;
    return metrics.filter(m => m.username === studentFilter);
  }, [metrics, studentFilter]);

  const studentList = useMemo(() => {
    return [...new Set(metrics.map(m => m.username))];
  }, [metrics]);

  const totalSessions = filteredMetrics.length;
  
  const totalTimeMins = useMemo(() => {
    const sec = filteredMetrics.reduce((sum, m) => sum + (m.duration_seconds || 0), 0);
    return Math.round(sec / 60);
  }, [filteredMetrics]);

  const avgScore = useMemo(() => {
    if (filteredMetrics.length === 0) return 0;
    const sum = filteredMetrics.reduce((sum, m) => sum + (m.score || 0), 0);
    return Math.round(sum / filteredMetrics.length);
  }, [filteredMetrics]);

  const maxScore = useMemo(() => {
    if (filteredMetrics.length === 0) return 0;
    return Math.max(...filteredMetrics.map(m => m.score || 0));
  }, [filteredMetrics]);

  const gameScores = useMemo(() => {
    const groups = {};
    filteredMetrics.forEach(m => {
      const name = m.game_name.toUpperCase();
      if (!groups[name]) groups[name] = { sum: 0, count: 0 };
      groups[name].sum += m.score;
      groups[name].count += 1;
    });
    return Object.keys(groups).map(game => ({
      game,
      avg: Math.round(groups[game].sum / groups[game].count)
    })).sort((a, b) => b.avg - a.avg);
  }, [filteredMetrics]);

  const moduleUsage = useMemo(() => {
    const counts = {};
    filteredMetrics.forEach(m => {
      const name = m.game_name.toUpperCase();
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.keys(counts).map(name => ({
      name,
      count: counts[name]
    })).sort((a, b) => b.count - a.count);
  }, [filteredMetrics]);

  const timelineData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      const key = d.toISOString().split('T')[0];
      days.push({ key, dateStr, score: 0 });
    }
    filteredMetrics.forEach(m => {
      const mDateStr = new Date(m.played_at).toISOString().split('T')[0];
      const found = days.find(d => d.key === mDateStr);
      if (found) {
        found.score += m.score;
      }
    });
    return days;
  }, [filteredMetrics]);

  return (
    <div className="w-full relative z-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="text-purple-400" size={20} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400">Panel de Control Docente</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-black tracking-tighter italic uppercase text-gradient">
            Métricas de Aprendizaje
          </h2>
          <p className="text-white/45 text-sm font-medium mt-2 max-w-2xl leading-relaxed">
            Monitoreo en tiempo real del desempeño de los estudiantes en la plataforma de movimiento natural LearnHands.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-5 py-3 glass rounded-2xl border border-white/10 hover:border-white/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-5 py-3 bg-purple-600/10 border border-purple-500/20 hover:border-purple-500/40 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all text-purple-400 hover:scale-[1.02]"
          >
            {seedSuccess ? <CheckCircle size={12} className="text-emerald-400" /> : <Activity size={12} />}
            {seeding ? 'Generando...' : seedSuccess ? '¡Completado!' : 'Sembrar Datos Demo'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-96 glass rounded-[40px] border border-white/5 flex flex-col items-center justify-center gap-4">
          <RefreshCw className="animate-spin text-purple-500" size={48} />
          <span className="text-xs font-black uppercase tracking-widest text-white/30">Cargando métricas analíticas...</span>
        </div>
      ) : error ? (
        <div className="glass rounded-[40px] border border-red-500/20 p-12 text-center flex flex-col items-center gap-6 max-w-3xl mx-auto">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-3xl flex items-center justify-center text-red-400">
            <AlertTriangle size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold uppercase tracking-tight text-red-200">Error de Conexión</h3>
            <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed">{error}</p>
          </div>
          <button
            onClick={handleSeed}
            className="mt-2 px-8 py-4 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-purple-500 transition-all shadow-xl shadow-purple-500/20 hover:scale-105 active:scale-[0.97]"
          >
            Sembrar base de datos local
          </button>
        </div>
      ) : metrics.length === 0 ? (
        <div className="glass rounded-[40px] border border-white/10 p-16 text-center flex flex-col items-center gap-8 max-w-2xl mx-auto">
          <div className="text-6xl animate-bounce-slow">📊</div>
          <div className="space-y-3">
            <h3 className="text-2xl font-display font-black uppercase italic text-white/90">Sin datos de juego</h3>
            <p className="text-white/40 text-sm max-w-sm mx-auto leading-relaxed">
              Aún no se han Sincronizado métricas desde la aplicación de escritorio a la base de datos central.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={handleSeed}
              className="px-6 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-purple-500/20 hover:scale-105 active:scale-[0.98]"
            >
              Generar Datos Ficticios
            </button>
            <span className="text-[9px] font-black tracking-wider text-white/20 uppercase">Permite probar el dashboard con un click</span>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Student Filter Bar */}
          <div className="glass p-5 rounded-3xl border border-white/5 flex flex-wrap items-center gap-4 bg-black/20">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30 flex items-center gap-2 mr-2">
              <User size={12} /> Filtrar Estudiante:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStudentFilter('ALL')}
                className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                  studentFilter === 'ALL'
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                    : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:border-white/20'
                }`}
              >
                Todos ({metrics.length})
              </button>
              {studentList.map(student => {
                const count = metrics.filter(m => m.username === student).length;
                return (
                  <button
                    key={student}
                    onClick={() => setStudentFilter(student)}
                    className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                      studentFilter === student
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                        : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {student} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-white/10 gap-8">
            {[
              { id: 'summary', label: 'Resumen General' },
              { id: 'timeline', label: 'Historial Temporal' },
              { id: 'modules', label: 'Uso de Módulos' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDashboardTab(tab.id)}
                className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${
                  dashboardTab === tab.id ? 'text-purple-400' : 'text-white/40 hover:text-white'
                }`}
              >
                {tab.label}
                {dashboardTab === tab.id && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-0 w-full h-[3px] bg-purple-500 rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          <AnimatePresence mode="wait">
            <motion.div
              key={dashboardTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {dashboardTab === 'summary' && (
                <div className="grid md:grid-cols-3 gap-8">
                  {/* Left Column: Key KPIs */}
                  <div className="md:col-span-1 flex flex-col gap-6">
                    <div className="glass p-6 rounded-[28px] border border-white/5 flex items-center gap-4 bg-gradient-to-br from-purple-500/5 to-transparent">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                        <Activity size={22} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Sesiones Totales</span>
                        <span className="text-3xl font-display font-black italic text-white">{totalSessions}</span>
                      </div>
                    </div>

                    <div className="glass p-6 rounded-[28px] border border-white/5 flex items-center gap-4 bg-gradient-to-br from-cyan-500/5 to-transparent">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                        <Clock size={22} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Tiempo Activo</span>
                        <span className="text-3xl font-display font-black italic text-cyan-400">
                          {totalTimeMins} <span className="text-sm not-italic text-white/40">min</span>
                        </span>
                      </div>
                    </div>

                    <div className="glass p-6 rounded-[28px] border border-white/5 flex items-center gap-4 bg-gradient-to-br from-amber-500/5 to-transparent">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                        <Award size={22} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Puntaje Máximo</span>
                        <span className="text-3xl font-display font-black italic text-amber-400">
                          {maxScore} <span className="text-sm not-italic text-white/40">pts</span>
                        </span>
                      </div>
                    </div>

                    <div className="glass p-6 rounded-[28px] border border-white/5 flex items-center gap-4 bg-gradient-to-br from-emerald-500/5 to-transparent">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                        <TrendingUp size={22} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Puntaje Promedio</span>
                        <span className="text-3xl font-display font-black italic text-emerald-400">
                          {avgScore} <span className="text-sm not-italic text-white/40">pts</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Game Averages Chart */}
                  <div className="md:col-span-2 glass p-6 rounded-[32px] border border-white/10 bg-black/40 flex flex-col gap-6">
                    <div>
                      <h3 className="text-base font-bold uppercase tracking-tight text-white/90">Desempeño Promedio por Juego</h3>
                      <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mt-1">Comparativa de puntajes promedios alcanzados</p>
                    </div>
                    
                    {gameScores.length === 0 ? (
                      <div className="h-64 flex items-center justify-center text-[10px] font-black uppercase text-white/20">Sin registros de puntuación</div>
                    ) : (
                      <div className="w-full flex-1 flex items-end justify-center min-h-[250px] pt-6">
                        <svg viewBox="0 0 500 200" className="w-full h-64 overflow-visible">
                          <line x1="40" y1="20" x2="480" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
                          <line x1="40" y1="80" x2="480" y2="80" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
                          <line x1="40" y1="140" x2="480" y2="140" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
                          <line x1="40" y1="170" x2="480" y2="170" stroke="rgba(255,255,255,0.2)" />
                          {(() => {
                            const maxAvg = Math.max(...gameScores.map(g => g.avg), 100);
                            const colWidth = 420 / Math.max(gameScores.length, 1);
                            return gameScores.map((g, idx) => {
                              const x = 50 + idx * colWidth + (colWidth - 26) / 2;
                              const barHeight = (g.avg / maxAvg) * 140;
                              const y = 170 - barHeight;
                              return (
                                <g key={g.game}>
                                  <defs>
                                    <linearGradient id={`webBarGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#c084fc" />
                                      <stop offset="100%" stopColor="#6366f1" />
                                    </linearGradient>
                                  </defs>
                                  <rect
                                    x={x}
                                    y={y}
                                    width="26"
                                    height={barHeight}
                                    rx="6"
                                    fill={`url(#webBarGrad-${idx})`}
                                    className="transition-all duration-500 hover:opacity-90 cursor-pointer"
                                  />
                                  <text x={x + 13} y={y - 8} textAnchor="middle" fill="#fff" className="text-[10px] font-black">{g.avg}</text>
                                  <text x={x + 13} y="185" textAnchor="middle" fill="rgba(255,255,255,0.4)" className="text-[8px] font-black uppercase tracking-wider">{g.game.substring(0, 6)}</text>
                                </g>
                              );
                            });
                          })()}
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {dashboardTab === 'timeline' && (
                <div className="glass p-6 rounded-[32px] border border-white/10 bg-black/40 flex flex-col gap-6">
                  <div>
                    <h3 className="text-base font-bold uppercase tracking-tight text-white/90">Evolución del Puntaje en el Tiempo</h3>
                    <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mt-1">Puntos totales acumulados por clase (Últimos 7 Días)</p>
                  </div>

                  <div className="w-full h-72 pt-6">
                    <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="webAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(168, 85, 247, 0.4)" />
                          <stop offset="100%" stopColor="rgba(99, 102, 241, 0.0)" />
                        </linearGradient>
                      </defs>
                      <line x1="40" y1="30" x2="480" y2="30" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
                      <line x1="40" y1="100" x2="480" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
                      <line x1="40" y1="170" x2="480" y2="170" stroke="rgba(255,255,255,0.2)" />
                      {(() => {
                        const maxVal = Math.max(...timelineData.map(d => d.score), 100);
                        const points = timelineData.map((d, idx) => {
                          const x = 55 + idx * (410 / 6);
                          const y = 170 - (d.score / maxVal) * 130;
                          return { x, y };
                        });
                        const pathD = points.reduce((acc, p, idx) => {
                          if (idx === 0) return `M ${p.x} ${p.y}`;
                          const prev = points[idx - 1];
                          const cpX1 = prev.x + (p.x - prev.x) / 2;
                          const cpY1 = prev.y;
                          const cpX2 = prev.x + (p.x - prev.x) / 2;
                          const cpY2 = p.y;
                          return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
                        }, '');
                        const areaD = points.length > 0 ? `${pathD} L ${points[points.length - 1].x} 170 L ${points[0].x} 170 Z` : '';
                        
                        return (
                          <>
                            {areaD && <path d={areaD} fill="url(#webAreaGrad)" />}
                            {pathD && <path d={pathD} fill="none" stroke="#c084fc" strokeWidth="3" />}
                            {points.map((p, idx) => (
                              <g key={idx}>
                                <circle cx={p.x} cy={p.y} r="5.5" fill="#a78bfa" stroke="#fff" strokeWidth="2" />
                                <text x={p.x} y={p.y - 12} textAnchor="middle" fill="#fff" className="text-[10px] font-black">{timelineData[idx].score}</text>
                                <text x={p.x} y="188" textAnchor="middle" fill="rgba(255,255,255,0.4)" className="text-[9px] font-black uppercase tracking-wider">{timelineData[idx].dateStr}</text>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>
              )}

              {dashboardTab === 'modules' && (
                <div className="glass p-6 rounded-[32px] border border-white/10 bg-black/40 flex flex-col gap-6">
                  <div>
                    <h3 className="text-base font-bold uppercase tracking-tight text-white/90">Módulos Más Frecuentados</h3>
                    <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mt-1">Conteo absoluto de rondas jugadas por módulo</p>
                  </div>

                  {moduleUsage.length === 0 ? (
                    <div className="py-12 text-center text-[10px] font-black uppercase text-white/20">Sin datos de aperturas</div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      {(() => {
                        const maxCount = Math.max(...moduleUsage.map(m => m.count), 1);
                        return moduleUsage.map(m => (
                          <div key={m.name} className="flex flex-col gap-2 p-4 bg-white/5 border border-white/5 rounded-2xl">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                              <span className="text-white/80">{m.name}</span>
                              <span className="text-purple-400">{m.count} {m.count === 1 ? 'partida' : 'partidas'}</span>
                            </div>
                            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                                style={{ width: `${(m.count / maxCount) * 100}%` }}
                              />
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Raw / Recent Activity Table */}
          <div className="glass p-6 rounded-[32px] border border-white/10 bg-black/40 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold uppercase tracking-tight text-white/90">Historial Reciente</h3>
                <p className="text-white/40 text-[10px] uppercase font-black tracking-widest mt-1">Detalle de las últimas 5 partidas en base de datos</p>
              </div>
              <span className="px-3.5 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-[9px] font-black uppercase tracking-wider text-purple-400">
                Live Data
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-white/30 uppercase tracking-widest font-black">
                    <th className="pb-3">Estudiante</th>
                    <th className="pb-3">Módulo</th>
                    <th className="pb-3 text-center">Puntaje</th>
                    <th className="pb-3 text-center">Duración</th>
                    <th className="pb-3 text-right">Fecha de Juego</th>
                  </tr>
                </thead>
                <tbody className="text-white/80 font-bold">
                  {filteredMetrics.slice(0, 5).map((m, idx) => (
                    <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-all">
                      <td className="py-3.5 uppercase text-purple-400 tracking-wider flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                        {m.username}
                      </td>
                      <td className="py-3.5">{m.game_name}</td>
                      <td className="py-3.5 text-center text-amber-400 font-display italic">{m.score} pts</td>
                      <td className="py-3.5 text-center text-white/50">{m.duration_seconds} seg</td>
                      <td className="py-3.5 text-right text-white/30">
                        {new Date(m.played_at).toLocaleString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                  {filteredMetrics.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-white/20 uppercase font-black">Sin partidas registradas</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
