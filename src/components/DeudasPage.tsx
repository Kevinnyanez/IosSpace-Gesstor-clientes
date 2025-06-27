import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, DollarSign, AlertTriangle, Calendar, Eye, Trash2, X } from "lucide-react";
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
import { DeudaForm } from "./DeudaForm";
import { AbonoForm } from "./AbonoForm";
import { PagoCompletoForm } from "./PagoCompletoForm";
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
      
      const currentMonth = new Date();
      const cobradoMes = deudasData
        .filter(d => {
          const createdDate = new Date(d.created_at);
          return d.estado === 'pagado' && 
                 createdDate.getMonth() === currentMonth.getMonth() &&
                 createdDate.getFullYear() === currentMonth.getFullYear();
        })
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

  const handleDeleteDeuda = async (deudaId: string) => {
    try {
      // Primero eliminar pagos relacionados
      const { error: pagosError } = await supabase
        .from('pagos')
        .delete()
        .eq('deuda_id', deudaId);

      if (pagosError) throw pagosError;

      // Luego eliminar la deuda
      const { error: deudaError } = await supabase
        .from('deudas')
        .delete()
        .eq('id', deudaId);

      if (deudaError) throw deudaError;

      toast({
        title: "Deuda eliminada",
        description: "La deuda se eliminó correctamente",
      });

      fetchDeudas();
    } catch (error) {
      console.error('Error deleting deuda:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la deuda",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGrupoDeudas = async (deudas: DeudaConCliente[]) => {
    try {
      const deudaIds = deudas.map(d => d.id);
      
      // Eliminar todos los pagos relacionados
      const { error: pagosError } = await supabase
        .from('pagos')
        .delete()
        .in('deuda_id', deudaIds);

      if (pagosError) throw pagosError;

      // Eliminar todas las deudas del grupo
      const { error: deudasError } = await supabase
        .from('deudas')
        .delete()
        .in('id', deudaIds);

      if (deudasError) throw deudasError;

      toast({
        title: "Deudas eliminadas",
        description: `Se eliminaron ${deudas.length} cuotas correctamente`,
      });

      fetchDeudas();
    } catch (error) {
      console.error('Error deleting grupo deudas:', error);
      toast({
        title: "Error",
        description: "No se pudieron eliminar las deudas",
        variant: "destructive",
      });
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

  // Agrupar deudas por concepto base (sin el sufijo de cuota)
  const agruparDeudas = (deudas: DeudaConCliente[]) => {
    const grupos: { [key: string]: DeudaConCliente[] } = {};
    
    deudas.forEach(deuda => {
      // Extraer el concepto base (sin "- Cuota X/Y")
      const conceptoBase = deuda.concepto.replace(/ - Cuota \d+\/\d+/, '');
      const clienteKey = `${deuda.cliente_id}-${conceptoBase}`;
      
      if (!grupos[clienteKey]) {
        grupos[clienteKey] = [];
      }
      grupos[clienteKey].push(deuda);
    });
    
    return grupos;
  };

  const filteredDeudas = deudas.filter(deuda =>
    deuda.concepto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deuda.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deuda.cliente.apellido.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const gruposDeudas = agruparDeudas(filteredDeudas);

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
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Deudas</h1>
            <p className="text-gray-600 mt-2">Controla los pagos y saldos pendientes</p>
          </div>
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
            <CardTitle>Registro de Deudas ({Object.keys(gruposDeudas).length} productos)</CardTitle>
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
          {Object.keys(gruposDeudas).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay deudas registradas</p>
              <div className="mt-4">
                <DeudaForm onDeudaCreated={fetchDeudas} />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(gruposDeudas).map(([key, deudas]) => {
                const primeraDeuda = deudas[0];
                const conceptoBase = primeraDeuda.concepto.replace(/ - Cuota \d+\/\d+/, '');
                const totalCuotas = deudas.length;
                const cuotasPagadas = deudas.filter(d => d.estado === 'pagado').length;
                const montoTotalGrupo = deudas.reduce((sum, d) => sum + d.monto_total, 0);
                const montoAbonadoGrupo = deudas.reduce((sum, d) => sum + d.monto_abonado, 0);
                const montoRestanteGrupo = deudas.reduce((sum, d) => sum + d.monto_restante, 0);
                const deudasPendientes = deudas.filter(d => d.estado !== 'pagado');
                
                return (
                  <Card key={key} className="border-l-4 border-l-orange-500">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900">
                            {primeraDeuda.cliente.nombre} {primeraDeuda.cliente.apellido}
                          </h3>
                          <p className="text-gray-600">{conceptoBase}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span>Cuotas: {cuotasPagadas}/{totalCuotas}</span>
                            <span>Total: ${montoTotalGrupo.toLocaleString()}</span>
                            <span>Restante: ${montoRestanteGrupo.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge 
                              className={montoRestanteGrupo <= 0 ? 'text-green-700 bg-green-100' : 'text-orange-700 bg-orange-100'}
                              variant="outline"
                            >
                              {montoRestanteGrupo <= 0 ? 'Pagado' : 'Pendiente'}
                            </Badge>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                  <X className="h-4 w-4 mr-1" />
                                  Eliminar Todas
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar todas las cuotas?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción eliminará permanentemente todas las {totalCuotas} cuotas de "{conceptoBase}" y todos sus pagos asociados. Esta acción no se puede deshacer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleDeleteGrupoDeudas(deudas)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Eliminar Todas
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                          {deudasPendientes.length > 1 && (
                            <div>
                              <PagoCompletoForm deudas={deudasPendientes} onPagoCreated={fetchDeudas} />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {deudas.map((deuda, index) => (
                          <div key={deuda.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-sm font-semibold">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  ${deuda.monto_total.toLocaleString()}
                                </p>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(deuda.fecha_vencimiento).toLocaleDateString('es-AR')}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right text-sm">
                                <p className="text-gray-600">
                                  Abonado: ${deuda.monto_abonado.toLocaleString()}
                                </p>
                                <p className={deuda.monto_restante > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>
                                  Resta: ${deuda.monto_restante.toLocaleString()}
                                </p>
                              </div>
                              <Badge 
                                className={getEstadoBadge(deuda.estado).color}
                                variant="outline"
                              >
                                {deuda.estado.charAt(0).toUpperCase() + deuda.estado.slice(1)}
                              </Badge>
                              <div className="flex items-center gap-2">
                                {deuda.estado !== 'pagado' && (
                                  <AbonoForm deuda={deuda} onAbonoCreated={fetchDeudas} />
                                )}
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4" />
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
                                        Esta acción eliminará permanentemente la deuda y todos sus pagos asociados. Esta acción no se puede deshacer.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteDeuda(deuda.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Eliminar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
