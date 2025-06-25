
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Clock, User, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { DeudaConCliente } from "@/types";

interface EventoCalendario {
  id: string;
  titulo: string;
  fecha: Date;
  tipo: 'vencimiento' | 'vencido' | 'proximo_vencimiento';
  descripcion: string;
  cliente: string;
  monto: number;
}

export function CalendarioPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [stats, setStats] = useState({
    vencimientos: 0,
    vencidos: 0,
    proximosVencimientos: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchEventosDeudas();
  }, []);

  const fetchEventosDeudas = async () => {
    try {
      const hoy = new Date();
      const enUnMes = new Date();
      enUnMes.setMonth(enUnMes.getMonth() + 1);

      const { data, error } = await supabase
        .from('deudas')
        .select(`
          *,
          cliente:clientes(*)
        `)
        .neq('estado', 'pagado')
        .lte('fecha_vencimiento', enUnMes.toISOString().split('T')[0])
        .order('fecha_vencimiento');

      if (error) throw error;

      const eventosGenerados: EventoCalendario[] = [];
      let vencimientos = 0;
      let vencidos = 0;
      let proximosVencimientos = 0;

      data?.forEach((deuda) => {
        const fechaVencimiento = new Date(deuda.fecha_vencimiento);
        const esVencido = fechaVencimiento < hoy;
        const esHoy = fechaVencimiento.toDateString() === hoy.toDateString();
        const esProximo = fechaVencimiento > hoy && fechaVencimiento <= enUnMes;

        let tipo: 'vencimiento' | 'vencido' | 'proximo_vencimiento';
        if (esVencido) {
          tipo = 'vencido';
          vencidos++;
        } else if (esHoy) {
          tipo = 'vencimiento';
          vencimientos++;
        } else {
          tipo = 'proximo_vencimiento';
          proximosVencimientos++;
        }

        eventosGenerados.push({
          id: deuda.id,
          titulo: `${esVencido ? 'VENCIDO - ' : esHoy ? 'VENCE HOY - ' : 'Vencimiento - '}${deuda.cliente.nombre} ${deuda.cliente.apellido}`,
          fecha: fechaVencimiento,
          tipo,
          descripcion: `${deuda.concepto} - $${deuda.monto_restante.toLocaleString()}`,
          cliente: `${deuda.cliente.nombre} ${deuda.cliente.apellido}`,
          monto: deuda.monto_restante
        });
      });

      setEventos(eventosGenerados);
      setStats({ vencimientos, vencidos, proximosVencimientos });

    } catch (error) {
      console.error('Error fetching eventos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los eventos",
        variant: "destructive",
      });
    }
  };

  const getEventBadge = (tipo: string) => {
    const tipos = {
      'vencido': { color: 'bg-red-100 text-red-700', icon: AlertTriangle },
      'vencimiento': { color: 'bg-orange-100 text-orange-700', icon: Clock },
      'proximo_vencimiento': { color: 'bg-blue-100 text-blue-700', icon: CalendarIcon }
    };
    return tipos[tipo as keyof typeof tipos] || tipos.proximo_vencimiento;
  };

  // Filtrar eventos para mostrar solo los más próximos (próximos 30 días)
  const eventosProximos = eventos
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
    .slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendario de Vencimientos</h1>
          <p className="text-gray-600 mt-2">Gestiona fechas de vencimiento y eventos importantes</p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700" onClick={fetchEventosDeudas}>
          <CalendarIcon className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Calendario</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border pointer-events-auto"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos Vencimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {eventosProximos.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No hay vencimientos próximos</p>
              ) : (
                eventosProximos.map((evento) => {
                  const badge = getEventBadge(evento.tipo);
                  const Icon = badge.icon;
                  return (
                    <div key={evento.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${badge.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{evento.titulo}</h3>
                            <p className="text-sm text-gray-600">{evento.descripcion}</p>
                          </div>
                        </div>
                        <Badge className={badge.color} variant="outline">
                          ${evento.monto.toLocaleString()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                        <CalendarIcon className="h-4 w-4" />
                        {evento.fecha.toLocaleDateString('es-AR')}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen de Vencimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.vencidos}</p>
                  <p className="text-sm text-red-700">Vencidos</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold text-orange-600">{stats.vencimientos}</p>
                  <p className="text-sm text-orange-700">Vencen Hoy</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">{stats.proximosVencimientos}</p>
                  <p className="text-sm text-blue-700">Próximos 30 días</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
