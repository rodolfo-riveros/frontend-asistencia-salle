
"use client"

import * as React from "react"
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  UserRound,
  BookOpen,
  ClipboardList,
  AlertCircle,
  Link2,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const initialAssignments = [
  { 
    id: "ASG-01", 
    instructorName: "Carlos Mendoza", 
    instructorId: "INST-01",
    courseName: "Análisis y Diseño de Sistemas", 
    courseId: "UD-01",
    program: "Desarrollo de Sistemas",
    semester: "III",
    days: "Lun - Mie",
    time: "08:00 - 10:30"
  },
  { 
    id: "ASG-02", 
    instructorName: "María Rodríguez", 
    instructorId: "INST-02",
    courseName: "Contabilidad Gubernamental", 
    courseId: "UD-03",
    program: "Contabilidad",
    semester: "IV",
    days: "Mar - Jue",
    time: "14:00 - 16:30"
  }
]

export default function AcademicAssignmentsPage() {
  const [assignments, setAssignments] = React.useState(initialAssignments)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingAssignment, setEditingAssignment] = React.useState<any>(null)
  const [searchTerm, setSearchTerm] = React.useState("")

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    // In a real app, you'd find the objects by ID
    const newAssignment = {
      id: editingAssignment?.id || `ASG-0${assignments.length + 1}`,
      instructorName: formData.get("instructor") as string,
      courseName: formData.get("course") as string,
      program: "Desarrollo de Sistemas", // Mocked for simplicity
      semester: "III", // Mocked for simplicity
      days: "Lun - Vie",
      time: "08:00 - 10:00"
    }

    if (editingAssignment) {
      setAssignments(prev => prev.map(a => a.id === editingAssignment.id ? { ...a, ...newAssignment } : a))
      toast({ title: "Asignación actualizada", description: "La carga académica ha sido modificada." })
    } else {
      setAssignments(prev => [...prev, newAssignment as any])
      toast({ title: "Docente asignado", description: "Se ha vinculado el docente al curso con éxito." })
    }
    
    setIsModalOpen(false)
    setEditingAssignment(null)
  }

  const handleDelete = (id: string) => {
    setAssignments(prev => prev.filter(a => a.id !== id))
    toast({ variant: "destructive", title: "Asignación eliminada", description: "Se ha retirado la carga académica." })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Gestión de Carga Académica</p>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-slate-900">Asignación de Docentes</h2>
          <p className="text-slate-500 text-sm">Vincula a los profesionales con sus respectivas unidades didácticas y horarios.</p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingAssignment(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20 h-11 px-6">
              <Link2 className="h-4 w-4" /> Nueva Asignación
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>{editingAssignment ? "Editar Asignación" : "Vincular Docente a Curso"}</DialogTitle>
                <DialogDescription>Define qué docente dictará cada unidad didáctica este ciclo.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-6">
                <div className="space-y-2">
                  <Label htmlFor="instructor">Seleccionar Docente</Label>
                  <Select name="instructor" defaultValue={editingAssignment?.instructorName || "Carlos Mendoza"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Busca un docente..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Carlos Mendoza">Carlos Mendoza (Ing. de Software)</SelectItem>
                      <SelectItem value="María Rodríguez">María Rodríguez (Contabilidad)</SelectItem>
                      <SelectItem value="Roberto Sánchez">Roberto Sánchez (Administración)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="course">Unidad Didáctica (Curso)</Label>
                  <Select name="course" defaultValue={editingAssignment?.courseName || "Análisis y Diseño de Sistemas"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Busca una unidad..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Análisis y Diseño de Sistemas">Análisis y Diseño de Sistemas (Ciclo III)</SelectItem>
                      <SelectItem value="Programación Orientada a Objetos">Programación Orientada a Objetos (Ciclo II)</SelectItem>
                      <SelectItem value="Contabilidad Gubernamental">Contabilidad Gubernamental (Ciclo IV)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="days">Días</Label>
                    <Input id="days" name="days" placeholder="Ej. Lun - Mie" defaultValue={editingAssignment?.days} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Horario</Label>
                    <Input id="time" name="time" placeholder="Ej. 08:00 - 10:30" defaultValue={editingAssignment?.time} required />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-primary">Confirmar Asignación</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Buscar por docente, curso o programa..." 
          className="pl-11 py-6 bg-white border-slate-100 shadow-sm text-base"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest pl-6">Docente Responsable</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Unidad Didáctica</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Programa / Ciclo</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Horario</TableHead>
                <TableHead className="w-[80px] pr-6 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.length > 0 ? (
                assignments.map((asg) => (
                  <TableRow key={asg.id} className="group hover:bg-slate-50/50 transition-colors">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border">
                          <AvatarImage src={`https://picsum.photos/seed/${asg.instructorId}/200/200`} />
                          <AvatarFallback>DOC</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{asg.instructorName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{asg.instructorId}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-primary/5 flex items-center justify-center text-primary">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700">{asg.courseName}</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-tighter">ID: {asg.courseId}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-500">{asg.program}</span>
                        <Badge variant="outline" className="w-fit text-[9px] font-black uppercase border-slate-200">Ciclo {asg.semester}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-primary" /> {asg.days}
                        </span>
                        <span className="text-xs text-slate-500">{asg.time}</span>
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
                            <Edit2 className="h-3.5 w-3.5" /> Cambiar Docente
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDelete(asg.id)}>
                            <Trash2 className="h-3.5 w-3.5" /> Revocar Asignación
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
                      No hay asignaciones registradas.
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
