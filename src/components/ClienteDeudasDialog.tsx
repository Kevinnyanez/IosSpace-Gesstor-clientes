import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AbonoForm } from "./AbonoForm";
import { PagoCompletoForm } from "./PagoCompletoForm";
import type { Cliente, DeudaConCliente } from "@/types";
import { MONEDAS } from "@/types";

interface ClienteDeudasDialogProps {
  cliente: Cliente;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeudaUpdated?: () => void;
}

export function ClienteDeudasDialog({ cliente, open, onOpenChange, onDeudaUpdated }: ClienteDeudasDialogProps) {
  const [deudas, setDeudas] = useState<DeudaConCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open) fetchDeudas();
  }, [open, cliente.id]);

  const fetchDeudas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('deudas')
        .select('*, cliente:clientes(*)')
        .eq('cliente_id', cliente.id)
        .order('fecha_vencimiento', { ascending: true });
      if (error) throw error;
      setDeudas(data || []);
    } catch (error) {
      console.error('Error fetching deudas:', error);
      toast({ title: "Error", description: "No se pudieron cargar las deudas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeudaUpdated = () => { fetchDeudas(); onDeudaUpdated?.(); };

  const deudasPorConcepto: Record<string, DeudaConCliente[]> = {};
  deudas.forEach(d => {
    const key = d.concepto.replace(/ - Cuota \d+\/\d+/, '');
    if (!deudasPorConcepto[key]) deudasPorConcepto[key] = [];
    deudasPorConcepto[key].push(d);
  });

  const totalesARS = deudas.filter(d => d.moneda === 'ARS').reduce((a, d) => ({ total: a.total + d.monto_total, restante: a.restante + d.monto_restante, abonado: a.abonado + d.monto_abonado }), { total: 0, restante: 0, abonado: 0 });
  const totalesUSD = deudas.filter(d => d.moneda === 'USD').reduce((a, d) => ({ total: a.total + d.monto_total, restante: a.restante + d.monto_restante, abonado: a.abonado + d.monto_abonado }), { total: 0, restante: 0, abonado: 0 });

  const deudasPendientes = deudas.filter(d => d.estado !== 'pagado');
  const deudasPagadas = deudas.filter(d => d.monto_restante <= 0);
  const tieneVencidas = deudas.some(d => d.estado === 'vencido');
  const todoAlDia = (totalesARS.restante + totalesUSD.restante) <= 0;

  const limpiarDeudasPagadas = async () => {
    if (deudasPagadas.length === 0) return;
    try {
      const ids = deudasPagadas.map(d => d.id);
      for (const id of ids) { await supabase.from('pagos').delete().eq('deuda_id', id); }
      const { error } = await supabase.from('deudas').delete().in('id', ids);
      if (error) throw error;
      toast({ title: "Limpieza completa", description: `Se eliminaron ${deudasPagadas.length} deudas pagadas` });
      fetchDeudas();
      onDeudaUpdated?.();
    } catch (error) {
      console.error('Error limpiando deudas pagadas:', error);
      toast({ title: "Error", description: "No se pudieron eliminar las deudas pagadas", variant: "destructive" });
    }
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Deudas - ${cliente.nombre} ${cliente.apellido}</title>
<style>body{font-family:Arial,sans-serif;padding:20px;color:#000}.header{border-bottom:3px solid #2563eb;padding-bottom:15px;margin-bottom:20px}.header h1{margin:0;font-size:22px;color:#1e40af}.header-info{margin-top:8px;font-size:13px;color:#666}
table{width:100%;border-collapse:collapse;margin-top:12px}thead tr{background:#f3f4f6;border-bottom:2px solid #e5e7eb}th{padding:10px;text-align:left;font-size:11px;font-weight:bold;color:#666;text-transform:uppercase}tbody tr{border-bottom:1px solid #e5e7eb}tbody tr:nth-child(even){background:#f9fafb}td{padding:10px;font-size:13px}
.badge{display:inline-block;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:bold;text-transform:uppercase}.b-pagado{background:#d1fae5;color:#065f46}.b-vencido{background:#fee2e2;color:#991b1b}.b-pendiente{background:#fef3c7;color:#92400e}
.footer{margin-top:30px;padding-top:12px;border-top:2px solid #e5e7eb;text-align:center;font-size:11px;color:#666}</style></head><body>
<div class="header"><h1>Estado de Deudas</h1><div class="header-info"><strong>Cliente:</strong> ${cliente.nombre} ${cliente.apellido}<br>${cliente.telefono ? `<strong>Tel:</strong> ${cliente.telefono}<br>` : ''}<strong>Fecha:</strong> ${new Date().toLocaleDateString('es-AR')}</div></div>
${Object.entries(deudasPorConcepto).map(([concepto, ds]) => {
  const total = ds.reduce((s, d) => s + d.monto_total, 0);
  const resta = ds.reduce((s, d) => s + d.monto_restante, 0);
  return `<h3 style="margin:20px 0 5px;font-size:15px;border-left:4px solid #2563eb;padding-left:10px">${concepto} <span style="font-weight:normal;font-size:12px;color:#666">· Total: $${total.toLocaleString()} ${ds[0]?.moneda || 'ARS'}${resta > 0 ? ` · Resta: $${resta.toLocaleString()}` : ''}</span></h3>
<table><thead><tr><th>#</th><th>Vence</th><th>Estado</th><th>Precio</th><th>Recargo</th><th>Total</th><th>Abonado</th><th>Resta</th></tr></thead><tbody>
${ds.map((d, i) => {
  const precio = d.monto_total - d.recargos;
  const bc = d.estado === 'pagado' ? 'b-pagado' : d.estado === 'vencido' ? 'b-vencido' : 'b-pendiente';
  return `<tr><td style="font-weight:bold">${i + 1}</td><td>${new Date(d.fecha_vencimiento).toLocaleDateString('es-AR')}</td><td><span class="badge ${bc}">${d.estado}</span></td><td>$${precio.toLocaleString()}</td><td style="color:#ea580c">${d.recargos > 0 ? `$${d.recargos.toLocaleString()}` : '—'}</td><td style="font-weight:bold">$${d.monto_total.toLocaleString()}</td><td style="color:#16a34a">$${d.monto_abonado.toLocaleString()}</td><td style="font-weight:bold;color:${d.monto_restante > 0 ? '#dc2626' : '#16a34a'}">$${d.monto_restante.toLocaleString()}</td></tr>`;
}).join('')}
</tbody></table>`;
}).join('')}
<div class="footer"><p><strong>IosSpace</strong> - Sistema de Gestión de Deudas</p><p>Desarrollado por <strong>AppyStudios</strong></p></div></body></html>`);
    w.document.close();
    w.onload = () => { setTimeout(() => w.print(), 250); };
  };

  const handlePrintDeuda = (conceptoBase: string, ds: DeudaConCliente[]) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const total = ds.reduce((s, d) => s + d.monto_total, 0);
    const resta = ds.reduce((s, d) => s + d.monto_restante, 0);
    const abonado = ds.reduce((s, d) => s + d.monto_abonado, 0);
    const recargos = ds.reduce((s, d) => s + d.recargos, 0);
    w.document.write(`<!DOCTYPE html><html><head><title>Deuda - ${cliente.nombre} ${cliente.apellido}</title>
<style>body{font-family:Arial,sans-serif;padding:20px;color:#000}.header{border-bottom:3px solid #2563eb;padding-bottom:15px;margin-bottom:20px}.header h1{margin:0;font-size:22px;color:#1e40af}.header-info{margin-top:8px;font-size:13px;color:#666}
.resumen{background:#f0f9ff;padding:15px;border-radius:8px;margin-bottom:20px;border-left:4px solid #2563eb;display:grid;grid-template-columns:repeat(4,1fr);gap:15px}.resumen div h4{margin:0 0 4px;font-size:11px;color:#666;text-transform:uppercase}.resumen div p{margin:0;font-size:18px;font-weight:bold}
table{width:100%;border-collapse:collapse;margin-top:12px}thead tr{background:#f3f4f6;border-bottom:2px solid #e5e7eb}th{padding:10px;text-align:left;font-size:11px;font-weight:bold;color:#666;text-transform:uppercase}tbody tr{border-bottom:1px solid #e5e7eb}tbody tr:nth-child(even){background:#f9fafb}td{padding:10px;font-size:13px}
.badge{display:inline-block;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:bold;text-transform:uppercase}.b-pagado{background:#d1fae5;color:#065f46}.b-vencido{background:#fee2e2;color:#991b1b}.b-pendiente{background:#fef3c7;color:#92400e}
.footer{margin-top:30px;padding-top:12px;border-top:2px solid #e5e7eb;text-align:center;font-size:11px;color:#666}</style></head><body>
<div class="header"><h1>Detalle de Deuda</h1><div class="header-info"><strong>Cliente:</strong> ${cliente.nombre} ${cliente.apellido}<br>${cliente.telefono ? `<strong>Tel:</strong> ${cliente.telefono}<br>` : ''}<strong>Concepto:</strong> ${conceptoBase}<br><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-AR')}</div></div>
<div class="resumen"><div><h4>Total</h4><p>$${total.toLocaleString()}</p></div><div><h4>Abonado</h4><p style="color:#16a34a">$${abonado.toLocaleString()}</p></div><div><h4>Restante</h4><p style="color:${resta > 0 ? '#dc2626' : '#16a34a'}">$${resta.toLocaleString()}</p></div><div><h4>Recargos</h4><p style="color:${recargos > 0 ? '#ea580c' : '#666'}">${recargos > 0 ? `$${recargos.toLocaleString()}` : '—'}</p></div></div>
<table><thead><tr><th>#</th><th>Vence</th><th>Estado</th><th>Precio</th><th>Recargo</th><th>Total</th><th>Abonado</th><th>Resta</th></tr></thead><tbody>
${ds.map((d, i) => {
  const precio = d.monto_total - d.recargos;
  const bc = d.estado === 'pagado' ? 'b-pagado' : d.estado === 'vencido' ? 'b-vencido' : 'b-pendiente';
  return `<tr><td style="font-weight:bold">${i + 1}</td><td>${new Date(d.fecha_vencimiento).toLocaleDateString('es-AR')}</td><td><span class="badge ${bc}">${d.estado}</span></td><td>$${precio.toLocaleString()}</td><td style="color:#ea580c">${d.recargos > 0 ? `$${d.recargos.toLocaleString()}` : '—'}</td><td style="font-weight:bold">$${d.monto_total.toLocaleString()}</td><td style="color:#16a34a">$${d.monto_abonado.toLocaleString()}</td><td style="font-weight:bold;color:${d.monto_restante > 0 ? '#dc2626' : '#16a34a'}">$${d.monto_restante.toLocaleString()}</td></tr>`;
}).join('')}
</tbody></table>
<div class="footer"><p><strong>IosSpace</strong> - Sistema de Gestión de Deudas</p><p>Desarrollado por <strong>AppyStudios</strong></p></div></body></html>`);
    w.document.close();
    w.onload = () => { setTimeout(() => w.print(), 250); };
  };

  const statusBorder = todoAlDia && deudas.length > 0 ? 'border-l-emerald-500' : tieneVencidas ? 'border-l-red-500' : 'border-l-blue-500';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                todoAlDia && deudas.length > 0 ? 'bg-emerald-100 text-emerald-700' : tieneVencidas ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {cliente.nombre.charAt(0)}{cliente.apellido.charAt(0)}
              </div>
              <div>
                <DialogTitle className="text-lg">{cliente.nombre} {cliente.apellido}</DialogTitle>
                {cliente.telefono && <p className="text-xs text-gray-400">{cliente.telefono}</p>}
              </div>
            </div>
            {!loading && deudas.length > 0 && (
              <Button onClick={handlePrint} variant="outline" size="sm" className="gap-1.5 text-xs">
                <Printer className="h-3.5 w-3.5" />
                Imprimir
              </Button>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : deudas.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-sm">Este cliente no tiene deudas registradas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats compactas */}
            <Card className={`border shadow-sm border-l-4 ${statusBorder}`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary" className={`text-[10px] ${
                    todoAlDia ? 'bg-emerald-100 text-emerald-700' : tieneVencidas ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {todoAlDia ? 'Al día' : tieneVencidas ? 'Vencido' : 'Pendiente'}
                  </Badge>
                  <div className="flex items-center gap-2">
                    {deudasPagadas.length > 0 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-400 hover:text-red-600">
                            <Trash2 className="h-3 w-3 mr-1" />
                            Limpiar pagadas ({deudasPagadas.length})
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Limpiar deudas pagadas?</AlertDialogTitle>
                            <AlertDialogDescription>Se eliminarán {deudasPagadas.length} deudas completamente pagadas. No se puede deshacer.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={limpiarDeudasPagadas} className="bg-red-600 hover:bg-red-700">Limpiar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {deudasPendientes.length > 1 && (
                      <PagoCompletoForm deudas={deudasPendientes} onPagoCreated={handleDeudaUpdated} />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 divide-x divide-gray-100">
                  {totalesARS.total > 0 && (<>
                    <div className="pl-2">
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Total ARS</p>
                      <p className="text-lg font-bold text-gray-900">${totalesARS.total.toLocaleString('es-AR')}</p>
                    </div>
                    <div className="pl-3">
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Resta ARS</p>
                      <p className={`text-lg font-bold ${totalesARS.restante > 0 ? 'text-red-600' : 'text-emerald-600'}`}>${totalesARS.restante.toLocaleString('es-AR')}</p>
                    </div>
                  </>)}
                  {totalesUSD.total > 0 && (<>
                    <div className="pl-3">
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Total USD</p>
                      <p className="text-lg font-bold text-gray-900">US${totalesUSD.total.toLocaleString('en-US')}</p>
                    </div>
                    <div className="pl-3">
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Resta USD</p>
                      <p className={`text-lg font-bold ${totalesUSD.restante > 0 ? 'text-red-600' : 'text-emerald-600'}`}>US${totalesUSD.restante.toLocaleString('en-US')}</p>
                    </div>
                  </>)}
                </div>
              </CardContent>
            </Card>

            {/* Deudas por concepto */}
            <div className="space-y-3">
              {Object.entries(deudasPorConcepto).map(([concepto, ds]) => {
                const montoTotal = ds.reduce((s, d) => s + d.monto_total, 0);
                const montoResta = ds.reduce((s, d) => s + d.monto_restante, 0);
                const tieneVenc = ds.some(d => d.estado === 'vencido');
                const todoPagado = ds.every(d => d.monto_restante <= 0);
                const border = todoPagado ? 'border-l-emerald-500' : tieneVenc ? 'border-l-red-500' : 'border-l-blue-500';
                const simb = MONEDAS[ds[0]?.moneda as keyof typeof MONEDAS]?.simbolo ?? '$';

                return (
                  <div key={concepto} className={`rounded-lg border bg-white border-gray-200 border-l-4 ${border}`}>
                    <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-100">
                      <div>
                        <h4 className="font-medium text-sm text-gray-900">{concepto}</h4>
                        <span className="text-xs text-gray-500">
                          {simb}{montoTotal.toLocaleString()} {ds[0]?.moneda}
                          {montoResta > 0 && <span className="text-red-500 ml-1">· Resta: {simb}{montoResta.toLocaleString()}</span>}
                        </span>
                      </div>
                      <Button onClick={() => handlePrintDeuda(concepto, ds)} variant="ghost" size="sm" className="h-7 text-xs text-gray-400 hover:text-gray-700">
                        <Printer className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[10px] text-gray-400 uppercase tracking-wider bg-gray-50/80">
                            <th className="text-left font-medium py-1.5 px-3 w-8">#</th>
                            <th className="text-left font-medium py-1.5 px-3">Vence</th>
                            <th className="text-center font-medium py-1.5 px-3">Estado</th>
                            <th className="text-right font-medium py-1.5 px-3">Precio</th>
                            <th className="text-right font-medium py-1.5 px-3">Recargo</th>
                            <th className="text-right font-medium py-1.5 px-3">Total</th>
                            <th className="text-right font-medium py-1.5 px-3">Abonado</th>
                            <th className="text-right font-medium py-1.5 px-3">Resta</th>
                            <th className="text-right font-medium py-1.5 px-3 w-16"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {ds.map((d, i) => {
                            const precio = d.monto_total - d.recargos;
                            const badgeClass = d.estado === 'pagado' ? 'bg-emerald-100 text-emerald-700' : d.estado === 'vencido' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
                            return (
                              <tr key={d.id} className="hover:bg-gray-50/50 group">
                                <td className="px-3 py-2 font-semibold text-gray-500">{i + 1}</td>
                                <td className="px-3 py-2 text-gray-600">{new Date(d.fecha_vencimiento).toLocaleDateString('es-AR')}</td>
                                <td className="px-3 py-2 text-center">
                                  <Badge variant="secondary" className={`text-[9px] ${badgeClass}`}>
                                    {d.estado.charAt(0).toUpperCase() + d.estado.slice(1)}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 text-right text-gray-700">{simb}{precio.toLocaleString()}</td>
                                <td className="px-3 py-2 text-right text-orange-600">{d.recargos > 0 ? `${simb}${d.recargos.toLocaleString()}` : '—'}</td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-900">{simb}{d.monto_total.toLocaleString()}</td>
                                <td className="px-3 py-2 text-right text-emerald-600">{simb}{d.monto_abonado.toLocaleString()}</td>
                                <td className={`px-3 py-2 text-right font-semibold ${d.monto_restante > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{simb}{d.monto_restante.toLocaleString()}</td>
                                <td className="px-3 py-2 text-right">
                                  {d.estado !== 'pagado' && (
                                    <div className="opacity-50 group-hover:opacity-100 transition-opacity">
                                      <AbonoForm deuda={d} onAbonoCreated={handleDeudaUpdated} />
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
