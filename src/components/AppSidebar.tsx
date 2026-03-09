import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Home, Users, Package, CreditCard, Calendar, HelpCircle, Settings, LogOut, MessageCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useChatUnread } from "@/hooks/useChatUnread";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Deudas", url: "/deudas", icon: CreditCard },
  { title: "Calendario", url: "/calendario", icon: Calendar },
  { title: "Inventario", url: "/inventario", icon: Package },
  { title: "Mensajes", url: "/chat", icon: MessageCircle },
  { title: "Ayuda", url: "/ayuda", icon: HelpCircle },
  { title: "Configuración", url: "/configuracion", icon: Settings },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { unread } = useChatUnread();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar className="border-r border-gray-200">
      <SidebarHeader className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-blue-900">IoSSpace Control</h2>
          </div>
          <div className="flex-shrink-0">
            <img 
              src="/lovable-uploads/139ccb2f-7ba1-4720-9a2e-04dbfc1f46a3.png" 
              alt="Appy Studios" 
              className="w-12 h-12 object-contain opacity-70"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">Powered by Appy Studios</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-600 font-medium">
            Navegación
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location.pathname === item.url}
                  >
                    <button 
                      onClick={() => navigate(item.url)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-900 transition-colors"
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="flex-1">{item.title}</span>
                      {item.url === '/chat' && unread > 0 && (
                        <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold bg-red-500 text-white rounded-full">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-gray-200 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-900 truncate">{user?.email}</p>
            <p className="text-[10px] text-gray-500 capitalize">{profile?.role ?? 'usuario'}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="shrink-0 text-gray-500 hover:text-red-600 h-8 w-8 p-0"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
