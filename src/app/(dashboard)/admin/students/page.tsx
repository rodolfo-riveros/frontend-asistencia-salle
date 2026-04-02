"use client"

import * as React from "react"
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  GraduationCap,
  FileUp,
  Filter,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  X,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { api } from "@/lib/api"

export default function AdminStudentsPage() {
  const [students, setStudents] = React.useState<any[]>([])
  const [programs, setPrograms] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isImportOpen, setIsImportOpen] = React.useState(false)
  const [editingStudent, setEditingStudent] = React.useState<any>(null)
  const [searchTerm, setSearchTerm] = React.useState("")

  const [isDragging, setIsDragging] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)

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
        title: "Error de servidor", 
        description: err.message || "No se pudo sincronizar con FastAPI." 
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
    const studentData = {
      nombre: formData.get("nombre") as string,
      dni: formData.get("dni") as string,
      programa_id: formData.get("programa_id") as string,
      semestre: formData.get("semestre") as string,
      estado: formData.get("estado") as string
    }

    try {
      if (editingStudent) {
        await api.patch(`/alumnos/${editingStudent.id}`, studentData)
        toast({ title: "Matrícula actualizada", description: "El registro del alumno fue modificado." })
      } else {
        await api.post('/alumnos/', studentData)
        toast({ title: "Alumno matriculado", description: "Se ha registrado al nuevo estudiante con éxito." })
      }
      fetchData()
      setIsModalOpen(false)
      setEditingStudent(null)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: err.message })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/alumnos/${id}`)
      toast({ variant: "destructive", title: "Alumno retirado", description: "La matrícula fue cancelada." })
      fetchData()
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    }
  }

  const startUpload = () => {
    setUploading(true)
    let p = 0
    const interval = setInterval(() => {
      p += 10
      setProgress(p)
      if (p >= 100) {
        clearInterval(interval)
        setUploading(false)
        toast({ title: "Importación completa", description: "Se han procesado los registros del archivo." })
        fetchData()
      }
    }, 200)
  }

  const filteredStudents = (students || []).filter(s => 
    s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.dni.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-1 w-full lg:w-auto">
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Padrón de Estudiantes</p>
          <h2 className="text-2xl md:text-3xl font-headline font-extrabold tracking-tight text-slate-900 leading-tight">Registro de Alumnos</h2>
          <p className="text-slate-500 text-sm">Control total de la matrícula y estado académico.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <Dialog open={isImportOpen} onOpenChange={(open) => { setIsImportOpen(open); if(!open) { setFile(null); setProgress(0); setUploading(false); } }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto gap-2 h-11 border-primary/20 hover:bg-primary/5 text-primary font-bold text-sm">
                <FileUp className="h-4 w-4" /> Importar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] w-[95vw]">
              <DialogHeader>
                <DialogTitle>Importación Masiva</DialogTitle>
                <DialogDescription>Sube tu archivo .xlsx o .xls para procesar los registros.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {!file ? (
                  <div
                    className="border-2 border-dashed rounded-xl p-8 md:p-12 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-4 border-slate-200 hover:border-primary/50"
                    onClick={() => document.getElementById('fileInput')?.click()}
                  >
                    <div className="p-3 md:p-4 bg-primary/10 rounded-full">
                      <FileUp className="h-8 w-8 md:h-10 md:w-10 text-primary" />
                    </div>
                    <div>
                      <p className="text-base md:text-lg font-bold text-slate-900">Sube tu Excel aquí</p>
                      <p className="text-xs md:text-sm text-slate-500">Formato .xlsx o .xls permitido</p>
                    </div>
                    <input id="fileInput" type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </div>
                ) : (
                  <div className="border rounded-xl p-4 md:p-6 bg-slate-50/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="p-2 bg-green-100 rounded-lg text-green-600 shrink-0">
                          <FileSpreadsheet className="h-6 w-6 md:h-8 md:w-8" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate text-sm md:text-base">{file.name}</p>
                          <p className="text-[10px] md:text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                        </div>
                      </div>
                    </div>
                    {uploading ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] md:text-xs font-bold text-primary">
                          <span>Enviando al servidor...</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    ) : progress === 100 ? (
                      <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 md:p-4 rounded-lg text-xs md:text-sm font-bold">
                        <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5" />
                        <span>¡Importación exitosa!</span>
                      </div>
                    ) : (
                      <Button onClick={startUpload} className="w-full bg-primary h-11 md:h-12 text-sm md:text-base font-bold">
                        Iniciar Procesamiento
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsImportOpen(false)} className="text-sm">Cerrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingStudent(null); }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 gap-2 h-11 px-6 font-bold shadow-lg shadow-primary/20 text-sm">
                <Plus className="h-4 w-4" /> Matricular
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] w-[95vw]">
              <form onSubmit={handleSave}>
                <DialogHeader>
                  <DialogTitle>{editingStudent ? "Editar Matrícula" : "Matricular Estudiante"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre" className="text-xs">Nombre Completo</Label>
                    <Input id="nombre" name="nombre" defaultValue={editingStudent?.nombre} placeholder="Apellidos y Nombres" required className="text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dni" className="text-xs">DNI</Label>
                    <Input id="dni" name="dni" defaultValue={editingStudent?.dni} placeholder="8 dígitos" required maxLength={8} className="text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Programa Académico</Label>
                    <Select name="programa_id" defaultValue={editingStudent?.programa_id}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Seleccione un programa" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Semestre</Label>
                      <Select name="semestre" defaultValue={editingStudent?.semestre || "I"}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["I", "II", "III", "IV", "V", "VI"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Condición</Label>
                      <Select name="estado" defaultValue={editingStudent?.estado || "Regular"}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Regular">Regular</SelectItem>
                          <SelectItem value="Observado">Observado</SelectItem>
                          <SelectItem value="Egresado">Egresado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="text-sm">Cancelar</Button>
                  <Button type="submit" className="bg-primary text-sm">Guardar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 md:p-4 rounded-xl border-slate-100 border shadow-sm w-full">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Buscar por DNI o Nombre..." 
            className="pl-10 h-10 bg-slate-50 border-none text-sm w-full" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="ghost" className="w-full sm:w-auto gap-2 text-slate-500 font-bold text-xs">
          <Filter className="h-4 w-4" /> Filtros
        </Button>
      </div>

      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Conectando con FastAPI...</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="w-[60px] md:w-[80px] pl-4 md:pl-6"></TableHead>
                    <TableHead className="font-bold text-slate-400 uppercase text-[9px] md:text-[10px] tracking-widest min-w-[150px]">Estudiante</TableHead>
                    <TableHead className="font-bold text-slate-400 uppercase text-[9px] md:text-[10px] tracking-widest min-w-[120px]">Programa</TableHead>
                    <TableHead className="font-bold text-slate-400 uppercase text-[9px] md:text-[10px] tracking-widest text-center">Ciclo</TableHead>
                    <TableHead className="font-bold text-slate-400 uppercase text-[9px] md:text-[10px] tracking-widest">Condición</TableHead>
                    <TableHead className="w-[60px] md:w-[80px] pr-4 md:pr-6 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <TableRow key={student.id} className="group hover:bg-slate-50/50 transition-colors">
                        <TableCell className="pl-4 md:pl-6 py-3">
                          <Avatar className="h-8 w-8 md:h-10 md:w-10 border-2 border-white shadow-sm shrink-0">
                            <AvatarImage src={`https://picsum.photos/seed/${student.id}/200/200`} />
                            <AvatarFallback>{student.nombre[0]}</AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-900 text-xs md:text-sm truncate">{student.nombre}</span>
                            <span className="text-[10px] text-slate-400 font-mono">DNI: {student.dni}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-slate-500 text-[10px] md:text-xs">
                            <GraduationCap className="h-3 w-3 shrink-0" /> <span className="truncate">{student.programa_nombre || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-slate-100 text-slate-600 border-none font-bold text-[9px] md:text-xs">Sem {student.semestre}</Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={student.estado} />
                        </TableCell>
                        <TableCell className="pr-4 md:pr-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                                <MoreVertical className="h-4 w-4 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32">
                              <DropdownMenuItem className="gap-2 text-xs" onClick={() => { setEditingStudent(student); setIsModalOpen(true); }}>
                                <Edit2 className="h-3 w-3" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 text-destructive text-xs" onClick={() => handleDelete(student.id)}>
                                <Trash2 className="h-3 w-3" /> Retirar
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
                          <AlertCircle className="h-6 w-6 opacity-20" />
                          <span className="text-sm">Sin resultados en el servidor.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, string> = {
    "Regular": "bg-green-100 text-green-700 hover:bg-green-200",
    "Observado": "bg-red-100 text-red-700 hover:bg-red-200",
    "Egresado": "bg-blue-100 text-blue-700 hover:bg-blue-200",
  }
  return (
    <Badge className={`${configs[status] || 'bg-slate-100 text-slate-600'} border-none px-2 py-0 text-[9px] md:text-[10px]`}>
      {status}
    </Badge>
  )
}
