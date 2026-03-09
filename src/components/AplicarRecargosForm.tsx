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
import { calcularRecargoPorDiasYMeses } from "@/lib/recargos";

interface AplicarRecargosFormProps {
  deudas: DeudaConCliente[];
  onRecargosAplicados?: () => void;
}

export function AplicarRecargosForm({ deudas, onRecargosAplicados }: AplicarRecargosFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Filtrar deudas vencidas que pueden recibir recargo (no aplicado hoy para no duplicar)
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);
  const hoyInicio = new Date(hoy);
  hoyInicio.setHours(0, 0, 0, 0);

  const deudasVencidas = deudas.filter(deuda => {
    const fechaVencimiento = new Date(deuda.fecha_vencimiento);
    fechaVencimiento.setHours(0, 0, 0, 0);
    const estaVencida = fechaVencimiento <= hoy;
    const yaAplicadoHoy = deuda.fecha_ultimo_recargo && (() => {
      const ultimo = new Date(deuda.fecha_ultimo_recargo);
      ultimo.setHours(0, 0, 0, 0);
      return ultimo.getTime() >= hoyInicio.getTime();
    })();
    return (deuda.estado === 'pendiente' || deuda.estado === 'vencido') &&
           deuda.monto_restante > 0 &&
           estaVencida &&
           !yaAplicadoHoy;
  });

  const aplicarRecargosAutomaticos = async () => {
    setLoading(true);
    try {
      console.log('Aplicando recargos automáticos (0,5% por día + 10% cada 30 días) a', deudasVencidas.length, 'deudas');

      let recargosAplicados = 0;
      const hasta = new Date();
      hasta.setHours(23, 59, 59, 999);

      for (const deuda of deudasVencidas) {
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
          console.log(`Aplicando recargo a deuda ${deuda.id}:`, {
            montoActual: deuda.monto_total,
            recargoTotal: montoTotalRecargos,
            nuevoTotal: nuevoMontoTotal
          });

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
        description: `Se aplicaron recargos a ${recargosAplicados} deudas vencidas`,
      });

      setOpen(false);
      onRecargosAplicados?.();
    } catch (error) {
      console.error('Error aplicando recargos:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron aplicar los recargos automáticos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const aplicarRecargoManual = async (deudaId: string, montoRecargo: number, deuda: DeudaConCliente) => {
    try {
      const nuevoMontoTotal = deuda.monto_total + montoRecargo;

      console.log(`Aplicando recargo manual a deuda ${deudaId}:`, {
        montoOriginal: deuda.monto_total,
        montoRestante: deuda.monto_restante,
        recargo: montoRecargo,
        nuevoTotal: nuevoMontoTotal
      });

      // Solo actualizar campos que se pueden modificar, monto_restante se calcula automáticamente
      const { error } = await supabase
        .from('deudas')
        .update({
          recargos: deuda.recargos + montoRecargo,
          monto_total: nuevoMontoTotal,
          estado: 'vencido',
          fecha_ultimo_recargo: new Date().toISOString()
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
        <Button variant="outline" size="sm" className="text-amber-600 hover:text-amber-700 border-amber-200 hover:bg-amber-50 h-9">
          <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
          Recargos ({deudasVencidas.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-base">Aplicar Recargos</DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">{deudasVencidas.length} deudas vencidas · 0,5% diario + 10% cada 30 días</p>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50/80 border border-amber-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Recargos automáticos</p>
              <p className="text-xs text-gray-500 mt-0.5">Aplica a todas las deudas vencidas de una vez</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 shadow-sm h-8" disabled={loading}>
                  <Calculator className="h-3.5 w-3.5 mr-1.5" />
                  {loading ? 'Aplicando...' : 'Aplicar todas'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Aplicar recargos automáticos?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se aplicarán recargos a {deudasVencidas.length} deudas vencidas. Los montos se actualizarán. No se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={aplicarRecargosAutomaticos} className="bg-amber-600 hover:bg-amber-700">
                    Aplicar Recargos
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Detalle por deuda</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    <th className="text-left font-medium text-gray-500 text-[10px] uppercase tracking-wider px-3 py-2">Cliente / Concepto</th>
                    <th className="text-center font-medium text-gray-500 text-[10px] uppercase tracking-wider px-3 py-2">Días</th>
                    <th className="text-right font-medium text-gray-500 text-[10px] uppercase tracking-wider px-3 py-2">Deuda</th>
                    <th className="text-right font-medium text-gray-500 text-[10px] uppercase tracking-wider px-3 py-2">Recargo</th>
                    <th className="text-right font-medium text-gray-500 text-[10px] uppercase tracking-wider px-3 py-2 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {deudasVencidas.map((deuda) => {
                    const fechaVencimiento = new Date(deuda.fecha_vencimiento);
                    fechaVencimiento.setHours(0, 0, 0, 0);
                    const hasta = new Date();
                    hasta.setHours(23, 59, 59, 999);
                    let fechaDesde: Date;
                    if (deuda.fecha_ultimo_recargo) {
                      fechaDesde = new Date(deuda.fecha_ultimo_recargo);
                      fechaDesde.setHours(0, 0, 0, 0);
                      fechaDesde.setDate(fechaDesde.getDate() + 1);
                    } else {
                      fechaDesde = new Date(fechaVencimiento);
                    }
                    const baseParaRecargo = deuda.monto_restante ?? deuda.monto_total;
                    const montoRecargo = calcularRecargoPorDiasYMeses(baseParaRecargo, fechaDesde, hasta);
                    const diasVencido = Math.max(0, Math.ceil((hasta.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24)));
                    const simb = MONEDAS[deuda.moneda as keyof typeof MONEDAS]?.simbolo || '$';

                    return (
                      <tr key={deuda.id} className="hover:bg-gray-50/50 group">
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-gray-900">{deuda.cliente.nombre} {deuda.cliente.apellido}</p>
                          <p className="text-gray-500 mt-0.5">{deuda.concepto}</p>
                          <p className="text-gray-400 mt-0.5">Vencía: {fechaVencimiento.toLocaleDateString('es-AR')}</p>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Badge variant="secondary" className="text-[9px] bg-red-100 text-red-700">
                            {diasVencido}d
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-700 font-medium">{simb}{deuda.monto_restante.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right text-amber-600 font-semibold">{simb}{montoRecargo.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-gray-400 hover:text-amber-600 opacity-60 group-hover:opacity-100 transition-opacity">
                                Aplicar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Aplicar recargo individual?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Se aplicará un recargo de {simb}{montoRecargo.toLocaleString()} a la deuda de {deuda.cliente.nombre} {deuda.cliente.apellido}. No se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => aplicarRecargoManual(deuda.id, montoRecargo, deuda)} className="bg-amber-600 hover:bg-amber-700">
                                  Aplicar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
