import { useState, FormEvent } from 'react';
import { Head, useForm, router } from '@inertiajs/react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Teacher {
    username: string;
    display_name: string;
    last_login_at: string | null;
    created_at: string;
}

interface Student {
    username: string;
    display_name: string;
    class_code: string | null;
    last_login_at: string | null;
    created_at: string;
    total_score: number;
    sessions: number;
}

interface MetricRow {
    username: string;
    display_name: string;
    game_name: string;
    score: number;
    duration_seconds: number;
    played_at: string;
}

interface GameSummary {
    game_name: string;
    sessions: number;
    avg_score: number;
    max_score: number;
    avg_duration: number;
}

interface Props {
    authenticated: boolean;
    teachers?: Teacher[];
    students?: Student[];
    metrics?: MetricRow[];
    byGame?: GameSummary[];
    flash?: { success?: string; error?: string };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(dt: string | null) {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(s: number) {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
}
function badge(text: string, color: string) {
    const map: Record<string, string> = {
        blue: 'bg-blue-100 text-blue-700',
        green: 'bg-green-100 text-green-700',
        purple: 'bg-purple-100 text-purple-700',
        amber: 'bg-amber-100 text-amber-700',
        rose: 'bg-rose-100 text-rose-700',
        slate: 'bg-slate-100 text-slate-600',
    };
    return `inline-block px-2 py-0.5 rounded text-xs font-semibold ${map[color] ?? map.slate}`;
}

// ── Login Gate ────────────────────────────────────────────────────────────────

function LoginGate({ flash }: { flash?: Props['flash'] }) {
    const { data, setData, post, processing } = useForm({ password: '' });

    function submit(e: FormEvent) {
        e.preventDefault();
        post('/admin/login');
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-indigo-950 p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8">
                <div className="text-center mb-8">
                    <div className="text-4xl mb-3">🛡️</div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Panel Administrativo</h1>
                    <p className="text-slate-500 text-sm mt-1">LearnHands · Acceso restringido</p>
                </div>

                {flash?.error && (
                    <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-lg">
                        {flash.error}
                    </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Contraseña de administrador</label>
                        <input
                            type="password"
                            value={data.password}
                            onChange={e => setData('password', e.target.value)}
                            required
                            placeholder="••••••••"
                            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg transition disabled:opacity-60"
                    >
                        {processing ? 'Verificando…' : 'Ingresar'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ── Tab: Profesores ───────────────────────────────────────────────────────────

function TeachersTab({ teachers, flash }: { teachers: Teacher[]; flash?: Props['flash'] }) {
    const { data, setData, post, processing, reset, errors } = useForm({
        username: '',
        display_name: '',
        password: '',
    });

    function submit(e: FormEvent) {
        e.preventDefault();
        post('/admin/teachers', { onSuccess: () => reset() });
    }

    function deleteTeacher(username: string) {
        if (!confirm(`¿Eliminar al profesor "${username}"? Esta acción no se puede deshacer.`)) return;
        router.delete(`/admin/teachers/${username}`);
    }

    return (
        <div className="space-y-8">
            {/* Flash */}
            {flash?.success && (
                <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">{flash.success}</div>
            )}
            {flash?.error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-lg">{flash.error}</div>
            )}

            {/* Form: nuevo profesor */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="font-black text-slate-800 text-lg mb-5">➕ Registrar nuevo profesor</h3>
                <form onSubmit={submit} className="grid sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Usuario *</label>
                        <input
                            type="text"
                            value={data.username}
                            onChange={e => setData('username', e.target.value)}
                            required
                            placeholder="ProfeGarcia"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nombre completo</label>
                        <input
                            type="text"
                            value={data.display_name}
                            onChange={e => setData('display_name', e.target.value)}
                            placeholder="Prof. García López"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Contraseña *</label>
                        <input
                            type="password"
                            value={data.password}
                            onChange={e => setData('password', e.target.value)}
                            required
                            placeholder="••••••••"
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="sm:col-span-3">
                        <button
                            type="submit"
                            disabled={processing}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-6 py-2 rounded-lg transition disabled:opacity-60"
                        >
                            {processing ? 'Creando…' : 'Crear profesor'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Tabla de profesores */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-black text-slate-800">Profesores registrados</h3>
                    <span className={badge(`${teachers.length} docentes`, 'blue')}>{teachers.length} docentes</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-left">Usuario</th>
                                <th className="px-4 py-3 text-left">Nombre</th>
                                <th className="px-4 py-3 text-left">Último acceso</th>
                                <th className="px-4 py-3 text-left">Creado</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {teachers.length === 0 && (
                                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Sin profesores registrados</td></tr>
                            )}
                            {teachers.map(t => (
                                <tr key={t.username} className="hover:bg-slate-50 transition">
                                    <td className="px-4 py-3 font-mono text-slate-700 font-semibold">{t.username}</td>
                                    <td className="px-4 py-3 text-slate-600">{t.display_name}</td>
                                    <td className="px-4 py-3 text-slate-400">{fmt(t.last_login_at)}</td>
                                    <td className="px-4 py-3 text-slate-400">{fmt(t.created_at)}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => deleteTeacher(t.username)}
                                            className="text-rose-500 hover:text-rose-700 text-xs font-semibold transition"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ── Tab: Estudiantes ──────────────────────────────────────────────────────────

function StudentsTab({ students }: { students: Student[] }) {
    const [search, setSearch] = useState('');
    const filtered = students.filter(s =>
        s.display_name.toLowerCase().includes(search.toLowerCase()) ||
        s.username.toLowerCase().includes(search.toLowerCase()) ||
        (s.class_code ?? '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-4">
            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total estudiantes', value: students.length, color: 'blue' },
                    { label: 'Con sesiones', value: students.filter(s => s.sessions > 0).length, color: 'green' },
                    { label: 'Puntaje máx.', value: Math.max(0, ...students.map(s => s.total_score)), color: 'purple' },
                    { label: 'Promedio pts', value: students.length ? Math.round(students.reduce((a, s) => a + s.total_score, 0) / students.length) : 0, color: 'amber' },
                ].map(stat => (
                    <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                        <div className="text-2xl font-black text-slate-800">{stat.value}</div>
                        <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
                    </div>
                ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <h3 className="font-black text-slate-800">Lista de estudiantes</h3>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por nombre, cédula o clase…"
                        className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-left">#</th>
                                <th className="px-4 py-3 text-left">Nombre</th>
                                <th className="px-4 py-3 text-left">Cédula / Usuario</th>
                                <th className="px-4 py-3 text-left">Clase</th>
                                <th className="px-4 py-3 text-right">Pts totales</th>
                                <th className="px-4 py-3 text-right">Sesiones</th>
                                <th className="px-4 py-3 text-left">Último acceso</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length === 0 && (
                                <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Sin resultados</td></tr>
                            )}
                            {filtered.map((s, i) => (
                                <tr key={s.username} className="hover:bg-slate-50 transition">
                                    <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                                    <td className="px-4 py-3 font-semibold text-slate-700">{s.display_name}</td>
                                    <td className="px-4 py-3 font-mono text-slate-500 text-xs">{s.username}</td>
                                    <td className="px-4 py-3">
                                        {s.class_code
                                            ? <span className={badge(s.class_code, 'purple')}>{s.class_code}</span>
                                            : <span className="text-slate-300 text-xs">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-indigo-600">{s.total_score.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-slate-500">{s.sessions}</td>
                                    <td className="px-4 py-3 text-slate-400 text-xs">{fmt(s.last_login_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ── Tab: Métricas ─────────────────────────────────────────────────────────────

function MetricsTab({ metrics, byGame }: { metrics: MetricRow[]; byGame: GameSummary[] }) {
    const [gameFilter, setGameFilter] = useState('');
    const filtered = gameFilter ? metrics.filter(m => m.game_name === gameFilter) : metrics;
    const games = [...new Set(byGame.map(g => g.game_name))];

    return (
        <div className="space-y-6">
            {/* Resumen por módulo */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="font-black text-slate-800">Uso por módulo</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-left">Módulo</th>
                                <th className="px-4 py-3 text-right">Sesiones</th>
                                <th className="px-4 py-3 text-right">Puntaje promedio</th>
                                <th className="px-4 py-3 text-right">Puntaje máximo</th>
                                <th className="px-4 py-3 text-right">Duración prom.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {byGame.length === 0 && (
                                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Sin métricas registradas aún</td></tr>
                            )}
                            {byGame.map(g => (
                                <tr key={g.game_name} className="hover:bg-slate-50 transition">
                                    <td className="px-4 py-3 font-semibold text-slate-700">{g.game_name}</td>
                                    <td className="px-4 py-3 text-right text-slate-600">{g.sessions}</td>
                                    <td className="px-4 py-3 text-right text-indigo-600 font-semibold">{Math.round(g.avg_score)}</td>
                                    <td className="px-4 py-3 text-right text-green-600 font-bold">{g.max_score}</td>
                                    <td className="px-4 py-3 text-right text-slate-400">{fmtTime(Math.round(g.avg_duration))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detalle de sesiones */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <h3 className="font-black text-slate-800">Últimas 100 sesiones</h3>
                    <select
                        value={gameFilter}
                        onChange={e => setGameFilter(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Todos los módulos</option>
                        {games.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-left">Estudiante</th>
                                <th className="px-4 py-3 text-left">Módulo</th>
                                <th className="px-4 py-3 text-right">Puntaje</th>
                                <th className="px-4 py-3 text-right">Duración</th>
                                <th className="px-4 py-3 text-left">Fecha</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length === 0 && (
                                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Sin sesiones registradas</td></tr>
                            )}
                            {filtered.map((m, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition">
                                    <td className="px-4 py-3 font-semibold text-slate-700">{m.display_name}</td>
                                    <td className="px-4 py-3"><span className={badge(m.game_name, 'purple')}>{m.game_name}</span></td>
                                    <td className="px-4 py-3 text-right font-bold text-indigo-600">{m.score}</td>
                                    <td className="px-4 py-3 text-right text-slate-400">{fmtTime(m.duration_seconds)}</td>
                                    <td className="px-4 py-3 text-slate-400 text-xs">{fmt(m.played_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ── Main Admin Page ───────────────────────────────────────────────────────────

const TABS = ['Profesores', 'Estudiantes', 'Métricas'] as const;
type Tab = typeof TABS[number];

export default function Admin({ authenticated, teachers = [], students = [], metrics = [], byGame = [], flash }: Props) {
    const [tab, setTab] = useState<Tab>('Profesores');

    if (!authenticated) return <LoginGate flash={flash} />;

    return (
        <>
            <Head title="Panel Admin · LearnHands" />

            <div className="min-h-screen bg-slate-50">
                {/* Header */}
                <header className="bg-white border-b border-slate-200 shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🛡️</span>
                            <div>
                                <h1 className="text-xl font-black text-slate-800 leading-tight">Panel Administrativo</h1>
                                <p className="text-xs text-slate-400">LearnHands · Fe y Alegría Ecuador</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex gap-3 text-xs text-slate-400">
                                <span><span className="font-bold text-slate-700">{teachers.length}</span> profesores</span>
                                <span><span className="font-bold text-slate-700">{students.length}</span> estudiantes</span>
                            </div>
                            <button
                                onClick={() => router.post('/admin/logout')}
                                className="text-xs text-slate-500 hover:text-rose-600 font-semibold transition border border-slate-200 rounded-lg px-3 py-1.5"
                            >
                                Cerrar sesión
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1">
                        {TABS.map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${
                                    tab === t
                                        ? 'border-indigo-600 text-indigo-700'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {t === 'Profesores' && '👩‍🏫 '}
                                {t === 'Estudiantes' && '🎓 '}
                                {t === 'Métricas' && '📊 '}
                                {t}
                            </button>
                        ))}
                    </div>
                </header>

                {/* Content */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                    {tab === 'Profesores' && <TeachersTab teachers={teachers} flash={flash} />}
                    {tab === 'Estudiantes' && <StudentsTab students={students} />}
                    {tab === 'Métricas' && <MetricsTab metrics={metrics} byGame={byGame} />}
                </main>
            </div>
        </>
    );
}
