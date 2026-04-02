
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
  UserPlus,
  Stethoscope
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
  const [isSaving, setIsSaving] = React.useState(false)
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
        description: "No se pudo cargar la lista de docentes." 
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
    
    const nombre = formData.get("nombre") as string
    const email = formData.get("email") as string
    const dni = formData.get("dni") as string
    const especialidad = formData.get("especialidad") as string
    const es_transversal = formData.get("es_transversal") === "on"

    try {
      if (editingInstructor) {
        await api.patch(`/docentes/${editingInstructor.id}`, {
          nombre,
          especialidad,
          es_transversal
        })
        toast({ title: "Perfil actualizado", description: "Los datos profesionales se guardaron correctamente." })
      } else {
        // FLUJO DE CREACIÓN DOBLE (Auth + DB)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password: dni,
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
        if (!authData.user) throw new Error("Error al crear usuario en Supabase.")

        await api.post('/docentes/', {
          id: authData.user.id,
          nombre,
          especialidad,
          es_transversal
        })

        toast({ 
          title: "Docente Registrado", 
          description: "Cuenta de acceso y perfil vinculados exitosamente." 
        })
      }
      fetchData()
      setIsModalOpen(false)
      setEditingInstructor(null)
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Error al guardar", 
        description: err.message || "Hubo un problema con la base de datos." 
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if(!confirm("¿Desea eliminar este perfil docente? Esto no borrará su cuenta de acceso.")) return
    try {
      await api.delete(`/docentes/${id}`)
      toast({ title: "Perfil eliminado", description: "El registro ha sido retirado de la base de datos." })
      fetchData()
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    }
  }

  const filteredInstructors = React.useMemo(() => {
    const term = searchTerm.toLowerCase()
    return (instructors || []).filter(i => 
      i.nombre.toLowerCase().includes(term) || 
      i.especialidad?.toLowerCase().includes(term) ||
      i.id.toLowerCase().includes(term)
    )
  }, [instructors, searchTerm])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Administración Académica</p>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-slate-900">Gestión de Docentes</h2>
          <p className="text-slate-500 text-sm">Registra y vincula perfiles profesionales con cuentas de acceso.</p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingInstructor(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20 h-11 px-6 font-bold">
              <UserPlus className="h-4 w-4" /> Registrar Nuevo Docente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>{editingInstructor ? "Editar Perfil" : "Nuevo Registro de Docente"}</DialogTitle>
                <DialogDescription>
                  {editingInstructor 
                    ? "Modifica la especialidad o condición del docente." 
                    : "Completa los datos para crear la cuenta de acceso (DNI como clave)."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-6">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre Completo</Label>
                  <Input id="nombre" name="nombre" defaultValue={editingInstructor?.nombre} placeholder="Apellidos y Nombres" required />
                </div>
                {!editingInstructor && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Institucional</Label>
                    <Input id="email" name="email" type="email" placeholder="usuario@lasalle.edu.pe" required />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dni">DNI (Será su contraseña)</Label>
                    <Input id="dni" name="dni" placeholder="8 dígitos" required maxLength={8} disabled={!!editingInstructor} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="especialidad">Especialidad</Label>
                    <Input id="especialidad" name="especialidad" defaultValue={editingInstructor?.especialidad} placeholder="Ej. Sistemas, Contabilidad" required />
                  </div>
                </div>
                <div className="flex items-center space-x-3 pt-4 border-t mt-2">
                  <Checkbox id="es_transversal" name="es_transversal" defaultChecked={editingInstructor?.es_transversal} />
                  <Label htmlFor="es_transversal" className="text-sm font-semibold text-slate-700 cursor-pointer">
                    ¿Es Docente de Cursos Transversales?
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-primary font-bold min-w-[120px]" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingInstructor ? "Actualizar" : "Registrar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Buscador inteligente: filtra por nombre, especialidad o ID..." 
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
              <p className="text-sm font-medium">Sincronizando perfiles...</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest pl-6">Docente</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Especialidad</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest text-center">Tipo</TableHead>
                  <TableHead className="w-[80px] pr-6 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInstructors.length > 0 ? (
                  filteredInstructors.map((docente) => (
                    <TableRow key={docente.id} className="group hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                            <AvatarFallback className="bg-primary/5 text-primary font-bold">
                              {docente.nombre[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm">{docente.nombre}</span>
                            <span className="text-[10px] text-slate-400 font-mono">UUID: {docente.id.substring(0, 8)}...</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50">
                          {docente.especialidad || 'No definida'}
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
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Carrera</span>
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
                              <Edit2 className="h-3.5 w-3.5" /> Editar Perfil
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-destructive" onClick={() => handleDelete(docente.id)}>
                              <Trash2 className="h-3.5 w-3.5" /> Eliminar Registro
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
                        <p className="font-bold text-slate-900">No se encontraron docentes</p>
                        <p className="text-sm">Asegúrate de registrar los perfiles vinculados a las cuentas de usuario.</p>
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
