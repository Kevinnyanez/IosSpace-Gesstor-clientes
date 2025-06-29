
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Plus, 
  Package, 
  AlertTriangle, 
  Edit, 
  Trash2,
  Filter,
  DollarSign
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { InventarioStats } from "./InventarioStats";
import { MONEDAS, type ProductoConCategoria, type Categoria } from "@/types";

export function InventarioPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [productos, setProductos] = useState<ProductoConCategoria[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('productos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todos');
  const [filtroMoneda, setFiltroMoneda] = useState<string>('todos');
  const [filtroStock, setFiltroStock] = useState<string>('todos');
  const [showCategoriaForm, setShowCategoriaForm] = useState(false);
  const [showProductoForm, setShowProductoForm] = useState(false);
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
        .eq('activo', true)
        .order('nombre');

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
        .update({ activo: false })
        .eq('id', productoId);

      if (error) throw error;

      toast({
        title: "Producto eliminado",
        description: "El producto se desactivó correctamente",
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

  const getStockStatus = (producto: ProductoConCategoria) => {
    if (producto.stock_actual === 0) {
      return { label: 'Sin Stock', variant: 'destructive' as const, color: 'text-red-700 bg-red-100' };
    } else if (producto.stock_actual <= producto.stock_minimo) {
      return { label: 'Stock Bajo', variant: 'default' as const, color: 'text-orange-700 bg-orange-100' };
    }
    return { label: 'Disponible', variant: 'default' as const, color: 'text-green-700 bg-green-100' };
  };

  // Filtrar productos
  const filteredProductos = productos.filter(producto => {
    const matchesSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         producto.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         producto.codigo?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategoria = filtroCategoria === 'todos' || 
                            producto.categoria_id === filtroCategoria ||
                            (filtroCategoria === 'sin-categoria' && !producto.categoria_id);

    const matchesMoneda = filtroMoneda === 'todos' || producto.moneda === filtroMoneda;

    const matchesStock = filtroStock === 'todos' ||
                        (filtroStock === 'disponible' && producto.stock_actual > producto.stock_minimo) ||
                        (filtroStock === 'bajo' && producto.stock_actual <= producto.stock_minimo && producto.stock_actual > 0) ||
                        (filtroStock === 'agotado' && producto.stock_actual === 0);

    return matchesSearch && matchesCategoria && matchesMoneda && matchesStock;
  });

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
            <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
            <p className="text-gray-600 mt-2">Gestiona tus productos y categorías</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCategoriaForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Categoría
          </Button>
          <Button onClick={() => setShowProductoForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="productos">Productos</TabsTrigger>
          <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="estadisticas">
          <InventarioStats productos={productos} />
        </TabsContent>

        <TabsContent value="productos" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Productos ({filteredProductos.length})</CardTitle>
                <div className="flex items-center gap-4">
                  {/* Filtros */}
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todas</SelectItem>
                        <SelectItem value="sin-categoria">Sin Categoría</SelectItem>
                        {categorias.map((categoria) => (
                          <SelectItem key={categoria.id} value={categoria.id}>
                            {categoria.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filtroMoneda} onValueChange={setFiltroMoneda}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Moneda" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todas</SelectItem>
                        {Object.entries(MONEDAS).map(([codigo, moneda]) => (
                          <SelectItem key={codigo} value={codigo}>
                            {moneda.simbolo} {codigo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filtroStock} onValueChange={setFiltroStock}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Stock" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="disponible">Disponible</SelectItem>
                        <SelectItem value="bajo">Stock Bajo</SelectItem>
                        <SelectItem value="agotado">Agotado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Búsqueda */}
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
              </div>
            </CardHeader>
            <CardContent>
              {filteredProductos.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No hay productos que coincidan con los filtros</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProductos.map((producto) => {
                    const stockStatus = getStockStatus(producto);
                    const valorTotal = producto.precio * producto.stock_actual;

                    return (
                      <Card key={producto.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {producto.nombre}
                              </h3>
                              {producto.codigo && (
                                <p className="text-sm text-gray-500 mb-1">
                                  Código: {producto.codigo}
                                </p>
                              )}
                              {producto.categoria && (
                                <Badge variant="outline" className="text-xs mb-2">
                                  {producto.categoria.nombre}
                                </Badge>
                              )}
                            </div>
                            <Badge 
                              className={stockStatus.color}
                              variant="outline"
                            >
                              {stockStatus.label}
                            </Badge>
                          </div>

                          {producto.descripcion && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {producto.descripcion}
                            </p>
                          )}

                          <div className="space-y-2 mb-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Precio:</span>
                              <span className="font-semibold">
                                {MONEDAS[producto.moneda as keyof typeof MONEDAS]?.simbolo || '$'}
                                {producto.precio.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Stock:</span>
                              <span className={producto.stock_actual <= producto.stock_minimo ? 'text-orange-600 font-semibold' : ''}>
                                {producto.stock_actual} / {producto.stock_minimo} mín.
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Valor Total:</span>
                              <span className="font-semibold text-green-600">
                                {MONEDAS[producto.moneda as keyof typeof MONEDAS]?.simbolo || '$'}
                                {valorTotal.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción desactivará el producto "{producto.nombre}". 
                                    No se eliminará permanentemente pero no será visible en el inventario.
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
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showCategoriaForm && (
        <CategoriaForm
          onClose={() => setShowCategoriaForm(false)}
          onSuccess={() => {
            fetchCategorias();
            setShowCategoriaForm(false);
          }}
        />
      )}

      {showProductoForm && (
        <ProductoForm
          onClose={() => setShowProductoForm(false)}
          onSuccess={() => {
            fetchProductos();
            setShowProductoForm(false);
          }}
        />
      )}
    </div>
  );
}
