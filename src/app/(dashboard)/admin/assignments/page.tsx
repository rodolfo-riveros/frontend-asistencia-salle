
"use client"

import * as React from "react"
import { 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  BookOpen,
  Link2,
  AlertCircle,
  Loader2,
  Calendar
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { api } from "@/lib/api"

export default function AcademicAssignmentsPage() {
  const [assignments, setAssignments] = React.useState<any[]>([])
  const [instructors, setInstructors] = React.useState<any[]>([])
  const [courses, setCourses] = React.useState<any[]>([])
  const [periods, setPeriods] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingAssignment, setEditingAssignment] = React.useState<any>(null)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedPeriodId, setSelectedPeriodId] = React.useState<string>("all")

  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const query = selectedPeriodId !== "all" ? `?periodo_id=${selectedPeriodId}` : ""
      const [asgData, instData, courseData, periodData] = await Promise.all([
        api.get<any[]>(`/asignaciones/${query}`),
        api.get<any[]>('/docentes/'),
        api.get<any[]>('/unidades/'),
        api.get<any[]>('/periodos/')
      ])
      setAssignments(asgData)
      setInstructors(instData)
      setCourses(courseData)
      setPeriods(periodData)
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Error de Sincronización", 
        description: err.message || "No se pudo conectar con el servidor."
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedPeriodId])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const payload = {
      docente_id: formData.get("docente_id") as string,
      unidad_id: formData.get("unidad_id") as string,
      periodo_id: formData.get("periodo_id") as string,
    }

    try {
      if (editingAssignment) {
        await api.patch(`/asignaciones/${editingAssignment.id}`, payload)
        toast({ title: "Asignación actualizada", description: "Los cambios han sido guardados." })
      } else {
        await api.post('/asignaciones/', payload)
        toast({ title: "Vínculo creado", description: "Docente asignado correctamente al curso." })
      }
      fetchData()
      setIsModalOpen(false)
      setEditingAssignment(null)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: err.message })
    }
  }

  const handleDelete = async (id: string) => {
    if(!confirm("¿Desea eliminar esta carga académica?")) return
    try {
      await api.delete(`/asignaciones/${id}`)
      toast({ title: "Asignación eliminada", description: "El registro fue retirado exitosamente." })
      fetchData()
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    }
  }

  const filteredAssignments = React.useMemo(() => {
    const term = searchTerm.toLowerCase()
    return (assignments || []).filter(asg => 
      asg.docente_nombre?.toLowerCase().includes(term) || 
      asg.unidad_nombre?.toLowerCase().includes(term) ||
      asg.periodo_nombre?.toLowerCase().includes(term)
    )
  }, [assignments, searchTerm])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Carga Académica</p>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-slate-900">Vínculo Docente - Unidad</h2>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar Ciclo:</span>
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
              <SelectTrigger className="h-8 w-[160px] bg-white border-none shadow-sm font-bold text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Periodos</SelectItem>
                {periods.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre} {p.es_activo && "(Activo)"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingAssignment(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20 h-11 px-6 font-bold">
              <Link2 className="h-4 w-4" /> Vincular Docente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>{editingAssignment ? "Editar Asignación" : "Nueva Asignación"}</DialogTitle>
                <DialogDescription>Define el responsable de una unidad para un ciclo académico específico.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-6">
                <div className="space-y-2">
                  <Label>Periodo Lectivo</Label>
                  <Select name="periodo_id" defaultValue={editingAssignment?.periodo_id || periods.find(p => p.es_activo)?.id}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione ciclo" />
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre} {p.es_activo && "(Actual)"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Docente</Label>
                  <Select name="docente_id" defaultValue={editingAssignment?.docente_id}>
                    <SelectTrigger>
                      <SelectValue placeholder="Busca docente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {instructors.map(inst => (
                        <SelectItem key={inst.id} value={inst.id}>{inst.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unidad Didáctica</Label>
                  <Select name="unidad_id" defaultValue={editingAssignment?.unidad_id}>
                    <SelectTrigger>
                      <SelectValue placeholder="Busca curso..." />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map(course => (
                        <SelectItem key={course.id} value={course.id}>{course.nombre} ({course.programa_nombre})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-primary font-bold">Asignar Carga</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Buscador inteligente: filtra por docente, unidad o periodo..." 
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
              <p className="text-sm font-medium">Sincronizando carga académica...</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest pl-6">Docente Responsable</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Unidad Didáctica</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest text-center">Ciclo</TableHead>
                  <TableHead className="w-[80px] pr-6 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.length > 0 ? (
                  filteredAssignments.map((asg) => (
                    <TableRow key={asg.id} className="group hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border shadow-sm">
                            <AvatarFallback className="bg-primary/5 text-primary font-bold text-xs uppercase">
                              {asg.docente_nombre?.[0]}
                            </AvatarFallback>
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
                      <TableCell className="text-center">
                        <Badge variant="outline" className="border-primary/20 text-primary font-black text-[10px] bg-primary/5 uppercase tracking-tighter">
                          {asg.periodo_nombre}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                              <MoreVertical className="h-4 w-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem className="gap-2" onClick={() => { setEditingAssignment(asg); setIsModalOpen(true); }}>
                              <Edit2 className="h-3.5 w-3.5" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDelete(asg.id)}>
                              <Trash2 className="h-3.5 w-3.5" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <AlertCircle className="h-10 w-10 opacity-10" />
                        <p className="font-bold text-slate-900 uppercase text-xs tracking-widest">Sin asignaciones para este criterio</p>
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
