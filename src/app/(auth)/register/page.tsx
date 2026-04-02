
"use client"

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, Mail, User, CreditCard, BookOpen, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function RegisterPage() {
  const router = useRouter();
  const [currentYear, setCurrentYear] = React.useState<number | null>(null);

  const sjbImage = PlaceHolderImages.find(img => img.id === 'sjb-avatar')?.imageUrl || "https://picsum.photos/seed/sjb/200/200";

  React.useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Solicitud enviada correctamente. El administrador revisará sus datos.");
    router.push('/');
  };

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center p-6 md:p-12">
        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-xl overflow-hidden shadow-[0_12px_32px_-4px_rgba(25,28,29,0.06)]">
          
          {/* Columna Izquierda: Branding La Salle */}
          <div className="hidden md:flex flex-col justify-between p-12 bg-primary relative overflow-hidden text-white">
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
            
            <div className="z-10">
              <div className="flex items-center gap-3 mb-12">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-lg text-primary">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <h1 className="font-headline font-extrabold text-2xl tracking-tight uppercase">IES La Salle Urubamba</h1>
              </div>
              <div className="space-y-6">
                <h2 className="font-headline text-4xl font-bold leading-tight max-w-sm">
                  Únete a nuestra Comunidad Educativa.
                </h2>
                <p className="text-blue-100 text-lg font-medium opacity-90 max-w-xs">
                  Solicita tu acceso al portal institucional para gestionar la asistencia y el rendimiento académico de tus alumnos.
                </p>
              </div>
            </div>

            <div className="z-10 mt-auto">
              <div className="p-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/10">
                <p className="text-sm italic font-medium leading-relaxed">
                  "Tengan un amor bien tierno para con los jóvenes, a imitación de Jesucristo."
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-800 overflow-hidden border border-white/20 relative">
                    <img 
                      alt="San Juan Bautista de La Salle" 
                      className="w-full h-full object-cover" 
                      src={sjbImage}
                      data-ai-hint="San Juan"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold">San Juan Bautista de La Salle</p>
                    <p className="text-blue-200 text-[10px] uppercase tracking-widest font-semibold">Patrono de los Educadores</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-700 rounded-full blur-3xl opacity-50"></div>
          </div>

          {/* Columna Derecha: Formulario de Registro */}
          <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
            <div className="md:hidden flex items-center gap-2 mb-8">
              <GraduationCap className="text-primary w-6 h-6" />
              <span className="font-headline font-bold text-xl text-primary">La Salle Urubamba</span>
            </div>
            
            <div className="mb-8">
              <h3 className="font-headline text-2xl font-bold text-slate-900 mb-2">Solicitud de Registro</h3>
              <p className="text-slate-500 text-sm">Complete sus datos para que el administrador valide su cuenta.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400" htmlFor="firstname">Nombres</Label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary" />
                    <Input className="bg-slate-50 border-none pl-11 py-5" id="firstname" placeholder="Ej. Juan" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400" htmlFor="lastname">Apellidos</Label>
                  <Input className="bg-slate-50 border-none py-5" id="lastname" placeholder="Ej. Pérez García" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400" htmlFor="email">Correo Institucional</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary" />
                  <Input className="bg-slate-50 border-none pl-11 py-5" id="email" type="email" placeholder="usuario@lasalleurubamba.edu.pe" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400" htmlFor="dni">DNI</Label>
                <div className="relative group">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary" />
                  <Input className="bg-slate-50 border-none pl-11 py-5" id="dni" placeholder="8 dígitos" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400" htmlFor="program">Programa de Estudio</Label>
                <div className="relative group">
                  <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary" />
                  <Input className="bg-slate-50 border-none pl-11 py-5" id="program" placeholder="Ej. Desarrollo de Sistemas de Información" required />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full py-6 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg shadow-lg shadow-primary/20 transition-all"
              >
                Enviar Solicitud de Acceso
              </Button>

              <div className="text-center pt-4">
                <Button variant="link" className="text-slate-500 hover:text-primary text-sm font-medium" asChild>
                  <Link href="/" className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Ya tengo una cuenta, volver al login
                  </Link>
                </Button>
              </div>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">
                Acceso Protegido - IES LA SALLE URUBAMBA
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white w-full py-4 px-8 mt-auto flex flex-col md:flex-row justify-between items-center border-t border-slate-100 gap-4">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 text-center md:text-left">
          © {currentYear || '2024'} IES La Salle Urubamba | Cusco - Perú
        </div>
        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
          Desarrollado por Rodolfo Rodolfo Riveros
        </div>
      </footer>
    </div>
  );
}
