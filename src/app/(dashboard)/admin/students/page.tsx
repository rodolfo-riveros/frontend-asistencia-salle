
"use client"

import * as React from "react"
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  GraduationCap,
  Loader2,
  Fingerprint,
  RefreshCcw,
  FileUp,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { getInitials } from "@/lib/utils"
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
  
  const [isDeleteDialogOpen, setIsDeletingDialogOpen] = React.useState(false)
  const [studentToDelete, setStudentToDelete] = React.useState<any>(null)
  const [isDeletingLoading, setIsDeletingLoading] = React.useState(false)

  const [importFile, setImportFile] = React.useState<File | null>(null)
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1)
  const itemsPerPage = 10

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

  const confirmDelete = async () => {
    if (!studentToDelete) return
    setIsDeletingLoading(true)
    try {
      await api.delete(`/alumnos/${studentToDelete.id}`)
      toast({ title: "Alumno retirado" })
      fetchData()
      setIsDeletingDialogOpen(false)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al eliminar", description: err.message })
    } finally {
      setIsDeletingLoading(false)
      setStudentToDelete(null)
    }
  }

  const downloadTemplate = () => {
    const templateData = [
      { nombre: "APELLIDOS Y NOMBRES", dni: "00000000", programa_codigo: "CODIGO_AQUI", semestre: "I" },
    ]
    const wsData = XLSX.utils.json_to_sheet(templateData)
    const referenceData = programs.map(p => ({
      CODIGO: p.codigo,
      PROGRAMA_DE_ESTUDIO: p.nombre
    }))
    
    if (referenceData.length === 0) {
      referenceData.push({ CODIGO: "SIS", PROGRAMA_DE_ESTUDIO: "Desarrollo de Sistemas (Ejemplo)" })
    }

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, wsData, "Datos_Alumnos")
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(referenceData), "Codigos_Programas")
    XLSX.writeFile(workbook, "plantilla_importacion_salle.xlsx")
    
    toast({ 
      title: "Plantilla generada", 
      description: "Usa los códigos de la pestaña 'Codigos_Programas'." 
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
          toast({ variant: "destructive", title: "Archivo vacío" })
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
          description: `Éxito: ${successCount}, Errores: ${errorCount}.`,
        })
        fetchData()
        setIsImportModalOpen(false)
        setImportFile(null)
        setIsUploading(false)
      }
      reader.readAsArrayBuffer(importFile)
    } catch (err) {
      toast({ variant: "destructive", title: "Error crítico" })
      setIsUploading(false)
    }
  }

  const filteredStudents = React.useMemo(() => {
    const term = searchTerm.toLowerCase()
    const result = (students || []).filter(s => 
      s.nombre.toLowerCase().includes(term) || 
      s.dni.includes(term) ||
      (s.programa_nombre || "").toLowerCase().includes(term)
    )
    return result
  }, [students, searchTerm])

  // Pagination Reset
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // Pagination Logic
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage)
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

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
              <Button variant="outline" className="gap-2 h-11 border-primary text-primary hover:bg-primary/5 font-bold">
                <FileUp className="h-4 w-4" /> Importar Masivo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Importador de Alumnos</DialogTitle>
                <DialogDescription>Sube tu padrón de alumnos. Usa los códigos oficiales de carrera.</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <Button onClick={downloadTemplate} variant="link" size="sm" className="gap-1.5 text-xs font-bold p-0">
                  <Download className="h-4 w-4" /> Descargar Plantilla Oficial
                </Button>

                {!importFile ? (
                  <div 
                    className="border-2 border-dashed border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center gap-3 hover:border-primary/50 cursor-pointer bg-slate-50/50"
                    onClick={() => document.getElementById('excel-input')?.click()}
                  >
                    <FileSpreadsheet className="h-10 w-10 text-primary opacity-50" />
                    <p className="font-bold text-slate-900 text-sm">Haz clic para subir Excel</p>
                    <input id="excel-input" type="file" accept=".xlsx, .xls" className="hidden" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
                  </div>
                ) : (
                  <div className="border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold truncate">{importFile.name}</p>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImportFile(null)} disabled={isUploading}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {isUploading && <Progress value={uploadProgress} className="h-2" />}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsImportModalOpen(false)} disabled={isUploading}>Cancelar</Button>
                <Button onClick={handleImportExcel} disabled={!importFile || isUploading} className="bg-primary font-bold text-white">
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Confirmar Importación
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={() => { setEditingStudent(null); setIsModalOpen(true); }} className="bg-primary font-bold gap-2 h-11 px-6 shadow-lg shadow-primary/20 text-white">
            <Plus className="h-4 w-4" /> Nuevo Alumno
          </Button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Busca por DNI, Nombre o Carrera..." 
          className="pl-11 h-12 bg-white border-slate-100 shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Cargando...</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="w-[80px] pl-8"></TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-400">Estudiante</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-slate-400">Carrera Profesional</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase tracking-widest text-center text-slate-400">Ciclo</TableHead>
                    <TableHead className="w-[80px] pr-8 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStudents.map((student) => (
                    <TableRow key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-8 py-3">
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                          <AvatarFallback className="bg-primary/5 text-primary font-bold text-xs">
                            {getInitials(student.nombre)}
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
                        <Badge className="bg-slate-100 text-slate-600 border-none font-black text-[10px] uppercase">Sem {student.semestre}</Badge>
                      </TableCell>
                      <TableCell className="pr-8 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full">
                              <MoreVertical className="h-4 w-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingStudent(student); setIsModalOpen(true); }}>Editar</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => { setStudentToDelete(student); setIsDeletingDialogOpen(true); }}>Eliminar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-8 py-4 bg-slate-50/30 border-t">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Página {currentPage} de {totalPages} ({filteredStudents.length} registros)
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingStudent(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingStudent ? "Editar Alumno" : "Nueva Matrícula"}</DialogTitle>
              <DialogDescription>Completa los datos del estudiante.</DialogDescription>
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
              <Button type="submit" className="bg-primary font-bold text-white" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Registro"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeletingDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Retirar alumno de la matrícula?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará definitivamente a <strong>{studentToDelete?.nombre}</strong> del padrón institucional.
              Se perderá todo el historial de asistencia asociado a este estudiante.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingLoading}
            >
              {isDeletingLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Eliminar Alumno
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
