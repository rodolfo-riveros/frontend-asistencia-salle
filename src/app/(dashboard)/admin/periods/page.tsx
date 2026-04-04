
"use client"

import * as React from "react"
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2, 
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCcw,
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
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"
import { api } from "@/lib/api"

export default function AdminPeriodsPage() {
  const [periods, setPeriods] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isDeletingId, setIsDeletingId] = React.useState<string | null>(null)
  const [searchTerm, setSearchTerm] = React.useState("")
  
  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1)
  const itemsPerPage = 10

  const fetchPeriods = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.get<any[]>('/periodos/')
      setPeriods(Array.isArray(data) ? data : [])
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Error de Sincronización", 
        description: "No se pudieron obtener los periodos académicos."
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchPeriods()
  }, [fetchPeriods])

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const payload = {
      nombre: formData.get("nombre") as string,
      es_activo: formData.get("es_activo") === "on",
    }

    try {
      await api.post('/periodos/', payload)
      toast({ title: "Ciclo creado", description: "El periodo académico ha sido registrado." })
      fetchPeriods()
      setIsModalOpen(false)
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error al guardar", description: err.message })
    }
  }

  const handleDelete = async (id: string) => {
    if(!id) return
    const confirmDelete = window.confirm("¿Desea eliminar este periodo?")
    if(!confirmDelete) return
    
    setIsDeletingId(id)
    try {
      await api.delete(`/periodos/${id}`)
      toast({ title: "Periodo eliminado" })
      setPeriods(prev => prev.filter(p => p.id !== id))
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Error al eliminar", 
        description: err.message || "El periodo podría tener datos vinculados."
      })
    } finally {
      setIsDeletingId(null)
    }
  }

  const filteredPeriods = React.useMemo(() => {
    const term = searchTerm.toLowerCase()
    const result = (periods || []).filter(p => 
      p.nombre?.toLowerCase().includes(term)
    )
    return result
  }, [periods, searchTerm])

  // Reset page when filtering
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // Pagination Logic
  const totalPages = Math.ceil(filteredPeriods.length / itemsPerPage)
  const paginatedPeriods = filteredPeriods.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Gestión Institucional</p>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-slate-900">Periodos Académicos</h2>
          <p className="text-slate-500 text-sm">Define el ciclo activo para el sistema de asistencia.</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPeriods} className="gap-2 h-11" disabled={isLoading}>
            <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20 h-11 px-6 font-bold text-white">
                <Plus className="h-4 w-4" /> Nuevo Ciclo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleSave}>
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Ciclo</DialogTitle>
                  <DialogDescription>Asigna el nombre oficial del ciclo académico (Ej: 2024-II).</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-6">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre del Periodo</Label>
                    <Input id="nombre" name="nombre" placeholder="Ej. 2025-I" required />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">Ciclo Activo</Label>
                      <p className="text-xs text-slate-500">Activa este ciclo para el pase de lista.</p>
                    </div>
                    <Switch name="es_activo" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-primary font-bold text-white">Guardar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Busca por nombre del periodo..." 
          className="pl-11 h-11 bg-white border-slate-100 shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <CardContent className="p-0">
          {isLoading && periods.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium italic">Sincronizando con FastAPI...</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest pl-6">Nombre del Periodo</TableHead>
                    <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest text-center">Estado</TableHead>
                    <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Identificador</TableHead>
                    <TableHead className="w-[80px] pr-6 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPeriods.length > 0 ? (
                    paginatedPeriods.map((p) => (
                      <TableRow key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-bold text-slate-700 pl-6">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            {p.nombre}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {p.es_activo ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-none font-black uppercase text-[9px] tracking-widest gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Activo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-300 border-slate-100 uppercase text-[9px] tracking-widest gap-1">
                              <XCircle className="h-3 w-3" /> Inactivo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-[10px] text-slate-400">
                          {p.id}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          {isDeletingId === p.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary ml-auto" />
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                                  <MoreVertical className="h-4 w-4 text-slate-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem 
                                  className="gap-2 text-destructive focus:text-destructive focus:bg-red-50 cursor-pointer" 
                                  onClick={() => handleDelete(p.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" /> Eliminar Ciclo
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <AlertCircle className="h-10 w-10 opacity-10" />
                        <p className="font-bold text-slate-900 uppercase text-xs tracking-widest">No hay periodos registrados</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50/30 border-t">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Página {currentPage} de {totalPages} ({filteredPeriods.length} registros)
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
    </div>
  )
}
