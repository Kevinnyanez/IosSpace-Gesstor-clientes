
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calculator, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MONEDAS, type DeudaConCliente } from "@/types";

interface AplicarRecargosFormProps {
  deudas: DeudaConCliente[];
  onRecargosAplicados?: () => void;
}

export function AplicarRecargosForm({ deudas, onRecargosAplicados }: AplicarRecargosFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Filtrar deudas vencidas sin recargo aplicado
  const deudasVencidas = deudas.filter(deuda => {
    const fechaVencimiento = new Date(deuda.fecha_vencimiento);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Resetear horas para comparación de fechas
    fechaVencimiento.setHours(0, 0, 0, 0);
    
    return deuda.estado === 'pendiente' && 
           deuda.monto_restante > 0 && 
           deuda.recargos === 0 && 
           fechaVencimiento < hoy;
  });

  console.log('Deudas vencidas encontradas:', deudasVencidas.length);
  console.log('Deudas vencidas:', deudasVencidas);

  const aplicarRecargosAutomaticos = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('aplicar_recargos_vencidos');
      
      if (error) {
        console.error('Error en RPC:', error);
        throw error;
      }
      
      toast({
        title: "Recargos aplicados",
        description: "Se han aplicado recargos automáticos a las deudas vencidas",
      });

      setOpen(false);
      onRecargosAplicados?.();
    } catch (error) {
      console.error('Error aplicando recargos:', error);
      toast({
        title: "Error",
        description: "No se pudieron aplicar los recargos automáticos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const aplicarRecargoManual = async (deudaId: string, montoRecargo: number) => {
    try {
      const { error } = await supabase
        .from('deudas')
        .update({
          recargos: montoRecargo,
          estado: 'vencido'
        })
        .eq('id', deudaId);

      if (error) {
        console.error('Error actualizando deuda:', error);
        throw error;
      }

      toast({
        title: "Recargo aplicado",
        description: "Se aplicó el recargo manualmente a la deuda",
      });

      onRecargosAplicados?.();
    } catch (error) {
      console.error('Error aplicando recargo manual:', error);
      toast({
        title: "Error",
        description: "No se pudo aplicar el recargo",
        variant: "destructive",
      });
    }
  };

  // Si no hay deudas vencidas, no mostrar el botón
  if (deudasVencidas.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-orange-600 hover:text-orange-700 border-orange-300">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Aplicar Recargos ({deudasVencidas.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Aplicar Recargos a Deudas Vencidas
          </DialogTitle>
          <DialogDescription>
            Se encontraron {deudasVencidas.length} deudas vencidas sin recargo aplicado
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div>
              <h3 className="font-semibold text-orange-900">Recargos Automáticos</h3>
              <p className="text-sm text-orange-700">
                Aplica recargos según la configuración del sistema a todas las deudas vencidas
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="default" 
                  className="bg-orange-600 text-white hover:bg-orange-700"
                  disabled={loading}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  {loading ? 'Aplicando...' : 'Aplicar Automático'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Aplicar recargos automáticos?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción aplicará recargos automáticamente a {deudasVencidas.length} deudas vencidas 
                    según la configuración del sistema. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={aplicarRecargosAutomaticos}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Aplicar Recargos
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Deudas Vencidas Sin Recargo</h3>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {deudasVencidas.map((deuda) => {
                const fechaVencimiento = new Date(deuda.fecha_vencimiento);
                const hoy = new Date();
                const diasVencido = Math.ceil((hoy.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24));
                const porcentajeRecargo = 10; // Esto debería venir de la configuración
                const montoRecargo = Math.round((deuda.monto_restante * porcentajeRecargo) / 100);

                return (
                  <div key={deuda.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">
                          {deuda.cliente.nombre} {deuda.cliente.apellido}
                        </h4>
                        <Badge variant="destructive" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {diasVencido} días vencido
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{deuda.concepto}</p>
                      <div className="flex items-center gap-4 text-sm mt-1">
                        <span>Deuda: {MONEDAS[deuda.moneda as keyof typeof MONEDAS]?.simbolo || '$'}{deuda.monto_restante.toLocaleString()}</span>
                        <span className="text-orange-600 font-semibold">
                          Recargo: {MONEDAS[deuda.moneda as keyof typeof MONEDAS]?.simbolo || '$'}{montoRecargo.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Vencía: {fechaVencimiento.toLocaleDateString('es-AR')}
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700 border-orange-300">
                          Aplicar Recargo
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Aplicar recargo individual?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se aplicará un recargo de {MONEDAS[deuda.moneda as keyof typeof MONEDAS]?.simbolo || '$'}{montoRecargo.toLocaleString()} 
                            a la deuda de {deuda.cliente.nombre} {deuda.cliente.apellido}. Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => aplicarRecargoManual(deuda.id, montoRecargo)}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            Aplicar Recargo
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
