import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, DollarSign, AlertTriangle, Calendar, Eye, Trash2, X, Printer } from "lucide-react";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

export function DeudasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [deudas, setDeudas] = useState<DeudaConCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('deudas');
  const [currentPage, setCurrentPage] = useState(1);
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

      // Filtrar las que están vencidas desde hoy y no tienen recargo reciente
      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999); // Incluir todo el día de hoy
      
      const deudasParaRecargo = deudasVencidas?.filter(deuda => {
        const fechaVencimiento = new Date(deuda.fecha_vencimiento);
        fechaVencimiento.setHours(0, 0, 0, 0);
        
        // Verificar si ya tiene recargo reciente (menos de 30 días)
        const tieneRecargoReciente = deuda.fecha_ultimo_recargo && 
          new Date(deuda.fecha_ultimo_recargo) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        const estaVencida = fechaVencimiento <= hoy;
        
        return estaVencida && !tieneRecargoReciente;
      }) || [];

      if (deudasParaRecargo.length === 0) {
        console.log('No hay deudas para aplicar recargo automático');
        return;
      }

      // Obtener configuración
      const { data: config } = await supabase
        .from('configuracion')
        .select('porcentaje_recargo, dias_para_recargo')
        .limit(1)
        .maybeSingle();

      const porcentajeRecargo = config?.porcentaje_recargo || 10;
      const diasParaRecargo = config?.dias_para_recargo || 30;

      // Aplicar recargos automáticamente
      for (const deuda of deudasParaRecargo) {
        const fechaVencimiento = new Date(deuda.fecha_vencimiento);
        fechaVencimiento.setHours(0, 0, 0, 0);
        const hoy = new Date();
        hoy.setHours(23, 59, 59, 999);
        
        // Calcular días desde el vencimiento
        const diasVencidos = Math.floor((hoy.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24));
        
        // Determinar desde cuándo calcular los recargos pendientes
        let fechaBaseRecargo: Date;
        if (deuda.fecha_ultimo_recargo) {
          // Si ya tiene recargo, calcular desde la fecha del último recargo
          fechaBaseRecargo = new Date(deuda.fecha_ultimo_recargo);
          fechaBaseRecargo.setHours(0, 0, 0, 0);
        } else {
          // Si no tiene recargo, calcular desde la fecha de vencimiento
          fechaBaseRecargo = new Date(fechaVencimiento);
        }
        
        // Calcular cuántos períodos de recargo han pasado
        const diasDesdeBase = Math.floor((hoy.getTime() - fechaBaseRecargo.getTime()) / (1000 * 60 * 60 * 24));
        const periodosRecargo = Math.floor(diasDesdeBase / diasParaRecargo);
        
        // Aplicar recargos acumulativos por cada período
        let montoTotalRecargos = 0;
        let montoActual = deuda.monto_restante;
        
        for (let i = 0; i < periodosRecargo; i++) {
          const montoRecargoPeriodo = Math.round((montoActual * porcentajeRecargo) / 100);
          montoTotalRecargos += montoRecargoPeriodo;
          montoActual += montoRecargoPeriodo; // El siguiente recargo se calcula sobre el monto ya incrementado
        }
        
        if (montoTotalRecargos > 0) {
          const nuevoMontoTotal = deuda.monto_total + montoTotalRecargos;

          // Solo actualizar campos que se pueden modificar, monto_restante se calcula automáticamente
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Adeudado (ARS)</CardTitle>
                <DollarSign className="h-5 w-5 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ${stats.totalAdeudadoARS.toLocaleString('es-AR')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Adeudado (USD)</CardTitle>
                <DollarSign className="h-5 w-5 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  US${stats.totalAdeudadoUSD.toLocaleString('en-US')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Recargos (ARS)</CardTitle>
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  ${stats.recargosAplicadosARS.toLocaleString('es-AR')}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Recargos (USD)</CardTitle>
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  US${stats.recargosAplicadosUSD.toLocaleString('en-US')}
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setActiveTab('historial')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Cobrado Este Mes</CardTitle>
                <DollarSign className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-green-600">
                  ${stats.cobradoMesARS.toLocaleString('es-AR')} ARS
                </div>
                <div className="text-lg font-bold text-green-600">
                  US${stats.cobradoMesUSD.toLocaleString('en-US')}
                </div>
                <p className="text-xs text-gray-600 mt-1">Click para ver historial</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Deudas Activas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.deudasActivas}
                </div>
                <p className="text-xs text-gray-600 mt-1">{stats.deudasConRecargo} con recargo</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Registro de Deudas ({clientesOrdenados.length} {clientesOrdenados.length === 1 ? 'cliente' : 'clientes'})
                  {searchTerm && (
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      - {clientesPaginados.length} mostrados
                    </span>
                  )}
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por cliente o concepto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
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

    // 👉 Cliente al día solo si TODAS las monedas están saldadas
    const clienteAlDia = totalesPorMoneda.every(t => t.restante <= 0);

    return (
      <Card key={clienteId} className="border-l-4 border-l-blue-500 shadow-sm">
        <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div>
                <h3 className="font-bold text-lg text-gray-900">
                  {cliente.nombre} {cliente.apellido}
                </h3>
                {cliente.telefono && (
                  <p className="text-xs text-gray-600 mt-0.5">📞 {cliente.telefono}</p>
                )}
              </div>

              <Badge
                className={
                  clienteAlDia
                    ? 'text-green-700 bg-green-100'
                    : 'text-orange-700 bg-orange-100'
                }
                variant="outline"
              >
                {clienteAlDia ? 'Al día' : 'Pendiente'}
              </Badge>

              <div className="text-xs text-gray-600">
                {deudasPagadas}/{totalDeudas} pagadas
              </div>

              {/* 👉 Totales separados por moneda */}
              <div className="text-sm space-y-1">
                {totalesPorMoneda.map(t => (
                  <div key={t.moneda}>
                    <span className="text-gray-700 font-semibold">
                      Total {t.moneda}: ${t.total.toLocaleString()}
                    </span>
                    <span
                      className={
                        t.restante > 0
                          ? 'text-red-600 font-semibold ml-3'
                          : 'text-green-600 ml-3'
                      }
                    >
                      Resta: ${t.restante.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {deudasPendientesCliente.length > 1 && (
                <PagoCompletoForm
                  deudas={deudasPendientesCliente}
                  onPagoCreated={fetchDeudas}
                />
              )}

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 h-8">
                                      <X className="h-3 w-3 mr-1" />
                                      Eliminar
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>¿Eliminar todas las deudas de {cliente.nombre} {cliente.apellido}?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta acción eliminará permanentemente todas las {totalDeudas} deudas y todos sus pagos asociados. Esta acción no se puede deshacer.
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
                            </div>
                          </CardHeader>
                          <CardContent className="pt-3 pb-3">
                            <div className="space-y-2">
                              {Object.entries(deudasPorConcepto).map(([conceptoBase, deudasConcepto]) => {
                                const montoTotalConcepto = deudasConcepto.reduce((sum, d) => sum + d.monto_total, 0);
                                const montoRestanteConcepto = deudasConcepto.reduce((sum, d) => sum + d.monto_restante, 0);
                                
                                return (
                                  <div key={conceptoBase} className="border-l-2 border-l-orange-300 pl-3 py-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className="font-semibold text-sm text-gray-800">{conceptoBase}</h4>
                                      <div className="flex items-center gap-2">
                                        <div className="text-xs text-gray-600">
                                          <span className="font-medium">${montoTotalConcepto.toLocaleString()} {deudasConcepto[0]?.moneda || 'ARS'}</span>
                                          {montoRestanteConcepto > 0 && (
                                            <span className="text-red-600 ml-1">
                                              (Resta: ${montoRestanteConcepto.toLocaleString()})
                                            </span>
                                          )}
                                        </div>
                                        <Button
                                          onClick={() => handlePrintDeuda(cliente, conceptoBase, deudasConcepto)}
                                          variant="outline"
                                          size="sm"
                                          className="gap-1 h-7 text-xs"
                                          title="Imprimir esta deuda completa"
                                        >
                                          <Printer className="h-3 w-3" />
                                          Imprimir
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      {deudasConcepto.map((deuda, index) => (
                                        <div key={deuda.id} className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded text-xs">
                                          <div className="flex items-center gap-2 flex-1">
                                            <span className="w-5 h-5 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-semibold">
                                              {index + 1}
                                            </span>
                                            <span className="font-medium text-gray-900">
                                              ${deuda.monto_total.toLocaleString()}
                                              {deuda.recargos > 0 && (
                                                <span className="text-orange-600 ml-1">
                                                  (+${deuda.recargos.toLocaleString()})
                                                </span>
                                              )}
                                            </span>
                                            <span className="text-gray-500">
                                              <Calendar className="h-3 w-3 inline mr-0.5" />
                                              {new Date(deuda.fecha_vencimiento).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                                            </span>
                                            <span className="text-gray-500">
                                              Abonado: ${deuda.monto_abonado.toLocaleString()}
                                            </span>
                                            <span className={deuda.monto_restante > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>
                                              Resta: ${deuda.monto_restante.toLocaleString()}
                                            </span>
                                            <Badge 
                                              className={`${getEstadoBadge(deuda.estado).color} text-xs px-1.5 py-0`}
                                              variant="outline"
                                            >
                                              {deuda.estado.charAt(0).toUpperCase() + deuda.estado.slice(1)}
                                            </Badge>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            {deuda.estado !== 'pagado' && (
                                              <AbonoForm deuda={deuda} onAbonoCreated={fetchDeudas} />
                                            )}
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 h-6 w-6 p-0">
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
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
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
                  
                  <div className="mt-4 text-center text-sm text-gray-500">
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
    </div>
  );
}
