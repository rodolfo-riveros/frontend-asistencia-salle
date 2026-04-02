
"use client"

import * as React from "react"
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  UserRound,
  Mail,
  Fingerprint,
  Link as LinkIcon,
  ShieldCheck,
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
import { toast } from "@/hooks/use-toast"

const initialInstructors = [
  { id: "INST-01", name: "Carlos Mendoza", dni: "45879632", email: "carlos.mendoza@lasalleurubamba.edu.pe", specialization: "Ing. de Software", courses: 3 },
  { id: "INST-02", name: "María Rodríguez", dni: "78451236", email: "m.rodriguez@lasalleurubamba.edu.pe", specialization: "Contadora Pública", courses: 2 },
  { id: "INST-03", name: "Roberto Sánchez", dni: "12365478", email: "rsanchez@lasalleurubamba.edu.pe", specialization: "Administrador", courses: 4 },
]

export default function AdminInstructorsPage() {
  const [instructors, setInstructors] = React.useState(initialInstructors)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingInstructor, setEditingInstructor] = React.useState<any>(null)
  const [searchTerm, setSearchTerm] = React.useState("")

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const instructorData = {
      id: editingInstructor?.id || `INST-0${instructors.length + 1}`,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      dni: formData.get("dni") as string,
      specialization: formData.get("specialization") as string,
      courses: editingInstructor?.courses || 0
    }

    if (editingInstructor) {
      setInstructors(prev => prev.map(i => i.id === editingInstructor.id ? instructorData : i))
      toast({ title: "Docente actualizado", description: "El perfil ha sido modificado." })
    } else {
      setInstructors(prev => [...prev, instructorData])
      toast({ title: "Docente registrado", description: "Bienvenido al equipo docente." })
    }
    
    setIsModalOpen(false)
    setEditingInstructor(null)
  }

  const handleDelete = (id: string) => {
    setInstructors(prev => prev.filter(i => i.id !== id))
    toast({ variant: "destructive", title: "Docente retirado", description: "El registro fue eliminado del padrón." })
  }

  const filteredInstructors = instructors.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.dni.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Cuerpo Docente</p>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-slate-900">Gestión de Docentes</h2>
          <p className="text-slate-500 text-sm">Registra y asigna cursos a los profesionales de la institución.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingInstructor(null); }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20 h-11 px-6">
                <Plus className="h-4 w-4" /> Nuevo Docente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSave}>
                <DialogHeader>
                  <DialogTitle>{editingInstructor ? "Editar Docente" : "Registrar Nuevo Docente"}</DialogTitle>
                  <DialogDescription>Completa el perfil profesional del instructor.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre Completo</Label>
                    <Input id="name" name="name" defaultValue={editingInstructor?.name} placeholder="Ej. Rodolfo Riveros" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Institucional</Label>
                    <Input id="email" name="email" type="email" defaultValue={editingInstructor?.email} placeholder="ejemplo@lasalleurubamba.edu.pe" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dni">DNI</Label>
                      <Input id="dni" name="dni" defaultValue={editingInstructor?.dni} placeholder="8 dígitos" required maxLength={8} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="specialization">Especialidad</Label>
                      <Input id="specialization" name="specialization" defaultValue={editingInstructor?.specialization} placeholder="Ej. Contabilidad" required />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-primary">Guardar Perfil</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Buscar docente por nombre o DNI..." 
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
                <TableHead className="w-[80px] pl-6"></TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Datos del Docente</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Especialidad</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Cursos</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Estado</TableHead>
                <TableHead className="w-[80px] pr-6 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInstructors.length > 0 ? (
                filteredInstructors.map((docente) => (
                  <TableRow key={docente.id} className="group hover:bg-slate-50/50 transition-colors">
                    <TableCell className="pl-6">
                      <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                        <AvatarImage src={`https://picsum.photos/seed/${docente.id}/200/200`} />
                        <AvatarFallback>{docente.name[0]}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          {docente.name}
                          {docente.id === 'INST-01' && <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3" /> {docente.email}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Fingerprint className="h-3 w-3" /> DNI: {docente.dni}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50">
                        {docente.specialization}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary">{docente.courses} asignados</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm font-medium text-slate-600">Activo</span>
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
                          <DropdownMenuItem className="gap-2" onClick={() => { setEditingInstructor(docente); setIsModalOpen(true); }}>
                            <Edit2 className="h-3.5 w-3.5" /> Editar Datos
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <LinkIcon className="h-3.5 w-3.5" /> Gestionar Cursos
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDelete(docente.id)}>
                            <Trash2 className="h-3.5 w-3.5" /> Dar de Baja
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
                      No se encontraron docentes.
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
