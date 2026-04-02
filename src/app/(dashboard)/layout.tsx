
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  UserRound,
  ClipboardList,
  UserCheck,
  Search,
  LogOut
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/layout/nav-user"
import { Button } from "@/components/ui/button"

const ADMIN_NAV = [
  { name: "Panel", href: "/admin", icon: LayoutDashboard },
  { name: "Solicitudes", href: "/admin/requests", icon: UserCheck },
  { name: "Programas", href: "/admin/programs", icon: GraduationCap },
  { name: "Cursos", href: "/admin/courses", icon: BookOpen },
  { name: "Docentes", href: "/admin/instructors", icon: UserRound },
  { name: "Asignaciones", href: "/admin/assignments", icon: ClipboardList },
  { name: "Alumnos", href: "/admin/students", icon: Users },
]

const ADMIN_USER = {
  name: "Administrador Central",
  email: "gestion@lasalleurubamba.edu.pe",
  avatar: "https://picsum.photos/seed/admin/200/200",
}

const INSTRUCTOR_USER = {
  name: "Docente La Salle",
  email: "docente@lasalleurubamba.edu.pe",
  avatar: "https://picsum.photos/seed/docente/200/200",
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isAdmin = pathname.startsWith('/admin')
  const currentYear = new Date().getFullYear()

  const InstitutionalFooter = () => (
    <footer className="w-full py-6 px-8 mt-auto flex flex-col md:flex-row justify-between items-center border-t border-slate-100 bg-white gap-4 text-[10px] uppercase tracking-widest font-bold">
      <div className="text-slate-500">
        © {currentYear} IES La Salle Urubamba | Cusco - Perú
      </div>
      <div className="text-slate-400">
        Desarrollado por Rodolfo Riveros
      </div>
    </footer>
  )

  if (isAdmin) {
    return (
      <SidebarProvider>
        <Sidebar collapsible="icon" className="border-r-0 shadow-2xl">
          <SidebarHeader className="h-20 flex items-center justify-center border-b border-white/10 px-6">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="bg-white p-1.5 rounded-lg shadow-md">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <span className="font-extrabold text-xl text-white group-data-[collapsible=icon]:hidden uppercase font-headline tracking-tighter">
                La Salle
              </span>
            </Link>
          </SidebarHeader>
          <SidebarContent className="py-6">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="gap-2 px-3">
                  {ADMIN_NAV.map((item) => (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                        tooltip={item.name}
                        className={`py-6 px-4 rounded-xl transition-all ${pathname === item.href ? 'bg-white/15 text-white shadow-lg' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
                      >
                        <Link href={item.href} className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          <span className="font-semibold text-sm">{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-white/10 p-4">
            <NavUser user={ADMIN_USER} />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="bg-[#f8f9fa] flex flex-col min-h-screen">
          <header className="flex h-20 shrink-0 items-center gap-2 border-b bg-white/60 backdrop-blur-xl px-8 sticky top-0 z-40">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1 px-4 flex justify-end">
              <div className="relative w-72 hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  placeholder="Buscar en el portal..." 
                  className="h-10 w-full rounded-full border-none bg-slate-100 px-10 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" 
                />
              </div>
            </div>
          </header>
          <div className="p-6 lg:p-12 max-w-[1600px] mx-auto w-full flex-grow">
            {children}
          </div>
          <InstitutionalFooter />
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      <header className="h-20 bg-primary sticky top-0 z-50 px-6 lg:px-20 flex items-center justify-between shadow-lg">
        <Link href="/instructor" className="flex items-center gap-3 group">
          <div className="bg-white p-1.5 rounded-lg shadow-lg group-hover:scale-110 transition-transform">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <span className="font-extrabold text-xl text-white uppercase font-headline tracking-tight">
            La Salle Urubamba
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-sm font-black text-white leading-tight">{INSTRUCTOR_USER.name}</span>
            <span className="text-[10px] text-white/80 font-bold uppercase tracking-widest">Docente de Especialidad</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full h-11 w-11 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => router.push('/')}
            title="Cerrar Sesión"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>
      <main className="flex-grow p-6 lg:p-12 max-w-7xl mx-auto w-full">
        {children}
      </main>
      <InstitutionalFooter />
    </div>
  )
}
