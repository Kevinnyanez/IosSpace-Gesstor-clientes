
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, CreditCard } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { DeudaConCliente } from "@/types";
import { MONEDAS } from "@/types";

const pagoCompletoFormSchema = z.object({
  monto: z.number().min(0.01, "El monto debe ser mayor a 0"),
  fecha_pago: z.date({
    required_error: "La fecha de pago es obligatoria",
  }),
});

type PagoCompletoFormData = z.infer<typeof pagoCompletoFormSchema>;

interface PagoCompletoFormProps {
  deudas: DeudaConCliente[];
  onPagoCreated?: () => void;
}

export function PagoCompletoForm({ deudas, onPagoCreated }: PagoCompletoFormProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const montoTotalRestante = deudas.reduce((sum, deuda) => sum + deuda.monto_restante, 0);
  const conceptoBase = deudas[0]?.concepto.replace(/ - Cuota \d+\/\d+/, '') || '';
  const cliente = deudas[0]?.cliente;
  const moneda = deudas[0]?.moneda || 'ARS';
  
  const form = useForm<PagoCompletoFormData>({
    resolver: zodResolver(pagoCompletoFormSchema),
    defaultValues: {
      monto: montoTotalRestante,
      fecha_pago: new Date(),
    },
  });

  const onSubmit = async (data: PagoCompletoFormData) => {
    try {
      if (data.monto > montoTotalRestante) {
        toast({
          title: "Error",
          description: "El monto no puede ser mayor al saldo restante total",
          variant: "destructive",
        });
        return;
      }

      // Crear un pago para cada deuda
      const pagos = deudas.map(deuda => ({
        deuda_id: deuda.id,
        monto: deuda.monto_restante,
        fecha_pago: data.fecha_pago.toISOString().split('T')[0],
        moneda: deuda.moneda,
      }));

      const { error: pagoError } = await supabase
        .from('pagos')
        .insert(pagos);

      if (pagoError) throw pagoError;

      // Registrar todos los pagos en el historial
      const historialEntries = deudas.map(deuda => ({
        deuda_id: deuda.id,
        cliente_nombre: `${deuda.cliente.nombre} ${deuda.cliente.apellido}`,
        concepto: deuda.concepto,
        monto_pago: deuda.monto_restante,
        moneda: deuda.moneda,
        fecha_pago: data.fecha_pago.toISOString().split('T')[0],
      }));

      const { error: historialError } = await supabase
        .from('historial_pagos')
        .insert(historialEntries);

      if (historialError) throw historialError;

      // Actualizar todas las deudas como pagadas
      for (const deuda of deudas) {
        const { error: deudaError } = await supabase
          .from('deudas')
          .update({
            monto_abonado: deuda.monto_total,
            estado: 'pagado',
          })
          .eq('id', deuda.id);

        if (deudaError) throw deudaError;
      }

      toast({
        title: "Pago completo registrado",
        description: `Se han pagado todas las cuotas restantes (${deudas.length} cuotas)`,
      });

      form.reset();
      setOpen(false);
      onPagoCreated?.();
    } catch (error) {
      console.error('Error creating pago completo:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar el pago completo",
        variant: "destructive",
      });
    }
  };

  if (deudas.length === 0 || montoTotalRestante <= 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-8">
          <CreditCard className="h-3.5 w-3.5 mr-1" />
          Pagar Todo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-base">Pago Completo</DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">{cliente?.nombre} {cliente?.apellido} — {conceptoBase}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-[10px] text-gray-400 uppercase tracking-wide block">Cuotas</span>
                <span className="text-sm font-semibold text-gray-900">{deudas.filter(d => d.estado !== 'pagado').length}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 uppercase tracking-wide block">Total a pagar</span>
              <span className="text-sm font-semibold text-gray-900">{MONEDAS[moneda as keyof typeof MONEDAS]?.simbolo || '$'}{montoTotalRestante.toLocaleString()} {moneda}</span>
            </div>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 pt-2">
            <FormField
              control={form.control}
              name="monto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-gray-600">Monto ({moneda}) *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      className="h-9"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="fecha_pago"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-xs font-medium text-gray-600">Fecha de Pago *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal h-9",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>Seleccionar fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-gray-500">
                Cancelar
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 shadow-sm">Pagar Todo</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
