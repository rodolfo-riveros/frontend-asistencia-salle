
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
  Loader2,
  CheckCircle2,
  XCircle
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
import { Checkbox } from "@/components/ui/checkbox"
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
        description: "No se pudo cargar el cuerpo docente desde FastAPI." 
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
      nombre: formData.get("nombre") as string,
      email: formData.get("email") as string,
      dni: formData.get("dni") as string,
      especialidad: formData.get("especialidad") as string,
      es_transversal: formData.get("es_transversal") === "on"
    }

    try {
      if (editingInstructor) {
        await api.patch(`/docentes/${editingInstructor.id}`, instructorData)
        toast({ title: "Perfil actualizado correctamente" })
      } else {
        // Nota: Para crear un docente nuevo, el backend espera un ID que coincida con Supabase Auth.
        // En un entorno de producción, esto se manejaría creando primero el usuario en Auth.
        toast({ 
          variant: "destructive", 
          title: "Acción Restringida", 
          description: "La creación manual requiere sincronización con Auth. Use el registro público por ahora." 
        })
        return
      }
      fetchData()
      setIsModalOpen(false)
      setEditingInstructor(null)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    }
  }

  const handleDelete = async (id: string) => {
    if(!confirm("¿Desea eliminar este perfil docente?")) return
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
      i.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.especialidad.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [instructors, searchTerm])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Cuerpo Docente</p>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-slate-900">Gestión de Docentes</h2>
          <p className="text-slate-500 text-sm">Administra los perfiles de los profesionales del IES La Salle.</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Buscador inteligente: busca por nombre, DNI, correo o especialidad..." 
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
              <p className="text-sm font-medium">Sincronizando docentes...</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[80px] pl-6"></TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Datos del Docente</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Especialidad</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest text-center">Transversal</TableHead>
                  <TableHead className="w-[80px] pr-6 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInstructors.length > 0 ? (
                  filteredInstructors.map((docente) => (
                    <TableRow key={docente.id} className="group hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-6">
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {docente.nombre.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
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
                      <TableCell className="text-center">
                        {docente.es_transversal ? (
                          <div className="flex justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div>
                        ) : (
                          <div className="flex justify-center"><XCircle className="h-5 w-5 text-slate-200" /></div>
                        )}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full">
                              <MoreVertical className="h-4 w-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingInstructor(null); }}>
                              <DialogTrigger asChild>
                                <DropdownMenuItem className="gap-2" onSelect={(e) => { e.preventDefault(); setEditingInstructor(docente); setIsModalOpen(true); }}>
                                  <Edit2 className="h-3.5 w-3.5" /> Editar Perfil
                                </DropdownMenuItem>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[500px]">
                                <form onSubmit={handleSave}>
                                  <DialogHeader>
                                    <DialogTitle>Editar Perfil Docente</DialogTitle>
                                    <DialogDescription>Actualiza los datos del profesional.</DialogDescription>
                                  </DialogHeader>
                                  <div className="grid gap-4 py-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="nombre">Nombre Completo</Label>
                                      <Input id="nombre" name="nombre" defaultValue={editingInstructor?.nombre} required />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="email">Correo Institucional</Label>
                                      <Input id="email" name="email" type="email" defaultValue={editingInstructor?.email} required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="dni">DNI</Label>
                                        <Input id="dni" name="dni" defaultValue={editingInstructor?.dni} required maxLength={8} />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="especialidad">Especialidad</Label>
                                        <Input id="especialidad" name="especialidad" defaultValue={editingInstructor?.especialidad} required />
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2 pt-2">
                                      <Checkbox id="es_transversal" name="es_transversal" defaultChecked={editingInstructor?.es_transversal} />
                                      <Label htmlFor="es_transversal" className="text-sm font-medium leading-none cursor-pointer">
                                        ¿Es docente de cursos transversales?
                                      </Label>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                    <Button type="submit" className="bg-primary font-bold">Guardar Cambios</Button>
                                  </DialogFooter>
                                </form>
                              </DialogContent>
                            </Dialog>
                            <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDelete(docente.id)}>
                              <Trash2 className="h-3.5 w-3.5" /> Eliminar Perfil
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
                        No se encontraron docentes registrados.
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
