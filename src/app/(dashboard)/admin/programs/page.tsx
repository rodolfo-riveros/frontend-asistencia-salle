
"use client"

import * as React from "react"
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  GraduationCap,
  Calendar,
  BookOpen
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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

const mockPrograms = [
  { id: "PROG-01", name: "Desarrollo de Sistemas de Información", duration: "6 Semestres", status: "Activo", students: 120 },
  { id: "PROG-02", name: "Contabilidad", duration: "6 Semestres", status: "Activo", students: 85 },
  { id: "PROG-03", name: "Enfermería Técnica", duration: "6 Semestres", status: "Activo", students: 150 },
  { id: "PROG-04", name: "Guía Oficial de Turismo", duration: "6 Semestres", status: "Mantenimiento", students: 45 },
]

export default function AdminProgramsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Gestión Académica</p>
          <h2 className="text-3xl font-headline font-extrabold tracking-tight text-slate-900">Programas de Estudio</h2>
          <p className="text-slate-500 text-sm">Administra las carreras profesionales ofrecidas por la institución.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Nuevo Programa
        </Button>
      </div>

      <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <CardHeader className="bg-white border-b px-6 py-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Buscar por nombre o código..." className="pl-10 bg-slate-50 border-none h-11" />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-4 py-1.5 text-slate-500 font-medium bg-slate-50 border-slate-100">
                Total: {mockPrograms.length} Programas
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[120px] font-bold text-slate-400 uppercase text-[10px] tracking-widest pl-6">Código</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Nombre del Programa</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Duración</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Alumnos</TableHead>
                <TableHead className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Estado</TableHead>
                <TableHead className="w-[80px] pr-6 text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockPrograms.map((program) => (
                <TableRow key={program.id} className="group hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-bold text-slate-900 pl-6">{program.id}</TableCell>
                  <TableCell className="font-semibold text-slate-700">{program.name}</TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" /> {program.duration}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold">{program.students} Estudiantes</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={program.status === 'Activo' ? 'bg-green-100 text-green-700 hover:bg-green-200 border-none' : 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-none'}>
                      {program.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-white hover:shadow-sm">
                          <MoreVertical className="h-4 w-4 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem className="gap-2">
                          <Edit2 className="h-3.5 w-3.5" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
