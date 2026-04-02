
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
  Hash,
  RefreshCcw,
  ShieldAlert,
  Terminal,
  Info
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"

export default function AdminProgramsPage() {
  const [programs, setPrograms] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [editingProgram, setEditingProgram] = React.useState<any>(null)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [showDebug, setShowDebug] = React.useState(false)

  const fetchPrograms = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.get<any[]>('/programas/')
      console.log("[DEBUG] Respuesta del servidor /programas/:", data)
      setPrograms(Array.isArray(data) ? data : [])
    } catch (err: any) {
      console.error("[FETCH ERROR] Falló la carga de programas:", err)
      toast({ 
        variant: "destructive", 
        title: "Error al cargar", 
        description: "No se pudieron obtener los programas. Verifica la consola." 
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchPrograms()
  }, [fetchPrograms])

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    const formData = new FormData(e.currentTarget)
    const nombre = (formData.get("nombre") as string).trim()
    
    // Generar código modular automático compatible con backend (SOLO MAYÚSCULAS Y _)
    const cleanName = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().substring(0, 5)
    const generatedCode = editingProgram?.codigo || `PRG_${cleanName}_${Math.floor(Math.random() * 9000 + 1000)}`

    const payload = {
      nombre,
      codigo: generatedCode,
    }

    try {
      if (editingProgram) {
        await api.patch(`/programas/${editingProgram.id}`, payload)
        toast({ title: "Programa actualizado" })
      } else {
        await api.post('/programas/', payload)
        toast({ title: "Programa creado", description: `Código autogenerado: ${generatedCode}` })
      }
      fetchPrograms()
      setIsModalOpen(false)
      setEditingProgram(null)
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Error al guardar", 
        description: err.message 
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if(!confirm("¿Desea eliminar este programa?")) return
    try {
      await api.delete(`/programas/${id}`)
      toast({ title: "Programa eliminado" })
      fetchPrograms()
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "No se pudo eliminar", 
        description: "El programa podría tener cursos o alumnos vinculados." 
      })
    }
  }

  const filteredPrograms = React.useMemo(() => {
    const term = searchTerm.toLowerCase()
    return (programs || []).filter(p => {
      if (!p) return false
      const name = (p.nombre || "").toLowerCase()
      const code = (p.codigo || "").toLowerCase()
      return name.includes(term) || code.includes(term)
    })
  }, [programs, searchTerm])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Padrón Institucional</p>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-slate-900">Programas de Estudio</h2>
          <div className="flex items-center gap-2">
            <p className="text-slate-500 text-sm">Gestiona el catálogo de carreras profesionales.</p>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400" onClick={() => setShowDebug(!showDebug)}>
              <Terminal className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPrograms} className="gap-2 h-11">
            <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingProgram(null); }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20 h-11 px-6 font-bold">
                <Plus className="h-4 w-4" /> Nuevo Programa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSave}>
                <DialogHeader>
                  <DialogTitle>{editingProgram ? "Editar Programa" : "Registrar Carrera"}</DialogTitle>
                  <DialogDescription>
                    Ingresa el nombre del programa académico. El código modular se generará automáticamente.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-6">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre del Programa</Label>
                    <Input 
                      id="nombre" 
                      name="nombre" 
                      defaultValue={editingProgram?.nombre} 
                      placeholder="Ej. Desarrollo de Sistemas" 
                      required 
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-primary font-bold" disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Programa"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {showDebug && (
        <Alert className="bg-slate-900 text-slate-100 border-slate-800 animate-in fade-in zoom-in-95 duration-200">
          <Terminal className="h-4 w-4 text-emerald-400" />
          <AlertTitle className="font-mono text-emerald-400">Diagnóstico de Datos []</AlertTitle>
          <AlertDescription className="font-mono text-[10px] space-y-2 mt-2">
            <p>{"-"} Si ves la lista vacía pero hay datos en Supabase, el RLS está bloqueando al usuario.</p>
            <p>{"-"} Verifica que la política incluya: <span className="text-yellow-400">TO authenticated</span>.</p>
            <p>{"-"} URL API: <span className="text-blue-400">{process.env.NEXT_PUBLIC_API_URL || 'https://backend-asistencia-salle.onrender.com'}/api/v1/programas/</span></p>
          </AlertDescription>
        </Alert>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="Busca por nombre o código..." 
          className="pl-10 h-11 bg-white border-slate-100 shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Sincronizando con el servidor...</p>
            </div>
          ) : filteredPrograms.length > 0 ? (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[150px] font-bold text-slate-400 uppercase text-[10px] tracking-widest pl-6">Código</TableHead>
                  <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Carrera Profesional</TableHead>
                  <TableHead className="w-[100px] pr-6 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrograms.map((program) => (
                  <TableRow key={program.id} className="group hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-mono text-[11px] text-slate-500 pl-6">
                      <div className="flex items-center gap-1.5">
                        <Hash className="h-3 w-3 text-primary/40" /> 
                        <span className="font-bold text-slate-700">{program.codigo}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary shrink-0">
                          <GraduationCap className="h-4 w-4" />
                        </div>
                        {program.nombre}
                      </div>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                            <MoreVertical className="h-4 w-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem className="gap-2" onClick={() => { setEditingProgram(program); setIsModalOpen(true); }}>
                            <Edit2 className="h-3.5 w-3.5" /> Editar Nombre
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => handleDelete(program.id)}>
                            <Trash2 className="h-3.5 w-3.5" /> Eliminar Carrera
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="p-4 bg-amber-50 rounded-full">
                <ShieldAlert className="h-8 w-8 text-amber-500" />
              </div>
              <div className="space-y-2 text-center">
                <p className="font-bold text-slate-900">La lista de programas está vacía</p>
                <div className="flex flex-col gap-1 items-center">
                  <p className="text-xs text-slate-500 max-w-[350px]">
                    Si hay datos en Supabase, el problema es el <strong>RLS</strong>. Ejecuta este SQL en Supabase para permitir la lectura:
                  </p>
                  <code className="text-[10px] bg-slate-100 p-2 rounded block mt-2 font-mono text-slate-700">
                    ALTER TABLE programas_estudio ENABLE ROW LEVEL SECURITY;<br/>
                    DROP POLICY IF EXISTS "Lectura Total" ON programas_estudio;<br/>
                    CREATE POLICY "Lectura Total" ON programas_estudio FOR SELECT TO authenticated USING (true);
                  </code>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={fetchPrograms} className="mt-4 gap-2">
                <RefreshCcw className="h-3 w-3" /> Reintentar Sincronización
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
        <Info className="h-5 w-5 text-blue-600 shrink-0" />
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Nota sobre Seguridad:</strong> Si el GET devuelve `[]` en Postman con el token de portador, significa que la política RLS está bloqueando las filas. El SQL anterior debería solucionarlo de inmediato.
        </p>
      </div>
    </div>
  )
}
