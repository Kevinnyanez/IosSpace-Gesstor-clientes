
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { Cliente } from "@/types";

const deudaFormSchema = z.object({
  cliente_id: z.string().min(1, "Debe seleccionar un cliente"),
  concepto: z.string().min(1, "El concepto es obligatorio"),
  monto_total: z.number().min(0.01, "El monto debe ser mayor a 0"),
  monto_abonado: z.number().min(0, "El monto abonado no puede ser negativo").default(0),
  fecha_vencimiento: z.date({
    required_error: "La fecha de vencimiento es obligatoria",
  }),
  cuotas: z.number().min(1, "Debe ser al menos 1 cuota").default(1),
  notas: z.string().optional(),
});

type DeudaFormData = z.infer<typeof deudaFormSchema>;

interface DeudaFormProps {
  onDeudaCreated?: () => void;
}

export function DeudaForm({ onDeudaCreated }: DeudaFormProps) {
  const [open, setOpen] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const { toast } = useToast();
  
  const form = useForm<DeudaFormData>({
    resolver: zodResolver(deudaFormSchema),
    defaultValues: {
      cliente_id: "",
      concepto: "",
      monto_total: 0,
      monto_abonado: 0,
      cuotas: 1,
      notas: "",
    },
  });

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error fetching clientes:', error);
    }
  };

  const onSubmit = async (data: DeudaFormData) => {
    try {
      console.log('Datos del formulario:', data);
      
      // Validar que el monto abonado no sea mayor al total
      if (data.monto_abonado > data.monto_total) {
        toast({
          title: "Error",
          description: "El monto abonado no puede ser mayor al monto total",
          variant: "destructive",
        });
        return;
      }

      // Calcular el monto restante después del abono inicial
      const montoRestante = data.monto_total - data.monto_abonado;
      
      console.log('Monto total:', data.monto_total);
      console.log('Monto abonado:', data.monto_abonado);
      console.log('Monto restante:', montoRestante);
      console.log('Cuotas:', data.cuotas);

      // Si el monto restante es 0 o negativo, crear una sola deuda pagada
      if (montoRestante <= 0) {
        const { error } = await supabase
          .from('deudas')
          .insert([{
            cliente_id: data.cliente_id,
            concepto: data.concepto,
            monto_total: data.monto_total,
            monto_abonado: data.monto_total,
            monto_restante: 0,
            fecha_vencimiento: data.fecha_vencimiento.toISOString().split('T')[0],
            estado: 'pagado',
            notas: data.notas || null,
          }]);

        if (error) throw error;

        toast({
          title: "Deuda creada y pagada",
          description: "La deuda ha sido registrada como pagada completamente",
        });
      } else {
        // Si hay más de una cuota, crear múltiples deudas
        if (data.cuotas > 1) {
          const montoPorCuota = montoRestante / data.cuotas;
          const deudas = [];
          
          console.log('Monto por cuota:', montoPorCuota);
          
          for (let i = 0; i < data.cuotas; i++) {
            const fechaVencimiento = new Date(data.fecha_vencimiento);
            fechaVencimiento.setMonth(fechaVencimiento.getMonth() + i);
            
            deudas.push({
              cliente_id: data.cliente_id,
              concepto: `${data.concepto} - Cuota ${i + 1}/${data.cuotas}`,
              monto_total: montoPorCuota,
              monto_abonado: 0,
              monto_restante: montoPorCuota,
              fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
              estado: 'pendiente',
              notas: i === 0 && data.monto_abonado > 0 
                ? `${data.notas || ''} | Abono inicial: $${data.monto_abonado}`.trim() 
                : data.notas || null,
            });
          }

          console.log('Deudas a insertar:', deudas);

          const { error } = await supabase
            .from('deudas')
            .insert(deudas);

          if (error) throw error;

          toast({
            title: "Deuda creada",
            description: `Se han creado ${data.cuotas} cuotas de $${montoPorCuota.toLocaleString()} cada una`,
          });
        } else {
          // Una sola deuda
          const { error } = await supabase
            .from('deudas')
            .insert([{
              cliente_id: data.cliente_id,
              concepto: data.concepto,
              monto_total: data.monto_total,
              monto_abonado: data.monto_abonado,
              monto_restante: montoRestante,
              fecha_vencimiento: data.fecha_vencimiento.toISOString().split('T')[0],
              estado: 'pendiente',
              notas: data.notas || null,
            }]);

          if (error) throw error;

          toast({
            title: "Deuda creada",
            description: "La deuda ha sido registrada exitosamente",
          });
        }
      }

      form.reset();
      setOpen(false);
      onDeudaCreated?.();
    } catch (error) {
      console.error('Error creating deuda:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la deuda. Revisa los datos e intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-600 hover:bg-orange-700">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Deuda
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar Deuda</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cliente_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nombre} {cliente.apellido}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="concepto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concepto/Producto *</FormLabel>
                  <FormControl>
                    <Input placeholder="Descripción del producto o servicio" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monto_total"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto Total *</FormLabel>
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
                name="monto_abonado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Abono Inicial</FormLabel>
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
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cuotas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad de Cuotas</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fecha_vencimiento"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Primera Cuota Vence *</FormLabel>
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
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="notas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notas adicionales..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Crear Deuda</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
