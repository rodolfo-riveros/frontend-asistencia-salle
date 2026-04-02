import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen, Users, Clock, ArrowRight } from "lucide-react"

const courses = [
  {
    id: "DA-101",
    name: "Diseño de Interfaces I",
    program: "Diseño Gráfico",
    students: 24,
    schedule: "Lun - Mier: 08:00 - 10:30",
    color: "bg-blue-600"
  },
  {
    id: "CS-202",
    name: "Desarrollo Web Backend",
    program: "Computación e Informática",
    students: 18,
    schedule: "Mar - Jue: 14:00 - 16:30",
    color: "bg-purple-600"
  },
  {
    id: "DA-205",
    name: "UX Research Avanzado",
    program: "Diseño Gráfico",
    students: 21,
    schedule: "Viernes: 18:00 - 21:00",
    color: "bg-indigo-600"
  },
  {
    id: "CS-301",
    name: "Gestión de Base de Datos",
    program: "Computación e Informática",
    students: 30,
    schedule: "Sabado: 09:00 - 13:00",
    color: "bg-green-600"
  }
]

export default function InstructorDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-primary">Mis Unidades Didácticas</h2>
          <p className="text-muted-foreground italic">Ciclo Académico 2024-II</p>
        </div>
        <Badge variant="secondary" className="px-4 py-1 text-sm bg-accent/10 text-accent border-accent/20">
          4 Cursos Asignados
        </Badge>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <Card key={course.id} className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-shadow flex flex-col group">
            <div className={`h-2 ${course.color}`} />
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{course.id}</span>
                <Badge variant="outline" className="text-[10px]">{course.program}</Badge>
              </div>
              <CardTitle className="text-xl group-hover:text-primary transition-colors">{course.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Users className="h-4 w-4 text-primary" />
                <span>{course.students} Alumnos inscritos</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 text-primary" />
                <span>{course.schedule}</span>
              </div>
            </CardContent>
            <CardFooter className="pt-2 border-t bg-muted/5">
              <Button asChild className="w-full group/btn h-11" variant="outline">
                <Link href={`/instructor/attendance/${course.id}`}>
                  Gestionar Asistencia
                  <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
