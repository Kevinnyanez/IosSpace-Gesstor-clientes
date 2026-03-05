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

      // Filtrar las que están vencidas y no tienen recargo reciente
      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999); // Incluir todo el día de hoy

      // Usar la configuración de días para recargo (por defecto 30)
      const diasParaRecargo = formData.dias_para_recargo || 30;
      const limiteRecargoMs = diasParaRecargo * 24 * 60 * 60 * 1000;
      
      const deudasParaRecargo = deudasVencidas?.filter(deuda => {
        const fechaVencimiento = new Date(deuda.fecha_vencimiento);
        fechaVencimiento.setHours(0, 0, 0, 0);
        
        // Verificar si ya tiene recargo reciente (según la configuración de días)
        const tieneRecargoReciente = deuda.fecha_ultimo_recargo && 
          new Date(deuda.fecha_ultimo_recargo) > new Date(Date.now() - limiteRecargoMs);
        
        const estaVencida = fechaVencimiento <= hoy;
        
        console.log(`Deuda ${deuda.id}:`, {
          fechaVencimiento: fechaVencimiento.toISOString(),
          hoy: hoy.toISOString(),
          estaVencida,
          tieneRecargoReciente
        });
        
        return estaVencida && !tieneRecargoReciente;
      }) || [];

      console.log('Deudas encontradas para recargo:', deudasParaRecargo.length);

      if (deudasParaRecargo.length === 0) {
        toast({
          title: "Sin deudas para recargo",
          description: "No se encontraron deudas vencidas sin recargo aplicado recientemente",
        });
        return;
      }

      // Aplicar recargos individualmente
      let recargosAplicados = 0;
      for (const deuda of deudasParaRecargo) {
        const fechaVencimiento = new Date(deuda.fecha_vencimiento);
        fechaVencimiento.setHours(0, 0, 0, 0);
        const hoy = new Date();
        hoy.setHours(23, 59, 59, 999);
        
        // Determinar desde cuándo calcular los recargos pendientes
        let fechaBaseRecargo: Date;
        if (deuda.fecha_ultimo_recargo) {
          // Si ya tiene recargo, calcular desde la fecha del último recargo
          fechaBaseRecargo = new Date(deuda.fecha_ultimo_recargo);
          fechaBaseRecargo.setHours(0, 0, 0, 0);
        } else {
          // Si no tiene recargo, calcular desde la fecha de vencimiento
          fechaBaseRecargo = new Date(fechaVencimiento);
        }
        
        // Calcular cuántos períodos de recargo han pasado
        const diasDesdeBase = Math.floor((hoy.getTime() - fechaBaseRecargo.getTime()) / (1000 * 60 * 60 * 24));
        const periodosRecargo = Math.floor(diasDesdeBase / diasParaRecargo);
        
        // Aplicar recargos acumulativos por cada período
        let montoTotalRecargos = 0;
        let montoActual = deuda.monto_restante;
        
        for (let i = 0; i < periodosRecargo; i++) {
          const montoRecargoPeriodo = Math.round((montoActual * formData.porcentaje_recargo) / 100);
          montoTotalRecargos += montoRecargoPeriodo;
          montoActual += montoRecargoPeriodo; // El siguiente recargo se calcula sobre el monto ya incrementado
        }
        
        if (montoTotalRecargos > 0) {
          const nuevoMontoTotal = deuda.monto_total + montoTotalRecargos;

          // Solo actualizar campos que se pueden modificar, monto_restante se calcula automáticamente
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
        description: `Se aplicaron recargos a ${recargosAplicados} deudas vencidas según la configuración actual`,
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
    if (!confirm('¿Estás seguro de recalcular TODOS los recargos desde la fecha de vencimiento? Esto recalculará los recargos de todas las deudas vencidas desde su fecha original, aplicando todos los períodos que correspondan. Esta acción puede modificar significativamente los montos.')) {
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
      const diasParaRecargo = formData.dias_para_recargo || 30;
      
      // Filtrar solo las que están vencidas
      const deudasParaRecalcular = deudasVencidas?.filter(deuda => {
        const fechaVencimiento = new Date(deuda.fecha_vencimiento);
        fechaVencimiento.setHours(0, 0, 0, 0);
        return fechaVencimiento <= hoy;
      }) || [];

      console.log('Deudas encontradas para recalcular:', deudasParaRecalcular.length);

      if (deudasParaRecalcular.length === 0) {
        toast({
          title: "Sin deudas para recalcular",
          description: "No se encontraron deudas vencidas",
        });
        return;
      }

      // Recalcular recargos para cada deuda desde su fecha de vencimiento
      let deudasRecalculadas = 0;
      for (const deuda of deudasParaRecalcular) {
        // Parsear la fecha de vencimiento correctamente
        // La fecha viene en formato YYYY-MM-DD desde la base de datos
        const fechaVencimientoStr = deuda.fecha_vencimiento;
        const fechaVencimiento = new Date(fechaVencimientoStr + 'T00:00:00'); // Agregar hora para evitar problemas de zona horaria
        fechaVencimiento.setHours(0, 0, 0, 0);
        
        // Asegurar que hoy también esté en la misma zona horaria
        const hoyNormalizado = new Date(hoy);
        hoyNormalizado.setHours(0, 0, 0, 0);
        
        // Calcular cuántos períodos han pasado desde el vencimiento
        // dias_para_recargo es el período entre recargos (cada X días se aplica un recargo)
        const diasVencidos = Math.floor((hoyNormalizado.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24));
        
        // Si diasParaRecargo es 0, usar 30 días como período por defecto
        const periodoRecargo = diasParaRecargo > 0 ? diasParaRecargo : 30;
        const periodosRecargo = Math.floor(diasVencidos / periodoRecargo);
        
        // Log adicional para debugging de fechas
        if (diasVencidos < 0) {
          console.warn(`Deuda ${deuda.id}: Fecha de vencimiento en el futuro`, {
            fechaVencimiento_original: fechaVencimientoStr,
            fechaVencimiento_calculada: fechaVencimiento.toISOString(),
            hoy: hoyNormalizado.toISOString(),
            diasVencidos: diasVencidos
          });
        }
        
        const clienteNombre = (deuda.cliente as any)?.nombre || (typeof deuda.cliente === 'object' && deuda.cliente !== null ? (deuda.cliente as any).nombre : 'N/A');
        const concepto = deuda.concepto || 'Sin concepto';
        
        // Log detallado expandido
        const logData = {
          id: deuda.id,
          cliente: clienteNombre,
          concepto: concepto,
          fechaVencimiento_original: deuda.fecha_vencimiento,
          fechaVencimiento_calculada: fechaVencimiento.toISOString(),
          fechaVencimiento_formato: fechaVencimiento.toLocaleDateString('es-AR'),
          hoy_calculado: hoy.toISOString(),
          hoy_formato: hoy.toLocaleDateString('es-AR'),
          diasVencidos: diasVencidos,
          diasParaRecargo: diasParaRecargo,
          periodosRecargo: periodosRecargo,
          monto_total: deuda.monto_total,
          recargos_actuales: deuda.recargos,
          monto_restante: deuda.monto_restante,
          monto_abonado: deuda.monto_abonado,
          estado: deuda.estado,
          moneda: deuda.moneda
        };
        console.log(`Deuda ${deuda.id} - Cliente: ${clienteNombre} - Concepto: ${concepto}:`, logData);
        
        if (periodosRecargo <= 0) {
          console.log(`Deuda ${deuda.id}: No se aplica recargo (periodos: ${periodosRecargo}, diasVencidos: ${diasVencidos}, diasParaRecargo: ${diasParaRecargo})`);
          continue; // No aplicar recargo si no ha pasado un período completo
        }

        // Obtener el monto original sin recargos (monto_total - recargos actuales)
        const montoOriginal = deuda.monto_total - deuda.recargos;
        // El monto restante original es: monto_original - monto_abonado
        // Porque monto_restante = monto_total - monto_abonado
        // y monto_total = monto_original + recargos
        // entonces: monto_restante = (monto_original + recargos) - monto_abonado
        // por lo tanto: monto_restante_original = monto_restante - recargos = monto_original - monto_abonado
        const montoRestanteOriginal = deuda.monto_restante - deuda.recargos;
        
        // Si el monto restante original es negativo o cero, significa que ya está pagado
        if (montoRestanteOriginal <= 0) {
          console.log(`Deuda ${deuda.id}: Ya está pagada completamente, no se aplican recargos`);
          continue;
        }
        
        const calculoData = {
          montoOriginal: montoOriginal,
          monto_abonado: deuda.monto_abonado,
          monto_restante_actual: deuda.monto_restante,
          montoRestanteOriginal: montoRestanteOriginal,
          porcentajeRecargo: formData.porcentaje_recargo,
          periodos_a_aplicar: periodosRecargo
        };
        console.log(`Deuda ${deuda.id} - Cálculo de recargos:`, calculoData);
        
        // Calcular recargos acumulativos desde el monto original
        // IMPORTANTE: Los recargos se calculan sobre el monto restante ORIGINAL (sin recargos previos)
        // porque estamos recalculando TODOS los recargos desde cero
        let montoTotalRecargos = 0;
        let montoActual = montoRestanteOriginal;
        
        for (let i = 0; i < periodosRecargo; i++) {
          const montoRecargoPeriodo = Math.round((montoActual * formData.porcentaje_recargo) / 100);
          montoTotalRecargos += montoRecargoPeriodo;
          montoActual += montoRecargoPeriodo; // El siguiente recargo se calcula sobre el monto ya incrementado
          console.log(`Deuda ${deuda.id} - Período ${i + 1}:`, {
            montoAntes: montoActual - montoRecargoPeriodo,
            recargoPeriodo: montoRecargoPeriodo,
            montoDespues: montoActual,
            recargoAcumulado: montoTotalRecargos
          });
        }
        
        // Actualizar la deuda con los nuevos recargos calculados desde el vencimiento
        const nuevoMontoTotal = montoOriginal + montoTotalRecargos;
        
        const resultadoData = {
          recargosAnteriores: deuda.recargos,
          recargosNuevos: montoTotalRecargos,
          diferencia: montoTotalRecargos - deuda.recargos,
          monto_total_anterior: deuda.monto_total,
          monto_total_nuevo: nuevoMontoTotal
        };
        console.log(`Deuda ${deuda.id} - Resultado final:`, resultadoData);

        // Validar que los valores sean números válidos
        if (isNaN(montoTotalRecargos) || isNaN(nuevoMontoTotal) || montoTotalRecargos < 0 || nuevoMontoTotal < 0) {
          console.error(`Deuda ${deuda.id}: Valores inválidos`, {
            montoTotalRecargos,
            nuevoMontoTotal,
            montoOriginal,
            montoRestanteOriginal
          });
          continue;
        }

        // Formatear valores para evitar problemas de precisión decimal
        const recargosFormateado = parseFloat(montoTotalRecargos.toFixed(2));
        const montoTotalFormateado = parseFloat(nuevoMontoTotal.toFixed(2));
        
        // Validar que los valores formateados sean válidos
        if (isNaN(recargosFormateado) || isNaN(montoTotalFormateado)) {
          console.error(`Deuda ${deuda.id}: Error al formatear valores`, {
            recargosFormateado,
            montoTotalFormateado,
            montoTotalRecargos,
            nuevoMontoTotal
          });
          continue;
        }

        const updateData: {
          recargos: number;
          monto_total: number;
          estado?: string;
          fecha_ultimo_recargo?: string;
        } = {
          recargos: recargosFormateado,
          monto_total: montoTotalFormateado
        };

        // Solo actualizar estado y fecha_ultimo_recargo si hay recargos nuevos
        if (montoTotalRecargos > 0) {
          updateData.estado = 'vencido';
          updateData.fecha_ultimo_recargo = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
        }

        console.log(`Deuda ${deuda.id} - Actualizando con:`, updateData);

        const { error } = await supabase
          .from('deudas')
          .update(updateData)
          .eq('id', deuda.id);

        if (error) {
          console.error(`Error actualizando deuda ${deuda.id}:`, error);
          console.error('Datos que se intentaron actualizar:', updateData);
          console.error('Datos de la deuda:', {
            id: deuda.id,
            monto_total: deuda.monto_total,
            recargos: deuda.recargos,
            monto_restante: deuda.monto_restante,
            estado: deuda.estado
          });
          // Continuar con la siguiente deuda en lugar de fallar todo
          continue;
        }
        
        deudasRecalculadas++;
      }
      
      toast({
        title: "Recargos recalculados",
        description: `Se recalcularon los recargos de ${deudasRecalculadas} deudas vencidas desde su fecha de vencimiento original`,
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
