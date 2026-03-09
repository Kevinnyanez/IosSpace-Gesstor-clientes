import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CreditCard, AlertTriangle, Calendar as CalendarIcon, LayoutDashboard } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DeudaConCliente } from "@/types";
import { format, addDays, isToday, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { ExchangeRateCard } from "./ExchangeRateCard";

export function Dashboard() {
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

  const deudasPendientes = deudas.filter(deuda =>
    deuda.estado === 'pendiente' || deuda.estado === 'vencido'
  );

  const deudasProximasVencer = deudasPendientes.filter(deuda => {
    const fechaVencimiento = new Date(deuda.fecha_vencimiento);
    const hoy = new Date();
    const proximosSieteDias = addDays(hoy, 7);
    return fechaVencimiento >= hoy && fechaVencimiento <= proximosSieteDias;
  });

  const actividadReciente = deudas
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  const proximosEventos = deudasPendientes
    .filter(deuda => {
      const fechaVencimiento = new Date(deuda.fecha_vencimiento);
      const hoy = new Date();
      const proximosTreintaDias = addDays(hoy, 30);
      return fechaVencimiento >= hoy && fechaVencimiento <= proximosTreintaDias;
    })
    .slice(0, 3);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-blue-600" />
            Dashboard
          </h1>
          <p className="text-sm text-gray-500">Resumen general de tu negocio</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Clientes</p>
                <p className="text-2xl font-bold text-gray-900">{clientes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <CreditCard className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">{deudasPendientes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Por vencer</p>
                <p className="text-2xl font-bold text-gray-900">{deudasProximasVencer.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <ExchangeRateCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <CardTitle className="text-sm font-semibold">Próximas a vencer</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {deudasProximasVencer.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No hay deudas próximas a vencer</p>
              ) : (
                deudasProximasVencer.slice(0, 3).map((deuda) => {
                  const fechaVencimiento = new Date(deuda.fecha_vencimiento);
                  const esVencido = isPast(fechaVencimiento) && !isToday(fechaVencimiento);
                  const esHoy = isToday(fechaVencimiento);

                  return (
                    <div
                      key={deuda.id}
                      className="flex justify-between items-center p-3 rounded-lg border border-gray-100 bg-gray-50/50"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {deuda.cliente.nombre} {deuda.cliente.apellido}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {deuda.concepto} — ${deuda.monto_restante?.toLocaleString()}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`shrink-0 text-[10px] ml-2 ${
                          esVencido
                            ? 'bg-red-100 text-red-700'
                            : esHoy
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {esVencido
                          ? 'Vencido'
                          : esHoy
                          ? 'Hoy'
                          : format(fechaVencimiento, 'dd/MM', { locale: es })}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <CreditCard className="h-4 w-4 text-emerald-600" />
              </div>
              <CardTitle className="text-sm font-semibold">Actividad reciente</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {actividadReciente.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No hay actividad reciente</p>
              ) : (
                actividadReciente.map((deuda) => (
                  <div key={deuda.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full shrink-0"></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">Nueva deuda registrada</p>
                      <p className="text-xs text-gray-500 truncate">
                        {deuda.cliente.nombre} {deuda.cliente.apellido} — {deuda.concepto} — ${deuda.monto_total.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <CalendarIcon className="h-4 w-4 text-blue-600" />
            </div>
            <CardTitle className="text-sm font-semibold">Próximos eventos del calendario</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {proximosEventos.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No hay eventos próximos</p>
            ) : (
              proximosEventos.map((deuda) => (
                <div key={deuda.id} className="flex justify-between items-center p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {deuda.cliente.nombre} {deuda.cliente.apellido}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{deuda.concepto}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xs font-medium text-blue-600">
                      {format(new Date(deuda.fecha_vencimiento), 'dd/MM/yyyy', { locale: es })}
                    </p>
                    <p className="text-[11px] text-gray-400">
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
