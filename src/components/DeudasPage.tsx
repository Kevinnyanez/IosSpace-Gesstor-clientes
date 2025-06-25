
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, DollarSign, AlertTriangle, Calendar } from "lucide-react";
import type { Deuda } from "@/types";

export function DeudasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Datos mock para demostración
  const [deudas] = useState<Deuda[]>([
    {
      id: '1',
      clienteId: '1',
      productoId: '1',
      montoTotal: 1500,
      montoAbonado: 500,
      montoRestante: 1000,
      fechaVencimiento: new Date('2024-07-15'),
      fechaCreacion: new Date('2024-06-01'),
      recargos: 50,
      estado: 'vencido'
    },
    {
      id: '2',
      clienteId: '2',
      productoId: '2',
      montoTotal: 800,
      montoAbonado: 300,
      montoRestante: 500,
      fechaVencimiento: new Date('2024-07-30'),
      fechaCreacion: new Date('2024-06-15'),
      recargos: 0,
      estado: 'pendiente'
    },
    {
      id: '3',
      clienteId: '1',
      productoId: '3',
      montoTotal: 2200,
      montoAbonado: 2200,
      montoRestante: 0,
      fechaVencimiento: new Date('2024-06-20'),
      fechaCreacion: new Date('2024-05-01'),
      recargos: 0,
      estado: 'pagado'
    }
  ]);

  const getEstadoBadge = (estado: string) => {
    const variants = {
      'pendiente': { variant: 'default' as const, color: 'text-yellow-700 bg-yellow-100' },
      'vencido': { variant: 'destructive' as const, color: 'text-red-700 bg-red-100' },
      'pagado': { variant: 'default' as const, color: 'text-green-700 bg-green-100' }
    };
    return variants[estado as keyof typeof variants] || variants.pendiente;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Deudas</h1>
          <p className="text-gray-600 mt-2">Controla los pagos y saldos pendientes</p>
        </div>
        <Button className="bg-orange-600 hover:bg-orange-700">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Deuda
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Adeudado</CardTitle>
            <DollarSign className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">$1,500</div>
            <p className="text-xs text-gray-600 mt-1">2 deudas activas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Recargos Aplicados</CardTitle>
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">$50</div>
            <p className="text-xs text-gray-600 mt-1">1 deuda con recargo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Cobrado Este Mes</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">$2,200</div>
            <p className="text-xs text-gray-600 mt-1">1 pago completado</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Registro de Deudas</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar deudas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-4 font-semibold text-gray-700">Cliente</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Producto</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Monto Total</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Abonado</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Restante</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Recargos</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Vencimiento</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Estado</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {deudas.map((deuda) => (
                  <tr key={deuda.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-900">
                      {deuda.clienteId === '1' ? 'Juan Pérez' : 'María García'}
                    </td>
                    <td className="p-4 text-gray-600">
                      {deuda.productoId === '1' ? 'Producto Premium A' : 
                       deuda.productoId === '2' ? 'Servicio Básico B' : 'Producto Especial C'}
                    </td>
                    <td className="p-4 text-gray-900 font-medium">
                      ${deuda.montoTotal.toLocaleString()}
                    </td>
                    <td className="p-4 text-green-600 font-medium">
                      ${deuda.montoAbonado.toLocaleString()}
                    </td>
                    <td className="p-4 font-medium">
                      <span className={deuda.montoRestante > 0 ? 'text-red-600' : 'text-gray-400'}>
                        ${deuda.montoRestante.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4">
                      {deuda.recargos > 0 ? (
                        <span className="text-orange-600 font-medium">
                          ${deuda.recargos}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {deuda.fechaVencimiento.toLocaleDateString('es-AR')}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge 
                        className={getEstadoBadge(deuda.estado).color}
                        variant="outline"
                      >
                        {deuda.estado.charAt(0).toUpperCase() + deuda.estado.slice(1)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700">
                          Abonar
                        </Button>
                        <Button variant="outline" size="sm">
                          Ver
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
