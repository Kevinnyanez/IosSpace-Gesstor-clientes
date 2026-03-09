import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, DollarSign, AlertTriangle, Calendar, Eye, Trash2, X, Printer, ChevronDown, CreditCard, TrendingUp, Loader2 } from "lucide-react";
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
import { AplicarRecargosForm } from "./AplicarRecargosForm";
import { HistorialPagos } from "./HistorialPagos";
import { MONEDAS, type DeudaConCliente } from "@/types";
import { calcularRecargoPorDiasYMeses, calcularRecargoConDesglose, getPorcentajesRecargo, calcularRecargoSimpleDiario } from "@/lib/recargos";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function DeudasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [deudas, setDeudas] = useState<DeudaConCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('deudas');
  const [currentPage, setCurrentPage] = useState(1);
  const [detalleRecargoModalDeuda, setDetalleRecargoModalDeuda] = useState<DeudaConCliente | null>(null);
  const itemsPerPage = 10; // Clientes por página
  const [stats, setStats] = useState({
    totalAdeudadoARS: 0,
    totalAdeudadoUSD: 0,
    recargosAplicadosARS: 0,
    recargosAplicadosUSD: 0,
    cobradoMesARS: 0,
    cobradoMesUSD: 0,
    deudasActivas: 0,
    deudasConRecargo: 0,
    pagosCompletados: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchDeudas();
    // Aplicar recargos automáticamente al cargar la página
    aplicarRecargosAutomaticosAlCargar();
  }, []);

  const aplicarRecargosAutomaticosAlCargar = async () => {
    try {
      console.log('Aplicando recargos automáticos al cargar...');
      
      // Obtener deudas vencidas
      const { data: deudasVencidas, error: deudasError } = await supabase
        .from('deudas')
        .select('*')
        .in('estado', ['pendiente', 'vencido'])
        .gt('monto_restante', 0);

      if (deudasError) {
        console.error('Error obteniendo deudas:', deudasError);
        return;
      }

      // Filtrar las que están vencidas; no aplicar si ya se aplicó recargo hoy (evitar duplicar)
      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999);
      const hoyInicio = new Date(hoy);
      hoyInicio.setHours(0, 0, 0, 0);

      const deudasParaRecargo = deudasVencidas?.filter(deuda => {
        const fechaVencimiento = new Date(deuda.fecha_vencimiento);
        fechaVencimiento.setHours(0, 0, 0, 0);
        const estaVencida = fechaVencimiento <= hoy;
        const yaAplicadoHoy = deuda.fecha_ultimo_recargo && (() => {
          const ultimo = new Date(deuda.fecha_ultimo_recargo);
          ultimo.setHours(0, 0, 0, 0);
          return ultimo.getTime() >= hoyInicio.getTime();
        })();
        return estaVencida && !yaAplicadoHoy;
      }) || [];

      if (deudasParaRecargo.length === 0) {
        console.log('No hay deudas para aplicar recargo automático');
        return;
      }

      // Aplicar recargos: 0,5% por día + 10% cada 30 días desde el vencimiento
      for (const deuda of deudasParaRecargo) {
        const fechaVencimiento = new Date(deuda.fecha_vencimiento);
        fechaVencimiento.setHours(0, 0, 0, 0);
        const hasta = new Date();
        hasta.setHours(23, 59, 59, 999);

        let fechaDesde: Date;
        if (deuda.fecha_ultimo_recargo) {
          fechaDesde = new Date(deuda.fecha_ultimo_recargo);
          fechaDesde.setHours(0, 0, 0, 0);
          fechaDesde.setDate(fechaDesde.getDate() + 1);
        } else {
          fechaDesde = new Date(fechaVencimiento);
        }

        // Recargo sobre lo que aún debe (monto_restante), no sobre el total; así se tiene en cuenta si abonó
        const baseParaRecargo = deuda.monto_restante ?? deuda.monto_total;
        const montoTotalRecargos = calcularRecargoPorDiasYMeses(
          baseParaRecargo,
          fechaDesde,
          hasta
        );

        if (montoTotalRecargos > 0) {
          const nuevoMontoTotal = deuda.monto_total + montoTotalRecargos;
          await supabase
            .from('deudas')
            .update({
              recargos: deuda.recargos + montoTotalRecargos,
              monto_total: nuevoMontoTotal,
              estado: 'vencido',
              fecha_ultimo_recargo: new Date().toISOString()
            })
            .eq('id', deuda.id);
        }
      }
      
      console.log('Recargos automáticos aplicados al cargar la página');
    } catch (error) {
      console.error('Error aplicando recargos automáticos:', error);
    }
  };

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
      
      // Calcular estadísticas por moneda
      const totalAdeudadoARS = deudasData
        .filter(d => d.estado !== 'pagado' && d.moneda === 'ARS')
        .reduce((sum, d) => sum + d.monto_restante, 0);
      
      const totalAdeudadoUSD = deudasData
        .filter(d => d.estado !== 'pagado' && d.moneda === 'USD')
        .reduce((sum, d) => sum + d.monto_restante, 0);
      
      const recargosAplicadosARS = deudasData
        .filter(d => d.moneda === 'ARS')
        .reduce((sum, d) => sum + d.recargos, 0);
      
      const recargosAplicadosUSD = deudasData
        .filter(d => d.moneda === 'USD')
        .reduce((sum, d) => sum + d.recargos, 0);
      
      // Obtener historial de pagos del mes actual
      const currentMonth = new Date();
      const { data: historialData } = await supabase
        .from('historial_pagos')
        .select('*')
        .gte('fecha_pago', `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-01`)
        .lt('fecha_pago', `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 2).padStart(2, '0')}-01`);

      const cobradoMesARS = (historialData || [])
        .filter(h => h.moneda === 'ARS')
        .reduce((sum, h) => sum + h.monto_pago, 0);

      const cobradoMesUSD = (historialData || [])
        .filter(h => h.moneda === 'USD')
        .reduce((sum, h) => sum + h.monto_pago, 0);

      setStats({
        totalAdeudadoARS,
        totalAdeudadoUSD,
        recargosAplicadosARS,
        recargosAplicadosUSD,
        cobradoMesARS,
        cobradoMesUSD,
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

  const handlePrintDeuda = (cliente: DeudaConCliente['cliente'], conceptoBase: string, deudasConcepto: DeudaConCliente[]) => {
    // Crear una nueva ventana para imprimir todas las cuotas de esta deuda
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Calcular totales del concepto
    const montoTotalConcepto = deudasConcepto.reduce((sum, d) => sum + d.monto_total, 0);
    const montoAbonadoConcepto = deudasConcepto.reduce((sum, d) => sum + d.monto_abonado, 0);
    const montoRestanteConcepto = deudasConcepto.reduce((sum, d) => sum + d.monto_restante, 0);
    const recargosConcepto = deudasConcepto.reduce((sum, d) => sum + d.recargos, 0);

    // Generar el HTML para imprimir todas las cuotas de la deuda
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Deuda - ${cliente.nombre} ${cliente.apellido}</title>
          <style>
            @media print {
              @page {
                margin: 1cm;
              }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #000;
            }
            .header {
              border-bottom: 3px solid #2563eb;
              padding-bottom: 15px;
              margin-bottom: 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              color: #1e40af;
            }
            .header-info {
              margin-top: 10px;
              font-size: 14px;
              color: #666;
            }
            .resumen {
              background: #f0f9ff;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
              border-left: 4px solid #2563eb;
            }
            .resumen-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
            }
            .resumen-item h3 {
              margin: 0 0 5px 0;
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
            }
            .resumen-item p {
              margin: 0;
              font-size: 20px;
              font-weight: bold;
            }
            .concepto-section {
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            .concepto-header {
              background: #fff7ed;
              padding: 12px;
              border-left: 4px solid #f97316;
              margin-bottom: 10px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .concepto-header h3 {
              margin: 0;
              font-size: 16px;
              font-weight: bold;
            }
            .concepto-totales {
              font-size: 14px;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
              background: white;
            }
            thead tr {
              background: #f3f4f6;
              border-bottom: 2px solid #e5e7eb;
            }
            th {
              padding: 12px;
              text-align: left;
              font-size: 12px;
              font-weight: bold;
              color: #666;
              text-transform: uppercase;
              border-right: 1px solid #e5e7eb;
            }
            tbody tr {
              border-bottom: 1px solid #e5e7eb;
            }
            tbody tr:nth-child(even) {
              background: #f9fafb;
            }
            td {
              padding: 15px;
              font-size: 14px;
              border-right: 1px solid #e5e7eb;
            }
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            .recargo {
              color: #ea580c;
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Detalle de Deuda</h1>
            <div class="header-info">
              <strong>Cliente:</strong> ${cliente.nombre} ${cliente.apellido}<br>
              ${cliente.telefono ? `<strong>Teléfono:</strong> ${cliente.telefono}<br>` : ''}
              ${cliente.email ? `<strong>Email:</strong> ${cliente.email}<br>` : ''}
              <strong>Fecha de impresión:</strong> ${new Date().toLocaleDateString('es-AR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>

          <div class="resumen">
            <div class="resumen-grid">
              <div class="resumen-item">
                <h3>Total de la Deuda</h3>
                <p>${deudasConcepto[0]?.moneda === 'USD' ? 'US$' : '$'}${montoTotalConcepto.toLocaleString()} ${deudasConcepto[0]?.moneda || 'ARS'}</p>
              </div>
              <div class="resumen-item">
                <h3>Monto Abonado</h3>
                <p style="color: #16a34a">
                  ${deudasConcepto[0]?.moneda === 'USD' ? 'US$' : '$'}${montoAbonadoConcepto.toLocaleString()} ${deudasConcepto[0]?.moneda || 'ARS'}
                </p>
              </div>
              <div class="resumen-item">
                <h3>Monto Restante</h3>
                <p style="color: ${montoRestanteConcepto > 0 ? '#dc2626' : '#16a34a'}">
                  ${deudasConcepto[0]?.moneda === 'USD' ? 'US$' : '$'}${montoRestanteConcepto.toLocaleString()} ${deudasConcepto[0]?.moneda || 'ARS'}
                </p>
              </div>
            </div>
            ${recargosConcepto > 0 ? `
              <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #e5e7eb;">
                <h3 style="margin: 0 0 5px 0; font-size: 12px; color: #666; text-transform: uppercase;">Total Recargos Aplicados</h3>
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #ea580c;">
                  ${deudasConcepto[0]?.moneda === 'USD' ? 'US$' : '$'}${recargosConcepto.toLocaleString()} ${deudasConcepto[0]?.moneda || 'ARS'}
                </p>
              </div>
            ` : ''}
          </div>

          <div class="concepto-section">
            <div class="concepto-header">
              <h3>${conceptoBase}</h3>
              <div class="concepto-totales">
                ${deudasConcepto.length} ${deudasConcepto.length === 1 ? 'cuota' : 'cuotas'} registradas
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Cuota</th>
                  <th>Monto Total</th>
                  <th>Fecha Vencimiento</th>
                  <th>Abonado</th>
                  <th>Restante</th>
                  <th>Recargos</th>
                  <th style="text-align: center;">Estado</th>
                </tr>
              </thead>
              <tbody>
                ${deudasConcepto.map((deuda, index) => {
                  return `
                    <tr>
                      <td style="font-weight: bold; color: #9a3412;">
                        ${index + 1} / ${deudasConcepto.length}
                      </td>
                      <td style="font-weight: bold;">
                        ${deuda.moneda === 'USD' ? 'US$' : '$'}${deuda.monto_total.toLocaleString()} ${deuda.moneda}
                      </td>
                      <td>
                        ${new Date(deuda.fecha_vencimiento).toLocaleDateString('es-AR', { 
                          weekday: 'short', 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric' 
                        })}
                      </td>
                      <td style="color: #16a34a; font-weight: bold;">
                        ${deuda.moneda === 'USD' ? 'US$' : '$'}${deuda.monto_abonado.toLocaleString()}
                      </td>
                      <td style="font-weight: bold; color: ${deuda.monto_restante > 0 ? '#dc2626' : '#16a34a'};">
                        ${deuda.moneda === 'USD' ? 'US$' : '$'}${deuda.monto_restante.toLocaleString()}
                      </td>
                      <td style="color: ${deuda.recargos > 0 ? '#ea580c' : '#666'}; font-weight: ${deuda.recargos > 0 ? 'bold' : 'normal'};">
                        ${deuda.recargos > 0 ? `${deuda.moneda === 'USD' ? 'US$' : '$'}${deuda.recargos.toLocaleString()}` : '-'}
                      </td>
                      <td style="text-align: center;">
                        <span style="display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; 
                          background: ${deuda.estado === 'pagado' ? '#d1fae5' : deuda.estado === 'vencido' ? '#fee2e2' : '#fef3c7'}; 
                          color: ${deuda.estado === 'pagado' ? '#065f46' : deuda.estado === 'vencido' ? '#991b1b' : '#92400e'};">
                          ${deuda.estado.charAt(0).toUpperCase() + deuda.estado.slice(1)}
                        </span>
                      </td>
                    </tr>
                    ${deuda.notas ? `
                      <tr>
                        <td colspan="7" style="padding: 10px 15px; background: #f0f9ff; border-left: 3px solid #2563eb;">
                          <strong style="font-size: 11px; color: #666; text-transform: uppercase;">Notas Cuota ${index + 1}:</strong>
                          <span style="font-size: 12px; color: #000; margin-left: 5px;">${deuda.notas}</span>
                        </td>
                      </tr>
                    ` : ''}
                  `;
                }).join('')}
                <tr style="background: #fff7ed; border-top: 3px solid #f97316; font-weight: bold;">
                  <td colspan="2">TOTALES</td>
                  <td>-</td>
                  <td style="color: #16a34a;">${deudasConcepto[0]?.moneda === 'USD' ? 'US$' : '$'}${montoAbonadoConcepto.toLocaleString()}</td>
                  <td style="color: ${montoRestanteConcepto > 0 ? '#dc2626' : '#16a34a'};">
                    ${deudasConcepto[0]?.moneda === 'USD' ? 'US$' : '$'}${montoRestanteConcepto.toLocaleString()}
                  </td>
                  <td style="color: ${recargosConcepto > 0 ? '#ea580c' : '#666'};">
                    ${recargosConcepto > 0 ? `${deudasConcepto[0]?.moneda === 'USD' ? 'US$' : '$'}${recargosConcepto.toLocaleString()}` : '-'}
                  </td>
                  <td style="text-align: center;">
                    <span style="color: ${montoRestanteConcepto <= 0 ? '#16a34a' : '#ea580c'};">
                      ${montoRestanteConcepto <= 0 ? 'PAGADO' : 'PENDIENTE'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p><strong>IosSpace</strong> - Sistema de Gestión de Deudas</p>
            <p>Desarrollado por <strong>AppyStudios</strong></p>
            <p>Documento generado el ${new Date().toLocaleDateString('es-AR')}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Esperar a que se cargue el contenido y luego imprimir
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
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

  // Agrupar deudas por cliente (todas las deudas de cada cliente juntas)
  const agruparDeudasPorCliente = (deudas: DeudaConCliente[]) => {
    const grupos: { [key: string]: DeudaConCliente[] } = {};
    
    deudas.forEach(deuda => {
      // Agrupar solo por cliente_id
      const clienteKey = deuda.cliente_id;
      
      if (!grupos[clienteKey]) {
        grupos[clienteKey] = [];
      }
      grupos[clienteKey].push(deuda);
    });
    
    // Ordenar las deudas dentro de cada grupo por fecha de vencimiento
    Object.keys(grupos).forEach(key => {
      grupos[key].sort((a, b) => 
        new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime()
      );
    });
    
    return grupos;
  };

  const filteredDeudas = deudas.filter(deuda =>
    deuda.concepto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deuda.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deuda.cliente.apellido.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const gruposDeudas = agruparDeudasPorCliente(filteredDeudas);
  
  // Obtener array de clientes ordenados por nombre
  const clientesOrdenados = Object.entries(gruposDeudas)
    .map(([clienteId, deudasCliente]) => ({
      clienteId,
      cliente: deudasCliente[0].cliente,
      deudas: deudasCliente
    }))
    .sort((a, b) => {
      const nombreA = `${a.cliente.nombre} ${a.cliente.apellido}`.toLowerCase();
      const nombreB = `${b.cliente.nombre} ${b.cliente.apellido}`.toLowerCase();
      return nombreA.localeCompare(nombreB);
    });

  // Calcular paginación
  const totalPages = Math.ceil(clientesOrdenados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const clientesPaginados = clientesOrdenados.slice(startIndex, endIndex);
  
  // Resetear a página 1 cuando cambia el término de búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
              <CreditCard className="h-6 w-6 text-blue-600" />
              Gestión de Deudas
            </h1>
            <p className="text-sm text-gray-500">Controla los pagos y saldos pendientes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AplicarRecargosForm deudas={deudas} onRecargosAplicados={fetchDeudas} />
          <DeudaForm onDeudaCreated={fetchDeudas} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="deudas">Deudas Activas</TabsTrigger>
          <TabsTrigger value="historial">Historial de Pagos</TabsTrigger>
        </TabsList>

        <TabsContent value="deudas" className="space-y-6">
          <Card className="border shadow-sm">
            <CardContent className="py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-x divide-gray-100">
                <div className="pl-2">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Adeudado</p>
                  <p className="text-lg font-bold text-red-600 mt-1">${stats.totalAdeudadoARS.toLocaleString('es-AR')}</p>
                  <p className="text-sm font-semibold text-red-500">US${stats.totalAdeudadoUSD.toLocaleString('en-US')}</p>
                </div>
                <div className="pl-4">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Recargos</p>
                  <p className="text-lg font-bold text-amber-600 mt-1">${stats.recargosAplicadosARS.toLocaleString('es-AR')}</p>
                  <p className="text-sm font-semibold text-amber-500">US${stats.recargosAplicadosUSD.toLocaleString('en-US')}</p>
                </div>
                <div className="pl-4 cursor-pointer" onClick={() => setActiveTab('historial')}>
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Cobrado (mes)</p>
                  <p className="text-lg font-bold text-emerald-600 mt-1">${stats.cobradoMesARS.toLocaleString('es-AR')}</p>
                  <p className="text-sm font-semibold text-emerald-500">US${stats.cobradoMesUSD.toLocaleString('en-US')}</p>
                </div>
                <div className="pl-4">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Activas</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{stats.deudasActivas}</p>
                  <p className="text-xs text-gray-400">{stats.deudasConRecargo} con recargo</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <CreditCard className="h-5 w-5 text-gray-700" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      Registro de deudas
                      <span className="text-xs font-normal text-gray-400 ml-2">
                        {clientesOrdenados.length} {clientesOrdenados.length === 1 ? 'cliente' : 'clientes'}
                        {searchTerm ? ` · ${clientesPaginados.length} mostrados` : ''}
                      </span>
                    </CardTitle>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por cliente o concepto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64 h-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {clientesOrdenados.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No hay deudas registradas</p>
                  <div className="mt-4">
                    <DeudaForm onDeudaCreated={fetchDeudas} />
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-6">
  {clientesPaginados.map(({ clienteId, cliente, deudas }) => {
    // Agrupar deudas por concepto (producto)
    const deudasPorConcepto: { [concepto: string]: DeudaConCliente[] } = {};
    deudas.forEach(deuda => {
      const conceptoBase = deuda.concepto.replace(/ - Cuota \d+\/\d+/, '');
      if (!deudasPorConcepto[conceptoBase]) {
        deudasPorConcepto[conceptoBase] = [];
      }
      deudasPorConcepto[conceptoBase].push(deuda);
    });

    // 👉 Agrupar deudas por moneda
    const deudasPorMoneda: Record<string, DeudaConCliente[]> = {};
    deudas.forEach(deuda => {
      const moneda = deuda.moneda || 'ARS';
      if (!deudasPorMoneda[moneda]) {
        deudasPorMoneda[moneda] = [];
      }
      deudasPorMoneda[moneda].push(deuda);
    });

    // 👉 Totales por moneda
    const totalesPorMoneda = Object.entries(deudasPorMoneda).map(
      ([moneda, deudasMoneda]) => ({
        moneda,
        total: deudasMoneda.reduce((s, d) => s + d.monto_total, 0),
        restante: deudasMoneda.reduce((s, d) => s + d.monto_restante, 0),
      })
    );

    const deudasPendientesCliente = deudas.filter(d => d.estado !== 'pagado');
    const totalDeudas = deudas.length;
    const deudasPagadas = deudas.filter(d => d.estado === 'pagado').length;
    const tieneVencidas = deudas.some(d => d.estado === 'vencido');

    const clienteAlDia = totalesPorMoneda.every(t => t.restante <= 0);

    const borderColor = clienteAlDia ? 'border-l-emerald-500' : tieneVencidas ? 'border-l-red-500' : 'border-l-blue-500';
    const avatarColor = clienteAlDia ? 'bg-emerald-100 text-emerald-700' : tieneVencidas ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700';
    const badgeColor = clienteAlDia ? 'bg-emerald-100 text-emerald-700' : tieneVencidas ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
    const badgeText = clienteAlDia ? 'Al día' : tieneVencidas ? 'Vencido' : 'Pendiente';

    return (
      <div key={clienteId} className={`rounded-lg border bg-white border-gray-200 border-l-4 ${borderColor} hover:shadow-md transition-shadow`}>
        <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-gray-100">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${avatarColor}`}>
              {cliente.nombre.charAt(0)}{cliente.apellido.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 text-sm">{cliente.nombre} {cliente.apellido}</h3>
                <Badge variant="secondary" className={`text-[10px] ${badgeColor}`}>
                  {badgeText}
                </Badge>
                <span className="text-[10px] text-gray-400">{deudasPagadas}/{totalDeudas} pagadas</span>
              </div>
              <div className="flex flex-wrap gap-x-4 mt-0.5">
                {totalesPorMoneda.map(t => (
                  <span key={t.moneda} className="text-xs text-gray-500">
                    {t.moneda}: <strong className="text-gray-800">${t.total.toLocaleString()}</strong>
                    {' · '}Resta: <strong className={t.restante > 0 ? 'text-red-600' : 'text-emerald-600'}>${t.restante.toLocaleString()}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {deudasPendientesCliente.length > 1 && (
              <PagoCompletoForm deudas={deudasPendientesCliente} onPagoCreated={fetchDeudas} />
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-600 h-8">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar todas las deudas de {cliente.nombre} {cliente.apellido}?</AlertDialogTitle>
                  <AlertDialogDescription>Se eliminarán permanentemente las {totalDeudas} deudas y sus pagos. No se puede deshacer.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeleteGrupoDeudas(deudas)} className="bg-red-600 hover:bg-red-700">Eliminar Todas</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="px-4 py-3">
                            <div className="space-y-2">
                              {Object.entries(deudasPorConcepto).map(([conceptoBase, deudasConcepto]) => {
                                const montoTotalConcepto = deudasConcepto.reduce((sum, d) => sum + d.monto_total, 0);
                                const montoRestanteConcepto = deudasConcepto.reduce((sum, d) => sum + d.monto_restante, 0);
                                
                                return (
                                  <div key={conceptoBase} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-medium text-sm text-gray-800">{conceptoBase}</h4>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">
                                          ${montoTotalConcepto.toLocaleString()} {deudasConcepto[0]?.moneda || 'ARS'}
                                          {montoRestanteConcepto > 0 && (
                                            <span className="text-red-500 ml-1">
                                              · Resta: ${montoRestanteConcepto.toLocaleString()}
                                            </span>
                                          )}
                                        </span>
                                        <Button
                                          onClick={() => handlePrintDeuda(cliente, conceptoBase, deudasConcepto)}
                                          variant="ghost"
                                          size="sm"
                                          className="gap-1 h-7 text-xs text-gray-500 hover:text-gray-700"
                                          title="Imprimir esta deuda completa"
                                        >
                                          <Printer className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="overflow-x-auto -mx-1">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-[10px] text-gray-400 uppercase tracking-wider">
                                            <th className="text-left font-medium py-1.5 px-2 w-8">#</th>
                                            <th className="text-left font-medium py-1.5 px-2">Vence</th>
                                            <th className="text-left font-medium py-1.5 px-2">Estado</th>
                                            <th className="text-right font-medium py-1.5 px-2">Precio</th>
                                            <th className="text-right font-medium py-1.5 px-2">Recargo</th>
                                            <th className="text-right font-medium py-1.5 px-2">Total</th>
                                            <th className="text-right font-medium py-1.5 px-2">Abonado</th>
                                            <th className="text-right font-medium py-1.5 px-2">Resta</th>
                                            <th className="w-16"></th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                          {deudasConcepto.map((deuda, index) => {
                                            const simb = MONEDAS[deuda.moneda as keyof typeof MONEDAS]?.simbolo ?? '$';
                                            const montoOriginal = deuda.monto_total - deuda.recargos;
                                            const totalCalculado = montoOriginal + deuda.recargos;
                                            const restaCalculada = deuda.monto_total - deuda.monto_abonado;
                                            return (
                                              <tr key={deuda.id} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="py-2 px-2">
                                                  <span className="w-5 h-5 bg-blue-50 text-blue-600 rounded flex items-center justify-center text-[10px] font-bold">
                                                    {index + 1}
                                                  </span>
                                                </td>
                                                <td className="py-2 px-2 text-gray-500">
                                                  {new Date(deuda.fecha_vencimiento).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                                                </td>
                                                <td className="py-2 px-2">
                                                  <Badge
                                                    variant="secondary"
                                                    className={`text-[10px] px-1.5 py-0 ${getEstadoBadge(deuda.estado).color}`}
                                                  >
                                                    {deuda.estado.charAt(0).toUpperCase() + deuda.estado.slice(1)}
                                                  </Badge>
                                                </td>
                                                <td className="py-2 px-2 text-right text-gray-700 font-medium">{simb}{montoOriginal.toLocaleString()}</td>
                                                <td className="py-2 px-2 text-right">
                                                  {deuda.recargos > 0 ? (
                                                    <button
                                                      onClick={() => setDetalleRecargoModalDeuda(deuda)}
                                                      className="text-amber-600 font-medium hover:text-amber-800 hover:underline transition-colors"
                                                    >
                                                      {simb}{deuda.recargos.toLocaleString()}
                                                    </button>
                                                  ) : (
                                                    <span className="text-gray-300">—</span>
                                                  )}
                                                </td>
                                                <td className="py-2 px-2 text-right font-semibold text-gray-800">{simb}{deuda.monto_total.toLocaleString()}</td>
                                                <td className="py-2 px-2 text-right text-blue-600">
                                                  {deuda.monto_abonado > 0 ? `${simb}${deuda.monto_abonado.toLocaleString()}` : <span className="text-gray-300">—</span>}
                                                </td>
                                                <td className={`py-2 px-2 text-right font-bold ${deuda.monto_restante > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                  {simb}{(deuda.monto_restante ?? 0).toLocaleString()}
                                                </td>
                                                <td className="py-2 px-2">
                                                  <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    {deuda.estado !== 'pagado' && (
                                                      <AbonoForm deuda={deuda} onAbonoCreated={fetchDeudas} />
                                                    )}
                                                    <AlertDialog>
                                                      <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-600 h-6 w-6 p-0">
                                                          <Trash2 className="h-3 w-3" />
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
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-center">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (currentPage > 1) setCurrentPage(currentPage - 1);
                              }}
                              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                          
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                            // Mostrar solo algunas páginas alrededor de la actual
                            if (
                              page === 1 ||
                              page === totalPages ||
                              (page >= currentPage - 1 && page <= currentPage + 1)
                            ) {
                              return (
                                <PaginationItem key={page}>
                                  <PaginationLink
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setCurrentPage(page);
                                    }}
                                    isActive={currentPage === page}
                                    className="cursor-pointer"
                                  >
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            } else if (page === currentPage - 2 || page === currentPage + 2) {
                              return (
                                <PaginationItem key={page}>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              );
                            }
                            return null;
                          })}
                          
                          <PaginationItem>
                            <PaginationNext 
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                              }}
                              className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                  
                  <div className="mt-4 text-center text-xs text-gray-400">
                    Mostrando {startIndex + 1} - {Math.min(endIndex, clientesOrdenados.length)} de {clientesOrdenados.length} clientes
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial">
          <HistorialPagos />
        </TabsContent>
      </Tabs>

      <Dialog open={!!detalleRecargoModalDeuda} onOpenChange={(open) => !open && setDetalleRecargoModalDeuda(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de recargo</DialogTitle>
            <DialogDescription>
              Desglose del recargo. Por defecto se cobra el <strong>recargo acumulado</strong>. Aquí puedes ver también el recargo simple por si quieres cobrar ese monto.
            </DialogDescription>
          </DialogHeader>
          {detalleRecargoModalDeuda && (() => {
            const deuda = detalleRecargoModalDeuda;
            const simb = MONEDAS[deuda.moneda as keyof typeof MONEDAS]?.simbolo ?? '$';
            const montoOriginal = deuda.monto_total - deuda.recargos;
            const fechaVenc = new Date(deuda.fecha_vencimiento);
            fechaVenc.setHours(0, 0, 0, 0);
            const hasta = new Date();
            hasta.setHours(23, 59, 59, 999);
            const desglose = calcularRecargoConDesglose(montoOriginal, fechaVenc, hasta);
            const porc = getPorcentajesRecargo();
            const recargoSimple = calcularRecargoSimpleDiario(montoOriginal, desglose.diasVencidos);
            return (
              <div className="space-y-4 text-sm">
                <div className="rounded-lg border p-3 space-y-2 bg-gray-50">
                  <p className="font-semibold text-gray-800">Recargo acumulado (por defecto)</p>
                  <p className="text-gray-600">{desglose.diasVencidos} días vencidos</p>
                  <div className="space-y-1">
                    <p>
                      <span className="text-gray-600">Por días (0,5% acumulado por día):</span>{' '}
                      <strong>{simb}{desglose.recargoPorDias.toLocaleString()}</strong>
                    </p>
                    <p>
                      <span className="text-gray-600">Por vencimiento (10% cada 30 días):</span>{' '}
                      <strong className="text-orange-600">{simb}{desglose.recargoPor30Dias.toLocaleString()}</strong>
                    </p>
                    {desglose.detallePor30Dias.length > 0 && (
                      <div className="mt-2">
                        <p className="text-gray-600 mb-1">Cada aplicación del 10%:</p>
                        <ul className="list-disc list-inside space-y-0.5 pl-1 text-gray-700">
                          {desglose.detallePor30Dias.map((d) => (
                            <li key={d.periodo}>
                              Período {d.periodo} (día {d.diaDesdeInicio}): {simb}{d.montoRecargo.toLocaleString()}
                              {' '}
                              <span className="text-gray-500">({new Date(d.fechaAplicacion).toLocaleDateString('es-AR')})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="pt-2 border-t border-gray-200 mt-2 font-medium">
                      Total recargo acumulado: <strong>{simb}{desglose.total.toLocaleString()}</strong>
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-dashed p-3 space-y-1 bg-blue-50/50">
                  <p className="font-semibold text-gray-800">Recargo simple (referencia)</p>
                  <p className="text-gray-600">
                    0,5% del precio × {desglose.diasVencidos} días = {simb}{montoOriginal.toLocaleString()} × {porc.diario}% × {desglose.diasVencidos}
                  </p>
                  <p className="font-medium">
                    Total recargo simple: <strong>{simb}{recargoSimple.toLocaleString()}</strong>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Si quieres cobrar este monto en lugar del acumulado, puedes anotarlo o ajustar la deuda manualmente.
                  </p>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
