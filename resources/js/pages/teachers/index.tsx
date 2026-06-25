import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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

interface Teacher {
    username: string;
    display_name: string;
    last_login_at: string | null;
    created_at: string;
    class_count: number;
}

interface Props {
    teachers: Teacher[];
}

function CreateTeacherDialog() {
    const [open, setOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        username: '',
        display_name: '',
        password: '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/teachers', {
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
                    Nuevo profesor
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Registrar profesor</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="flex flex-col gap-4 pt-2">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="username">Usuario *</Label>
                        <Input
                            id="username"
                            value={data.username}
                            onChange={(e) => setData('username', e.target.value)}
                            placeholder="ej: profe_maria"
                            autoComplete="off"
                        />
                        {errors.username && (
                            <p className="text-destructive text-xs">{errors.username}</p>
                        )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="display_name">Nombre para mostrar</Label>
                        <Input
                            id="display_name"
                            value={data.display_name}
                            onChange={(e) => setData('display_name', e.target.value)}
                            placeholder="ej: María García"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="password">Contraseña *</Label>
                        <Input
                            id="password"
                            type="password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Registrar
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function TeachersIndex({ teachers }: Props) {
    function destroy(username: string) {
        if (!confirm(`¿Eliminar al profesor "${username}"? Se eliminarán también sus clases.`)) {
return;
}

        router.delete(`/teachers/${username}`);
    }

    return (
        <>
            <Head title="Profesores" />

            <div className="flex flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Profesores</h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            {teachers.length} profesor{teachers.length !== 1 ? 'es' : ''} registrado{teachers.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <CreateTeacherDialog />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Lista de profesores</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {teachers.length === 0 ? (
                            <p className="text-muted-foreground px-6 py-4 text-sm">
                                No hay profesores registrados.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-muted-foreground px-6 py-3 text-left font-medium">Usuario</th>
                                            <th className="text-muted-foreground px-6 py-3 text-left font-medium">Nombre</th>
                                            <th className="text-muted-foreground px-6 py-3 text-center font-medium">Clases</th>
                                            <th className="text-muted-foreground px-6 py-3 text-right font-medium">Último acceso</th>
                                            <th className="text-muted-foreground px-6 py-3 text-right font-medium">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teachers.map((t) => (
                                            <tr key={t.username} className="border-b last:border-0">
                                                <td className="px-6 py-3">
                                                    <Badge variant="outline" className="font-mono">
                                                        {t.username}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-3 font-medium">{t.display_name}</td>
                                                <td className="px-6 py-3 text-center">{t.class_count}</td>
                                                <td className="text-muted-foreground px-6 py-3 text-right">
                                                    {t.last_login_at
                                                        ? new Date(t.last_login_at).toLocaleDateString('es-EC', {
                                                              day: '2-digit',
                                                              month: 'short',
                                                              year: 'numeric',
                                                          })
                                                        : 'Nunca'}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            asChild
                                                        >
                                                            <a href={`/teachers/${t.username}/edit`}>
                                                                <Pencil className="h-4 w-4" />
                                                            </a>
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="text-destructive hover:text-destructive"
                                                            onClick={() => destroy(t.username)}
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

TeachersIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Profesores', href: '/teachers' },
    ],
};
