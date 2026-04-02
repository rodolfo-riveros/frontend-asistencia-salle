
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
  LogOut
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
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Programas", href: "/admin/programs", icon: GraduationCap },
  { name: "Cursos (Unidades)", href: "/admin/courses", icon: BookOpen },
  { name: "Docentes", href: "/admin/instructors", icon: Users },
  { name: "Importación Masiva", href: "/admin/import", icon: FileUp },
]

const instructorNav = [
  { name: "Mis Cursos", href: "/instructor", icon: BookOpen },
  { name: "Horarios", href: "/instructor/schedule", icon: Calendar },
]

const user = {
  name: "Carlos Mendoza",
  email: "carlos.mendoza@lasalleurubamba.edu.pe",
  avatar: "https://picsum.photos/seed/doc/200/200",
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
            <span className="font-bold text-lg text-primary group-data-[collapsible=icon]:hidden uppercase">
              La Salle
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navegación</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={item.name}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {isAdmin && (
            <SidebarGroup>
              <SidebarGroupLabel>Configuración</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Ajustes">
                      <Settings />
                      <span>Ajustes</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1">
             <h1 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
               IES La Salle Urubamba - {isAdmin ? 'Administración' : 'Docente'}
             </h1>
          </div>
        </header>
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
