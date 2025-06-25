
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, DollarSign, AlertTriangle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DeudaForm } from "./DeudaForm";
import type { DeudaConCliente } from "@/types";

export function DeudasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [deudas, setDeudas] = useState<DeudaConCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAdeudado: 0,
    recargosAplicados: 0,
    cobradoMes: 0,
    deudasActivas: 0,
    deudasConRecargo: 0,
    pagosCompletados: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchDeudas();
  }, []);

  const fetchDeudas = async () => {
    try {
      const { data, error } = await supabase
        .from('deudas')
        .select(`
          *,
          cliente:clientes(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const deudasData = data || [];
      setDeudas(deudasData);
      
      // Calcular estadísticas
      const totalAdeudado = deudasData
        .filter(d => d.estado !== 'pagado')
        .reduce((sum, d) => sum + d.monto_restante, 0);
      
      const recargosAplicados = deudasData
        .reduce((sum, d) => sum + d.recargos, 0);
      
      const cobradoMes = deudasData
        .filter(d => d.estado === 'pagado')
        .reduce((sum, d) => sum + d.monto_total, 0);

      setStats({
        totalAdeudado,
        recargosAplicados,
        cobradoMes,
        deudasActivas: deudasData.filter(d => d.estado !== 'pagado').length,
        deudasConRecargo: deudasData.filter(d => d.recargos > 0).length,
        pagosCompletados: deudasData.filter(d => d.estado === 'pagado').length
      });

    } catch (error) {
      console.error('Error fetching deudas:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las deudas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const variants = {
      'pendiente': { variant: 'default' as const, color: 'text-yellow-700 bg-yellow-100' },
      'vencido': { variant: 'destructive' as const, color: 'text-red-700 bg-red-100' },
      'pagado': { variant: 'default' as const, color: 'text-green-700 bg-green-100' }
    };
    return variants[estado as keyof typeof variants] || variants.pendiente;
  };

  const filteredDeudas = deudas.filter(deuda =>
    deuda.concepto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deuda.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deuda.cliente.apellido.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-lg">Cargando deudas...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Deudas</h1>
          <p className="text-gray-600 mt-2">Controla los pagos y saldos pendientes</p>
        </div>
        <DeudaForm onDeudaCreated={fetchDeudas} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Adeudado</CardTitle>
            <DollarSign className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${stats.totalAdeudado.toLocaleString()}
            </div>
            <p className="text-xs text-gray-600 mt-1">{stats.deudasActivas} deudas activas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Recargos Aplicados</CardTitle>
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${stats.recargosAplicados.toLocaleString()}
            </div>
            <p className="text-xs text-gray-600 mt-1">{stats.deudasConRecargo} deudas con recargo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Cobrado Este Mes</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${stats.cobradoMes.toLocaleString()}
            </div>
            <p className="text-xs text-gray-600 mt-1">{stats.pagosCompletados} pagos completados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Registro de Deudas ({filteredDeudas.length})</CardTitle>
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
          {filteredDeudas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay deudas registradas</p>
              <div className="mt-4">
                <DeudaForm onDeudaCreated={fetchDeudas} />
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-4 font-semibold text-gray-700">Cliente</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Concepto</th>
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
                  {filteredDeudas.map((deuda) => (
                    <tr key={deuda.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium text-gray-900">
                        {deuda.cliente.nombre} {deuda.cliente.apellido}
                      </td>
                      <td className="p-4 text-gray-600">
                        {deuda.concepto}
                      </td>
                      <td className="p-4 text-gray-900 font-medium">
                        ${deuda.monto_total.toLocaleString()}
                      </td>
                      <td className="p-4 text-green-600 font-medium">
                        ${deuda.monto_abonado.toLocaleString()}
                      </td>
                      <td className="p-4 font-medium">
                        <span className={deuda.monto_restante > 0 ? 'text-red-600' : 'text-gray-400'}>
                          ${deuda.monto_restante.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4">
                        {deuda.recargos > 0 ? (
                          <span className="text-orange-600 font-medium">
                            ${deuda.recargos.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {new Date(deuda.fecha_vencimiento).toLocaleDateString('es-AR')}
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
                          {deuda.estado !== 'pagado' && (
                            <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700">
                              Abonar
                            </Button>
                          )}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
