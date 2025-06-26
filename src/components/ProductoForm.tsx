
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Producto, Categoria } from "@/types";

interface ProductoFormProps {
  producto?: Producto;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductoForm({ producto, onClose, onSuccess }: ProductoFormProps) {
  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [formData, setFormData] = useState({
    nombre: producto?.nombre || '',
    descripcion: producto?.descripcion || '',
    precio: producto?.precio || 0,
    stock_actual: producto?.stock_actual || 0,
    stock_minimo: producto?.stock_minimo || 0,
    categoria_id: producto?.categoria_id || '',
    codigo: producto?.codigo || '',
    activo: producto?.activo ?? true
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('activa', true)
        .order('nombre');

      if (error) throw error;
      setCategorias(data || []);
    } catch (error) {
      console.error('Error fetching categorias:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre del producto es requerido",
        variant: "destructive",
      });
      return;
    }

    if (formData.precio < 0) {
      toast({
        title: "Error",
        description: "El precio no puede ser negativo",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const productData = {
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || null,
        precio: Number(formData.precio),
        stock_actual: Number(formData.stock_actual),
        stock_minimo: Number(formData.stock_minimo),
        categoria_id: formData.categoria_id || null,
        codigo: formData.codigo.trim() || null,
        activo: formData.activo
      };

      if (producto) {
        // Actualizar producto existente
        const { error } = await supabase
          .from('productos')
          .update(productData)
          .eq('id', producto.id);

        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Producto actualizado correctamente",
        });
      } else {
        // Crear nuevo producto
        const { error } = await supabase
          .from('productos')
          .insert(productData);

        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Producto creado correctamente",
        });
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error al guardar producto:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el producto. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {producto ? 'Editar Producto' : 'Nuevo Producto'}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Nombre del producto"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  placeholder="Código del producto"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción del producto"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="precio">Precio *</Label>
                <Input
                  id="precio"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.precio}
                  onChange={(e) => setFormData({ ...formData, precio: Number(e.target.value) })}
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="stock_actual">Stock Actual</Label>
                <Input
                  id="stock_actual"
                  type="number"
                  min="0"
                  value={formData.stock_actual}
                  onChange={(e) => setFormData({ ...formData, stock_actual: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
              
              <div>
                <Label htmlFor="stock_minimo">Stock Mínimo</Label>
                <Input
                  id="stock_minimo"
                  type="number"
                  min="0"
                  value={formData.stock_minimo}
                  onChange={(e) => setFormData({ ...formData, stock_minimo: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="categoria">Categoría</Label>
              <Select 
                value={formData.categoria_id} 
                onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin categoría</SelectItem>
                  {categorias.map((categoria) => (
                    <SelectItem key={categoria.id} value={categoria.id}>
                      {categoria.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Guardando...' : (producto ? 'Actualizar' : 'Crear')}
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
