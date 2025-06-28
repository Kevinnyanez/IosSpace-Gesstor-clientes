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
        <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700">
          <CreditCard className="h-4 w-4 mr-1" />
          Pagar Todo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Pago Completo</DialogTitle>
          <div className="text-sm text-gray-600">
            <p><strong>Cliente:</strong> {cliente?.nombre} {cliente?.apellido}</p>
            <p><strong>Concepto:</strong> {conceptoBase}</p>
            <p><strong>Cuotas a pagar:</strong> {deudas.filter(d => d.estado !== 'pagado').length}</p>
            <p><strong>Total a pagar:</strong> {MONEDAS[moneda as keyof typeof MONEDAS]?.simbolo || '$'}{montoTotalRestante.toLocaleString()} {moneda}</p>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="monto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto Total a Pagar ({moneda}) *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
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
                  <FormLabel>Fecha de Pago *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
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
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Pagar Todo</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
