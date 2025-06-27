
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Package, Plus, AlertTriangle, Edit, Trash2, Tag } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProductoForm } from "./ProductoForm";
import { CategoriaForm } from "./CategoriaForm";
import type { ProductoConCategoria, Categoria } from "@/types";

export function InventarioPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [productos, setProductos] = useState<ProductoConCategoria[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [editingProducto, setEditingProducto] = useState<ProductoConCategoria | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProductos();
    fetchCategorias();
  }, []);

  const fetchProductos = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          *,
          categoria:categorias(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProductos(data || []);
    } catch (error) {
      console.error('Error fetching productos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  const handleDeleteProducto = async (productoId: string) => {
    try {
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', productoId);

      if (error) throw error;

      toast({
        title: "Producto eliminado",
        description: "El producto se eliminó correctamente",
      });

      fetchProductos();
    } catch (error) {
      console.error('Error deleting producto:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto",
        variant: "destructive",
      });
    }
  };

  const filteredProductos = productos.filter(producto =>
    producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    producto.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    producto.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    producto.categoria?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const productosActivos = productos.filter(p => p.activo).length;
  const productosStockBajo = productos.filter(p => p.stock_actual <= p.stock_minimo).length;
  const valorInventario = productos.reduce((sum, p) => sum + (p.precio * p.stock_actual), 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-lg">Cargando inventario...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Inventario</h1>
            <p className="text-gray-600 mt-2">Controla tu inventario y productos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCategoryForm(true)} variant="outline">
            <Tag className="h-4 w-4 mr-2" />
            Nueva Categoría
          </Button>
          <Button onClick={() => setShowProductForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Productos</CardTitle>
            <Package className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{productos.length}</div>
            <p className="text-xs text-gray-600 mt-1">productos registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Activos</CardTitle>
            <Package className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{productosActivos}</div>
            <p className="text-xs text-gray-600 mt-1">productos activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Stock Bajo</CardTitle>
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{productosStockBajo}</div>
            <p className="text-xs text-gray-600 mt-1">requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Valor Inventario</CardTitle>
            <Package className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ${valorInventario.toLocaleString()}
            </div>
            <p className="text-xs text-gray-600 mt-1">valor total</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Productos ({filteredProductos.length})</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProductos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchTerm ? 'No se encontraron productos que coincidan con la búsqueda' : 'No hay productos registrados'}
              </p>
              {!searchTerm && (
                <div className="mt-4">
                  <Button onClick={() => setShowProductForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primer Producto
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProductos.map((producto) => (
                <Card key={producto.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{producto.nombre}</h3>
                        {producto.codigo && (
                          <p className="text-sm text-gray-500">Código: {producto.codigo}</p>
                        )}
                        {producto.categoria && (
                          <Badge variant="outline" className="mt-1">
                            {producto.categoria.nombre}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingProducto(producto)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción eliminará permanentemente el producto. Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteProducto(producto.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {producto.descripcion && (
                      <p className="text-sm text-gray-600">{producto.descripcion}</p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-green-600">
                        ${producto.precio.toLocaleString()}
                      </span>
                      <Badge variant={producto.activo ? "default" : "secondary"}>
                        {producto.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Stock:</span>
                        <span className={`ml-1 font-semibold ${
                          producto.stock_actual <= producto.stock_minimo ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {producto.stock_actual}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Mínimo:</span>
                        <span className="ml-1 font-semibold text-gray-900">
                          {producto.stock_minimo}
                        </span>
                      </div>
                    </div>
                    {producto.stock_actual <= producto.stock_minimo && (
                      <div className="flex items-center gap-1 text-orange-600 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Stock bajo</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showProductForm && (
        <ProductoForm
          onClose={() => setShowProductForm(false)}
          onSuccess={() => {
            fetchProductos();
            setShowProductForm(false);
          }}
        />
      )}

      {editingProducto && (
        <ProductoForm
          producto={editingProducto}
          onClose={() => setEditingProducto(null)}
          onSuccess={() => {
            fetchProductos();
            setEditingProducto(null);
          }}
        />
      )}

      {showCategoryForm && (
        <CategoriaForm
          onClose={() => setShowCategoryForm(false)}
          onSuccess={() => {
            fetchCategorias();
            setShowCategoryForm(false);
          }}
        />
      )}
    </div>
  );
}
