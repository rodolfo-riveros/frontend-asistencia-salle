
"use client"

import * as React from "react"
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  BookOpen,
  GraduationCap,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"

const initialCourses = [
  { id: "UD-01", name: "Análisis y Diseño de Sistemas", program: "Desarrollo de Sistemas", semester: "III", credits: 4 },
  { id: "UD-02", name: "Programación Orientada a Objetos", program: "Desarrollo de Sistemas", semester: "II", credits: 5 },
  { id: "UD-03", name: "Contabilidad Gubernamental", program: "Contabilidad", semester: "IV", credits: 3 },
  { id: "UD-04", name: "Fundamentos de Enfermería", program: "Enfermería Técnica", semester: "I", credits: 6 },
]

export default function AdminCoursesPage() {
  const [courses, setCourses] = React.useState(initialCourses)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingCourse, setEditingCourse] = React.useState<any>(null)
  const [searchTerm, setSearchTerm] = React.useState("")

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const courseData = {
      id: editingCourse?.id || `UD-0${courses.length + 1}`,
      name: formData.get("name") as string,
      program: formData.get("program") as string,
      semester: formData.get("semester") as string,
      credits: parseInt(formData.get("credits") as string)
    }

    if (editingCourse) {
      setCourses(prev => prev.map(c => c.id === editingCourse.id ? courseData : c))
      toast({ title: "Curso actualizado", description: "Los cambios se guardaron correctamente." })
    } else {
      setCourses(prev => [...prev, courseData])
      toast({ title: "Curso creado", description: "La unidad didáctica ha sido registrada." })
    }
    
    setIsModalOpen(false)
    setEditingCourse(null)
  }

  const handleDelete = (id: string) => {
    setCourses(prev => prev.filter(c => c.id !== id))
    toast({ variant: "destructive", title: "Curso eliminado", description: "La unidad didáctica fue borrada." })
  }

  const filteredCourses = courses.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.program.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Unidades Didácticas</p>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-slate-900">Gestión de Cursos</h2>
          <p className="text-slate-500 text-sm">Administra el catálogo de asignaturas por programa académico.</p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingCourse(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20 h-11 px-6">
              <Plus className="h-4 w-4" /> Nueva Unidad
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>{editingCourse ? "Editar Unidad Didáctica" : "Nueva Unidad Didáctica"}</DialogTitle>
                <DialogDescription>Configura los detalles de la asignatura.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Curso</Label>
                  <Input id="name" name="name" defaultValue={editingCourse?.name} placeholder="Ej. Estructuras de Datos" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="program">Programa Académico</Label>
                  <Select name="program" defaultValue={editingCourse?.program || "Desarrollo de Sistemas"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar Programa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Desarrollo de Sistemas">Desarrollo de Sistemas</SelectItem>
                      <SelectItem value="Contabilidad">Contabilidad</SelectItem>
                      <SelectItem value="Enfermería Técnica">Enfermería Técnica</SelectItem>
                      <SelectItem value="Turismo">Turismo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="semester">Semestre / Ciclo</Label>
                    <Select name="semester" defaultValue={editingCourse?.semester || "I"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {["I", "II", "III", "IV", "V", "VI"].map(s => (
                          <SelectItem key={s} value={s}>Semestre {s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="credits">Créditos</Label>
                    <Input id="credits" name="credits" type="number" min="1" max="10" defaultValue={editingCourse?.credits || 4} required />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-primary">Guardar Cambios</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Buscar por curso o programa..." 
            className="pl-10 h-11 bg-white border-slate-100" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select>
          <SelectTrigger className="h-11 bg-white border-slate-100">
            <SelectValue placeholder="Filtrar por Programa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los Programas</SelectItem>
            <SelectItem value="dsi">Desarrollo de Sistemas</SelectItem>
            <SelectItem value="cont">Contabilidad</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="h-11 bg-white border-slate-100">
            <SelectValue placeholder="Ciclo / Semestre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="i">Semestre I</SelectItem>
            <SelectItem value="ii">Semestre II</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[100px] font-bold text-slate-400 uppercase text-[10px] tracking-widest pl-6">ID</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Nombre del Curso</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Programa</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest text-center">Ciclo</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest text-center">Créditos</TableHead>
                <TableHead className="w-[80px] pr-6 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.length > 0 ? (
                filteredCourses.map((course) => (
                  <TableRow key={course.id} className="group hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-bold text-slate-900 pl-6 text-xs">{course.id}</TableCell>
                    <TableCell className="font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-primary/5 flex items-center justify-center text-primary">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        {course.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <GraduationCap className="h-3.5 w-3.5" /> {course.program}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="border-slate-100 text-slate-500 font-bold px-3">Semestre {course.semester}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-bold text-primary">{course.credits}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full">
                            <MoreVertical className="h-4 w-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem className="gap-2" onClick={() => { setEditingCourse(course); setIsModalOpen(true); }}>
                            <Edit2 className="h-3.5 w-3.5" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDelete(course.id)}>
                            <Trash2 className="h-3.5 w-3.5" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8 opacity-20" />
                      No se encontraron cursos.
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
