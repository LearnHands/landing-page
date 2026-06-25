import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboard } from '@/routes';

interface Teacher {
    username: string;
    display_name: string;
    created_at: string;
}

interface Props {
    teacher: Teacher;
}

export default function TeachersEdit({ teacher }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        display_name: teacher.display_name ?? '',
        password: '',
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        put(`/teachers/${teacher.username}`);
    }

    return (
        <>
            <Head title={`Editar profesor — ${teacher.username}`} />

            <div className="flex flex-col gap-6 p-6">
                <div>
                    <h1 className="text-2xl font-bold">Editar profesor</h1>
                    <p className="text-muted-foreground mt-1 font-mono text-sm">{teacher.username}</p>
                </div>

                <Card className="max-w-lg">
                    <CardHeader>
                        <CardTitle className="text-base">Datos del profesor</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="display_name">Nombre para mostrar</Label>
                                <Input
                                    id="display_name"
                                    value={data.display_name}
                                    onChange={(e) => setData('display_name', e.target.value)}
                                />
                                {errors.display_name && (
                                    <p className="text-destructive text-xs">{errors.display_name}</p>
                                )}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="password">Nueva contraseña</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="Dejar vacío para no cambiar"
                                />
                                {errors.password && (
                                    <p className="text-destructive text-xs">{errors.password}</p>
                                )}
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button type="submit" disabled={processing}>
                                    Guardar cambios
                                </Button>
                                <Button type="button" variant="outline" asChild>
                                    <a href="/teachers">Cancelar</a>
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

TeachersEdit.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Profesores', href: '/teachers' },
        { title: 'Editar', href: '#' },
    ],
};
