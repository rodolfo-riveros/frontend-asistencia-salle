
"use client"

import * as React from "react"
import {
  BookOpen,
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar,
  UserRound,
  Search,
  ClipboardList,
  UserCheck,
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
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

const adminNav = [
  { name: "Panel", href: "/admin", icon: LayoutDashboard },
  { name: "Solicitudes de Acceso", href: "/admin/requests", icon: UserCheck },
  { name: "Programas de Estudio", href: "/admin/programs", icon: GraduationCap },
  { name: "Unidades Didácticas", icon: BookOpen, href: "/admin/courses" },
  { name: "Cuerpo Docente", href: "/admin/instructors", icon: UserRound },
  { name: "Asignación Académica", href: "/admin/assignments", icon: ClipboardList },
  { name: "Padrón de Alumnos", href: "/admin/students", icon: Users },
]

const user = {
  name: "Administrador Central",
  email: "gestion@lasalleurubamba.edu.pe",
  avatar: "https://picsum.photos/seed/admin/200/200",
}

const instructorUser = {
  name: "Docente La Salle",
  email: "docente@lasalleurubamba.edu.pe",
  avatar: "https://picsum.photos/seed/docente/200/200",
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const isAdmin = pathname.startsWith('/admin')
  const [currentYear, setCurrentYear] = React.useState<number | null>(null)

  React.useEffect(() => {
    setCurrentYear(new Date().getFullYear())
  }, [])

  const Footer = () => (
    <footer className="bg-white w-full py-4 px-8 mt-auto flex flex-col md:flex-row justify-between items-center border-t border-slate-100 gap-4">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 text-center md:text-left">
        © {currentYear || '2024'} IES La Salle Urubamba | Cusco - Perú
      </div>
      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
        Desarrollado por Rodolfo Rodolfo Riveros
      </div>
    </footer>
  )

  // Layout para el Administrador (Con Sidebar)
  if (isAdmin) {
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
              <SidebarGroupContent>
                <SidebarMenu className="gap-2 px-3">
                  {adminNav.map((item) => (
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
        <SidebarInset className="bg-[#f8f9fa] flex flex-col min-h-svh">
          <header className="flex h-20 shrink-0 items-center gap-2 border-b bg-white/60 backdrop-blur-xl px-8 sticky top-0 z-40">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1 px-4 flex items-center justify-end">
               <div className="flex items-center gap-6">
                  <div className="relative w-72 hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input placeholder="Buscar en el portal..." className="flex h-10 w-full rounded-full border-none bg-slate-100 px-10 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary" />
                  </div>
               </div>
            </div>
          </header>
          <div className="p-6 lg:p-12 max-w-[1600px] mx-auto w-full flex-grow">
            {children}
          </div>
          <Footer />
        </SidebarInset>
      </SidebarProvider>
    )
  }

  // Layout para el Docente (Sin Sidebar, Pantalla Completa)
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      <header className="h-20 bg-white border-b sticky top-0 z-50 px-6 lg:px-20 flex items-center justify-between shadow-sm">
        <Link href="/instructor" className="flex items-center gap-3">
          <div className="bg-primary p-1.5 rounded-lg shadow-lg">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <span className="font-extrabold text-xl text-primary uppercase font-headline tracking-tight">
            La Salle Urubamba
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col text-right mr-4">
            <span className="text-sm font-bold text-slate-900">{instructorUser.name}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Docente de Especialidad</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50"
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
      <Footer />
    </div>
  )
}
