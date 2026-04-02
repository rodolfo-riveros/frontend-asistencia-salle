
"use client"

import * as React from "react"
import { 
  UserCheck, 
  UserX, 
  Search, 
  Mail, 
  Fingerprint, 
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  MoreVertical
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
import { toast } from "@/hooks/use-toast"

const initialRequests = [
  { 
    id: "REQ-01", 
    firstname: "Rodolfo", 
    lastname: "Riveros", 
    email: "r.riveros@lasalleurubamba.edu.pe", 
    dni: "74589632", 
    program: "Desarrollo de Sistemas de Información",
    date: "2024-03-20"
  },
  { 
    id: "REQ-02", 
    firstname: "Elena", 
    lastname: "Huamán García", 
    email: "e.huaman@lasalleurubamba.edu.pe", 
    dni: "45871236", 
    program: "Contabilidad",
    date: "2024-03-21"
  },
  { 
    id: "REQ-03", 
    firstname: "Marcos", 
    lastname: "Quispe Ttito", 
    email: "m.quispe@lasalleurubamba.edu.pe", 
    dni: "12345678", 
    program: "Guía Oficial de Turismo",
    date: "2024-03-22"
  }
]

export default function AccessRequestsPage() {
  const [requests, setRequests] = React.useState(initialRequests)
  const [searchTerm, setSearchTerm] = React.useState("")

  const handleApprove = (id: string) => {
    setRequests(prev => prev.filter(r => r.id !== id))
    toast({
      title: "Docente Aprobado",
      description: "Se ha creado la cuenta y enviado las credenciales al correo institucional.",
    })
  }

  const handleReject = (id: string) => {
    setRequests(prev => prev.filter(r => r.id !== id))
    toast({
      variant: "destructive",
      title: "Solicitud Rechazada",
      description: "La solicitud ha sido eliminada del sistema.",
    })
  }

  const filteredRequests = requests.filter(r => 
    `${r.firstname} ${r.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.dni.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Validación de Identidad</p>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-slate-900">Solicitudes de Acceso</h2>
          <p className="text-slate-500 text-sm">Nuevos docentes esperando aprobación para ingresar al portal.</p>
        </div>
        <Badge variant="outline" className="px-4 py-1.5 bg-blue-50 text-blue-700 border-blue-100 font-bold">
          {requests.length} Pendientes
        </Badge>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input 
          placeholder="Buscar solicitud por nombre o DNI..." 
          className="pl-11 py-6 bg-white border-slate-100 shadow-sm text-base"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[80px] pl-6"></TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Docente Solicitante</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Documentos / Contacto</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Programa de Estudio</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Fecha</TableHead>
                <TableHead className="w-[120px] pr-6 text-right">Acciones Rápidas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => (
                  <TableRow key={req.id} className="group hover:bg-slate-50/50 transition-colors">
                    <TableCell className="pl-6">
                      <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                        <AvatarImage src={`https://picsum.photos/seed/${req.id}/200/200`} />
                        <AvatarFallback>{req.firstname[0]}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{req.firstname} {req.lastname}</span>
                        <span className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">ID Solicitud: {req.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                          <Mail className="h-3 w-3 text-primary" /> {req.email}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1.5">
                          <Fingerprint className="h-3 w-3" /> DNI: {req.dni}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded bg-blue-50 flex items-center justify-center text-primary">
                          <BookOpen className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{req.program}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Calendar className="h-3.5 w-3.5" /> {req.date}
                      </div>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full"
                          onClick={() => handleApprove(req.id)}
                          title="Aprobar Acceso"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
                          onClick={() => handleReject(req.id)}
                          title="Rechazar Solicitud"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                              <MoreVertical className="h-4 w-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-xs">Ver detalles completos</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs">Contactar por correo</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-slate-200" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900">Bandeja limpia</p>
                        <p className="text-sm">No hay solicitudes de acceso pendientes de revisión.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-amber-900 uppercase tracking-widest">Protocolo de Seguridad</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Al aprobar una solicitud, el sistema generará automáticamente un correo electrónico con las instrucciones de primer acceso. Verifique que el DNI coincida con el padrón institucional antes de autorizar.
          </p>
        </div>
      </div>
    </div>
  )
}
