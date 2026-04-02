
"use client"

import * as React from "react"
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  GraduationCap,
  Download,
  Filter,
  AlertCircle
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"

const initialStudents = [
  { id: "20241001", name: "Mateo Alvarez", program: "Desarrollo de Sistemas", semester: "III", status: "Regular" },
  { id: "20241002", name: "Sofía Benitez", program: "Contabilidad", semester: "I", status: "Regular" },
  { id: "20241003", name: "Jorge Castillo", program: "Desarrollo de Sistemas", semester: "V", status: "Egresado" },
  { id: "20241004", name: "Valentina Díaz", program: "Turismo", semester: "II", status: "Observado" },
]

export default function AdminStudentsPage() {
  const [students, setStudents] = React.useState(initialStudents)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingStudent, setEditingStudent] = React.useState<any>(null)
  const [searchTerm, setSearchTerm] = React.useState("")

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const studentData = {
      id: editingStudent?.id || `2024${1000 + students.length + 1}`,
      name: formData.get("name") as string,
      program: formData.get("program") as string,
      semester: formData.get("semester") as string,
      status: formData.get("status") as string
    }

    if (editingStudent) {
      setStudents(prev => prev.map(s => s.id === editingStudent.id ? studentData : s))
      toast({ title: "Matrícula actualizada", description: "El registro del alumno fue modificado." })
    } else {
      setStudents(prev => [...prev, studentData])
      toast({ title: "Alumno matriculado", description: "Se ha registrado al nuevo estudiante con éxito." })
    }
    
    setIsModalOpen(false)
    setEditingStudent(null)
  }

  const handleDelete = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id))
    toast({ variant: "destructive", title: "Alumno retirado", description: "La matrícula fue cancelada." })
  }

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.id.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Padrón de Estudiantes</p>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-slate-900">Registro de Alumnos</h2>
          <p className="text-slate-500 text-sm">Control total de la matrícula y estado académico de los estudiantes.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 h-11">
            <Download className="h-4 w-4" /> Exportar
          </Button>
          <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingStudent(null); }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20 h-11 px-6">
                <Plus className="h-4 w-4" /> Matricular Alumno
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSave}>
                <DialogHeader>
                  <DialogTitle>{editingStudent ? "Editar Matrícula" : "Matricular Nuevo Estudiante"}</DialogTitle>
                  <DialogDescription>Ingresa los datos del alumno y su programa.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre Completo</Label>
                    <Input id="name" name="name" defaultValue={editingStudent?.name} placeholder="Apellidos y Nombres" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="program">Programa Académico</Label>
                    <Select name="program" defaultValue={editingStudent?.program || "Desarrollo de Sistemas"}>
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
                      <Label htmlFor="semester">Semestre Actual</Label>
                      <Select name="semester" defaultValue={editingStudent?.semester || "I"}>
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
                      <Label htmlFor="status">Condición</Label>
                      <Select name="status" defaultValue={editingStudent?.status || "Regular"}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
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
                  <Button type="submit" className="bg-primary">Confirmar Matrícula</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border-slate-100 border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Buscar por DNI, Nombre o Código..." 
            className="pl-10 h-11 bg-slate-50 border-none" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="ghost" className="gap-2 text-slate-500 font-bold">
          <Filter className="h-4 w-4" /> Filtros Avanzados
        </Button>
      </div>

      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[80px] pl-6"></TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Código / Estudiante</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Programa</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest text-center">Ciclo</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Condición</TableHead>
                <TableHead className="w-[80px] pr-6 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <TableRow key={student.id} className="group hover:bg-slate-50/50 transition-colors">
                    <TableCell className="pl-6">
                      <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                        <AvatarImage src={`https://picsum.photos/seed/${student.id}/200/200`} />
                        <AvatarFallback>{student.name[0]}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{student.name}</span>
                        <span className="text-xs text-slate-400 font-mono">ID: {student.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <GraduationCap className="h-3.5 w-3.5" /> {student.program}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-slate-100 text-slate-600 border-none font-bold">Semestre {student.semester}</Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={student.status} />
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full">
                            <MoreVertical className="h-4 w-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem className="gap-2" onClick={() => { setEditingStudent(student); setIsModalOpen(true); }}>
                            <Edit2 className="h-3.5 w-3.5" /> Perfil
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDelete(student.id)}>
                            <Trash2 className="h-3.5 w-3.5" /> Retirar
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
                      No se encontraron estudiantes registrados.
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

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, string> = {
    "Regular": "bg-green-100 text-green-700 hover:bg-green-200",
    "Observado": "bg-red-100 text-red-700 hover:bg-red-200",
    "Egresado": "bg-blue-100 text-blue-700 hover:bg-blue-200",
  }
  return (
    <Badge className={`${configs[status] || 'bg-slate-100 text-slate-600'} border-none px-3`}>
      {status}
    </Badge>
  )
}
