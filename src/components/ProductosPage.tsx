
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Package } from "lucide-react";
import type { Producto } from "@/types";

export function ProductosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Datos mock para demostración
  const [productos] = useState<Producto[]>([
    {
      id: '1',
      nombre: 'Producto Premium A',
      descripcion: 'Descripción detallada del producto premium A',
      precio: 1500,
      categoria: 'Electrónicos',
      activo: true
    },
    {
      id: '2',
      nombre: 'Servicio Básico B',
      descripcion: 'Servicio básico con garantía incluida',
      precio: 800,
      categoria: 'Servicios',
      activo: true
    },
    {
      id: '3',
      nombre: 'Producto Especial C',
      descripcion: 'Edición limitada con características especiales',
      precio: 2200,
      categoria: 'Especiales',
      activo: false
    }
  ]);

  const filteredProductos = productos.filter(producto =>
    producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    producto.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Productos</h1>
          <p className="text-gray-600 mt-2">Administra tu catálogo de productos y servicios</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Catálogo de Productos</CardTitle>
            <div className="flex items-center gap-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProductos.map((producto) => (
              <Card key={producto.id} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Package className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{producto.nombre}</CardTitle>
                        <Badge variant="outline" className="mt-1">
                          {producto.categoria}
                        </Badge>
                      </div>
                    </div>
                    <Badge variant={producto.activo ? "default" : "secondary"}>
                      {producto.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm mb-4">{producto.descripcion}</p>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-green-600">
                      ${producto.precio.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
