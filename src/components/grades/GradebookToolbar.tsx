"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface GradebookToolbarProps {
  searchTerm: string
  setSearchTerm: (val: string) => void
}

export function GradebookToolbar({ searchTerm, setSearchTerm }: GradebookToolbarProps) {
  return (
    <div className="p-4 md:p-8 bg-muted/30 border-b flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
      <div className="relative w-full md:w-[450px]">
        <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
        <Input 
          placeholder="Buscar alumno por nombre o DNI..." 
          className="pl-10 md:pl-14 h-12 md:h-14 border-none shadow-inner rounded-xl md:rounded-2xl bg-background font-medium text-sm md:text-base text-foreground" 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
        />
      </div>
      
      <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground/70 tracking-widest">
        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        Sincronización Automática Activa
      </div>
    </div>
  )
}
