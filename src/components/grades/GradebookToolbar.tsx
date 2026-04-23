"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, RefreshCcw, Save, Loader2 } from "lucide-react"

interface GradebookToolbarProps {
  searchTerm: string
  setSearchTerm: (val: string) => void
  onReload: () => void
  onSave: () => void
  isSaving: boolean
}

export function GradebookToolbar({ searchTerm, setSearchTerm, onReload, onSave, isSaving }: GradebookToolbarProps) {
  return (
    <div className="p-4 md:p-8 bg-slate-50/50 border-b flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
      <div className="relative w-full md:w-[450px]">
        <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-slate-400" />
        <Input 
          placeholder="Buscar alumno..." 
          className="pl-10 md:pl-14 h-12 md:h-14 border-none shadow-inner rounded-xl md:rounded-2xl bg-white font-medium text-sm md:text-base" 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
        />
      </div>
      
      <div className="flex gap-2 w-full md:w-auto">
        <Button 
          variant="outline" 
          className="flex-1 md:flex-none h-10 md:h-12 px-4 md:px-6 border-slate-200 rounded-lg md:rounded-xl font-bold gap-2 text-xs md:text-sm" 
          onClick={onReload}
        >
          <RefreshCcw className="h-4 w-4" /> <span className="hidden sm:inline">Recargar</span>
        </Button>
        <Button 
          className="flex-1 md:flex-none h-10 md:h-12 px-6 md:px-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg md:rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest shadow-lg gap-2" 
          onClick={onSave} 
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 
          {isSaving ? "Guardando..." : "Guardar Registro"}
        </Button>
      </div>
    </div>
  )
}
