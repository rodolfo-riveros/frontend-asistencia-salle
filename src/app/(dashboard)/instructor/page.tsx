"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, Users, Clock, ArrowRight, Sparkles, FileSpreadsheet } from "lucide-react"
import { toast } from "@/hooks/use-toast"

const courses = [
  {
    id: "DA-101",
    name: "Diseño de Interfaces I",
    program: "Diseño Gráfico",
    students: 24,
    schedule: "Lun - Mier: 08:00 - 10:30",
    color: "from-blue-600 to-blue-400"
  },
  {
    id: "CS-202",
    name: "Desarrollo Web Backend",
    program: "Computación e Informática",
    students: 18,
    schedule: "Mar - Jue: 14:00 - 16:30",
    color: "from-indigo-600 to-indigo-400"
  },
  {
    id: "DA-205",
    name: "UX Research Avanzado",
    program: "Diseño Gráfico",
    students: 21,
    schedule: "Viernes: 18:00 - 21:00",
    color: "from-slate-800 to-slate-600"
  },
  {
    id: "CS-301",
    name: "Gestión de Base de Datos",
    program: "Computación e Informática",
    students: 30,
    schedule: "Sabado: 09:00 - 13:00",
    color: "from-emerald-600 to-emerald-400"
  }
]

export default function InstructorDashboard() {
  const handleExportExcel = (courseName: string) => {
    toast({
      title: "Generando Excel",
      description: `Exportando el registro de asistencia de ${courseName}...`,
    });
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-2 border-b pb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1.5 w-10 bg-primary rounded-full" />
          <span className="text-primary font-bold uppercase tracking-[0.3em] text-xs">Sección Docente</span>
        </div>
        <h2 className="text-5xl font-headline font-black tracking-tight text-slate-900 leading-tight">
          Mis unidades didácticas son:
        </h2>
        <p className="text-slate-500 text-lg font-medium italic">
          Gestione su carga académica para el periodo actual 2024-II
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <Card key={course.id} className="overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col group bg-white">
            <div className={`h-2 bg-gradient-to-r ${course.color}`} />
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start mb-4">
                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-slate-200 text-slate-400 bg-slate-50">
                  ID: {course.id}
                </Badge>
                <div className="bg-primary/5 p-2 rounded-xl text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
              </div>
              <CardTitle className="text-2xl font-headline font-extrabold group-hover:text-primary transition-colors leading-tight">
                {course.name}
              </CardTitle>
              <CardDescription className="font-bold text-xs uppercase tracking-tighter text-slate-400 mt-1">
                {course.program}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-5 pt-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
                <div className="bg-white p-2.5 rounded-xl shadow-sm">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inscritos</p>
                  <p className="text-sm font-black text-slate-700">{course.students} Alumnos</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
                <div className="bg-white p-2.5 rounded-xl shadow-sm">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Horario Semanal</p>
                  <p className="text-sm font-black text-slate-700">{course.schedule}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-6 pb-6 bg-slate-50/30 flex gap-3">
              <Button asChild className="flex-1 h-14 text-base font-bold shadow-lg shadow-primary/20 group/btn" variant="default">
                <Link href={`/instructor/attendance/${course.id}`}>
                  Asistencia
                  <ArrowRight className="ml-2 h-5 w-5 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button 
                variant="outline" 
                className="h-14 px-5 border-slate-200 hover:bg-white hover:text-green-600 transition-all hover:scale-105" 
                title="Exportar a Excel"
                onClick={() => handleExportExcel(course.name)}
              >
                <FileSpreadsheet className="h-6 w-6" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-yellow-400" />
            <span className="text-xs font-black uppercase tracking-[0.4em] text-blue-300">Asistencia Inteligente</span>
          </div>
          <h3 className="text-3xl font-headline font-black leading-tight">
            Optimice su tiempo con IA
          </h3>
          <p className="text-blue-100/70 max-w-md text-sm leading-relaxed">
            Nuestro motor de IA analiza las tendencias de asistencia para alertarle sobre riesgos de deserción o patrones de tardanza en sus alumnos.
          </p>
        </div>
        <Button className="bg-white text-primary hover:bg-white/90 h-14 px-8 text-base font-black rounded-2xl shrink-0">
          Ver Reporte Mensual
        </Button>
      </div>
    </div>
  )
}
