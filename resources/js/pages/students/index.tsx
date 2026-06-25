import { Head, router } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { dashboard } from '@/routes';

interface Student {
    username: string;
    display_name: string;
    class_code: string | null;
    last_login_at: string | null;
    created_at: string;
    total_score: number;
    sessions: number;
}

interface Props {
    students: Student[];
}

export default function StudentsIndex({ students }: Props) {
    const [search, setSearch] = useState('');

    const filtered = search.trim()
        ? students.filter(
              (s) =>
                  s.username.toLowerCase().includes(search.toLowerCase()) ||
                  s.display_name.toLowerCase().includes(search.toLowerCase()),
          )
        : students;

    function destroy(username: string) {
        if (!confirm(`¿Eliminar al estudiante "${username}"? Se eliminarán sus métricas.`)) {
return;
}

        router.delete(`/students/${username}`);
    }

    return (
        <>
            <Head title="Estudiantes" />

            <div className="flex flex-col gap-6 p-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Estudiantes</h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            {students.length} estudiante{students.length !== 1 ? 's' : ''} registrado{students.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <Input
                        className="max-w-xs"
                        placeholder="Buscar por usuario o nombre..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Lista de estudiantes</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {filtered.length === 0 ? (
                            <p className="text-muted-foreground px-6 py-4 text-sm">
                                {search ? 'Sin resultados para la búsqueda.' : 'No hay estudiantes registrados.'}
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-muted-foreground px-6 py-3 text-left font-medium">Estudiante</th>
                                            <th className="text-muted-foreground px-6 py-3 text-left font-medium">Clase</th>
                                            <th className="text-muted-foreground px-6 py-3 text-right font-medium">Puntaje total</th>
                                            <th className="text-muted-foreground px-6 py-3 text-right font-medium">Sesiones</th>
                                            <th className="text-muted-foreground px-6 py-3 text-right font-medium">Último acceso</th>
                                            <th className="text-muted-foreground px-6 py-3 text-right font-medium"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((s) => (
                                            <tr key={s.username} className="border-b last:border-0">
                                                <td className="px-6 py-3">
                                                    <div className="font-medium">{s.display_name}</div>
                                                    <div className="text-muted-foreground font-mono text-xs">{s.username}</div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    {s.class_code ? (
                                                        <Badge variant="secondary" className="font-mono">
                                                            {s.class_code}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">Sin clase</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-right font-mono font-medium">
                                                    {Number(s.total_score).toLocaleString('es-EC')}
                                                </td>
                                                <td className="px-6 py-3 text-right">{s.sessions}</td>
                                                <td className="text-muted-foreground px-6 py-3 text-right">
                                                    {s.last_login_at
                                                        ? new Date(s.last_login_at).toLocaleDateString('es-EC', {
                                                              day: '2-digit',
                                                              month: 'short',
                                                          })
                                                        : 'Nunca'}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex justify-end">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="text-destructive hover:text-destructive"
                                                            onClick={() => destroy(s.username)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
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

StudentsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Estudiantes', href: '/students' },
    ],
};
