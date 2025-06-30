
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, Percent, Calendar, DollarSign, AlertTriangle, Trash2, TrashIcon, Info, Users, Calculator, TrendingUp, Shield, HelpCircle } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Configuracion } from "@/types";

export function ConfiguracionPage() {
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aplicandoRecargos, setAplicandoRecargos] = useState(false);
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
        .eq('estado', 'pendiente')
        .gt('monto_restante', 0);

      if (deudasError) {
        console.error('Error obteniendo deudas:', deudasError);
        throw deudasError;
      }

      // Filtrar las que están vencidas y no tienen recargo reciente
      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999); // Incluir todo el día de hoy
      
      const deudasParaRecargo = deudasVencidas?.filter(deuda => {
        const fechaVencimiento = new Date(deuda.fecha_vencimiento);
        fechaVencimiento.setHours(0, 0, 0, 0);
        
        // Verificar si ya tiene recargo reciente (menos de 30 días)
        const tieneRecargoReciente = deuda.fecha_ultimo_recargo && 
          new Date(deuda.fecha_ultimo_recargo) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
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
        const montoRecargo = Math.round((deuda.monto_restante * formData.porcentaje_recargo) / 100);
        const nuevoMontoTotal = deuda.monto_total + montoRecargo;

        // Solo actualizar campos que se pueden modificar, monto_restante se calcula automáticamente
        const { error } = await supabase
          .from('deudas')
          .update({
            recargos: deuda.recargos + montoRecargo,
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

            <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
              <h3 className="font-semibold mb-2 text-blue-900">Información</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Los recargos se calculan sobre el monto restante de la deuda</p>
                <p>• Solo se aplican a deudas en estado "pendiente"</p>
                <p>• Una vez aplicado, el estado cambia a "vencido"</p>
                <p>• No se aplican recargos múltiples a la misma deuda</p>
                <p>• Las deudas deben estar vencidas según los días configurados</p>
                <p>• El historial se limpia automáticamente cada 30 días</p>
              </div>
            </div>

            {config && (
              <div className="p-4 border rounded-lg bg-gray-50">
                <h3 className="font-semibold mb-2">Estado Actual</h3>
                <div className="text-sm space-y-1">
                  <p><strong>Recargo:</strong> {config.porcentaje_recargo}%</p>
                  <p><strong>Días de gracia:</strong> {config.dias_para_recargo} días</p>
                  <p><strong>Moneda:</strong> {config.moneda_default}</p>
                  <p><strong>Última actualización:</strong> {new Date(config.updated_at).toLocaleString('es-AR')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Nueva sección de Recomendaciones */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            Recomendaciones y Guía de Uso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo y descripción principal */}
          <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex-shrink-0">
              <img 
                src="/lovable-uploads/139ccb2f-7ba1-4720-9a2e-04dbfc1f46a3.png" 
                alt="Logo del Sistema" 
                className="w-24 h-24 object-contain"
              />
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Sistema de Gestión de Deudas</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                Una aplicación web integral diseñada para la gestión eficiente de clientes, deudas, pagos e inventario. 
                Automatiza procesos financieros y proporciona herramientas completas para el control administrativo.
              </p>
            </div>
          </div>

          {/* Funcionalidades principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-green-50 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-green-900">Gestión de Clientes</h4>
              </div>
              <p className="text-sm text-green-800">
                Administra información completa de clientes, contactos y historial de transacciones de manera centralizada.
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-5 w-5 text-purple-600" />
                <h4 className="font-semibold text-purple-900">Control de Deudas</h4>
              </div>
              <p className="text-sm text-purple-800">
                Registra, monitorea y gestiona deudas con cálculo automático de recargos por vencimiento y seguimiento de pagos.
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-orange-50 border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                <h4 className="font-semibold text-orange-900">Inventario</h4>
              </div>
              <p className="text-sm text-orange-800">
                Controla stock, productos y categorías con alertas de inventario bajo y gestión de precios actualizada.
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">Automatización</h4>
              </div>
              <p className="text-sm text-blue-800">
                Aplica recargos automáticos, limpia historial y mantiene datos organizados con procesos programados.
              </p>
            </div>
          </div>

          {/* Recomendaciones de uso */}
          <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
            <h4 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Recomendaciones para el Uso Correcto
            </h4>
            <div className="space-y-2 text-sm text-yellow-800">
              <p>• <strong>Configuración inicial:</strong> Establece el porcentaje de recargo y días de gracia según tu política comercial</p>
              <p>• <strong>Registro regular:</strong> Mantén actualizada la información de clientes y deudas para un control preciso</p>
              <p>• <strong>Revisión periódica:</strong> Verifica el estado de las deudas y aplica recargos de manera consistente</p>
              <p>• <strong>Respaldo de datos:</strong> Realiza copias de seguridad regulares de la información importante</p>
              <p>• <strong>Limpieza de historial:</strong> Usa las herramientas de limpieza para mantener el rendimiento óptimo</p>
              <p>• <strong>Monitoreo de inventario:</strong> Revisa regularmente los niveles de stock y actualiza precios</p>
            </div>
          </div>

          {/* Soporte técnico */}
          <div className="p-4 border rounded-lg bg-gray-50 border-gray-300 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <HelpCircle className="h-5 w-5 text-gray-600" />
              <h4 className="font-semibold text-gray-900">Soporte Técnico</h4>
            </div>
            <p className="text-sm text-gray-700 mb-3">
              ¿Necesitas ayuda o tienes alguna consulta sobre el funcionamiento del sistema?
            </p>
            <p className="text-sm font-medium text-gray-900">
              Contacta con nuestro equipo de soporte técnico para obtener asistencia personalizada
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Disponible para resolver dudas, configuraciones avanzadas y mantenimiento del sistema
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
