import { ScanFace, BarChart3, UserCircle, Plus, FileText, Camera, ClipboardList } from "lucide-react"
import { FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import logo from "@/assets/logo.png"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const clientNavItems = [
  { path: "/dashboard", label: "Analise", icon: ScanFace },
  { path: "/dashboard/reports", label: "Meus Relatorios", icon: FileText },
  { path: "/dashboard/photo-guide", label: "Guia de Fotos", icon: Camera },
  { path: "/dashboard/progress", label: "Progresso", icon: BarChart3 },
]

const professionalNavItems = [
  { path: "/professional/dashboard", label: "Painel Profissional", icon: ClipboardList },
  { path: "/professional/dashboard", label: "Voltar ao Cliente", icon: ScanFace, href: "/dashboard" },
]

const adminNavItems = [
  { path: "/dashboard/admin", label: "Fila de Analises", icon: ClipboardList },
  { path: "/professional/dashboard", label: "Painel Profissional", icon: ScanFace },
]

export function AppSidebar({ ...props }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const role = user?.role || 'client'

  let navItems = clientNavItems
  if (role === 'professional') {
    navItems = professionalNavItems
  } else if (role === 'admin') {
    navItems = adminNavItems
  }

  return (
    <Sidebar className="border-r apple-material-gold" {...props}>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3 px-2 py-2">
          <img src={logo} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
          <div className="hidden lg:block">
            <p className="text-[13px] font-bold tracking-wide text-text-primary leading-tight" style={{ letterSpacing: '-0.022em' }}>
              FACE<span className="text-brand-accent">MAX</span>
            </p>
            <p className="text-[10px] text-text-muted leading-tight" style={{ letterSpacing: '-0.011em' }}>
              {role === 'professional' || role === 'admin' ? 'Painel Profissional' : 'Elite da Estetica'}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ path, label, icon: Icon }) => {
                const isActive = location.pathname === path
                return (
                  <SidebarMenuItem key={path + label}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => navigate(path)}
                      className={`
                        h-11 px-4 text-[13px] font-medium apple-transition apple-focus apple-badge
                        ${isActive
                          ? 'bg-brand-accent/10 text-brand-accent'
                          : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                        }
                      `}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                      <span className="hidden lg:inline truncate" style={{ letterSpacing: '-0.011em' }}>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate(role === 'professional' || role === 'admin' ? '/professional/dashboard' : '/dashboard')}
              className="h-11 px-6 text-[13px] font-semibold bg-brand-accent text-background hover:opacity-90 apple-button apple-focus apple-transition"
            >
              <Plus className="w-[18px] h-[18px] shrink-0" />
              <span className="hidden lg:inline truncate">
                {role === 'professional' || role === 'admin' ? 'Ver Fila' : 'Nova Analise'}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <div className="h-px bg-border my-2" />
          {role === 'client' && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => navigate('/dashboard/profile')}
                className={`h-11 px-4 text-[13px] font-medium apple-transition apple-focus apple-badge ${
                  location.pathname === '/dashboard/profile'
                    ? 'bg-brand-accent/10 text-brand-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                }`}
              >
                <UserCircle className="w-[18px] h-[18px] shrink-0" />
                <span className="hidden lg:inline truncate" style={{ letterSpacing: '-0.011em' }}>Meu Perfil</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <div className="h-px bg-border my-2" />
          <div className="hidden lg:flex items-center justify-center gap-2 py-1">
            {[
              { Icon: FaInstagram, href: "https://www.instagram.com/face.max0904", label: "Instagram da FaceMax" },
              { Icon: FaTiktok, href: "https://www.tiktok.com/@face_max0", label: "TikTok da FaceMax" },
              { Icon: FaYoutube, href: "https://www.youtube.com/@facemax04", label: "YouTube da FaceMax" },
            ].map(({ Icon, href, label }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-brand-accent transition-colors">
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
