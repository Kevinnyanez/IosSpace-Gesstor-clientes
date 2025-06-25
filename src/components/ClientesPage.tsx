
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Mail, Phone } from "lucide-react";
import type { Cliente } from "@/types";

export function ClientesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Datos mock para demostración
  const [clientes] = useState<Cliente[]>([
    {
      id: '1',
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'juan.perez@email.com',
      telefono: '+54 11 1234-5678',
      direccion: 'Av. Corrientes 1234, CABA',
      fechaRegistro: new Date('2024-01-15'),
      activo: true
    },
    {
      id: '2',
      nombre: 'María',
      apellido: 'García',
      email: 'maria.garcia@email.com',
      telefono: '+54 11 8765-4321',
      direccion: 'Av. Santa Fe 5678, CABA',
      fechaRegistro: new Date('2024-02-10'),
      activo: true
    },
    {
      id: '3',
      nombre: 'Carlos',
      apellido: 'Ruiz',
      email: 'carlos.ruiz@email.com',
      telefono: '+54 11 5555-1234',
      direccion: 'Calle Falsa 123, CABA',
      fechaRegistro: new Date('2024-01-20'),
      activo: false
    }
  ]);

  const filteredClientes = clientes.filter(cliente =>
    cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Clientes</h1>
          <p className="text-gray-600 mt-2">Administra tu base de clientes</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Clientes</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar clientes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-4 font-semibold text-gray-700">Cliente</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Contacto</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Dirección</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Registro</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Estado</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.map((cliente) => (
                  <tr key={cliente.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-gray-900">{cliente.nombre} {cliente.apellido}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-4 w-4" />
                          {cliente.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-4 w-4" />
                          {cliente.telefono}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{cliente.direccion}</td>
                    <td className="p-4 text-sm text-gray-600">
                      {cliente.fechaRegistro.toLocaleDateString('es-AR')}
                    </td>
                    <td className="p-4">
                      <Badge variant={cliente.activo ? "default" : "secondary"}>
                        {cliente.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
