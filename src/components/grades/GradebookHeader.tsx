
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ClipboardCheck, FileSpreadsheet, FileText, PlusCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface GradebookHeaderProps {
  onNewEval: () => void
  onExportExcel: () => void
  onExportPdf: () => void
  isExporting: boolean
}

export function GradebookHeader({ onNewEval, onExportExcel, onExportPdf, isExporting }: GradebookHeaderProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
      <div className="space-y-4 w-full lg:w-auto">
        <button 
          onClick={() => router.back()} 
          className="flex items-center text-primary font-bold hover:opacity-70 transition-opacity uppercase tracking-widest text-[10px]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> VOLVER AL PANEL
        </button>
        <div className="flex items-center gap-4">
          <div className="p-3 md:p-4 bg-primary rounded-2xl md:rounded-3xl text-white shadow-2xl shadow-primary/20">
            <ClipboardCheck className="h-8 w-8 md:h-10 md:h-10" />
          </div>
          <div>
            <h2 className="text-2xl md:text-4xl font-headline font-black tracking-tight text-slate-900">Registro Auxiliar</h2>
            <p className="text-xs md:text-sm text-slate-500 font-medium italic">Gestión de Calificaciones e Indicadores de Logro</p>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-3 w-full lg:w-auto">
        <Button 
          variant="outline" 
          disabled={isExporting}
          onClick={onExportExcel}
          className="flex-1 lg:flex-none h-12 md:h-14 px-4 md:px-6 gap-2 md:gap-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-black rounded-xl md:rounded-2xl uppercase text-[10px] md:text-[11px] tracking-widest"
        >
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 md:h-5 md:h-5" />} Excel
        </Button>
        <Button 
          variant="outline" 
          disabled={isExporting}
          onClick={onExportPdf}
          className="flex-1 lg:flex-none h-12 md:h-14 px-4 md:px-6 gap-2 md:gap-3 border-red-200 text-red-700 hover:bg-red-50 font-black rounded-xl md:rounded-2xl uppercase text-[10px] md:text-[11px] tracking-widest"
        >
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 md:h-5 md:h-5" />} PDF
        </Button>
        <Button 
          className="w-full lg:w-auto h-12 md:h-14 px-8 gap-2 md:gap-3 bg-primary hover:bg-primary/90 font-black shadow-xl shadow-primary/30 rounded-xl md:rounded-2xl uppercase text-[10px] md:text-[11px] tracking-widest text-white"
          onClick={onNewEval}
          disabled={isExporting}
        >
          <PlusCircle className="h-4 w-4 md:h-5 md:h-5" /> Nueva Evaluación
        </Button>
      </div>
    </div>
  )
}
