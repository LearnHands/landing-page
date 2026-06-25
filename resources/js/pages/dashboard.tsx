import { Head, Link } from '@inertiajs/react';
import { GraduationCap, School, Trophy, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard } from '@/routes';

interface Stats {
    teachers: number;
    students: number;
    classes: number;
    sessions: number;
}

interface MetricRow {
    username: string;
    display_name: string;
    game_name: string;
    score: number;
    played_at: string;
}

interface Props {
    stats: Stats;
    recentMetrics: MetricRow[];
}

const GAME_LABELS: Record<string, string> = {
    PIZARRA: 'Pizarra',
    PIANO: 'Piano',
    PUZZLE: 'Puzzle',
    FORMAS: 'Formas',
    SOLAR: 'Sistema Solar',
    BRICKS: 'Bricks',
    SILABAS: 'Sílabas',
    ECO: 'Eco Guardián',
    ABACUS: 'Ábaco',
};

export default function Dashboard({ stats, recentMetrics }: Props) {
    return (
        <>
            <Head title="Dashboard" />

            <div className="flex flex-col gap-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold">Panel de administración</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Resumen general de LearnHands
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Link href="/teachers">
                        <Card className="hover:bg-accent/50 cursor-pointer transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Profesores</CardTitle>
                                <GraduationCap className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{stats.teachers}</div>
                                <p className="text-muted-foreground text-xs">Gestionar profesores →</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/students">
                        <Card className="hover:bg-accent/50 cursor-pointer transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Estudiantes</CardTitle>
                                <Users className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{stats.students}</div>
                                <p className="text-muted-foreground text-xs">Ver estudiantes →</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/classes">
                        <Card className="hover:bg-accent/50 cursor-pointer transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Clases</CardTitle>
                                <School className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{stats.classes}</div>
                                <p className="text-muted-foreground text-xs">Gestionar clases →</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Sesiones de juego</CardTitle>
                            <Trophy className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats.sessions}</div>
                            <p className="text-muted-foreground text-xs">Total registradas</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Actividad reciente</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {recentMetrics.length === 0 ? (
                            <p className="text-muted-foreground px-6 py-4 text-sm">
                                No hay sesiones registradas aún.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-muted-foreground px-6 py-3 text-left font-medium">Estudiante</th>
                                            <th className="text-muted-foreground px-6 py-3 text-left font-medium">Módulo</th>
                                            <th className="text-muted-foreground px-6 py-3 text-right font-medium">Puntaje</th>
                                            <th className="text-muted-foreground px-6 py-3 text-right font-medium">Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentMetrics.map((m, i) => (
                                            <tr key={i} className="border-b last:border-0">
                                                <td className="px-6 py-3 font-medium">{m.display_name}</td>
                                                <td className="px-6 py-3">
                                                    <Badge variant="secondary">
                                                        {GAME_LABELS[m.game_name] ?? m.game_name}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-3 text-right font-mono">{m.score}</td>
                                                <td className="text-muted-foreground px-6 py-3 text-right">
                                                    {new Date(m.played_at).toLocaleDateString('es-EC', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
