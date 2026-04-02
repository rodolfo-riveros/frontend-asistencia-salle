"use client"

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { GraduationCap, Mail, Lock, Eye, LogIn, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [currentYear, setCurrentYear] = React.useState<number | null>(null);

  const sjbImage = PlaceHolderImages.find(img => img.id === 'sjb-avatar')?.imageUrl || "https://picsum.photos/seed/sjb/200/200";

  React.useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/instructor');
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
                  Excelencia y Valores en la Educación Técnica.
                </h2>
                <p className="text-blue-100 text-lg font-medium opacity-90 max-w-xs">
                  Gestiona el rendimiento académico y la asistencia con la precisión que nuestra comunidad educativa merece.
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

          {/* Columna Derecha: Formulario de Login */}
          <div className="p-8 md:p-16 flex flex-col justify-center bg-white">
            <div className="md:hidden flex items-center gap-2 mb-10">
              <GraduationCap className="text-primary w-6 h-6" />
              <span className="font-headline font-bold text-xl text-primary">La Salle Urubamba</span>
            </div>
            
            <div className="mb-10 text-left">
              <h3 className="font-headline text-2xl font-bold text-slate-900 mb-2">Portal de Asistencia</h3>
              <p className="text-slate-500 text-sm">Ingresa con tu correo institucional asignado.</p>
            </div>

            <form className="space-y-6" onSubmit={handleLogin}>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-widest text-slate-500" htmlFor="email">
                  Correo Institucional
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-primary" />
                  <Input 
                    className="w-full bg-slate-100 border-none rounded-lg py-6 pl-12 pr-4 focus-visible:ring-1 focus-visible:ring-primary text-slate-900 placeholder:text-slate-400" 
                    id="email" 
                    placeholder="usuario@lasalleurubamba.edu.pe" 
                    type="email" 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold uppercase tracking-widest text-slate-500" htmlFor="password">
                    Contraseña
                  </Label>
                  <Link href="#" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-primary" />
                  <Input 
                    className="w-full bg-slate-100 border-none rounded-lg py-6 pl-12 pr-12 focus-visible:ring-1 focus-visible:ring-primary text-slate-900 placeholder:text-slate-400" 
                    id="password" 
                    placeholder="••••••••" 
                    type={showPassword ? "text" : "password"} 
                    required 
                  />
                  <button 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox id="remember" className="w-5 h-5" />
                <Label className="text-sm text-slate-500 font-normal cursor-pointer" htmlFor="remember">
                  Mantener sesión activa
                </Label>
              </div>

              <Button 
                type="submit" 
                className="w-full py-6 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Acceder al Portal</span>
                <LogIn className="w-5 h-5" />
              </Button>

              <div className="flex items-center gap-4 py-2">
                <div className="flex-grow h-px bg-slate-100"></div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold whitespace-nowrap">Nuevos Docentes</span>
                <div className="flex-grow h-px bg-slate-100"></div>
              </div>

              <div className="text-center">
                <p className="text-slate-500 text-sm mb-4">¿Aún no tienes acceso?</p>
                <Button 
                  variant="outline" 
                  className="w-full py-6 border-2 border-primary/10 text-primary font-bold rounded-lg hover:bg-slate-50 transition-colors" 
                  asChild
                >
                  <Link href="/register">Solicitar Registro</Link>
                </Button>
              </div>
            </form>

            <div className="mt-12 pt-8 border-t border-slate-100 text-center flex items-center justify-center gap-2">
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
