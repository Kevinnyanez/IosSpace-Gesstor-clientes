
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
  telefono: z.string().min(1, "El teléfono es obligatorio"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
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
      email: cliente?.email || "",
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
        email: cliente.email || "",
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
            telefono: data.telefono,
            email: data.email || null,
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
            telefono: data.telefono,
            email: data.email || null,
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
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{cliente ? "Editar Cliente" : "Agregar Cliente"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del cliente" {...field} />
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
                  <FormLabel>Apellido *</FormLabel>
                  <FormControl>
                    <Input placeholder="Apellido del cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono *</FormLabel>
                  <FormControl>
                    <Input placeholder="Número de teléfono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="email@ejemplo.com" {...field} />
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
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Dirección del cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit">
                {cliente ? "Actualizar Cliente" : "Crear Cliente"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
