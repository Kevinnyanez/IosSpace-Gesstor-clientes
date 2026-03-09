
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Edit, Trash2, Eye } from "lucide-react";
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
import { ClienteForm } from "./ClienteForm";
import { ClienteDeudasDialog } from "./ClienteDeudasDialog";
import type { Cliente } from "@/types";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

type DebtStatus = 'sin_deudas' | 'al_dia' | 'pendiente' | 'vencido';

interface ClienteDebtInfo {
  status: DebtStatus;
  total: number;
  restante: number;
}

export function ClientesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [viewingDeudasCliente, setViewingDeudasCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [debtMap, setDebtMap] = useState<Record<string, ClienteDebtInfo>>({});
  const itemsPerPage = 15;
  const { toast } = useToast();

  useEffect(() => { fetchClientes(); }, []);

  const fetchClientes = async () => {
    try {
      const [clientesRes, deudasRes] = await Promise.all([
        supabase.from('clientes').select('*').order('created_at', { ascending: false }),
        supabase.from('deudas').select('cliente_id, estado, monto_total, monto_restante'),
      ]);
      if (clientesRes.error) throw clientesRes.error;
      setClientes(clientesRes.data || []);

      const map: Record<string, ClienteDebtInfo> = {};
      (deudasRes.data || []).forEach((d: any) => {
        if (!map[d.cliente_id]) map[d.cliente_id] = { status: 'sin_deudas', total: 0, restante: 0 };
        map[d.cliente_id].total += d.monto_total;
        map[d.cliente_id].restante += d.monto_restante;
        if (d.estado === 'vencido') map[d.cliente_id].status = 'vencido';
        else if (d.estado === 'pendiente' && map[d.cliente_id].status !== 'vencido') map[d.cliente_id].status = 'pendiente';
        else if (d.estado === 'pagado' && map[d.cliente_id].status === 'sin_deudas') map[d.cliente_id].status = 'al_dia';
      });
      Object.values(map).forEach(info => {
        if (info.restante <= 0 && info.status !== 'sin_deudas') info.status = 'al_dia';
      });
      setDebtMap(map);
    } catch (error) {
      console.error('Error fetching clientes:', error);
      toast({ title: "Error", description: "No se pudieron cargar los clientes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCliente = async (clienteId: string) => {
    try {
      const { error } = await supabase.from('clientes').delete().eq('id', clienteId);
      if (error) throw error;
      toast({ title: "Cliente eliminado", description: "El cliente se eliminó correctamente" });
      fetchClientes();
    } catch (error) {
      console.error('Error deleting cliente:', error);
      toast({ title: "Error", description: "No se pudo eliminar el cliente", variant: "destructive" });
    }
  };

  const filteredClientes = clientes.filter(cliente => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      `${cliente.nombre} ${cliente.apellido}`.toLowerCase().includes(s) ||
      cliente.email?.toLowerCase().includes(s) ||
      cliente.telefono?.includes(searchTerm)
    );
  });

  const clientesOrdenados = [...filteredClientes].sort((a, b) =>
    `${a.nombre} ${a.apellido}`.toLowerCase().localeCompare(`${b.nombre} ${b.apellido}`.toLowerCase())
  );

  const totalPages = Math.ceil(clientesOrdenados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const clientesPaginados = clientesOrdenados.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const clientesActivos = clientes.filter(c => c.activo).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              Clientes
            </h1>
            <p className="text-sm text-gray-500">Administra tu base de clientes</p>
          </div>
        </div>
        <ClienteForm onClienteCreated={fetchClientes} />
      </div>

      <Card className="border shadow-sm">
        <CardContent className="py-4">
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            <div className="pl-2">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{clientes.length}</p>
            </div>
            <div className="pl-4">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Activos</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{clientesActivos}</p>
            </div>
            <div className="pl-4">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Inactivos</p>
              <p className="text-2xl font-bold text-red-500 mt-1">{clientes.length - clientesActivos}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">
              Lista de clientes
              <span className="text-xs font-normal text-gray-400 ml-2">
                {clientesOrdenados.length} resultados
              </span>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-56 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {clientesOrdenados.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-gray-400 text-sm">
                {searchTerm ? 'Sin resultados' : 'No hay clientes registrados'}
              </p>
              {!searchTerm && <div className="mt-4"><ClienteForm onClienteCreated={fetchClientes} /></div>}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-b border-gray-100 bg-gray-50/80">
                      <th className="text-left font-medium text-gray-500 text-xs uppercase tracking-wider px-4 py-2.5">Cliente</th>
                      <th className="text-left font-medium text-gray-500 text-xs uppercase tracking-wider px-4 py-2.5">Teléfono</th>
                      <th className="text-center font-medium text-gray-500 text-xs uppercase tracking-wider px-4 py-2.5">Deudas</th>
                      <th className="text-left font-medium text-gray-500 text-xs uppercase tracking-wider px-4 py-2.5 hidden lg:table-cell">Registro</th>
                      <th className="text-right font-medium text-gray-500 text-xs uppercase tracking-wider px-4 py-2.5">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {clientesPaginados.map((cliente) => {
                      const debt = debtMap[cliente.id];
                      const debtBadge = !debt || debt.status === 'sin_deudas'
                        ? { label: 'Sin deudas', className: 'bg-gray-100 text-gray-500' }
                        : debt.status === 'al_dia'
                        ? { label: 'Al día', className: 'bg-emerald-100 text-emerald-700' }
                        : debt.status === 'vencido'
                        ? { label: 'Vencido', className: 'bg-red-100 text-red-700' }
                        : { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' };

                      return (
                      <tr key={cliente.id} className="hover:bg-blue-50/50 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              debt?.status === 'vencido' ? 'bg-red-100 text-red-700'
                              : debt?.status === 'pendiente' ? 'bg-blue-100 text-blue-700'
                              : debt?.status === 'al_dia' ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                            }`}>
                              {cliente.nombre.charAt(0)}{cliente.apellido.charAt(0)}
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">{cliente.nombre} {cliente.apellido}</span>
                              {cliente.direccion && <p className="text-[11px] text-gray-400 truncate max-w-[200px]">{cliente.direccion}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{cliente.telefono || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="secondary" className={`text-[10px] ${debtBadge.className}`}>
                            {debtBadge.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                          {new Date(cliente.fecha_registro).toLocaleDateString('es-AR')}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-gray-500 hover:text-blue-600"
                              onClick={() => setViewingDeudasCliente(cliente)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Deudas
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-gray-500 hover:text-blue-600"
                              onClick={() => setEditingCliente(cliente)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-400 hover:text-red-600">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar a {cliente.nombre} {cliente.apellido}?</AlertDialogTitle>
                                  <AlertDialogDescription>Se eliminarán el cliente y todas sus deudas asociadas. No se puede deshacer.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteCliente(cliente.id)} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="py-4 flex items-center justify-center border-t border-gray-100">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage(currentPage - 1); }} className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                          return (<PaginationItem key={page}><PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(page); }} isActive={currentPage === page} className="cursor-pointer">{page}</PaginationLink></PaginationItem>);
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return (<PaginationItem key={page}><PaginationEllipsis /></PaginationItem>);
                        }
                        return null;
                      })}
                      <PaginationItem>
                        <PaginationNext href="#" onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) setCurrentPage(currentPage + 1); }} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
              <div className="pb-3 text-center text-xs text-gray-400">
                {startIndex + 1} – {Math.min(startIndex + itemsPerPage, clientesOrdenados.length)} de {clientesOrdenados.length}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {editingCliente && (
        <ClienteForm
          cliente={editingCliente}
          onClienteCreated={() => { fetchClientes(); setEditingCliente(null); }}
          onClose={() => setEditingCliente(null)}
        />
      )}

      {viewingDeudasCliente && (
        <ClienteDeudasDialog
          cliente={viewingDeudasCliente}
          open={!!viewingDeudasCliente}
          onOpenChange={(open) => !open && setViewingDeudasCliente(null)}
          onDeudaUpdated={fetchClientes}
        />
      )}
    </div>
  );
}
