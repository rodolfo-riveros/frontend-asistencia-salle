
"use client"

import * as React from "react"
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Mail,
  Fingerprint,
  ShieldCheck,
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
import { api } from "@/lib/api"

export default function AdminInstructorsPage() {
  const [instructors, setInstructors] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [editingInstructor, setEditingInstructor] = React.useState<any>(null)
  const [searchTerm, setSearchTerm] = React.useState("")

  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.get<any[]>('/docentes/')
      setInstructors(data)
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: "No se pudo cargar el cuerpo docente." 
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
    const instructorData = {
      nombre: formData.get("name") as string,
      email: formData.get("email") as string,
      dni: formData.get("dni") as string,
      especialidad: formData.get("specialization") as string,
    }

    try {
      if (editingInstructor) {
        await api.patch(`/docentes/${editingInstructor.id}`, instructorData)
        toast({ title: "Docente actualizado" })
      } else {
        await api.post('/docentes/', instructorData)
        toast({ title: "Docente registrado" })
      }
      fetchData()
      setIsModalOpen(false)
      setEditingInstructor(null)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/docentes/${id}`)
      toast({ variant: "destructive", title: "Docente eliminado" })
      fetchData()
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    }
  }

  const filteredInstructors = React.useMemo(() => {
    return (instructors || []).filter(i => 
      i.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
      i.dni.includes(searchTerm) ||
      i.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [instructors, searchTerm])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Cuerpo Docente</p>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-slate-900">Gestión de Docentes</h2>
          <p className="text-slate-500 text-sm">Registro de profesionales de la institución.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingInstructor(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20 h-11 px-6 font-bold">
              <Plus className="h-4 w-4" /> Nuevo Docente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>{editingInstructor ? "Editar Docente" : "Registrar Nuevo Docente"}</DialogTitle>
                <DialogDescription>Completa el perfil del docente.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo</Label>
                  <Input id="name" name="name" defaultValue={editingInstructor?.nombre} placeholder="Ej. Rodolfo Riveros" required />
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
                    <Input id="specialization" name="specialization" defaultValue={editingInstructor?.especialidad} placeholder="Ej. Contabilidad" required />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-primary font-bold">Guardar Perfil</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Buscador inteligente: busca por nombre, DNI o correo institucional..." 
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
              <p className="text-sm font-medium">Cargando docentes...</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[80px] pl-6"></TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Datos del Docente</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Especialidad</TableHead>
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
                          <AvatarFallback>{docente.nombre[0]}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{docente.nombre}</span>
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
                          {docente.especialidad}
                        </Badge>
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
                            <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDelete(docente.id)}>
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
                        No se encontraron docentes.
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
