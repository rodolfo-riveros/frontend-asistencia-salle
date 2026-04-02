
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
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  UserPlus
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
import { supabase } from "@/lib/supabase"

export default function AdminInstructorsPage() {
  const [instructors, setInstructors] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)
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
        title: "Error de Sincronización", 
        description: "No se pudo cargar la lista de docentes desde el servidor." 
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
    setIsCreating(true)
    const formData = new FormData(e.currentTarget)
    
    const nombre = formData.get("nombre") as string
    const email = formData.get("email") as string
    const dni = formData.get("dni") as string
    const especialidad = formData.get("especialidad") as string
    const es_transversal = formData.get("es_transversal") === "on"

    try {
      if (editingInstructor) {
        // ACTUALIZACIÓN
        await api.patch(`/docentes/${editingInstructor.id}`, {
          nombre,
          email,
          dni,
          especialidad,
          es_transversal
        })
        toast({ title: "Perfil actualizado correctamente" })
      } else {
        // CREACIÓN (Similar al Registro)
        // 1. Crear el usuario en Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password: dni, // El DNI es la contraseña por defecto
          options: {
            data: {
              firstname: nombre.split(' ')[0],
              lastname: nombre.split(' ').slice(1).join(' '),
              dni,
              role: 'docente'
            }
          }
        })

        if (authError) throw authError
        if (!authData.user) throw new Error("No se pudo obtener el ID del usuario creado.")

        // 2. Crear el perfil en la tabla 'docentes' vía FastAPI
        await api.post('/docentes/', {
          id: authData.user.id,
          nombre,
          email,
          dni,
          especialidad,
          es_transversal
        })

        toast({ 
          title: "Docente Registrado", 
          description: "Se ha creado la cuenta de acceso y el perfil profesional." 
        })
      }
      fetchData()
      setIsModalOpen(false)
      setEditingInstructor(null)
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Error al procesar", 
        description: err.message || "Hubo un problema al guardar los datos." 
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if(!confirm("¿Desea eliminar este perfil docente del sistema?")) return
    try {
      await api.delete(`/docentes/${id}`)
      toast({ variant: "destructive", title: "Docente eliminado" })
      fetchData()
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    }
  }

  const filteredInstructors = React.useMemo(() => {
    const term = searchTerm.toLowerCase()
    return (instructors || []).filter(i => 
      i.nombre.toLowerCase().includes(term) || 
      i.dni.includes(term) ||
      i.email.toLowerCase().includes(term) ||
      i.especialidad.toLowerCase().includes(term)
    )
  }, [instructors, searchTerm])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Gestión de Talento Humano</p>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-slate-900">Cuerpo Docente</h2>
          <p className="text-slate-500 text-sm">Administra los perfiles de los profesionales del instituto.</p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingInstructor(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20 h-11 px-6 font-bold">
              <UserPlus className="h-4 w-4" /> Registrar Docente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>{editingInstructor ? "Editar Datos del Docente" : "Nuevo Registro Docente"}</DialogTitle>
                <DialogDescription>
                  {editingInstructor 
                    ? "Actualiza la información profesional del docente." 
                    : "Se creará una cuenta de acceso institucional. La contraseña inicial será su DNI."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-6">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre Completo</Label>
                  <Input id="nombre" name="nombre" defaultValue={editingInstructor?.nombre} placeholder="Apellidos y Nombres" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Institucional</Label>
                  <Input id="email" name="email" type="email" defaultValue={editingInstructor?.email} placeholder="ejemplo@lasalle.edu.pe" required disabled={!!editingInstructor} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dni">DNI</Label>
                    <Input id="dni" name="dni" defaultValue={editingInstructor?.dni} placeholder="8 dígitos" required maxLength={8} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="especialidad">Especialidad</Label>
                    <Input id="especialidad" name="especialidad" defaultValue={editingInstructor?.especialidad} placeholder="Ej. Computación" required />
                  </div>
                </div>
                <div className="flex items-center space-x-3 pt-4 border-t mt-2">
                  <Checkbox id="es_transversal" name="es_transversal" defaultChecked={editingInstructor?.es_transversal} />
                  <Label htmlFor="es_transversal" className="text-sm font-semibold text-slate-700 cursor-pointer">
                    ¿Este docente dicta cursos transversales?
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-primary font-bold min-w-[120px]" disabled={isCreating}>
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : editingInstructor ? "Actualizar" : "Registrar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Buscador Inteligente: busca por Nombre, DNI, Email o Especialidad..." 
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
              <p className="text-sm font-medium">Sincronizando con FastAPI...</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[80px] pl-6"></TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Docente</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Perfil Profesional</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest text-center">Tipo</TableHead>
                  <TableHead className="w-[80px] pr-6 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInstructors.length > 0 ? (
                  filteredInstructors.map((docente) => (
                    <TableRow key={docente.id} className="group hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-6">
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                          <AvatarFallback className="bg-primary/5 text-primary font-bold">
                            {docente.nombre.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm">{docente.nombre}</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3" /> {docente.email}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                            DNI: {docente.dni}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 border-slate-200">
                          {docente.especialidad}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {docente.es_transversal ? (
                          <div className="flex flex-col items-center gap-1">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="text-[9px] font-bold text-emerald-600 uppercase">Transversal</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <XCircle className="h-4 w-4 text-slate-200" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Especialidad</span>
                          </div>
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
                            <DropdownMenuItem className="gap-2" onClick={() => { setEditingInstructor(docente); setIsModalOpen(true); }}>
                              <Edit2 className="h-3.5 w-3.5" /> Editar Datos
                            </DropdownMenuItem>
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
                    <TableCell colSpan={5} className="h-48 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <AlertCircle className="h-10 w-10 opacity-10" />
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900">No hay resultados</p>
                          <p className="text-sm">No se encontraron docentes con los criterios de búsqueda.</p>
                        </div>
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
