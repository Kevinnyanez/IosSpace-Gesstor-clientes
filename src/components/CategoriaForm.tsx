
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Categoria } from "@/types";

interface CategoriaFormProps {
  categoria?: Categoria;
  onClose: () => void;
  onSuccess: () => void;
}

export function CategoriaForm({ categoria, onClose, onSuccess }: CategoriaFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: categoria?.nombre || '',
    descripcion: categoria?.descripcion || '',
    activa: categoria?.activa ?? true
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la categoría es requerido",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (categoria) {
        // Actualizar categoría existente
        const { error } = await supabase
          .from('categorias')
          .update({
            nombre: formData.nombre.trim(),
            descripcion: formData.descripcion.trim() || null,
            activa: formData.activa
          })
          .eq('id', categoria.id);

        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Categoría actualizada correctamente",
        });
      } else {
        // Crear nueva categoría
        const { error } = await supabase
          .from('categorias')
          .insert({
            nombre: formData.nombre.trim(),
            descripcion: formData.descripcion.trim() || null,
            activa: formData.activa
          });

        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Categoría creada correctamente",
        });
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error al guardar categoría:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la categoría. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {categoria ? 'Editar Categoría' : 'Nueva Categoría'}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Nombre de la categoría"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción opcional"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Guardando...' : (categoria ? 'Actualizar' : 'Crear')}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
