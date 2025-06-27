
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, DollarSign, AlertTriangle } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay, addDays, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import type { DeudaConCliente } from "@/types";

export function CalendarioPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [deudas, setDeudas] = useState<DeudaConCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDeudas();
  }, []);

  const fetchDeudas = async () => {
    try {
      const { data, error } = await supabase
        .from('deudas')
        .select(`
          *,
          cliente:clientes(*)
        `)
        .eq('estado', 'pendiente')
        .order('fecha_vencimiento', { ascending: true });

      if (error) throw error;
      setDeudas(data || []);
    } catch (error) {
      console.error('Error fetching deudas:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las deudas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar deudas por fecha seleccionada
  const deudasDelDia = deudas.filter(deuda =>
    isSameDay(new Date(deuda.fecha_vencimiento), selectedDate)
  );

  // Obtener fechas con deudas para resaltar en el calendario
  const fechasConDeudas = deudas.map(deuda => new Date(deuda.fecha_vencimiento));

  // Estadísticas del mes actual
  const inicioMes = startOfMonth(selectedDate);
  const finMes = endOfMonth(selectedDate);
  
  const deudasDelMes = deudas.filter(deuda => {
    const fechaVencimiento = new Date(deuda.fecha_vencimiento);
    return fechaVencimiento >= inicioMes && fechaVencimiento <= finMes;
  });

  const montoTotalMes = deudasDelMes.reduce((sum, deuda) => sum + deuda.monto_restante, 0);
  const deudasVencidasMes = deudasDelMes.filter(deuda => 
    new Date(deuda.fecha_vencimiento) < new Date()
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-lg">Cargando calendario...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendario de Vencimientos</h1>
          <p className="text-gray-600 mt-2">Visualiza las fechas de vencimiento de las deudas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Deudas del Mes</CardTitle>
            <CalendarIcon className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{deudasDelMes.length}</div>
            <p className="text-xs text-gray-600 mt-1">
              {format(selectedDate, 'MMMM yyyy', { locale: es })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Monto del Mes</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${montoTotalMes.toLocaleString()}
            </div>
            <p className="text-xs text-gray-600 mt-1">total a cobrar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Vencidas</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{deudasVencidasMes.length}</div>
            <p className="text-xs text-gray-600 mt-1">deudas vencidas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Calendario</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={es}
              className="rounded-md border"
              modifiers={{
                deuda: fechasConDeudas,
              }}
              modifiersStyles={{
                deuda: { 
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  fontWeight: 'bold'
                }
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Deudas del {format(selectedDate, 'dd/MM/yyyy', { locale: es })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deudasDelDia.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No hay deudas programadas para esta fecha
              </p>
            ) : (
              <div className="space-y-3">
                {deudasDelDia.map((deuda) => (
                  <div key={deuda.id} className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">
                          {deuda.cliente.nombre} {deuda.cliente.apellido}
                        </h3>
                        <p className="text-sm text-gray-600">{deuda.concepto}</p>
                        <p className="text-lg font-bold text-orange-600 mt-1">
                          ${deuda.monto_restante.toLocaleString()}
                        </p>
                      </div>
                      <Badge 
                        variant={new Date(deuda.fecha_vencimiento) < new Date() ? "destructive" : "default"}
                      >
                        {new Date(deuda.fecha_vencimiento) < new Date() ? "Vencida" : "Pendiente"}
                      </Badge>
                    </div>
                    {deuda.cliente.telefono && (
                      <div className="mt-2 text-sm text-gray-500">
                        📞 {deuda.cliente.telefono}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
