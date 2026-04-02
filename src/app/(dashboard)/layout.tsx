"use client"

import * as React from "react"
import {
  BookOpen,
  LayoutDashboard,
  Users,
  FileUp,
  GraduationCap,
  Calendar,
  UserRound,
  Bell,
  Search,
  Settings
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/layout/nav-user"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const adminNav = [
  { name: "Dashboard Principal", href: "/admin", icon: LayoutDashboard },
  { name: "Programas de Estudio", href: "/admin/programs", icon: GraduationCap },
  { name: "Unidades Didácticas", href: "/admin/courses", icon: BookOpen },
  { name: "Cuerpo Docente", href: "/admin/instructors", icon: UserRound },
  { name: "Padrón de Alumnos", href: "/admin/students", icon: Users },
  { name: "Importación de Datos", href: "/admin/import", icon: FileUp },
]

const instructorNav = [
  { name: "Mis Cursos", href: "/instructor", icon: BookOpen },
  { name: "Horarios Semanales", href: "/instructor/schedule", icon: Calendar },
]

const user = {
  name: "Administrador Central",
  email: "gestion@lasalleurubamba.edu.pe",
  avatar: "https://picsum.photos/seed/admin/200/200",
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')
  const navItems = isAdmin ? adminNav : instructorNav

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r-0 shadow-2xl">
        <SidebarHeader className="h-20 flex items-center justify-center border-b border-white/10 px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-lg">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <span className="font-extrabold text-xl text-white group-data-[collapsible=icon]:hidden uppercase font-headline tracking-tight">
              La Salle
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="py-6">
          <SidebarGroup>
            <SidebarGroupLabel className="px-6 text-[10px] font-bold uppercase tracking-[0.3em] text-white/50 mb-4">Navegación Institucional</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-2 px-3">
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.name}
                      className={`py-6 px-4 rounded-xl transition-all duration-300 ${pathname === item.href ? 'bg-white/15 text-white shadow-lg' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        <span className="font-semibold text-sm tracking-tight">{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-white/10 p-4">
          <NavUser user={user} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-[#f8f9fa]">
        <header className="flex h-20 shrink-0 items-center gap-2 border-b bg-white/60 backdrop-blur-xl px-8 sticky top-0 z-40">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1 px-4 flex items-center justify-between">
             <h1 className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] hidden lg:block">
               Portal de Gestión de Asistencia | IES La Salle Urubamba
             </h1>
             <div className="flex items-center gap-6">
                <div className="relative w-72 hidden md:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input placeholder="Buscar en el portal..." className="pl-10 h-10 bg-slate-100 border-none rounded-full" />
                </div>
                <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-slate-100">
                  <Bell className="h-5 w-5 text-slate-500" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </Button>
             </div>
          </div>
        </header>
        <div className="p-6 lg:p-12 max-w-[1600px] mx-auto w-full">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}