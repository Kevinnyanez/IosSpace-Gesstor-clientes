
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, AlertTriangle, TrendingUp } from "lucide-react";

// Interfaz para productos de inventario
interface ProductoInventario {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock_actual: number;
  stock_minimo: number;
  categoria: string;
  codigo: string;
}

export function InventarioPage() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Datos mock para demostración del inventario
  const productos: ProductoInventario[] = [
    {
      id: '1',
      nombre: 'Producto A',
      descripcion: 'Descripción del producto A',
      precio: 1500,
      stock_actual: 25,
      stock_minimo: 10,
      categoria: 'Categoría 1',
      codigo: 'PROD001'
    },
    {
      id: '2',
      nombre: 'Producto B',
      descripcion: 'Descripción del producto B',
      precio: 2300,
      stock_actual: 5,
      stock_minimo: 15,
      categoria: 'Categoría 2',
      codigo: 'PROD002'
    },
    {
      id: '3',
      nombre: 'Producto C',
      descripción: 'Descripción del producto C',
      precio: 850,
      stock_actual: 50,
      stock_minimo: 20,
      categoria: 'Categoría 1',
      codigo: 'PROD003'
    }
  ];

  const productosFiltrados = productos.filter(producto =>
    producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    producto.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const productosStockBajo = productos.filter(p => p.stock_actual <= p.stock_minimo);
  const valorTotalInventario = productos.reduce((total, p) => total + (p.precio * p.stock_actual), 0);

  const getStockStatus = (producto: ProductoInventario) => {
    if (producto.stock_actual === 0) return { color: 'bg-red-500', text: 'Sin Stock' };
    if (producto.stock_actual <= producto.stock_minimo) return { color: 'bg-yellow-500', text: 'Stock Bajo' };
    return { color: 'bg-green-500', text: 'Stock OK' };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Control de Inventario</h1>
          <p className="text-gray-600 mt-2">Gestión independiente de stock y productos</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Producto
        </Button>
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

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar productos por nombre o código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de productos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {productosFiltrados.map((producto) => {
          const status = getStockStatus(producto);
          return (
            <Card key={producto.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{producto.nombre}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">Código: {producto.codigo}</p>
                  </div>
                  <Badge className={`${status.color} text-white`}>
                    {status.text}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-3">{producto.descripcion}</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Precio:</span>
                    <span className="font-semibold">${producto.precio.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Stock actual:</span>
                    <span className="font-semibold">{producto.stock_actual}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Stock mínimo:</span>
                    <span className="text-sm">{producto.stock_minimo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Categoría:</span>
                    <span className="text-sm">{producto.categoria}</span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    Editar
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    Ajustar Stock
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {productosFiltrados.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No se encontraron productos</p>
        </div>
      )}
    </div>
  );
}
