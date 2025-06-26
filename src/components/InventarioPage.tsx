
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Package, AlertTriangle, TrendingUp, Edit, Trash2, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProductoForm } from "./ProductoForm";
import { CategoriaForm } from "./CategoriaForm";
import type { Categoria, ProductoConCategoria } from "@/types";

export function InventarioPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [productos, setProductos] = useState<ProductoConCategoria[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductoForm, setShowProductoForm] = useState(false);
  const [showCategoriaForm, setShowCategoriaForm] = useState(false);
  const [editingProducto, setEditingProducto] = useState<ProductoConCategoria | undefined>();
  const [editingCategoria, setEditingCategoria] = useState<Categoria | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchProductos(), fetchCategorias()]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProductos = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          *,
          categoria:categorias(*)
        `)
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      setProductos(data || []);
    } catch (error) {
      console.error('Error fetching productos:', error);
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

  const handleDeleteProducto = async (producto: ProductoConCategoria) => {
    if (!confirm(`¿Está seguro de eliminar el producto "${producto.nombre}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('productos')
        .update({ activo: false })
        .eq('id', producto.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Producto eliminado correctamente",
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

  const handleDeleteCategoria = async (categoria: Categoria) => {
    if (!confirm(`¿Está seguro de eliminar la categoría "${categoria.nombre}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('categorias')
        .update({ activa: false })
        .eq('id', categoria.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Categoría eliminada correctamente",
      });
      
      fetchCategorias();
      fetchProductos(); // Refrescar productos también
    } catch (error) {
      console.error('Error deleting categoria:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la categoría",
        variant: "destructive",
      });
    }
  };

  const productosFiltrados = productos.filter(producto =>
    producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (producto.codigo && producto.codigo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (producto.categoria?.nombre && producto.categoria.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const productosStockBajo = productos.filter(p => p.stock_actual <= p.stock_minimo);
  const valorTotalInventario = productos.reduce((total, p) => total + (p.precio * p.stock_actual), 0);

  const getStockStatus = (producto: ProductoConCategoria) => {
    if (producto.stock_actual === 0) return { color: 'bg-red-500', text: 'Sin Stock' };
    if (producto.stock_actual <= producto.stock_minimo) return { color: 'bg-yellow-500', text: 'Stock Bajo' };
    return { color: 'bg-green-500', text: 'Stock OK' };
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Control de Inventario</h1>
          <p className="text-gray-600 mt-2">Gestión de productos y categorías</p>
        </div>
      </div>

      {/* Estadísticas del inventario */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Productos</CardTitle>
            <Package className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{productos.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Stock Bajo</CardTitle>
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{productosStockBajo.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Valor Total</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">${valorTotalInventario.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="productos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="productos">Productos</TabsTrigger>
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
        </TabsList>

        <TabsContent value="productos" className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar productos por nombre, código o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setShowProductoForm(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Producto
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No se encontraron productos</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    productosFiltrados.map((producto) => {
                      const status = getStockStatus(producto);
                      return (
                        <TableRow key={producto.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{producto.nombre}</div>
                              {producto.descripcion && (
                                <div className="text-sm text-gray-500">{producto.descripcion}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{producto.codigo || '-'}</TableCell>
                          <TableCell>{producto.categoria?.nombre || 'Sin categoría'}</TableCell>
                          <TableCell>${producto.precio.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>Actual: <span className="font-medium">{producto.stock_actual}</span></div>
                              <div className="text-gray-500">Mín: {producto.stock_minimo}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${status.color} text-white`}>
                              {status.text}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setEditingProducto(producto);
                                  setShowProductoForm(true);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDeleteProducto(producto)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categorias" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCategoriaForm(true)} className="bg-green-600 hover:bg-green-700">
              <Tag className="h-4 w-4 mr-2" />
              Nueva Categoría
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categorias.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Tag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay categorías creadas</p>
              </div>
            ) : (
              categorias.map((categoria) => {
                const productosEnCategoria = productos.filter(p => p.categoria_id === categoria.id);
                return (
                  <Card key={categoria.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{categoria.nombre}</CardTitle>
                          {categoria.descripcion && (
                            <p className="text-sm text-gray-600 mt-1">{categoria.descripcion}</p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Productos:</span>
                          <span className="font-semibold">{productosEnCategoria.length}</span>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => {
                              setEditingCategoria(categoria);
                              setShowCategoriaForm(true);
                            }}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleDeleteCategoria(categoria)}
                            disabled={productosEnCategoria.length > 0}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        {productosEnCategoria.length > 0 && (
                          <p className="text-xs text-gray-500 mt-2">
                            No se puede eliminar: tiene productos asociados
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Formularios modales */}
      {showProductoForm && (
        <ProductoForm
          producto={editingProducto}
          onClose={() => {
            setShowProductoForm(false);
            setEditingProducto(undefined);
          }}
          onSuccess={() => {
            fetchProductos();
          }}
        />
      )}

      {showCategoriaForm && (
        <CategoriaForm
          categoria={editingCategoria}
          onClose={() => {
            setShowCategoriaForm(false);
            setEditingCategoria(undefined);
          }}
          onSuccess={() => {
            fetchCategorias();
            fetchProductos(); // Refrescar productos también
          }}
        />
      )}
    </div>
  );
}
