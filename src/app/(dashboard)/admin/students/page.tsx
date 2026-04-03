
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
  ArrowRightLeft,
  FileUp,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  X,
  Info,
  ExternalLink
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
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import * as XLSX from 'xlsx'

export default function AdminStudentsPage() {
  const [students, setStudents] = React.useState<any[]>([])
  const [programs, setPrograms] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [editingStudent, setEditingStudent] = React.useState<any>(null)
  const [searchTerm, setSearchTerm] = React.useState("")
  
  // Estados para importación
  const [importFile, setImportFile] = React.useState<File | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)

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

  const downloadTemplate = () => {
    // Hoja 1: Estructura de datos
    const templateData = [
      { nombre: "APELLIDOS Y NOMBRES", dni: "00000000", programa_codigo: "CODIGO_AQUI", semestre: "I" },
    ]
    const wsData = XLSX.utils.json_to_sheet(templateData)

    // Hoja 2: Leyenda / Referencia de Códigos
    const referenceData = programs.map(p => ({
      CODIGO: p.codigo,
      PROGRAMA_DE_ESTUDIO: p.nombre
    }))
    
    // Si no hay programas, damos ejemplos
    if (referenceData.length === 0) {
      referenceData.push({ CODIGO: "SIS", PROGRAMA_DE_ESTUDIO: "Desarrollo de Sistemas (Ejemplo)" })
    }

    const wsRef = XLSX.utils.json_to_sheet(referenceData)

    // Crear libro
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, wsData, "Datos_Alumnos")
    XLSX.utils.book_append_sheet(workbook, wsRef, "Codigos_Programas")

    // Guardar
    XLSX.writeFile(workbook, "plantilla_importacion_salle.xlsx")
    
    toast({ 
      title: "Plantilla generada", 
      description: "Revisa la pestaña 'Codigos_Programas' en el Excel para ver qué códigos usar." 
    })
  }

  const handleImportExcel = async () => {
    if (!importFile) return
    setIsUploading(true)
    setUploadProgress(0)
    
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet)

        if (jsonData.length === 0) {
          toast({ variant: "destructive", title: "Archivo vacío", description: "No se encontraron registros." })
          setIsUploading(false)
          return
        }

        let successCount = 0
        let errorCount = 0

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row.nombre || !row.dni || !row.programa_codigo) continue

          const program = programs.find(p => String(p.codigo).toUpperCase() === String(row.programa_codigo).toUpperCase())
          
          if (!program) {
            console.error(`Error: Código ${row.programa_codigo} no existe.`)
            errorCount++
            continue
          }

          try {
            await api.post('/alumnos/', {
              nombre: String(row.nombre).toUpperCase(),
              dni: String(row.dni),
              programa_id: program.id,
              semestre: String(row.semestre || "I").toUpperCase()
            })
            successCount++
          } catch (err) {
            errorCount++
          }
          
          setUploadProgress(Math.round(((i + 1) / jsonData.length) * 100))
        }

        toast({
          title: "Importación Finalizada",
          description: `Se procesaron ${successCount} alumnos exitosamente. Errores: ${errorCount}.`,
        })
        fetchData()
        setIsImportModalOpen(false)
        setImportFile(null)
        setIsUploading(false)
      }
      reader.readAsArrayBuffer(importFile)
    } catch (err) {
      toast({ variant: "destructive", title: "Error crítico", description: "El archivo no pudo ser leído." })
      setIsUploading(false)
    }
  }

  const filteredStudents = React.useMemo(() => {
    const term = searchTerm.toLowerCase()
    return (students || []).filter(s => 
      s.nombre.toLowerCase().includes(term) || 
      s.dni.includes(term) ||
      (s.programa_nombre || "").toLowerCase().includes(term)
    )
  }, [students, searchTerm])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-1">
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Gestión de Matrícula</p>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-slate-900">Alumnos</h2>
          <p className="text-slate-500 text-sm">Registro centralizado de la comunidad estudiantil.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2 h-11" onClick={fetchData}>
            <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          
          <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 h-11 border-primary text-primary hover:bg-primary/5 font-bold shadow-sm">
                <FileUp className="h-4 w-4" /> Importar Masivo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  Importador de Alumnos
                </DialogTitle>
                <DialogDescription>Sube tu padrón de alumnos. El sistema validará los códigos de carrera automáticamente.</DialogDescription>
              </DialogHeader>
              <div className="py-6 space-y-6">
                <Card className="bg-slate-50 border-dashed border-2">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase">Leyenda de Datos</Badge>
                      </div>
                      <Button onClick={downloadTemplate} variant="link" size="sm" className="h-auto p-0 gap-1.5 text-xs font-bold text-primary">
                        <Download className="h-3.5 w-3.5" /> Descargar Plantilla con Códigos
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400">Pestaña 1</p>
                        <p className="text-xs font-semibold text-slate-700">Tus datos (Nombre, DNI, Código Carrera, Ciclo)</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-[10px] font-black uppercase text-primary">Pestaña 2 (Vital)</p>
                        <p className="text-xs font-bold text-slate-700">Lista de códigos oficiales para tu institución</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {!importFile ? (
                  <div 
                    className="border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 hover:border-primary/50 transition-colors cursor-pointer bg-slate-50/50 group"
                    onClick={() => document.getElementById('excel-input')?.click()}
                  >
                    <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      <FileSpreadsheet className="h-8 w-8" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-bold text-slate-900">Haz clic para subir tu Excel</p>
                      <p className="text-xs text-slate-400">Formatos compatibles: .xlsx o .xls</p>
                    </div>
                    <input 
                      id="excel-input" 
                      type="file" 
                      accept=".xlsx, .xls" 
                      className="hidden" 
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    />
                  </div>
                ) : (
                  <div className="border rounded-xl p-5 bg-white shadow-sm border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <FileSpreadsheet className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{importFile.name}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-black">{(importFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-destructive" onClick={() => setImportFile(null)} disabled={isUploading}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {isUploading && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase text-primary">
                          <span>Registrando en el servidor...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2 rounded-full" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter className="bg-slate-50 p-6 -mx-6 -mb-6 rounded-b-lg gap-2">
                <Button variant="ghost" onClick={() => setIsImportModalOpen(false)} disabled={isUploading} className="font-bold">Cancelar</Button>
                <Button 
                  onClick={handleImportExcel} 
                  disabled={!importFile || isUploading}
                  className="bg-primary font-black gap-2 min-w-[200px] shadow-lg shadow-primary/20 h-11"
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Confirmar Importación
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={() => { setEditingStudent(null); setIsModalOpen(true); }} className="bg-primary hover:bg-primary/90 gap-2 h-11 px-6 font-bold shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" /> Nuevo Alumno
          </Button>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingStudent(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingStudent ? "Editar Alumno" : "Nueva Matrícula"}</DialogTitle>
              <DialogDescription>Completa los datos del estudiante para el ciclo actual.</DialogDescription>
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
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Registro"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Busca por DNI, Nombre o Carrera..." 
          className="pl-11 h-12 bg-white border-slate-100 shadow-sm text-sm"
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
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                          <AvatarFallback className="bg-slate-100 text-slate-500 font-bold text-xs">
                            {student.nombre[0]}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm">{student.nombre}</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Fingerprint className="h-3 w-3" /> {student.dni}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-slate-600 text-xs font-medium">
                          <GraduationCap className="h-3.5 w-3.5 text-primary/40" /> {student.programa_nombre || 'No asignado'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-slate-100 text-slate-600 border-none font-black text-[10px] tracking-widest uppercase">Sem {student.semestre}</Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                              <MoreVertical className="h-4 w-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem className="gap-2 text-xs font-bold" onClick={() => { setEditingStudent(student); setIsModalOpen(true); }}>
                              <Edit2 className="h-3.5 w-3.5" /> Editar Datos
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-xs font-bold text-primary">
                              <ArrowRightLeft className="h-3.5 w-3.5" /> Migrar Semestre
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-destructive text-xs font-bold" onClick={() => handleDelete(student.id)}>
                              <Trash2 className="h-3.5 w-3.5" /> Retirar de Matrícula
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2 opacity-30">
                        <AlertCircle className="h-10 w-10" />
                        <span className="text-xs font-black uppercase tracking-widest">Sin resultados</span>
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
