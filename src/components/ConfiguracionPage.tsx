import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, Percent, Calendar, DollarSign, AlertTriangle, Trash2, TrashIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Configuracion } from "@/types";
import { calcularRecargoPorDiasYMeses } from "@/lib/recargos";

export function ConfiguracionPage() {
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aplicandoRecargos, setAplicandoRecargos] = useState(false);
  const [recalculandoRecargos, setRecalculandoRecargos] = useState(false);
  const [limpiandoHistorial, setLimpiandoHistorial] = useState(false);
  const [limpiandoTodoHistorial, setLimpiandoTodoHistorial] = useState(false);
  const [formData, setFormData] = useState({
    porcentaje_recargo: 10,
    dias_para_recargo: 30,
    moneda_default: 'ARS'
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchConfiguracion();
  }, []);

  const fetchConfiguracion = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setConfig(data);
        setFormData({
          porcentaje_recargo: data.porcentaje_recargo,
          dias_para_recargo: data.dias_para_recargo,
          moneda_default: data.moneda_default
        });
      }
    } catch (error) {
      console.error('Error fetching configuracion:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la configuración",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (config) {
        // Actualizar configuración existente
        const { error } = await supabase
          .from('configuracion')
          .update(formData)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        // Crear nueva configuración
        const { error } = await supabase
          .from('configuracion')
          .insert(formData);

        if (error) throw error;
      }

      toast({
        title: "Configuración guardada",
        description: "Los cambios se han guardado correctamente",
      });

      fetchConfiguracion();
    } catch (error) {
      console.error('Error saving configuracion:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const aplicarRecargos = async () => {
    setAplicandoRecargos(true);
    try {
      console.log('Aplicando recargos desde configuración...');
      
      // Obtener deudas vencidas sin recargo reciente
      const { data: deudasVencidas, error: deudasError } = await supabase
        .from('deudas')
        .select(`
          *,
          cliente:clientes(*)
        `)
        .in('estado', ['pendiente', 'vencido'])
        .gt('monto_restante', 0);

      if (deudasError) {
        console.error('Error obteniendo deudas:', deudasError);
        throw deudasError;
      }

      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999);
      const hoyInicio = new Date(hoy);
      hoyInicio.setHours(0, 0, 0, 0);

      const deudasParaRecargo = deudasVencidas?.filter(deuda => {
        const fechaVencimiento = new Date(deuda.fecha_vencimiento);
        fechaVencimiento.setHours(0, 0, 0, 0);
        const estaVencida = fechaVencimiento <= hoy;
        const yaAplicadoHoy = deuda.fecha_ultimo_recargo && (() => {
          const ultimo = new Date(deuda.fecha_ultimo_recargo);
          ultimo.setHours(0, 0, 0, 0);
          return ultimo.getTime() >= hoyInicio.getTime();
        })();
        return estaVencida && !yaAplicadoHoy;
      }) || [];

      if (deudasParaRecargo.length === 0) {
        toast({
          title: "Sin deudas para recargo",
          description: "No hay deudas vencidas pendientes de recargo (0,5% por día + 10% cada 30 días).",
        });
        return;
      }

      let recargosAplicados = 0;
      const hasta = new Date();
      hasta.setHours(23, 59, 59, 999);

      for (const deuda of deudasParaRecargo) {
        const fechaVencimiento = new Date(deuda.fecha_vencimiento);
        fechaVencimiento.setHours(0, 0, 0, 0);

        let fechaDesde: Date;
        if (deuda.fecha_ultimo_recargo) {
          fechaDesde = new Date(deuda.fecha_ultimo_recargo);
          fechaDesde.setHours(0, 0, 0, 0);
          fechaDesde.setDate(fechaDesde.getDate() + 1);
        } else {
          fechaDesde = new Date(fechaVencimiento);
        }

        // Recargo sobre lo que aún debe (monto_restante), para tener en cuenta abonos
        const baseParaRecargo = deuda.monto_restante ?? deuda.monto_total;
        const montoTotalRecargos = calcularRecargoPorDiasYMeses(
          baseParaRecargo,
          fechaDesde,
          hasta
        );

        if (montoTotalRecargos > 0) {
          const nuevoMontoTotal = deuda.monto_total + montoTotalRecargos;
          const { error } = await supabase
            .from('deudas')
            .update({
              recargos: deuda.recargos + montoTotalRecargos,
              monto_total: nuevoMontoTotal,
              estado: 'vencido',
              fecha_ultimo_recargo: new Date().toISOString()
            })
            .eq('id', deuda.id);

          if (error) {
            console.error('Error actualizando deuda:', error);
            throw error;
          }
          recargosAplicados++;
        }
      }

      toast({
        title: "Recargos aplicados",
        description: `Se aplicaron recargos (0,5% por día + 10% cada 30 días) a ${recargosAplicados} deudas vencidas`,
      });
    } catch (error) {
      console.error('Error aplicando recargos:', error);
      toast({
        title: "Error",
        description: "No se pudieron aplicar los recargos. Verifique que existan deudas vencidas sin recargo reciente.",
        variant: "destructive",
      });
    } finally {
      setAplicandoRecargos(false);
    }
  };

  const recalcularTodosLosRecargos = async () => {
    if (!confirm('¿Recalcular TODOS los recargos desde la fecha de vencimiento? Se usará: 0,5% por día + 10% cada 30 días desde el vencimiento. Esta acción puede modificar los montos.')) {
      return;
    }

    setRecalculandoRecargos(true);
    try {
      console.log('Recalculando todos los recargos desde fecha de vencimiento...');
      
      // Obtener TODAS las deudas vencidas
      const { data: deudasVencidas, error: deudasError } = await supabase
        .from('deudas')
        .select(`
          *,
          cliente:clientes(*)
        `)
        .in('estado', ['pendiente', 'vencido'])
        .gt('monto_restante', 0);

      if (deudasError) {
        console.error('Error obteniendo deudas:', deudasError);
        throw deudasError;
      }

      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999);
      const hasta = new Date(hoy);

      const deudasParaRecalcular = deudasVencidas?.filter(deuda => {
        const fechaVencimiento = new Date(deuda.fecha_vencimiento);
        fechaVencimiento.setHours(0, 0, 0, 0);
        return fechaVencimiento <= hoy;
      }) || [];

      if (deudasParaRecalcular.length === 0) {
        toast({
          title: "Sin deudas para recalcular",
          description: "No se encontraron deudas vencidas",
        });
        return;
      }

      let deudasRecalculadas = 0;
      for (const deuda of deudasParaRecalcular) {
        const fechaVencimiento = new Date(deuda.fecha_vencimiento + 'T00:00:00');
        fechaVencimiento.setHours(0, 0, 0, 0);

        const diasVencidos = Math.floor((hasta.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24));
        if (diasVencidos < 0) continue;

        const montoOriginal = deuda.monto_total - deuda.recargos;
        const montoRestanteOriginal = deuda.monto_restante! - deuda.recargos;
        if (montoRestanteOriginal <= 0) continue;

        const montoTotalRecargos = calcularRecargoPorDiasYMeses(
          montoOriginal,
          fechaVencimiento,
          hasta
        );
        const nuevoMontoTotal = montoOriginal + montoTotalRecargos;

        if (isNaN(montoTotalRecargos) || isNaN(nuevoMontoTotal) || montoTotalRecargos < 0 || nuevoMontoTotal < 0) continue;

        const recargosFormateado = Math.round(montoTotalRecargos);
        const montoTotalFormateado = Math.round(nuevoMontoTotal);

        const updateData: {
          recargos: number;
          monto_total: number;
          estado?: string;
          fecha_ultimo_recargo?: string;
        } = {
          recargos: recargosFormateado,
          monto_total: montoTotalFormateado
        };
        if (montoTotalRecargos > 0) {
          updateData.estado = 'vencido';
          updateData.fecha_ultimo_recargo = new Date().toISOString().split('T')[0];
        }

        const { error } = await supabase
          .from('deudas')
          .update(updateData)
          .eq('id', deuda.id);

        if (error) {
          console.error(`Error actualizando deuda ${deuda.id}:`, error);
          continue;
        }
        deudasRecalculadas++;
      }

      toast({
        title: "Recargos recalculados",
        description: `Se recalcularon los recargos (0,5% por día + 10% cada 30 días) de ${deudasRecalculadas} deudas vencidas`,
      });
    } catch (error) {
      console.error('Error recalculando recargos:', error);
      toast({
        title: "Error",
        description: "No se pudieron recalcular los recargos. Verifique que existan deudas vencidas.",
        variant: "destructive",
      });
    } finally {
      setRecalculandoRecargos(false);
    }
  };

  const limpiarHistorial = async () => {
    setLimpiandoHistorial(true);
    try {
      console.log('Limpiando historial de pagos...');
      
      // Eliminar registros de historial_pagos más antiguos de 30 días
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - 30);
      
      const { data, error } = await supabase
        .from('historial_pagos')
        .delete()
        .lt('created_at', fechaLimite.toISOString());

      if (error) {
        console.error('Error limpiando historial:', error);
        throw error;
      }

      toast({
        title: "Historial limpiado",
        description: "Se eliminaron los registros de pagos anteriores a 30 días",
      });
    } catch (error) {
      console.error('Error limpiando historial:', error);
      toast({
        title: "Error",
        description: "No se pudo limpiar el historial de pagos",
        variant: "destructive",
      });
    } finally {
      setLimpiandoHistorial(false);
    }
  };

  const limpiarTodoHistorial = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar TODO el historial de pagos? Esta acción no se puede deshacer.')) {
      return;
    }

    setLimpiandoTodoHistorial(true);
    try {
      console.log('Limpiando todo el historial de pagos...');
      
      const { data, error } = await supabase
        .from('historial_pagos')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (error) {
        console.error('Error limpiando todo el historial:', error);
        throw error;
      }

      toast({
        title: "Historial completamente limpiado",
        description: "Se eliminaron todos los registros del historial de pagos",
      });
    } catch (error) {
      console.error('Error limpiando todo el historial:', error);
      toast({
        title: "Error",
        description: "No se pudo limpiar todo el historial de pagos",
        variant: "destructive",
      });
    } finally {
      setLimpiandoTodoHistorial(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-lg">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuración del Sistema</h1>
          <p className="text-gray-600 mt-2">Ajusta los parámetros generales de la aplicación</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración General
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label htmlFor="porcentaje_recargo" className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Porcentaje de Recargo (%)
                </Label>
                <Input
                  id="porcentaje_recargo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.porcentaje_recargo}
                  onChange={(e) => setFormData({
                    ...formData,
                    porcentaje_recargo: parseFloat(e.target.value) || 0
                  })}
                  placeholder="10.00"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Porcentaje que se aplicará como recargo a las deudas vencidas
                </p>
              </div>

              <div>
                <Label htmlFor="dias_para_recargo" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Días para Aplicar Recargo
                </Label>
                <Input
                  id="dias_para_recargo"
                  type="number"
                  min="0"
                  value={formData.dias_para_recargo}
                  onChange={(e) => setFormData({
                    ...formData,
                    dias_para_recargo: parseInt(e.target.value) || 0
                  })}
                  placeholder="30"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Cantidad de días después del vencimiento para aplicar recargo (0 = inmediato)
                </p>
              </div>

              <div>
                <Label htmlFor="moneda_default" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Moneda por Defecto
                </Label>
                <Input
                  id="moneda_default"
                  type="text"
                  value={formData.moneda_default}
                  onChange={(e) => setFormData({
                    ...formData,
                    moneda_default: e.target.value
                  })}
                  placeholder="ARS"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Código de la moneda utilizada en el sistema (ej: ARS, USD, EUR)
                </p>
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Acciones del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg border-orange-200 bg-orange-50">
              <h3 className="font-semibold mb-2 text-orange-900">Aplicar Recargos</h3>
              <p className="text-sm text-orange-800 mb-3">
                Aplica recargos automáticamente a las deudas que han superado el período de gracia según la configuración actual.
              </p>
              <Button 
                onClick={aplicarRecargos} 
                disabled={aplicandoRecargos}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                {aplicandoRecargos ? 'Aplicando Recargos...' : 'Aplicar Recargos Vencidos'}
              </Button>
            </div>

            <div className="p-4 border rounded-lg border-red-200 bg-red-50">
              <h3 className="font-semibold mb-2 text-red-900">Recalcular Todos los Recargos</h3>
              <p className="text-sm text-red-800 mb-3">
                <strong>⚠️ Acción importante:</strong> Recalcula TODOS los recargos de las deudas vencidas desde su fecha de vencimiento original, aplicando todos los períodos que correspondan. Esto sobrescribirá los recargos actuales con el cálculo correcto desde el inicio.
              </p>
              <Button 
                onClick={recalcularTodosLosRecargos} 
                disabled={recalculandoRecargos}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                {recalculandoRecargos ? 'Recalculando...' : 'Recalcular Todos los Recargos'}
              </Button>
            </div>

            <div className="p-4 border rounded-lg border-red-200 bg-red-50">
              <h3 className="font-semibold mb-2 text-red-900">Limpiar Historial</h3>
              <p className="text-sm text-red-800 mb-3">
                Elimina los registros del historial de pagos. Puedes elegir eliminar solo los antiguos (30+ días) o todo el historial.
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={limpiarHistorial} 
                  disabled={limpiandoHistorial || limpiandoTodoHistorial}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {limpiandoHistorial ? 'Limpiando...' : 'Limpiar Historial (30+ días)'}
                </Button>
                
                <Button 
                  onClick={limpiarTodoHistorial} 
                  disabled={limpiandoHistorial || limpiandoTodoHistorial}
                  variant="destructive"
                  className="w-full bg-red-800 hover:bg-red-900 text-white"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  {limpiandoTodoHistorial ? 'Eliminando Todo...' : 'Eliminar TODO el Historial'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
