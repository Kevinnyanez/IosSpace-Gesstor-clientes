
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Plus, Check, ChevronsUpDown } from 'lucide-react';
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { MONEDAS, type MonedaCodigo } from "@/types";

const deudaFormSchema = z.object({
  cliente_id: z.string().min(1, "Debe seleccionar un cliente"),
  concepto: z.string().min(1, "El concepto es obligatorio"),
  monto_total: z.number().min(0.01, "El monto debe ser mayor a 0"),
  monto_abonado: z.number().min(0, "El monto abonado no puede ser negativo").default(0),
  fecha_vencimiento: z.date({
    required_error: "La fecha de vencimiento es obligatoria",
  }),
  cuotas: z.number().min(1, "Debe ser al menos 1 cuota").default(1),
  moneda: z.enum(['ARS', 'USD'] as const).default('ARS'),
  notas: z.string().optional(),
});

type DeudaFormData = z.infer<typeof deudaFormSchema>;

interface DeudaFormProps {
  onDeudaCreated?: () => void;
}

export function DeudaForm({ onDeudaCreated }: DeudaFormProps) {
  const [open, setOpen] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [clienteComboboxOpen, setClienteComboboxOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<DeudaFormData>({
    resolver: zodResolver(deudaFormSchema),
    defaultValues: {
      cliente_id: "",
      concepto: "",
      monto_total: 0,
      monto_abonado: 0,
      cuotas: 1,
      moneda: "ARS",
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
      setLoading(true);
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
      console.log('Moneda:', data.moneda);

      // Si el monto restante es 0 o negativo, crear una sola deuda pagada
      if (montoRestante <= 0) {
        const deudaData = {
          cliente_id: data.cliente_id,
          concepto: data.concepto,
          monto_total: data.monto_total,
          monto_abonado: data.monto_total,
          fecha_vencimiento: data.fecha_vencimiento.toISOString().split('T')[0],
          estado: 'pagado',
          moneda: data.moneda,
          notas: data.notas || null,
        };

        console.log('Insertando deuda pagada:', deudaData);
        
        const { error } = await supabase
          .from('deudas')
          .insert([deudaData]);

        if (error) {
          console.error('Error insertando deuda:', error);
          throw error;
        }

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
            
            const deudaData = {
              cliente_id: data.cliente_id,
              concepto: `${data.concepto} - Cuota ${i + 1}/${data.cuotas}`,
              monto_total: montoPorCuota,
              monto_abonado: 0,
              fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
              estado: 'pendiente',
              moneda: data.moneda,
              notas: i === 0 && data.monto_abonado > 0 
                ? `${data.notas || ''} | Abono inicial: ${MONEDAS[data.moneda].simbolo}${data.monto_abonado}`.trim() 
                : data.notas || null,
            };
            
            deudas.push(deudaData);
          }

          console.log('Insertando deudas múltiples:', deudas);

          const { error } = await supabase
            .from('deudas')
            .insert(deudas);

          if (error) {
            console.error('Error insertando deudas:', error);
            throw error;
          }

          toast({
            title: "Deuda creada",
            description: `Se han creado ${data.cuotas} cuotas de ${MONEDAS[data.moneda].simbolo}${montoPorCuota.toLocaleString()} cada una`,
          });
        } else {
          // Una sola deuda
          const deudaData = {
            cliente_id: data.cliente_id,
            concepto: data.concepto,
            monto_total: data.monto_total,
            monto_abonado: data.monto_abonado,
            fecha_vencimiento: data.fecha_vencimiento.toISOString().split('T')[0],
            estado: 'pendiente',
            moneda: data.moneda,
            notas: data.notas || null,
          };

          console.log('Insertando deuda única:', deudaData);

          const { error } = await supabase
            .from('deudas')
            .insert([deudaData]);

          if (error) {
            console.error('Error insertando deuda:', error);
            throw error;
          }

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
        description: `No se pudo crear la deuda: ${error.message || 'Error desconocido'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Deuda
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-lg font-semibold text-gray-900">Nueva Deuda</DialogTitle>
          <p className="text-sm text-gray-500">Registra una nueva deuda para un cliente</p>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 pt-2">
            <FormField
              control={form.control}
              name="cliente_id"
              render={({ field }) => {
                const clienteSeleccionado = clientes.find((c) => c.id === field.value);
                return (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-gray-600">Cliente *</FormLabel>
                    <Popover open={clienteComboboxOpen} onOpenChange={setClienteComboboxOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={clienteComboboxOpen}
                            className={cn(
                              "w-full justify-between font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {clienteSeleccionado
                              ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}`
                              : "Buscar o seleccionar cliente..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar por nombre o apellido..." />
                          <CommandList>
                            <CommandEmpty>Ningún cliente encontrado.</CommandEmpty>
                            <CommandGroup>
                              {clientes.map((cliente) => (
                                <CommandItem
                                  key={cliente.id}
                                  value={`${cliente.nombre} ${cliente.apellido}`}
                                  onSelect={() => {
                                    form.setValue("cliente_id", cliente.id);
                                    setClienteComboboxOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === cliente.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {cliente.nombre} {cliente.apellido}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            
            <FormField
              control={form.control}
              name="concepto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-gray-600">Concepto/Producto *</FormLabel>
                  <FormControl>
                    <Input placeholder="Descripción del producto o servicio" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="monto_total"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-gray-600">Monto Total *</FormLabel>
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
                    <FormLabel className="text-xs font-medium text-gray-600">Abono Inicial</FormLabel>
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
                name="moneda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-gray-600">Moneda *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(MONEDAS).map(([codigo, moneda]) => (
                          <SelectItem key={codigo} value={codigo}>
                            {moneda.simbolo} {moneda.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <FormLabel className="text-xs font-medium text-gray-600">Cuotas</FormLabel>
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
                    <FormLabel className="text-xs font-medium text-gray-600">Vencimiento *</FormLabel>
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
                  <FormLabel className="text-xs font-medium text-gray-600">Notas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notas adicionales..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-gray-500">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                {loading ? "Creando..." : "Crear Deuda"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
