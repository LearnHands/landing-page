import { Head, router, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboard } from '@/routes';

interface ClassRow {
    id: number;
    class_code: string;
    class_name: string;
    teacher_username: string;
    teacher_name: string;
    created_at: string;
    student_count: number;
}

interface TeacherOption {
    username: string;
    display_name: string;
}

interface Props {
    classes: ClassRow[];
    teachers: TeacherOption[];
}

function CreateClassDialog({ teachers }: { teachers: TeacherOption[] }) {
    const [open, setOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        teacher_username: '',
        class_name: '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/classes', {
            onSuccess: () => {
                setOpen(false);
                reset();
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus className="mr-1 h-4 w-4" />
                    Nueva clase
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Crear clase</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="teacher_username">Profesor *</Label>
                        <select
                            id="teacher_username"
                            value={data.teacher_username}
                            onChange={(e) => setData('teacher_username', e.target.value)}
                            className="border-input bg-background ring-offset-background focus:ring-ring flex h-9 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
                        >
                            <option value="">Seleccionar profesor...</option>
                            {teachers.map((t) => (
                                <option key={t.username} value={t.username}>
                                    {t.display_name || t.username} ({t.username})
                                </option>
                            ))}
                        </select>
                        {errors.teacher_username && (
                            <p className="text-destructive text-xs">{errors.teacher_username}</p>
                        )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="class_name">Nombre de la clase</Label>
                        <Input
                            id="class_name"
                            value={data.class_name}
                            onChange={(e) => setData('class_name', e.target.value)}
                            placeholder="ej: 4to Grado A"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Crear clase
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function ClassesIndex({ classes, teachers }: Props) {
    function destroy(code: string, name: string) {
        if (!confirm(`¿Eliminar la clase "${name}" (${code})? Los estudiantes perderán el acceso.`)) {
return;
}

        router.delete(`/classes/${code}`);
    }

    return (
        <>
            <Head title="Clases" />

            <div className="flex flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Clases</h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            {classes.length} clase{classes.length !== 1 ? 's' : ''} registrada{classes.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <CreateClassDialog teachers={teachers} />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Lista de clases</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {classes.length === 0 ? (
                            <p className="text-muted-foreground px-6 py-4 text-sm">
                                No hay clases registradas.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-muted-foreground px-6 py-3 text-left font-medium">Código</th>
                                            <th className="text-muted-foreground px-6 py-3 text-left font-medium">Nombre</th>
                                            <th className="text-muted-foreground px-6 py-3 text-left font-medium">Profesor</th>
                                            <th className="text-muted-foreground px-6 py-3 text-center font-medium">Estudiantes</th>
                                            <th className="text-muted-foreground px-6 py-3 text-right font-medium">Creada</th>
                                            <th className="text-muted-foreground px-6 py-3 text-right font-medium"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {classes.map((c) => (
                                            <tr key={c.id} className="border-b last:border-0">
                                                <td className="px-6 py-3">
                                                    <Badge className="font-mono tracking-widest">
                                                        {c.class_code}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-3 font-medium">{c.class_name}</td>
                                                <td className="px-6 py-3">
                                                    <div>{c.teacher_name}</div>
                                                    <div className="text-muted-foreground font-mono text-xs">{c.teacher_username}</div>
                                                </td>
                                                <td className="px-6 py-3 text-center">{c.student_count}</td>
                                                <td className="text-muted-foreground px-6 py-3 text-right">
                                                    {new Date(c.created_at).toLocaleDateString('es-EC', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex justify-end">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="text-destructive hover:text-destructive"
                                                            onClick={() => destroy(c.class_code, c.class_name)}
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

ClassesIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Clases', href: '/classes' },
    ],
};
