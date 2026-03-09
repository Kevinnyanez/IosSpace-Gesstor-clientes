
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

const abonoFormSchema = z.object({
  monto: z.number().min(0.01, "El monto debe ser mayor a 0"),
  fecha_pago: z.date({
    required_error: "La fecha de pago es obligatoria",
  }),
});

type AbonoFormData = z.infer<typeof abonoFormSchema>;

interface AbonoFormProps {
  deuda: DeudaConCliente;
  onAbonoCreated?: () => void;
}

export function AbonoForm({ deuda, onAbonoCreated }: AbonoFormProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<AbonoFormData>({
    resolver: zodResolver(abonoFormSchema),
    defaultValues: {
      monto: deuda.monto_restante,
      fecha_pago: new Date(),
    },
  });

  const onSubmit = async (data: AbonoFormData) => {
    try {
      if (data.monto > deuda.monto_restante) {
        toast({
          title: "Error",
          description: "El monto no puede ser mayor al saldo restante",
          variant: "destructive",
        });
        return;
      }

      // Crear el pago
      const { error: pagoError } = await supabase
        .from('pagos')
        .insert({
          deuda_id: deuda.id,
          monto: data.monto,
          fecha_pago: data.fecha_pago.toISOString().split('T')[0],
          moneda: deuda.moneda,
        });

      if (pagoError) throw pagoError;

      // Registrar en historial de pagos
      const { error: historialError } = await supabase
        .from('historial_pagos')
        .insert({
          deuda_id: deuda.id,
          cliente_nombre: `${deuda.cliente.nombre} ${deuda.cliente.apellido}`,
          concepto: deuda.concepto,
          monto_pago: data.monto,
          moneda: deuda.moneda,
          fecha_pago: data.fecha_pago.toISOString().split('T')[0],
        });

      if (historialError) throw historialError;

      // Actualizar la deuda
      const nuevoMontoAbonado = deuda.monto_abonado + data.monto;
      const nuevoEstado = nuevoMontoAbonado >= deuda.monto_total ? 'pagado' : 'pendiente';

      const { error: deudaError } = await supabase
        .from('deudas')
        .update({
          monto_abonado: nuevoMontoAbonado,
          estado: nuevoEstado,
        })
        .eq('id', deuda.id);

      if (deudaError) throw deudaError;

      toast({
        title: "Abono registrado",
        description: `Se registró un abono de ${MONEDAS[deuda.moneda as keyof typeof MONEDAS]?.simbolo || '$'}${data.monto.toLocaleString()}`,
      });

      form.reset();
      setOpen(false);
      onAbonoCreated?.();
    } catch (error) {
      console.error('Error creating abono:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar el abono",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-500 hover:text-blue-600">
          <CreditCard className="h-3 w-3 mr-1" />
          Abonar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-base">Registrar Abono</DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">{deuda.cliente.nombre} {deuda.cliente.apellido} — {deuda.concepto}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
            <span className="text-xs text-gray-500">Saldo restante</span>
            <span className="text-sm font-semibold text-gray-900">{MONEDAS[deuda.moneda as keyof typeof MONEDAS]?.simbolo || '$'}{deuda.monto_restante.toLocaleString()} {deuda.moneda}</span>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 pt-2">
            <FormField
              control={form.control}
              name="monto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-gray-600">Monto ({deuda.moneda}) *</FormLabel>
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
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 shadow-sm">Registrar Abono</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
