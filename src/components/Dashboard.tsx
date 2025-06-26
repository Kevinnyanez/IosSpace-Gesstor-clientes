import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, AlertTriangle, Calendar as CalendarIcon, SidebarOpen } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DeudaConCliente } from "@/types";
import { format, addDays, isToday, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { ExchangeRateCard } from "./ExchangeRateCard";

export function Dashboard() {
  // Consulta para obtener total de clientes
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('activo', true);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Consulta para obtener deudas con información de clientes
  const { data: deudas = [] } = useQuery({
    queryKey: ['deudas-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deudas')
        .select(`
          *,
          cliente:clientes(*)
        `)
        .order('fecha_vencimiento', { ascending: true });
      
      if (error) throw error;
      return (data || []) as DeudaConCliente[];
    },
  });

  // Filtrar deudas pendientes
  const deudasPendientes = deudas.filter(deuda => 
    deuda.estado === 'pendiente' || deuda.estado === 'vencido'
  );

  // Filtrar deudas próximas a vencer (próximos 7 días)
  const deudasProximasVencer = deudasPendientes.filter(deuda => {
    const fechaVencimiento = new Date(deuda.fecha_vencimiento);
    const hoy = new Date();
    const proximosSieteDias = addDays(hoy, 7);
    return fechaVencimiento >= hoy && fechaVencimiento <= proximosSieteDias;
  });

  // Actividad reciente (últimas 5 deudas creadas)
  const actividadReciente = deudas
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  // Próximos eventos del calendario (deudas con vencimiento en los próximos 30 días)
  const proximosEventos = deudasPendientes
    .filter(deuda => {
      const fechaVencimiento = new Date(deuda.fecha_vencimiento);
      const hoy = new Date();
      const proximosTreintaDias = addDays(hoy, 30);
      return fechaVencimiento >= hoy && fechaVencimiento <= proximosTreintaDias;
    })
    .slice(0, 3);

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Resumen general de tu negocio</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Clientes"
          value={clientes.length}
          icon={Users}
          color="text-blue-600"
        />
        <StatCard
          title="Deudas Pendientes"
          value={deudasPendientes.length}
          icon={CreditCard}
          color="text-orange-600"
        />
        <StatCard
          title="Próximas a Vencer"
          value={deudasProximasVencer.length}
          icon={AlertTriangle}
          color="text-red-600"
        />
        <ExchangeRateCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Deudas Próximas a Vencer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deudasProximasVencer.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay deudas próximas a vencer</p>
              ) : (
                deudasProximasVencer.slice(0, 3).map((deuda) => {
                  const fechaVencimiento = new Date(deuda.fecha_vencimiento);
                  const esVencido = isPast(fechaVencimiento) && !isToday(fechaVencimiento);
                  const esHoy = isToday(fechaVencimiento);
                  
                  return (
                    <div 
                      key={deuda.id}
                      className={`flex justify-between items-center p-3 rounded-lg ${
                        esVencido ? 'bg-red-50' : esHoy ? 'bg-yellow-50' : 'bg-orange-50'
                      }`}
                    >
                      <div>
                        <p className="font-medium">
                          {deuda.cliente.nombre} {deuda.cliente.apellido}
                        </p>
                        <p className="text-sm text-gray-600">
                          {deuda.concepto} - ${deuda.monto_restante?.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          esVencido ? 'text-red-600' : esHoy ? 'text-yellow-600' : 'text-orange-600'
                        }`}>
                          {esVencido 
                            ? 'Vencido' 
                            : esHoy 
                            ? 'Vence hoy' 
                            : `Vence ${format(fechaVencimiento, 'dd/MM', { locale: es })}`
                          }
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {actividadReciente.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay actividad reciente</p>
              ) : (
                actividadReciente.map((deuda) => (
                  <div key={deuda.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Nueva deuda registrada</p>
                      <p className="text-sm text-gray-600">
                        {deuda.cliente.nombre} {deuda.cliente.apellido} - {deuda.concepto} - ${deuda.monto_total.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-blue-500" />
            Próximos Eventos del Calendario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {proximosEventos.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay eventos próximos</p>
            ) : (
              proximosEventos.map((deuda) => (
                <div key={deuda.id} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium">
                      {deuda.cliente.nombre} {deuda.cliente.apellido}
                    </p>
                    <p className="text-sm text-gray-600">{deuda.concepto}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-blue-600 font-medium">
                      {format(new Date(deuda.fecha_vencimiento), 'dd/MM/yyyy', { locale: es })}
                    </p>
                    <p className="text-xs text-gray-500">
                      ${deuda.monto_restante?.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
