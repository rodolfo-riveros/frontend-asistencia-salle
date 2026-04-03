
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Users, GraduationCap, BookOpen, UserRound, ClipboardList, Search, LogOut, Loader2, CalendarDays } from "lucide-react"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { NavUser } from "@/components/layout/nav-user"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { api } from "@/lib/api"

const ADMIN_NAV = [
  { name: "Panel", href: "/admin", icon: LayoutDashboard },
  { name: "Periodos", href: "/admin/periods", icon: CalendarDays },
  { name: "Programas", href: "/admin/programs", icon: GraduationCap },
  { name: "Cursos", href: "/admin/courses", icon: BookOpen },
  { name: "Docentes", href: "/admin/instructors", icon: UserRound },
  { name: "Asignaciones", href: "/admin/assignments", icon: ClipboardList },
  { name: "Alumnos", href: "/admin/students", icon: Users },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [userData, setUserData] = React.useState<any>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) { router.replace('/'); return }
      
      const role = user.user_metadata?.role || 'docente'
      if (role === 'docente' && pathname.startsWith('/admin')) { router.replace('/instructor'); return }
      if (role === 'admin' && pathname.startsWith('/instructor')) { router.replace('/admin'); return }

      let isTransversal = false;
      if (role === 'docente') {
        try {
          const profile = await api.get<any>(`/docentes/${user.id}`);
          isTransversal = profile?.es_transversal || false;
        } catch (e) { console.error(e) }
      }

      setUserData({
        name: `${user.user_metadata?.firstname || ""} ${user.user_metadata?.lastname || ""}`.trim() || "Usuario",
        email: user.email,
        initials: `${(user.user_metadata?.firstname || "U").charAt(0)}${(user.user_metadata?.lastname || "S").charAt(0)}`.toUpperCase(),
        role: role,
        isTransversal: isTransversal
      })
      setIsLoading(false)
    }
    fetchUser()
  }, [router, pathname])

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace('/') }

  const Footer = () => (
    <footer className="w-full py-6 px-8 mt-auto flex flex-col md:flex-row justify-between items-center border-t bg-white gap-4 text-[10px] uppercase tracking-widest font-bold text-slate-400">
      <div>© {new Date().getFullYear()} IES La Salle Urubamba | Cusco - Perú</div>
      <div>Desarrollado por Rodolfo Riveros</div>
    </footer>
  )

  if (isLoading) return <div className="min-h-screen flex flex-col items-center justify-center gap-4"><Loader2 className="h-10 w-10 animate-spin text-primary" /><p className="text-sm font-bold text-slate-500 uppercase">Autorizando...</p></div>

  if (pathname.startsWith('/admin')) {
    return (
      <SidebarProvider>
        <Sidebar collapsible="icon" className="border-r-0 shadow-2xl">
          <SidebarHeader className="h-20 flex items-center justify-center border-b border-white/10 px-6">
            <Link href="/admin" className="flex items-center gap-3"><GraduationCap className="h-6 w-6 text-white" /><span className="font-extrabold text-xl text-white uppercase tracking-tighter">La Salle</span></Link>
          </SidebarHeader>
          <SidebarContent className="py-6">
            <SidebarGroup><SidebarMenu className="gap-2 px-3">{ADMIN_NAV.map((it) => (<SidebarMenuItem key={it.name}><SidebarMenuButton asChild isActive={pathname === it.href} className={`py-6 px-4 rounded-xl ${pathname === it.href ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/5'}`}><Link href={it.href} className="flex items-center gap-3"><it.icon className="h-5 w-5" /><span>{it.name}</span></Link></SidebarMenuButton></SidebarMenuItem>))}</SidebarMenu></SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-white/10 p-4"><NavUser user={userData} onLogout={handleLogout} /></SidebarFooter>
        </Sidebar>
        <SidebarInset className="bg-[#f8f9fa] flex flex-col min-h-screen">
          <header className="flex h-20 shrink-0 items-center gap-2 border-b bg-white/60 backdrop-blur-xl px-4 md:px-8 sticky top-0 z-40"><SidebarTrigger /><div className="flex-1 flex justify-end"><Search className="h-4 w-4 text-slate-400" /></div></header>
          <div className="p-4 md:p-12 max-w-[1600px] mx-auto w-full flex-grow">{children}</div>
          <Footer />
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
      <header className="h-20 bg-primary sticky top-0 z-50 px-4 md:px-10 lg:px-20 flex items-center justify-between shadow-lg">
        <Link href="/instructor" className="flex items-center gap-3 group">
          <div className="bg-white p-1.5 rounded-lg shadow-lg group-hover:scale-110 transition-transform"><GraduationCap className="h-6 w-6 text-primary" /></div>
          <span className="font-extrabold text-xl text-white uppercase tracking-tight">La Salle Urubamba</span>
        </Link>
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right flex flex-col"><span className="text-sm font-black text-white leading-tight">{userData?.name}</span><span className="text-[10px] text-white/80 font-bold uppercase tracking-widest">{userData?.isTransversal ? "Docente Transversal" : "Docente de Especialidad"}</span></div>
            <Avatar className="h-10 w-10 border-2 border-white/20"><AvatarFallback className="bg-white/10 text-white font-bold">{userData?.initials}</AvatarFallback></Avatar>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full h-11 w-11 text-white/70 hover:text-white hover:bg-white/10" onClick={handleLogout}><LogOut className="h-5 w-5" /></Button>
        </div>
      </header>
      <main className="flex-grow p-4 md:p-12 max-w-7xl mx-auto w-full">{children}</main>
      <Footer />
    </div>
  )
}
