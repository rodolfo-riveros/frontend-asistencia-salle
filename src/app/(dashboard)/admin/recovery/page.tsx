"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Plus, Search, RefreshCw, AlertTriangle, BookOpen, User, Calendar, Trash2, Pencil } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

interface Matricula {
  id: string; estudiante_nombre: string; estudiante_dni: string
  estudiante_programa: string; curso_nombre: string; curso_programa: string
  periodo: string; docente_id: string; docente_nombre: string
  estado: string; created_at: string
}

interface RecStudent {
  id: string; nombre: string; dni: string; programa: string; created_at: string
}

const estadoBadge = (estado: string) => {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pendiente: { label: "Pendiente", variant: "secondary" },
    en_curso: { label: "En Curso", variant: "default" },
    aprobado: { label: "Aprobado", variant: "outline" },
    desaprobado: { label: "Desaprobado", variant: "destructive" },
  }
  const m = map[estado] || { label: estado, variant: "outline" }
  return <Badge variant={m.variant}>{m.label}</Badge>
}

export default function AdminRecoveryPage() {
  const [matriculas, setMatriculas] = React.useState<Matricula[]>([])
  const [recStudents, setRecStudents] = React.useState<RecStudent[]>([])
  const [docentes, setDocentes] = React.useState<any[]>([])
  const [periodos, setPeriodos] = React.useState<any[]>([])
  const [programas, setProgramas] = React.useState<any[]>([])
  const [cursos, setCursos] = React.useState<any[]>([])
  const [search, setSearch] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)

  const [step, setStep] = React.useState(1)
  const [fProgramaId, setFProgramaId] = React.useState("")
  const [fCursoId, setFCursoId] = React.useState("")
  const [fEstudianteId, setFEstudianteId] = React.useState("nuevo")
  const [fNombre, setFNombre] = React.useState("")
  const [fDni, setFDni] = React.useState("")
  const [fDocenteId, setFDocenteId] = React.useState("")
  const [fPeriodo, setFPeriodo] = React.useState("")

  const fetchAll = React.useCallback(async () => {
    setLoading(true)
    try {
      const [matData, stdData, docData, perData, progData, curData] = await Promise.all([
        api.get<Matricula[]>('/recuperaciones/matriculas'),
        api.get<RecStudent[]>('/recuperaciones/estudiantes'),
        api.get<any[]>('/docentes/'),
        api.get<any[]>('/periodos/'),
        api.get<any[]>('/programas/'),
        api.get<any[]>('/unidades/?seccion=REC'),
      ])
      setMatriculas(matData)
      setRecStudents(stdData)
      setDocentes(docData)
      setPeriodos(perData)
      setProgramas(progData)
      setCursos(curData)
      const activo = perData.find((p: any) => p.es_activo)
      if (activo && !fPeriodo) setFPeriodo(activo.nombre || "")
    } catch { toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos" }) }
    finally { setLoading(false) }
  }, [])

  React.useEffect(() => { fetchAll() }, [fetchAll])

  const programaSel = programas.find((p: any) => p.id === fProgramaId)
  const cursosFiltrados = cursos.filter((c: any) => c.programa_id === fProgramaId)
  const estudiantesFiltrados = recStudents.filter(s => s.programa === programaSel?.nombre)

  const resetForm = () => {
    setStep(1); setEditingId(null)
    setFProgramaId(""); setFCursoId(""); setFEstudianteId("nuevo")
    setFNombre(""); setFDni(""); setFDocenteId("")
    const activo = periodos.find((p: any) => p.es_activo)
    if (activo) setFPeriodo(activo.nombre || "")
  }

  const ensureStudent = async (): Promise<string> => {
    if (fEstudianteId !== "nuevo") return fEstudianteId
    const existing = recStudents.find(s => s.dni === fDni)
    if (existing) return existing.id
    const created = await api.post<RecStudent>('/recuperaciones/estudiantes', {
      nombre: fNombre, dni: fDni, programa: programaSel?.nombre || "",
    })
    setRecStudents(prev => [...prev, created])
    return created.id
  }

  const handleCreate = async () => {
    if (!fProgramaId || !fCursoId || !fDocenteId || !fPeriodo) {
      toast({ variant: "destructive", title: "Campos requeridos" }); return
    }
    if (fEstudianteId === "nuevo" && (!fNombre || !fDni)) {
      toast({ variant: "destructive", title: "Datos del estudiante requeridos" }); return
    }

    const doc = docentes.find((d: any) => d.id === fDocenteId)
    const curso = cursos.find((c: any) => c.id === fCursoId)
    const programa = programas.find((p: any) => p.id === fProgramaId)

    try {
      if (editingId) {
        await api.patch(`/recuperaciones/matriculas/${editingId}`, {
          estudiante_nombre: fNombre, estudiante_dni: fDni,
          estudiante_programa: programa?.nombre || "",
          curso_nombre: curso?.nombre || undefined,
          curso_programa: programa?.nombre || undefined,
          periodo: fPeriodo, docente_id: fDocenteId,
          docente_nombre: doc?.nombre || "",
        })
        toast({ title: "Matrícula actualizada" })
      } else {
        const estudiante_id = await ensureStudent()
        await api.post('/recuperaciones/matriculas', {
          estudiante_id, estudiante_nombre: fNombre, estudiante_dni: fDni,
          estudiante_programa: programa?.nombre || "",
          curso_nombre: curso?.nombre || "", curso_programa: programa?.nombre || "",
          periodo: fPeriodo, docente_id: fDocenteId, docente_nombre: doc?.nombre || "",
        })
        toast({ title: "Matrícula creada" })
      }

      // Auto-crear asignacion_docente si no existe
      if (fCursoId && fDocenteId && fPeriodo) {
        const periodoObj = periodos.find((p: any) => p.nombre === fPeriodo)
        if (periodoObj) {
          await api.post('/asignaciones/', {
            docente_id: fDocenteId,
            unidad_id: fCursoId,
            periodo_id: periodoObj.id,
          }).catch(() => {})
        }
      }

      setDialogOpen(false)
      resetForm()
      fetchAll()
    } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e?.message }) }
  }

  const handleEdit = (m: Matricula) => {
    setEditingId(m.id)
    const curso = cursos.find((c: any) => c.nombre === m.curso_nombre)
    const programa = programas.find((p: any) => p.nombre === m.curso_programa)
    if (programa) setFProgramaId(programa.id)
    if (curso) setFCursoId(curso.id)
    setFNombre(m.estudiante_nombre); setFDni(m.estudiante_dni)
    setFDocenteId(m.docente_id); setFPeriodo(m.periodo)
    setFEstudianteId("nuevo"); setStep(3); setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta matrícula?")) return
    try {
      await api.delete(`/recuperaciones/matriculas/${id}`)
      toast({ title: "Eliminada" })
      fetchAll()
    } catch { toast({ variant: "destructive", title: "Error al eliminar" }) }
  }

  const handleEstudianteChange = (val: string) => {
    setFEstudianteId(val)
    if (val === "nuevo") { setFNombre(""); setFDni("") }
    else { const s = recStudents.find(st => st.id === val); if (s) { setFNombre(s.nombre); setFDni(s.dni) } }
  }

  const handleProgramaChange = (val: string) => {
    setFProgramaId(val); setFCursoId(""); setFEstudianteId("nuevo"); setFNombre(""); setFDni("")
  }

  const filtered = matriculas.filter(m =>
    m.estudiante_nombre?.toLowerCase().includes(search.toLowerCase()) ||
    m.curso_nombre?.toLowerCase().includes(search.toLowerCase()) ||
    m.docente_nombre?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground uppercase tracking-tight">Recuperaciones</h1>
            <p className="text-sm text-muted-foreground">Matrícula de egresados para cursos jalados</p>
          </div>
        </div>
        <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} />
        </Button>
      </div>

      <Card className="border border-border/60 bg-card rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/60 px-6 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
              {loading ? "Cargando..." : `${filtered.length} matrícula(s)`}
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="h-10 pl-10 rounded-xl bg-muted/50 border-border/60 text-sm" />
              </div>
              <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) resetForm() }}>
                <DialogTrigger asChild>
                  <Button className="h-10 px-5 rounded-xl font-bold text-xs gap-2 bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20">
                    <Plus className="h-4 w-4" /> Nueva Matrícula
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="font-black text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" /> {editingId ? "Editar" : "Nueva"} Matrícula de Recuperación
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex items-center justify-center gap-2 py-4">
                    {[
                      { n: 1, label: "Programa" },
                      { n: 2, label: "Estudiante" },
                      { n: 3, label: "Asignación" },
                    ].map(s => (
                      <React.Fragment key={s.n}>
                        {s.n > 1 && <div className={`h-px w-8 ${step >= s.n ? "bg-amber-500" : "bg-border"}`} />}
                        <div className={`flex items-center gap-2 ${step >= s.n ? "text-amber-500" : "text-muted-foreground"}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 ${
                            step >= s.n ? "border-amber-500 bg-amber-500 text-white" : "border-border bg-card"
                          }`}>{s.n}</div>
                          <span className={`text-xs font-bold hidden sm:inline ${step >= s.n ? "text-foreground" : ""}`}>{s.label}</span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="py-2 max-h-[55vh] overflow-y-auto pr-2">
                    {step === 1 && (
                      <div className="bg-primary/5 border border-primary/10 rounded-xl p-5 space-y-4">
                        <h4 className="text-xs font-black uppercase text-primary tracking-widest">Paso 1 — Programa y Curso</h4>
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase">Programa de estudios</Label>
                          <Select value={fProgramaId} onValueChange={handleProgramaChange}>
                            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Seleccionar programa..." /></SelectTrigger>
                            <SelectContent>
                              {programas.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase">Curso a recuperar</Label>
                          {!fProgramaId ? (
                            <p className="text-sm text-muted-foreground py-2">Selecciona un programa primero.</p>
                          ) : cursosFiltrados.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">Este programa no tiene cursos registrados.</p>
                          ) : (
                            <Select value={fCursoId} onValueChange={setFCursoId}>
                              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Seleccionar curso..." /></SelectTrigger>
                              <SelectContent>
                                {cursosFiltrados.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-5 space-y-4">
                        <h4 className="text-xs font-black uppercase text-amber-500 tracking-widest">Paso 2 — Estudiante</h4>
                        {!fProgramaId ? (
                          <p className="text-sm text-muted-foreground">Selecciona un programa primero (paso 1).</p>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <Label className="text-xs font-black uppercase">Estudiante existente</Label>
                              <Select value={fEstudianteId} onValueChange={handleEstudianteChange}>
                                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Seleccionar o registrar nuevo..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="nuevo">+ Registrar nuevo estudiante</SelectItem>
                                  {estudiantesFiltrados.length === 0 ? (
                                    <SelectItem value="__none__" disabled>No hay estudiantes registrados</SelectItem>
                                  ) : (
                                    estudiantesFiltrados.map(s => (<SelectItem key={s.id} value={s.id}>{s.nombre} — {s.dni}</SelectItem>))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            {fEstudianteId === "nuevo" && (
                              <div className="grid grid-cols-2 gap-4 pt-1">
                                <div className="space-y-2">
                                  <Label className="text-xs font-black uppercase">Nombres y apellidos</Label>
                                  <Input value={fNombre} onChange={e => setFNombre(e.target.value)} placeholder="Ej: Juan Pérez" className="h-11 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs font-black uppercase">DNI</Label>
                                  <Input value={fDni} onChange={e => setFDni(e.target.value)} placeholder="12345678" className="h-11 rounded-xl" />
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {step === 3 && (
                      <div className="bg-muted/50 border border-border rounded-xl p-5 space-y-4">
                        <h4 className="text-xs font-black uppercase text-muted-foreground tracking-widest">Paso 3 — Asignación</h4>
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase">Docente responsable</Label>
                          <Select value={fDocenteId} onValueChange={setFDocenteId}>
                            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Seleccionar docente..." /></SelectTrigger>
                            <SelectContent>
                              {docentes.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-black uppercase">Periodo</Label>
                          <Select value={fPeriodo} onValueChange={setFPeriodo}>
                            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Seleccionar periodo..." /></SelectTrigger>
                            <SelectContent>
                              {periodos.map((p: any) => (<SelectItem key={p.id} value={p.nombre || ""}>{p.nombre} {p.es_activo ? "(Activo)" : ""}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="bg-border/30 rounded-lg p-3 space-y-1 text-sm">
                          <p className="font-bold text-foreground">Resumen</p>
                          <p className="text-muted-foreground">Programa: <span className="font-medium text-foreground">{programas.find((p: any) => p.id === fProgramaId)?.nombre || "—"}</span></p>
                          <p className="text-muted-foreground">Curso: <span className="font-medium text-foreground">{cursos.find((c: any) => c.id === fCursoId)?.nombre || "—"}</span></p>
                          <p className="text-muted-foreground">Estudiante: <span className="font-medium text-foreground">{fNombre || "—"}</span></p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <Button variant="ghost" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="h-11 px-6 rounded-xl font-bold text-xs">
                      Anterior
                    </Button>
                    {step < 3 ? (
                      <Button onClick={() => {
                        if (step === 1 && (!fProgramaId || !fCursoId)) { toast({ variant: "destructive", title: "Campos requeridos" }); return }
                        if (step === 2 && fEstudianteId === "nuevo" && (!fNombre || !fDni)) { toast({ variant: "destructive", title: "Campos requeridos" }); return }
                        setStep(s => Math.min(3, s + 1))
                      }} className="h-11 px-6 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600">
                        Siguiente
                      </Button>
                    ) : (
                      <Button onClick={handleCreate} className="h-11 px-6 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600">
                        {editingId ? "Guardar Cambios" : "Crear Matrícula"}
                      </Button>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60">
                <TableHead className="text-[10px] font-black uppercase">Estudiante</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Curso</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Periodo</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Docente</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Estado</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-medium">
                  {search ? "Sin resultados" : "No hay matrículas de recuperación"}
                </TableCell></TableRow>
              ) : filtered.map(m => (
                <TableRow key={m.id} className="border-border/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <User className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{m.estudiante_nombre}</p>
                        <p className="text-[10px] text-muted-foreground">{m.estudiante_dni} · {m.estudiante_programa}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium">{m.curso_nombre}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm"><Calendar className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />{m.periodo}</TableCell>
                  <TableCell className="text-sm">{m.docente_nombre}</TableCell>
                  <TableCell>{estadoBadge(m.estado)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10" onClick={() => handleEdit(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleDelete(m.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
