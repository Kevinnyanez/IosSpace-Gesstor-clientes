
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
}

export function ClienteForm({ onClienteCreated }: ClienteFormProps) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  
  const form = useForm<ClienteFormData>({
    resolver: zodResolver(clienteFormSchema),
    defaultValues: {
      nombre: "",
      apellido: "",
      telefono: "",
      email: "",
      direccion: "",
    },
  });

  const onSubmit = async (data: ClienteFormData) => {
    try {
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

      form.reset();
      setOpen(false);
      onClienteCreated?.();
    } catch (error) {
      console.error('Error creating cliente:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el cliente",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agregar Cliente</DialogTitle>
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Crear Cliente</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
