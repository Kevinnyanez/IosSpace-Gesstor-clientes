
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, Percent, Calendar, DollarSign, AlertTriangle } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Configuracion } from "@/types";

export function ConfiguracionPage() {
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aplicandoRecargos, setAplicandoRecargos] = useState(false);
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
      hoy.setHours(0, 0, 0, 0);
      
      const deudasParaRecargo = deudasVencidas?.filter(deuda => {
        const fechaVencimiento = new Date(deuda.fecha_vencimiento);
        fechaVencimiento.setHours(0, 0, 0, 0);
        
        // Verificar si ya tiene recargo reciente (menos de 30 días)
        const tieneRecargoReciente = deuda.fecha_ultimo_recargo && 
          new Date(deuda.fecha_ultimo_recargo) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        return fechaVencimiento <= hoy && !tieneRecargoReciente;
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
        const nuevoMontoRestante = deuda.monto_restante + montoRecargo;

        const { error } = await supabase
          .from('deudas')
          .update({
            recargos: deuda.recargos + montoRecargo,
            monto_total: nuevoMontoTotal,
            monto_restante: nuevoMontoRestante,
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

            <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
              <h3 className="font-semibold mb-2 text-blue-900">Información</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Los recargos se calculan sobre el monto restante de la deuda</p>
                <p>• Solo se aplican a deudas en estado "pendiente"</p>
                <p>• Una vez aplicado, el estado cambia a "vencido"</p>
                <p>• No se aplican recargos múltiples a la misma deuda</p>
                <p>• Las deudas deben estar vencidas según los días configurados</p>
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
    </div>
  );
}
