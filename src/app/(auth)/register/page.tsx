
"use client"

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { GraduationCap, Mail, User, CreditCard, BookOpen, ArrowLeft, ShieldCheck, Loader2, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function RegisterPage() {
  const router = useRouter();
  const [currentYear, setCurrentYear] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const sjbImage = PlaceHolderImages.find(img => img.id === 'sjb-avatar')?.imageUrl || "https://picsum.photos/seed/sjb/200/200";

  React.useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const email = formData.get('email') as string;
    const firstname = formData.get('firstname') as string;
    const lastname = formData.get('lastname') as string;
    const dni = formData.get('dni') as string;
    const program = formData.get('program') as string;
    const role = formData.get('role') as string;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: dni, // El DNI será su contraseña inicial
        options: {
          data: {
            firstname,
            lastname,
            dni,
            program,
            role: role // 'admin' o 'docente'
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Solicitud enviada",
        description: `Cuenta creada como ${role}. Tu contraseña inicial es tu DNI.`,
      });
      router.push('/');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al registrar",
        description: error.message || "No se pudo procesar la solicitud.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center p-6 md:p-12">
        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-xl overflow-hidden shadow-[0_12px_32px_-4px_rgba(25,28,29,0.06)]">
          
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
                    <Image 
                      alt="San Juan Bautista de La Salle" 
                      className="object-cover" 
                      src={sjbImage}
                      fill
                      sizes="40px"
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

          <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
            <div className="md:hidden flex items-center gap-2 mb-8">
              <GraduationCap className="text-primary w-6 h-6" />
              <span className="font-headline font-bold text-xl text-primary">La Salle Urubamba</span>
            </div>
            
            <div className="mb-8">
              <h3 className="font-headline text-2xl font-bold text-slate-900 mb-2">Solicitud de Registro</h3>
              <p className="text-slate-500 text-sm">Complete sus datos para que el administrador valide su cuenta.</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400" htmlFor="firstname">Nombres</Label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary" />
                    <Input className="bg-slate-50 border-none pl-11 py-5" id="firstname" name="firstname" placeholder="Ej. Juan" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400" htmlFor="lastname">Apellidos</Label>
                  <Input className="bg-slate-50 border-none py-5" id="lastname" name="lastname" placeholder="Ej. Pérez García" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400" htmlFor="email">Correo Institucional</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary" />
                  <Input className="bg-slate-50 border-none pl-11 py-5" id="email" name="email" type="email" placeholder="usuario@lasalleurubamba.edu.pe" required />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400" htmlFor="dni">DNI</Label>
                  <div className="relative group">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary" />
                    <Input className="bg-slate-50 border-none pl-11 py-5" id="dni" name="dni" placeholder="8 dígitos" required maxLength={8} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400" htmlFor="role">Rol de Acceso</Label>
                  <div className="relative group">
                    <UserCog className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                    <Select name="role" defaultValue="docente">
                      <SelectTrigger className="bg-slate-50 border-none pl-11 py-5">
                        <SelectValue placeholder="Rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="docente">Docente</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400" htmlFor="program">Programa de Estudio</Label>
                <div className="relative group">
                  <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary" />
                  <Input className="bg-slate-50 border-none pl-11 py-5" id="program" name="program" placeholder="Ej. Desarrollo de Sistemas" required />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-6 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg shadow-lg shadow-primary/20 transition-all"
              >
                {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Registrar Cuenta"}
              </Button>

              <div className="text-center pt-2">
                <Button variant="link" className="text-slate-500 hover:text-primary text-sm font-medium" asChild>
                  <Link href="/" className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Volver al login
                  </Link>
                </Button>
              </div>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">
                Acceso Protegido - IES LA SALLE URUBAMBA
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white w-full py-4 px-8 mt-auto flex flex-col md:flex-row justify-between items-center border-t border-slate-100 gap-4 text-[10px] uppercase tracking-widest font-bold">
        <div className="text-slate-500 text-center md:text-left">
          © {currentYear || '2024'} IES La Salle Urubamba | Cusco - Perú
        </div>
        <div className="text-slate-400 text-center md:text-right">
          Desarrollado por Rodolfo Riveros
        </div>
      </footer>
    </div>
  );
}
