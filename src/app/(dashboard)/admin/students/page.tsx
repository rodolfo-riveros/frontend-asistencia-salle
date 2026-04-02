
"use client"

import * as React from "react"
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  GraduationCap,
  AlertCircle,
  Loader2,
  Filter
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { api } from "@/lib/api"

export default function AdminStudentsPage() {
  const [students, setStudents] = React.useState<any[]>([])
  const [programs, setPrograms] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingStudent, setEditingStudent] = React.useState<any>(null)
  const [searchTerm, setSearchTerm] = React.useState("")

  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const [studentsData, programsData] = await Promise.all([
        api.get<any[]>('/alumnos/'),
        api.get<any[]>('/programas/')
      ])
      setStudents(studentsData)
      setPrograms(programsData)
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "No se pudieron cargar los alumnos." 
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
    const studentData = {
      nombre: formData.get("nombre") as string,
      dni: formData.get("dni") as string,
      programa_id: formData.get("programa_id") as string,
      semestre: formData.get("semestre") as string,
      estado: formData.get("estado") as string
    }

    try {
      if (editingStudent) {
        await api.patch(`/alumnos/${editingStudent.id}`, studentData)
        toast({ title: "Matrícula actualizada" })
      } else {
        await api.post('/alumnos/', studentData)
        toast({ title: "Alumno matriculado" })
      }
      fetchData()
      setIsModalOpen(false)
      setEditingStudent(null)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/alumnos/${id}`)
      toast({ variant: "destructive", title: "Alumno retirado" })
      fetchData()
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    }
  }

  const filteredStudents = React.useMemo(() => {
    return (students || []).filter(s => 
      s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.dni.includes(searchTerm) ||
      s.programa_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [students, searchTerm])

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-1 w-full lg:w-auto">
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Padrón de Estudiantes</p>
          <h2 className="text-2xl md:text-3xl font-headline font-extrabold tracking-tight text-slate-900 leading-tight">Registro de Alumnos</h2>
          <p className="text-slate-500 text-sm">Control de matrícula institucional.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingStudent(null); }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 gap-2 h-11 px-6 font-bold shadow-lg shadow-primary/20 text-sm">
                <Plus className="h-4 w-4" /> Matricular Alumno
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] w-[95vw]">
              <form onSubmit={handleSave}>
                <DialogHeader>
                  <DialogTitle>{editingStudent ? "Editar Matrícula" : "Matricular Estudiante"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre" className="text-xs">Nombre Completo</Label>
                    <Input id="nombre" name="nombre" defaultValue={editingStudent?.nombre} placeholder="Apellidos y Nombres" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dni" className="text-xs">DNI</Label>
                    <Input id="dni" name="dni" defaultValue={editingStudent?.dni} placeholder="8 dígitos" required maxLength={8} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Programa Académico</Label>
                    <Select name="programa_id" defaultValue={editingStudent?.programa_id}>
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
                      <Label className="text-xs">Semestre</Label>
                      <Select name="semestre" defaultValue={editingStudent?.semestre || "I"}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["I", "II", "III", "IV", "V", "VI"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Condición</Label>
                      <Select name="estado" defaultValue={editingStudent?.estado || "Regular"}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Regular">Regular</SelectItem>
                          <SelectItem value="Observado">Observado</SelectItem>
                          <SelectItem value="Egresado">Egresado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-primary font-bold">Guardar Cambios</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Buscador inteligente: busca por DNI, Nombre o Programa de estudio..." 
          className="pl-11 h-11 bg-white border-slate-100 shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Sincronizando alumnos...</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="w-[60px] md:w-[80px] pl-6"></TableHead>
                    <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Estudiante</TableHead>
                    <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Programa</TableHead>
                    <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest text-center">Ciclo</TableHead>
                    <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Estado</TableHead>
                    <TableHead className="w-[80px] pr-6 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <TableRow key={student.id} className="group hover:bg-slate-50/50 transition-colors">
                        <TableCell className="pl-6 py-3">
                          <Avatar className="h-9 w-9 border-2 border-white shadow-sm shrink-0">
                            <AvatarImage src={`https://picsum.photos/seed/${student.id}/200/200`} />
                            <AvatarFallback>{student.nombre[0]}</AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm">{student.nombre}</span>
                            <span className="text-[10px] text-slate-400 font-mono">DNI: {student.dni}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                            <GraduationCap className="h-3 w-3 shrink-0" /> {student.programa_nombre || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-slate-100 text-slate-600 border-none font-bold text-xs">Sem {student.semestre}</Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={student.estado} />
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                                <MoreVertical className="h-4 w-4 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32">
                              <DropdownMenuItem className="gap-2 text-xs" onClick={() => { setEditingStudent(student); setIsModalOpen(true); }}>
                                <Edit2 className="h-3 w-3" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 text-destructive text-xs" onClick={() => handleDelete(student.id)}>
                                <Trash2 className="h-3 w-3" /> Retirar
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
                          <AlertCircle className="h-6 w-6 opacity-20" />
                          <span className="text-sm">No se encontraron estudiantes.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, string> = {
    "Regular": "bg-green-100 text-green-700 hover:bg-green-200",
    "Observado": "bg-red-100 text-red-700 hover:bg-red-200",
    "Egresado": "bg-blue-100 text-blue-700 hover:bg-blue-200",
  }
  return (
    <Badge className={`${configs[status] || 'bg-slate-100 text-slate-600'} border-none px-2 py-0 text-[10px]`}>
      {status}
    </Badge>
  )
}
