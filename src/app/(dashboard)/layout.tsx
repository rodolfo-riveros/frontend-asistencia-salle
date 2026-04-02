
"use client"

import * as React from "react"
import {
  BookOpen,
  LayoutDashboard,
  Users,
  Settings,
  FileUp,
  GraduationCap,
  Calendar,
  UserRound,
  Network
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

const adminNav = [
  { name: "Panel de Control", href: "/admin", icon: LayoutDashboard },
  { name: "Programas de Estudio", href: "/admin/programs", icon: GraduationCap },
  { name: "Unidades Didácticas", href: "/admin/courses", icon: BookOpen },
  { name: "Gestión de Docentes", href: "/admin/instructors", icon: UserRound },
  { name: "Registro de Alumnos", href: "/admin/students", icon: Users },
  { name: "Importación Masiva", href: "/admin/import", icon: FileUp },
]

const instructorNav = [
  { name: "Mis Cursos", href: "/instructor", icon: BookOpen },
  { name: "Horarios", href: "/instructor/schedule", icon: Calendar },
]

const user = {
  name: "Administrador General",
  email: "admin@lasalleurubamba.edu.pe",
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
      <Sidebar collapsible="icon">
        <SidebarHeader className="h-16 flex items-center px-6">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg text-primary group-data-[collapsible=icon]:hidden uppercase font-headline">
              La Salle
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Menú de Navegación</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.name}
                      className="py-6 px-4"
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon className={pathname === item.href ? "text-primary" : "text-slate-400"} />
                        <span className="font-medium text-sm">{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white/80 backdrop-blur-md px-4 sticky top-0 z-40">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1 px-4">
             <h1 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
               IES La Salle Urubamba - Portal de {isAdmin ? 'Administración' : 'Docente'}
             </h1>
          </div>
        </header>
        <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
