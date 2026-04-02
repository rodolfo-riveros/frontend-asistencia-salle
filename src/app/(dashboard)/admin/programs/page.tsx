
"use client"

import * as React from "react"
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  GraduationCap,
  Calendar,
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

const initialPrograms = [
  { id: "PROG-01", name: "Desarrollo de Sistemas de Información", duration: "6 Semestres", status: "Activo", students: 120 },
  { id: "PROG-02", name: "Contabilidad", duration: "6 Semestres", status: "Activo", students: 85 },
  { id: "PROG-03", name: "Enfermería Técnica", duration: "6 Semestres", status: "Activo", students: 150 },
  { id: "PROG-04", name: "Guía Oficial de Turismo", duration: "6 Semestres", status: "Mantenimiento", students: 45 },
]

export default function AdminProgramsPage() {
  const [programs, setPrograms] = React.useState(initialPrograms)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingProgram, setEditingProgram] = React.useState<any>(null)
  const [searchTerm, setSearchTerm] = React.useState("")

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const programData = {
      id: editingProgram?.id || `PROG-0${programs.length + 1}`,
      name: formData.get("name") as string,
      duration: formData.get("duration") as string,
      status: formData.get("status") as string,
      students: editingProgram?.students || 0
    }

    if (editingProgram) {
      setPrograms(prev => prev.map(p => p.id === editingProgram.id ? programData : p))
      toast({ title: "Programa actualizado", description: "Los cambios se guardaron correctamente." })
    } else {
      setPrograms(prev => [...prev, programData])
      toast({ title: "Programa creado", description: "El nuevo programa ha sido registrado." })
    }
    
    setIsModalOpen(false)
    setEditingProgram(null)
  }

  const handleDelete = (id: string) => {
    setPrograms(prev => prev.filter(p => p.id !== id))
    toast({ variant: "destructive", title: "Programa eliminado", description: "El registro fue borrado del sistema." })
  }

  const filteredPrograms = programs.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Gestión Académica</p>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-slate-900">Programas de Estudio</h2>
          <p className="text-slate-500 text-sm">Administra las carreras profesionales ofrecidas por la institución.</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingProgram(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20 h-11 px-6">
              <Plus className="h-4 w-4" /> Nuevo Programa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>{editingProgram ? "Editar Programa" : "Registrar Nuevo Programa"}</DialogTitle>
                <DialogDescription>Completa la información para el catálogo académico.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Programa</Label>
                  <Input id="name" name="name" defaultValue={editingProgram?.name} placeholder="Ej. Arquitectura de Plataformas" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duración</Label>
                    <Select name="duration" defaultValue={editingProgram?.duration || "6 Semestres"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2 Semestres">2 Semestres</SelectItem>
                        <SelectItem value="4 Semestres">4 Semestres</SelectItem>
                        <SelectItem value="6 Semestres">6 Semestres</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Estado</Label>
                    <Select name="status" defaultValue={editingProgram?.status || "Activo"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Activo">Activo</SelectItem>
                        <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                        <SelectItem value="Inactivo">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-primary">Guardar Programa</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <CardHeader className="bg-white border-b px-6 py-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar por nombre o código..." 
                className="pl-10 bg-slate-50 border-none h-11"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Badge variant="outline" className="px-4 py-1.5 text-slate-500 font-medium bg-slate-50 border-slate-100">
              Total: {filteredPrograms.length} Programas
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[120px] font-bold text-slate-400 uppercase text-[10px] tracking-widest pl-6">Código</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Nombre del Programa</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Duración</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Alumnos</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Estado</TableHead>
                <TableHead className="w-[80px] pr-6 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrograms.length > 0 ? (
                filteredPrograms.map((program) => (
                  <TableRow key={program.id} className="group hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-bold text-slate-900 pl-6">{program.id}</TableCell>
                    <TableCell className="font-semibold text-slate-700">{program.name}</TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" /> {program.duration}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold">{program.students} Estudiantes</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={program.status === 'Activo' ? 'bg-green-100 text-green-700 hover:bg-green-200 border-none' : 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-none'}>
                        {program.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full hover:bg-white hover:shadow-sm">
                            <MoreVertical className="h-4 w-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem className="gap-2" onClick={() => { setEditingProgram(program); setIsModalOpen(true); }}>
                            <Edit2 className="h-3.5 w-3.5" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => handleDelete(program.id)}>
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
                      No se encontraron programas.
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
