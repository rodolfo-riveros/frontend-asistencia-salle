
"use client"

import * as React from "react"
import { Users, CheckCircle2, Plus, Download, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface GroupConfigProps {
  students: any[]
  groupSize: number
  setGroupSize: (size: number) => void
  studentGroups: Record<string, string>
  setStudentGroups: (groups: Record<string, string>) => void
  newColName: string
}

export function GroupConfig({ students, groupSize, setGroupSize, studentGroups, setStudentGroups, newColName }: GroupConfigProps) {
  const generateRandomGroups = () => {
    const shuffled = [...students].sort(() => Math.random() - 0.5)
    const newGroups: Record<string, string> = {}
    shuffled.forEach((s, i) => {
      const groupNum = Math.floor(i / groupSize) + 1
      newGroups[s.id] = `Grupo ${groupNum}`
    })
    setStudentGroups(newGroups)
    toast({ title: "Sorteo Finalizado", description: "Se han mezclado los estudiantes aleatoriamente." })
  }

  const exportGroupsToPdf = () => {
    if (Object.keys(studentGroups).length === 0) {
      toast({ variant: "destructive", title: "Atención", description: "Debes generar o asignar los grupos primero." });
      return;
    }

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text("IES LA SALLE URUBAMBA", 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`CONFORMACIÓN DE EQUIPOS: ${newColName.toUpperCase()}`, 14, 30);
    doc.text(`FECHA: ${new Date().toLocaleDateString()}`, 14, 38);

    // Grouping data for table
    const groups: Record<string, string[]> = {};
    students.forEach(s => {
      const groupName = studentGroups[s.id];
      if (groupName) {
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(s.nombre);
      }
    });

    const tableRows: any[] = [];
    Object.keys(groups).sort().forEach(groupName => {
      groups[groupName].forEach((studentName, idx) => {
        tableRows.push([
          idx === 0 ? groupName : "",
          studentName
        ]);
      });
    });

    autoTable(doc, {
      startY: 45,
      head: [['EQUIPO', 'ESTUDIANTE']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
    });

    doc.save(`GRUPOS_${newColName.replace(/\s+/g, '_')}.pdf`);
    toast({ title: "PDF Generado", description: "Se ha descargado la conformación de equipos." });
  }

  return (
    <div className="space-y-6 p-8 bg-indigo-50/30 rounded-[2.5rem] border-2 border-indigo-100 border-dashed">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h4 className="text-xl font-black text-indigo-700 uppercase tracking-tighter flex items-center gap-2"><Users className="h-5 w-5" /> Configuración de Equipos</h4>
          <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest">Mezcla aleatoria o asignación manual de estudiantes</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-indigo-100 shadow-sm">
            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Alumnos x Grupo</Label>
            <Input type="number" value={groupSize} onChange={e => setGroupSize(parseInt(e.target.value) || 2)} className="w-16 h-10 rounded-lg text-center font-black border-none bg-slate-50 shadow-inner" />
          </div>
          <Button variant="outline" className="h-14 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 gap-2" onClick={exportGroupsToPdf}>
            <FileText className="h-4 w-4" /> Exportar PDF
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 h-14 px-8 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-200 text-white" onClick={generateRandomGroups}>Sorteo Aleatorio</Button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {students.map(s => (
          <div key={s.id} className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm flex flex-col gap-3 group hover:border-indigo-200 transition-all">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6"><AvatarFallback className="text-[8px] font-black bg-slate-100">{getInitials(s.nombre)}</AvatarFallback></Avatar>
              <span className="text-[10px] font-black uppercase truncate text-slate-600">{s.nombre.split(' ')[0]}</span>
            </div>
            <select 
              value={studentGroups[s.id] || ""} 
              onChange={e => setStudentGroups({ ...studentGroups, [s.id]: e.target.value })}
              className="w-full h-9 text-[9px] font-black uppercase tracking-widest border-2 rounded-lg bg-slate-50 border-slate-100 outline-none focus:border-indigo-300 transition-colors"
            >
              <option value="">Sin Grupo</option>
              {Array.from({ length: Math.ceil(students.length / 2) }, (_, i) => `Grupo ${i + 1}`).map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
