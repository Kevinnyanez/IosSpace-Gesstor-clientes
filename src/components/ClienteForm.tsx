
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus } from "lucide-react";
import type { Cliente } from "@/types";

const clienteFormSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  apellido: z.string().min(1, "El apellido es obligatorio"),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
});

type ClienteFormData = z.infer<typeof clienteFormSchema>;

interface ClienteFormProps {
  onClienteCreated?: () => void;
  cliente?: Cliente;
  onClose?: () => void;
}

export function ClienteForm({ onClienteCreated, cliente, onClose }: ClienteFormProps) {
  const [open, setOpen] = React.useState(!!cliente);
  const { toast } = useToast();
  
  const form = useForm<ClienteFormData>({
    resolver: zodResolver(clienteFormSchema),
    defaultValues: {
      nombre: cliente?.nombre || "",
      apellido: cliente?.apellido || "",
      telefono: cliente?.telefono || "",
      direccion: cliente?.direccion || "",
    },
  });

  React.useEffect(() => {
    if (cliente) {
      setOpen(true);
      form.reset({
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        telefono: cliente.telefono || "",
        direccion: cliente.direccion || "",
      });
    }
  }, [cliente, form]);

  const onSubmit = async (data: ClienteFormData) => {
    try {
      if (cliente) {
        // Actualizar cliente existente
        const { error } = await supabase
          .from('clientes')
          .update({
            nombre: data.nombre,
            apellido: data.apellido,
            telefono: data.telefono || null,
            direccion: data.direccion || null,
          })
          .eq('id', cliente.id);

        if (error) throw error;

        toast({
          title: "Cliente actualizado",
          description: "El cliente ha sido actualizado exitosamente",
        });
      } else {
        // Crear nuevo cliente
        const { error } = await supabase
          .from('clientes')
          .insert([{
            nombre: data.nombre,
            apellido: data.apellido,
            telefono: data.telefono || null,
            direccion: data.direccion || null,
          }]);

        if (error) throw error;

        toast({
          title: "Cliente creado",
          description: "El cliente ha sido registrado exitosamente",
        });
      }

      form.reset();
      setOpen(false);
      onClienteCreated?.();
      onClose?.();
    } catch (error) {
      console.error('Error saving cliente:', error);
      toast({
        title: "Error",
        description: `No se pudo ${cliente ? 'actualizar' : 'crear'} el cliente`,
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={cliente ? handleClose : setOpen}>
      {!cliente && (
        <DialogTrigger asChild>
          <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-lg font-semibold text-gray-900">
            {cliente ? "Editar Cliente" : "Nuevo Cliente"}
          </DialogTitle>
          <p className="text-sm text-gray-500">{cliente ? "Modifica los datos del cliente" : "Completa los datos para registrar un cliente"}</p>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-gray-600">Nombre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre" className="h-9" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apellido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-gray-600">Apellido *</FormLabel>
                    <FormControl>
                      <Input placeholder="Apellido" className="h-9" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-gray-600">Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="011 1234-5678" className="h-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="direccion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-gray-600">Dirección</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Dirección del cliente" className="resize-none h-16" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button type="button" variant="ghost" onClick={handleClose} className="text-gray-500">
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                {cliente ? "Guardar cambios" : "Crear Cliente"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
