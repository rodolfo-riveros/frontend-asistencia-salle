
"use client"

import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, Users, Clock, ArrowRight, FileSpreadsheet } from "lucide-react"
import { toast } from "@/hooks/use-toast"

const INSTRUCTOR_COURSES = [
  { id: "DA-101", name: "Diseño de Interfaces I", program: "Diseño Gráfico", students: 24, schedule: "Lun - Mier: 08:00 - 10:30", color: "from-blue-600 to-blue-400" },
  { id: "CS-202", name: "Desarrollo Web Backend", program: "Sistemas", students: 18, schedule: "Mar - Jue: 14:00 - 16:30", color: "from-indigo-600 to-indigo-400" },
  { id: "DA-205", name: "UX Research Avanzado", program: "Diseño Gráfico", students: 21, schedule: "Viernes: 18:00 - 21:00", color: "from-slate-800 to-slate-600" }
]

export default function InstructorDashboard() {
  const handleExport = (name: string) => {
    toast({
      title: "Excel en camino",
      description: `Generando reporte de asistencia para ${name}...`,
    })
  }

  return (
    <div className="space-y-8 md:space-y-12">
      <div className="space-y-4 border-b pb-6 md:pb-8">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-8 md:w-12 bg-primary rounded-full" />
          <span className="text-primary font-bold uppercase tracking-[0.3em] text-[8px] md:text-[10px]">Gestión Académica</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-headline font-black tracking-tighter text-slate-900 leading-tight">
          Mis unidades didácticas son:
        </h2>
        <p className="text-slate-500 text-sm md:text-lg font-medium italic">
          Supervise el progreso de sus alumnos para el periodo 2024-II
        </p>
      </div>

      <div className="grid gap-6 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {INSTRUCTOR_COURSES.map((course) => (
          <Card key={course.id} className="group border-none shadow-xl hover:shadow-2xl transition-all bg-white overflow-hidden flex flex-col">
            <div className={`h-2 bg-gradient-to-r ${course.color}`} />
            <CardHeader className="space-y-4">
              <div className="flex justify-between items-start">
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-slate-50 border-slate-200">
                  ID: {course.id}
                </Badge>
                <div className="p-2.5 bg-primary/5 rounded-xl text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
              </div>
              <div>
                <CardTitle className="text-xl md:text-2xl font-headline font-extrabold group-hover:text-primary transition-colors line-clamp-2">
                  {course.name}
                </CardTitle>
                <p className="text-[10px] font-black uppercase text-slate-400 mt-1 tracking-tight">
                  {course.program}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-grow">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="bg-white p-2 rounded-lg shadow-sm shrink-0">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Inscritos</span>
                  <span className="text-sm font-bold text-slate-700 truncate">{course.students} Estudiantes</span>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="bg-white p-2 rounded-lg shadow-sm shrink-0">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Horario</span>
                  <span className="text-sm font-bold text-slate-700 truncate">{course.schedule}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50/50 p-4 md:p-6 gap-3">
              <Button asChild className="flex-1 h-12 md:h-14 font-black text-sm md:text-base shadow-lg shadow-primary/20">
                <Link href={`/instructor/attendance/${course.id}`}>
                  Asistencia <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                </Link>
              </Button>
              <Button 
                variant="outline" 
                className="h-12 md:h-14 w-12 md:w-14 p-0 border-slate-200 hover:text-green-600 transition-all shrink-0"
                onClick={() => handleExport(course.name)}
              >
                <FileSpreadsheet className="h-5 w-5 md:h-6 md:w-6" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
