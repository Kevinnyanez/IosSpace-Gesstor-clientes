import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Save,
  Percent,
  Calendar,
  DollarSign,
  AlertTriangle,
  Trash2,
  TrashIcon,
  RefreshCw,
  Zap,
  Loader2,
} from "lucide-react";
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
        const { error } = await supabase
          .from('configuracion')
          .update(formData)
          .eq('id', config.id);

        if (error) throw error;
      } else {
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
      const { data: deudasVencidas, error: deudasError } = await supabase
        .from('deudas')
        .select(`
          *,
          cliente:clientes(*)
        `)
        .in('estado', ['pendiente', 'vencido'])
        .gt('monto_restante', 0);

      if (deudasError) throw deudasError;

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

          if (error) throw error;
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
      const { data: deudasVencidas, error: deudasError } = await supabase
        .from('deudas')
        .select(`
          *,
          cliente:clientes(*)
        `)
        .in('estado', ['pendiente', 'vencido'])
        .gt('monto_restante', 0);

      if (deudasError) throw deudasError;

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
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - 30);
      
      const { error } = await supabase
        .from('historial_pagos')
        .delete()
        .lt('created_at', fechaLimite.toISOString());

      if (error) throw error;

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
      const { error } = await supabase
        .from('historial_pagos')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

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
      <div className="flex items-center justify-center h-full p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" />
            Configuración
          </h1>
          <p className="text-sm text-gray-500">Parámetros generales y acciones del sistema</p>
        </div>
      </div>

      {/* Configuración General */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Settings className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">Configuración general</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">Parámetros de recargos y moneda</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="porcentaje_recargo" className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5" />
                  Recargo (%)
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
                  className="h-9"
                />
                <p className="text-[11px] text-gray-400">Porcentaje aplicado a deudas vencidas</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dias_para_recargo" className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Días para recargo
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
                  className="h-9"
                />
                <p className="text-[11px] text-gray-400">Días tras el vencimiento (0 = inmediato)</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="moneda_default" className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  Moneda
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
                  className="h-9"
                />
                <p className="text-[11px] text-gray-400">ARS, USD, EUR, etc.</p>
              </div>
            </div>

            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
                : <><Save className="h-4 w-4 mr-2" />Guardar configuración</>
              }
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Acciones — Recargos */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-base">Recargos</CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">Aplicar o recalcular recargos de deudas vencidas</p>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0 text-[10px] bg-amber-100 text-amber-700">Acciones</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Aplicar recargos */}
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Aplicar recargos pendientes</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Aplica recargos automáticamente a las deudas que superaron el período de gracia. Usa el sistema de 0,5% por día + 10% cada 30 días.
              </p>
            </div>
            <Button
              onClick={aplicarRecargos}
              disabled={aplicandoRecargos}
              variant="outline"
              className="w-full sm:w-auto border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
            >
              {aplicandoRecargos
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Aplicando...</>
                : <><Zap className="h-4 w-4 mr-2" />Aplicar recargos vencidos</>
              }
            </Button>
          </div>

          {/* Recalcular todos */}
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Recalcular todos los recargos</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Recalcula todos los recargos desde la fecha de vencimiento original. Sobrescribe los recargos actuales con el cálculo correcto desde el inicio.
              </p>
              <p className="text-[11px] text-amber-600 font-medium mt-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Esta acción puede modificar los montos de las deudas.
              </p>
            </div>
            <Button
              onClick={recalcularTodosLosRecargos}
              disabled={recalculandoRecargos}
              variant="outline"
              className="w-full sm:w-auto border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
            >
              {recalculandoRecargos
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Recalculando...</>
                : <><RefreshCw className="h-4 w-4 mr-2" />Recalcular todos</>
              }
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Acciones — Historial */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <CardTitle className="text-base">Historial de pagos</CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">Eliminar registros del historial</p>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0 text-[10px] bg-red-100 text-red-700">Peligro</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Limpiar +30 días */}
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Limpiar registros antiguos</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Elimina los registros de pagos con más de 30 días de antigüedad.
              </p>
            </div>
            <Button
              onClick={limpiarHistorial}
              disabled={limpiandoHistorial || limpiandoTodoHistorial}
              variant="outline"
              className="w-full sm:w-auto border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              {limpiandoHistorial
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Limpiando...</>
                : <><Trash2 className="h-4 w-4 mr-2" />Limpiar historial (30+ días)</>
              }
            </Button>
          </div>

          {/* Eliminar TODO */}
          <div className="rounded-lg border border-red-100 bg-red-50/40 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Eliminar todo el historial</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Elimina absolutamente todos los registros del historial de pagos. Esta acción no se puede deshacer.
              </p>
            </div>
            <Button
              onClick={limpiarTodoHistorial}
              disabled={limpiandoHistorial || limpiandoTodoHistorial}
              variant="destructive"
              className="w-full sm:w-auto"
            >
              {limpiandoTodoHistorial
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Eliminando todo...</>
                : <><TrashIcon className="h-4 w-4 mr-2" />Eliminar TODO el historial</>
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
