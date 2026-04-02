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
  Loader2,
  Layers
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
        title: "Error de Sincronización", 
        description: "No se pudieron obtener los datos de las unidades didácticas." 
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
        toast({ title: "Unidad Actualizada", description: "Los cambios se guardaron con éxito." })
      } else {
        await api.post('/unidades/', courseData)
        toast({ title: "Unidad Creada", description: "El curso ha sido registrado exitosamente." })
      }
      fetchData()
      setIsModalOpen(false)
      setEditingCourse(null)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: err.message })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta unidad?")) return
    try {
      await api.delete(`/unidades/${id}`)
      toast({ title: "Unidad Eliminada", description: "El curso fue retirado del sistema." })
      fetchData()
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al eliminar", description: err.message })
    }
  }

  const filteredCourses = React.useMemo(() => {
    return (courses || []).filter(c => 
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.programa_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.semestre.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [courses, searchTerm])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Unidades Didácticas</p>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-slate-900">Gestión de Cursos</h2>
          <p className="text-slate-500 text-sm">Administra el catálogo de asignaturas por programa.</p>
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
                <DialogTitle>{editingCourse ? "Editar Unidad" : "Registrar Nueva Unidad"}</DialogTitle>
                <DialogDescription>Configura los detalles técnicos de la asignatura.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-6">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre de la Unidad</Label>
                  <Input id="nombre" name="nombre" defaultValue={editingCourse?.nombre} placeholder="Ej. Arquitectura de Sistemas" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="programa_id">Programa de Estudio</Label>
                  <Select name="programa_id" defaultValue={editingCourse?.programa_id}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione la carrera" />
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
                    <Label htmlFor="semestre">Semestre / Ciclo</Label>
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
                    <Label htmlFor="creditos">Créditos Académicos</Label>
                    <Input id="creditos" name="creditos" type="number" min="1" max="15" defaultValue={editingCourse?.creditos || 4} required />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-primary font-bold">Guardar Unidad</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Buscador inteligente: filtra por curso, programa académico o semestre..." 
          className="pl-11 py-6 bg-white border-slate-100 shadow-sm" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium italic">Sincronizando con el servidor...</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest pl-6">Unidad Didáctica</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Programa Profesional</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest text-center">Ciclo</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest text-center">Créditos</TableHead>
                  <TableHead className="w-[100px] pr-6 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.length > 0 ? (
                  filteredCourses.map((course) => (
                    <TableRow key={course.id} className="group hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-bold text-slate-700 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0 transition-colors group-hover:bg-primary group-hover:text-white">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm">{course.nombre}</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {course.id.substring(0, 8)}...</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                          <GraduationCap className="h-3.5 w-3.5 text-primary/40" /> 
                          {course.programa_nombre || 'Sin programa asignado'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="border-slate-100 text-slate-500 font-bold px-3 py-0.5 bg-slate-50/50">
                          Sem {course.semestre}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-black text-primary">
                        {course.creditos}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full">
                              <MoreVertical className="h-4 w-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem className="gap-2" onClick={() => { setEditingCourse(course); setIsModalOpen(true); }}>
                              <Edit2 className="h-3.5 w-3.5" /> Editar Datos
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => handleDelete(course.id)}>
                              <Trash2 className="h-3.5 w-3.5" /> Eliminar Unidad
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-slate-50 rounded-full">
                          <Layers className="h-8 w-8 opacity-20" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900">Sin unidades registradas</p>
                          <p className="text-sm">No se encontraron cursos que coincidan con la búsqueda.</p>
                        </div>
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
