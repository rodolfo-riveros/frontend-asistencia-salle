
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
  Fingerprint,
  RefreshCcw,
  ArrowRightLeft
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import { api } from "@/lib/api"

export default function AdminStudentsPage() {
  const [students, setStudents] = React.useState<any[]>([])
  const [programs, setPrograms] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
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
        title: "Error de Sincronización", 
        description: err.message
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
    setIsSaving(true)
    const formData = new FormData(e.currentTarget)
    const studentData = {
      nombre: formData.get("nombre") as string,
      dni: formData.get("dni") as string,
      programa_id: formData.get("programa_id") as string,
      semestre: formData.get("semestre") as string
    }

    try {
      if (editingStudent) {
        await api.patch(`/alumnos/${editingStudent.id}`, studentData)
        toast({ title: "Datos actualizados", description: "Matrícula modificada con éxito." })
      } else {
        await api.post('/alumnos/', studentData)
        toast({ title: "Matrícula Exitosa", description: "Alumno registrado en el sistema." })
      }
      fetchData()
      setIsModalOpen(false)
      setEditingStudent(null)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if(!confirm("¿Desea retirar a este estudiante de la matrícula?")) return
    try {
      await api.delete(`/alumnos/${id}`)
      toast({ title: "Alumno retirado" })
      fetchData()
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al eliminar", description: err.message })
    }
  }

  const filteredStudents = React.useMemo(() => {
    const term = searchTerm.toLowerCase()
    return (students || []).filter(s => 
      s.nombre.toLowerCase().includes(term) || 
      s.dni.includes(term) ||
      s.programa_nombre?.toLowerCase().includes(term)
    )
  }, [students, searchTerm])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-1">
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Padrón Estudiantil</p>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-slate-900">Registro de Alumnos</h2>
          <p className="text-slate-500 text-sm">Control centralizado de matrícula institucional.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 h-11" onClick={fetchData}>
            <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => { setEditingStudent(null); setIsModalOpen(true); }} className="bg-primary hover:bg-primary/90 gap-2 h-11 px-6 font-bold shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" /> Matricular Estudiante
          </Button>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingStudent(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingStudent ? "Editar Matrícula" : "Nueva Matrícula"}</DialogTitle>
              <DialogDescription>Asegúrate de que el DNI sea único en el sistema institucional.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre Completo</Label>
                <Input id="nombre" name="nombre" defaultValue={editingStudent?.nombre} placeholder="Apellidos y Nombres" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dni">DNI</Label>
                <Input id="dni" name="dni" defaultValue={editingStudent?.dni} placeholder="8 dígitos" required maxLength={8} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="programa_id">Programa Académico</Label>
                <Select name="programa_id" defaultValue={editingStudent?.programa_id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione una carrera" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="semestre">Semestre Académico</Label>
                <Select name="semestre" defaultValue={editingStudent?.semestre || "I"}>
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
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary font-bold" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Matrícula"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Busca por DNI, Nombre o Carrera..." 
          className="pl-11 h-11 bg-white border-slate-100 shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Sincronizando alumnos...</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[80px] pl-6"></TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Estudiante</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Carrera Profesional</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest text-center">Ciclo</TableHead>
                  <TableHead className="w-[80px] pr-6 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id} className="group hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-6 py-3">
                        <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                          <AvatarFallback className="bg-slate-100 text-slate-500 font-bold">
                            {student.nombre[0]}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm">{student.nombre}</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Fingerprint className="h-2.5 w-2.5" /> DNI: {student.dni}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                          <GraduationCap className="h-3.5 w-3.5 text-primary/40" /> {student.programa_nombre || 'No asignado'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-slate-100 text-slate-600 border-none font-bold text-xs">Sem {student.semestre}</Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                              <MoreVertical className="h-4 w-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="gap-2 text-xs" onClick={() => { setEditingStudent(student); setIsModalOpen(true); }}>
                              <Edit2 className="h-3 w-3" /> Editar Datos
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-xs text-primary">
                              <ArrowRightLeft className="h-3 w-3" /> Promover Ciclo (Migrar)
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-destructive text-xs" onClick={() => handleDelete(student.id)}>
                              <Trash2 className="h-3 w-3" /> Retirar Matrícula
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
                        <AlertCircle className="h-6 w-6 opacity-20" />
                        <span className="text-sm">No hay estudiantes matriculados.</span>
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
