
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
  AlertCircle,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
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
import { api } from "@/lib/api"

export default function AdminCoursesPage() {
  const [courses, setCourses] = React.useState<any[]>([])
  const [programs, setPrograms] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingCourse, setEditingCourse] = React.useState<any>(null)
  const [searchTerm, setSearchTerm] = React.useState("")

  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const [coursesData, programsData] = await Promise.all([
        api.get<any[]>('/unidades/'),
        api.get<any[]>('/programas/')
      ])
      setCourses(coursesData)
      setPrograms(programsData)
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "No se pudo conectar con el servidor." 
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const courseData = {
      nombre: formData.get("nombre") as string,
      programa_id: formData.get("programa_id") as string,
      semestre: formData.get("semestre") as string,
      creditos: parseInt(formData.get("creditos") as string)
    }

    try {
      if (editingCourse) {
        await api.patch(`/unidades/${editingCourse.id}`, courseData)
        toast({ title: "Curso actualizado", description: "Cambios guardados." })
      } else {
        await api.post('/unidades/', courseData)
        toast({ title: "Curso creado", description: "Unidad registrada." })
      }
      fetchData()
      setIsModalOpen(false)
      setEditingCourse(null)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/unidades/${id}`)
      toast({ variant: "destructive", title: "Curso eliminado" })
      fetchData()
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    }
  }

  const filteredCourses = React.useMemo(() => {
    return (courses || []).filter(c => 
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.programa_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [courses, searchTerm])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Unidades Didácticas</p>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-slate-900">Gestión de Cursos</h2>
          <p className="text-slate-500 text-sm">Administra el catálogo de asignaturas.</p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingCourse(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20 h-11 px-6 font-bold">
              <Plus className="h-4 w-4" /> Nueva Unidad
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>{editingCourse ? "Editar Unidad" : "Nueva Unidad"}</DialogTitle>
                <DialogDescription>Configura los detalles del curso.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del Curso</Label>
                  <Input id="nombre" name="nombre" defaultValue={editingCourse?.nombre} placeholder="Ej. Análisis de Sistemas" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="programa_id">Programa Académico</Label>
                  <Select name="programa_id" defaultValue={editingCourse?.programa_id}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un programa" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="semestre">Semestre</Label>
                    <Select name="semestre" defaultValue={editingCourse?.semestre || "I"}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["I", "II", "III", "IV", "V", "VI"].map(s => (
                          <SelectItem key={s} value={s}>Semestre {s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="creditos">Créditos</Label>
                    <Input id="creditos" name="creditos" type="number" min="1" max="10" defaultValue={editingCourse?.creditos || 4} required />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-primary font-bold">Guardar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="Buscador inteligente: busca por nombre de curso o programa académico..." 
          className="pl-10 h-11 bg-white border-slate-100" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Cargando unidades...</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest pl-6">Nombre del Curso</TableHead>
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
                      <TableCell className="font-semibold text-slate-700 pl-6">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-primary/5 flex items-center justify-center text-primary shrink-0">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          {course.nombre}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <GraduationCap className="h-3.5 w-3.5" /> {course.programa_nombre || 'Sin programa'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="border-slate-100 text-slate-500 font-bold px-3">Sem {course.semestre}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-bold text-primary">{course.creditos}</TableCell>
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
                    <TableCell colSpan={5} className="h-32 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8 opacity-20" />
                        No se encontraron resultados.
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
