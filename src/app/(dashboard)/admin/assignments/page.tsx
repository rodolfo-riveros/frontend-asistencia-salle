
"use client"

import * as React from "react"
import { 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  BookOpen,
  Link2,
  Calendar,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { api } from "@/lib/api"

export default function AcademicAssignmentsPage() {
  const [assignments, setAssignments] = React.useState<any[]>([])
  const [instructors, setInstructors] = React.useState<any[]>([])
  const [courses, setCourses] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingAssignment, setEditingAssignment] = React.useState<any>(null)
  const [searchTerm, setSearchTerm] = React.useState("")

  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const [asgData, instData, courseData] = await Promise.all([
        api.get<any[]>('/asignaciones/'),
        api.get<any[]>('/docentes/'),
        api.get<any[]>('/unidades/')
      ])
      setAssignments(asgData)
      setInstructors(instData)
      setCourses(courseData)
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "No se pudieron cargar las asignaciones académicas." 
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
    
    const payload = {
      docente_id: formData.get("docente_id") as string,
      unidad_id: formData.get("unidad_id") as string,
      dias: formData.get("days") as string,
      horario: formData.get("time") as string
    }

    try {
      if (editingAssignment) {
        await api.patch(`/asignaciones/${editingAssignment.id}`, payload)
        toast({ title: "Asignación actualizada" })
      } else {
        await api.post('/asignaciones/', payload)
        toast({ title: "Docente asignado con éxito" })
      }
      fetchData()
      setIsModalOpen(false)
      setEditingAssignment(null)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/asignaciones/${id}`)
      toast({ variant: "destructive", title: "Asignación eliminada" })
      fetchData()
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    }
  }

  const filteredAssignments = React.useMemo(() => {
    return (assignments || []).filter(asg => 
      asg.docente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      asg.unidad_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asg.programa_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [assignments, searchTerm])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Gestión de Carga Académica</p>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-slate-900">Asignación de Docentes</h2>
          <p className="text-slate-500 text-sm">Vincula docentes con sus unidades didácticas.</p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingAssignment(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20 h-11 px-6 font-bold">
              <Link2 className="h-4 w-4" /> Nueva Asignación
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>{editingAssignment ? "Editar Asignación" : "Vincular Docente a Curso"}</DialogTitle>
                <DialogDescription>Define qué docente dictará cada unidad didáctica.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-6">
                <div className="space-y-2">
                  <Label htmlFor="docente_id">Seleccionar Docente</Label>
                  <Select name="docente_id" defaultValue={editingAssignment?.docente_id}>
                    <SelectTrigger>
                      <SelectValue placeholder="Busca un docente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {instructors.map(inst => (
                        <SelectItem key={inst.id} value={inst.id}>{inst.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unidad_id">Unidad Didáctica (Curso)</Label>
                  <Select name="unidad_id" defaultValue={editingAssignment?.unidad_id}>
                    <SelectTrigger>
                      <SelectValue placeholder="Busca una unidad..." />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map(course => (
                        <SelectItem key={course.id} value={course.id}>{course.nombre} (Sem {course.semestre})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="days">Días</Label>
                    <Input id="days" name="days" placeholder="Ej. Lun - Mie" defaultValue={editingAssignment?.dias} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Horario</Label>
                    <Input id="time" name="time" placeholder="Ej. 08:00 - 10:30" defaultValue={editingAssignment?.horario} required />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-primary font-bold">Confirmar Asignación</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Buscador inteligente: busca por docente, curso o programa académico..." 
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
              <p className="text-sm font-medium">Cargando carga académica...</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest pl-6">Docente Responsable</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Unidad Didáctica</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Horario</TableHead>
                  <TableHead className="w-[80px] pr-6 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.length > 0 ? (
                  filteredAssignments.map((asg) => (
                    <TableRow key={asg.id} className="group hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border shadow-sm">
                            <AvatarImage src={`https://picsum.photos/seed/${asg.docente_id}/200/200`} />
                            <AvatarFallback>DOC</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm">{asg.docente_nombre}</span>
                            <span className="text-[10px] text-slate-400 font-mono">DNI: {asg.docente_dni}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-primary/5 flex items-center justify-center text-primary shrink-0">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-700 text-sm">{asg.unidad_nombre}</span>
                            <span className="text-[10px] text-slate-400 uppercase">{asg.programa_nombre} (Sem {asg.semestre})</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-primary" /> {asg.dias}
                          </span>
                          <span className="text-xs text-slate-500">{asg.horario}</span>
                        </div>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full">
                              <MoreVertical className="h-4 w-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="gap-2" onClick={() => { setEditingAssignment(asg); setIsModalOpen(true); }}>
                              <Edit2 className="h-3.5 w-3.5" /> Cambiar Detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDelete(asg.id)}>
                              <Trash2 className="h-3.5 w-3.5" /> Eliminar Carga
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8 opacity-20" />
                        No se encontraron asignaciones.
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
