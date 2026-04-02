import Link from 'next/link';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center justify-center mb-6">
            <GraduationCap className="h-10 w-10 text-primary" />
            <span className="ml-2 text-3xl font-bold text-primary uppercase tracking-tighter">La Salle Urubamba</span>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight">Solicitud de Acceso</h2>
          <p className="text-sm text-muted-foreground mt-2">Personal docente y administrativo podrá solicitar la activación de su cuenta institucional.</p>
        </div>

        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Formulario de Registro</CardTitle>
            <CardDescription>Los administradores validarán su información institucional.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstname">Nombres</Label>
                <Input id="firstname" placeholder="Ej. Juan" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastname">Apellidos</Label>
                <Input id="lastname" placeholder="Ej. Pérez" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo Institucional</Label>
              <Input id="email" type="email" placeholder="usuario@lasalleurubamba.edu.pe" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="id-card">DNI</Label>
              <Input id="id-card" placeholder="8 dígitos" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Departamento o Programa</Label>
              <Textarea id="reason" placeholder="Indique su especialidad o cargo" rows={3} />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button className="w-full h-11 text-base">Enviar Solicitud</Button>
            <Button variant="ghost" className="w-full" asChild>
              <Link href="/" className="flex items-center justify-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Volver al inicio
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
