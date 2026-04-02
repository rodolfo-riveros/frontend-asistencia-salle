import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GraduationCap, ShieldCheck, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white">
        <Link className="flex items-center justify-center" href="/">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="ml-2 text-xl font-bold text-primary">PresenciaTech</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/login">
            Iniciar Sesión
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/register">
            Registrarse
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 flex justify-center">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none text-primary">
                  Gestión Inteligente de Asistencia
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Optimiza el seguimiento de tus estudiantes con PresenciaTech. Diseñado específicamente para educación técnica superior.
                </p>
              </div>
              <div className="space-x-4">
                <Button asChild size="lg">
                  <Link href="/login">Comenzar Ahora</Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/register">Saber Más</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-white flex justify-center">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="bg-background p-3 rounded-full">
                  <ShieldCheck className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Seguro y Confiable</h3>
                <p className="text-muted-foreground">Autenticación robusta y roles de usuario definidos para proteger la información académica.</p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="bg-background p-3 rounded-full">
                  <Users className="h-10 w-10 text-accent" />
                </div>
                <h3 className="text-xl font-bold">Optimizado para el Aula</h3>
                <p className="text-muted-foreground">Interfaz diseñada para tablets y móviles. Pasa lista en segundos con botones de acción rápida.</p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="bg-background p-3 rounded-full">
                  <GraduationCap className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Análisis con IA</h3>
                <p className="text-muted-foreground">Genera informes inteligentes y detecta patrones de deserción o falta de compromiso automáticamente.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-white">
        <p className="text-xs text-muted-foreground">© 2024 PresenciaTech. Todos los derechos reservados.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">Términos de Servicio</Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">Privacidad</Link>
        </nav>
      </footer>
    </div>
  );
}
