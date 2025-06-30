
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
} from "@/components/ui/sidebar";
import { Home, Users, Package, CreditCard, Calendar, HelpCircle, Settings } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Deudas", url: "/deudas", icon: CreditCard },
  { title: "Calendario", url: "/calendario", icon: Calendar },
  { title: "Inventario", url: "/inventario", icon: Package },
  { title: "Ayuda", url: "/ayuda", icon: HelpCircle },
  { title: "Configuración", url: "/configuracion", icon: Settings },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Sidebar className="border-r border-gray-200">
      <SidebarHeader className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-blue-900">IoSpace Control</h2>
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
                      <span>{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
