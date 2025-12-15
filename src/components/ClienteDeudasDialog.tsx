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
import { Calendar, CreditCard, DollarSign, X, Printer, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AbonoForm } from "./AbonoForm";
import { PagoCompletoForm } from "./PagoCompletoForm";
import type { Cliente, DeudaConCliente } from "@/types";

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
    if (open) {
      fetchDeudas();
    }
  }, [open, cliente.id]);

  const fetchDeudas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('deudas')
        .select(`
          *,
          cliente:clientes(*)
        `)
        .eq('cliente_id', cliente.id)
        .order('fecha_vencimiento', { ascending: true });

      if (error) throw error;
      setDeudas(data || []);
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

  const handleDeudaUpdated = () => {
    fetchDeudas();
    onDeudaUpdated?.();
  };

  // Agrupar deudas por concepto
  const deudasPorConcepto: { [concepto: string]: DeudaConCliente[] } = {};
  deudas.forEach(deuda => {
    const conceptoBase = deuda.concepto.replace(/ - Cuota \d+\/\d+/, '');
    if (!deudasPorConcepto[conceptoBase]) {
      deudasPorConcepto[conceptoBase] = [];
    }
    deudasPorConcepto[conceptoBase].push(deuda);
  });

  // Calcular totales separados por moneda
  const totalesARS = deudas
    .filter(d => d.moneda === 'ARS')
    .reduce((acc, d) => ({
      total: acc.total + d.monto_total,
      restante: acc.restante + d.monto_restante,
      abonado: acc.abonado + d.monto_abonado
    }), { total: 0, restante: 0, abonado: 0 });

  const totalesUSD = deudas
    .filter(d => d.moneda === 'USD')
    .reduce((acc, d) => ({
      total: acc.total + d.monto_total,
      restante: acc.restante + d.monto_restante,
      abonado: acc.abonado + d.monto_abonado
    }), { total: 0, restante: 0, abonado: 0 });

  const deudasPendientes = deudas.filter(d => d.estado !== 'pagado');
  const deudasPagadas = deudas.filter(d => d.monto_restante <= 0);

  const limpiarDeudasPagadas = async () => {
    if (deudasPagadas.length === 0) {
      toast({
        title: "No hay deudas pagadas",
        description: "No hay deudas completamente pagadas para eliminar",
      });
      return;
    }

    try {
      // Obtener IDs de las deudas pagadas
      const idsDeudasPagadas = deudasPagadas.map(d => d.id);

      // Primero eliminar los pagos relacionados
      for (const deudaId of idsDeudasPagadas) {
        const { error: pagosError } = await supabase
          .from('pagos')
          .delete()
          .eq('deuda_id', deudaId);

        if (pagosError) throw pagosError;
      }

      // Luego eliminar las deudas
      const { error: deudasError } = await supabase
        .from('deudas')
        .delete()
        .in('id', idsDeudasPagadas);

      if (deudasError) throw deudasError;

      toast({
        title: "Deudas pagadas eliminadas",
        description: `Se eliminaron ${deudasPagadas.length} ${deudasPagadas.length === 1 ? 'deuda' : 'deudas'} completamente pagadas`,
      });

      // Recargar las deudas
      fetchDeudas();
      onDeudaUpdated?.();
    } catch (error) {
      console.error('Error limpiando deudas pagadas:', error);
      toast({
        title: "Error",
        description: "No se pudieron eliminar las deudas pagadas",
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

  const handlePrintDeuda = (conceptoBase: string, deudasConcepto: DeudaConCliente[]) => {
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
            .deuda-item {
              background: #f9fafb;
              padding: 12px;
              margin-bottom: 8px;
              border-left: 3px solid #f97316;
              display: grid;
              grid-template-columns: 50px 1fr 1fr 1fr 100px;
              gap: 15px;
              align-items: center;
              font-size: 13px;
            }
            .deuda-numero {
              background: #fed7aa;
              color: #9a3412;
              width: 30px;
              height: 30px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 12px;
            }
            .deuda-monto {
              font-weight: bold;
              font-size: 14px;
            }
            .deuda-fecha {
              color: #666;
            }
            .deuda-abonado {
              color: #666;
            }
            .deuda-restante {
              font-weight: bold;
            }
            .deuda-restante.pendiente {
              color: #dc2626;
            }
            .deuda-restante.pagado {
              color: #16a34a;
            }
            .estado-badge {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .estado-pendiente {
              background: #fef3c7;
              color: #92400e;
            }
            .estado-vencido {
              background: #fee2e2;
              color: #991b1b;
            }
            .estado-pagado {
              background: #d1fae5;
              color: #065f46;
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
            @media print {
              .no-print {
                display: none;
              }
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
                <p>$${montoTotalConcepto.toLocaleString()} ${deudasConcepto[0]?.moneda || 'ARS'}</p>
              </div>
              <div class="resumen-item">
                <h3>Monto Abonado</h3>
                <p style="color: #16a34a">
                  $${montoAbonadoConcepto.toLocaleString()} ${deudasConcepto[0]?.moneda || 'ARS'}
                </p>
              </div>
              <div class="resumen-item">
                <h3>Monto Restante</h3>
                <p style="color: ${montoRestanteConcepto > 0 ? '#dc2626' : '#16a34a'}">
                  $${montoRestanteConcepto.toLocaleString()} ${deudasConcepto[0]?.moneda || 'ARS'}
                </p>
              </div>
            </div>
            ${recargosConcepto > 0 ? `
              <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #e5e7eb;">
                <h3 style="margin: 0 0 5px 0; font-size: 12px; color: #666; text-transform: uppercase;">Total Recargos Aplicados</h3>
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #ea580c;">
                  $${recargosConcepto.toLocaleString()} ${deudasConcepto[0]?.moneda || 'ARS'}
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
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; background: white;">
              <thead>
                <tr style="background: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
                  <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: bold; color: #666; text-transform: uppercase; border-right: 1px solid #e5e7eb;">Cuota</th>
                  <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: bold; color: #666; text-transform: uppercase; border-right: 1px solid #e5e7eb;">Monto Total</th>
                  <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: bold; color: #666; text-transform: uppercase; border-right: 1px solid #e5e7eb;">Fecha Vencimiento</th>
                  <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: bold; color: #666; text-transform: uppercase; border-right: 1px solid #e5e7eb;">Abonado</th>
                  <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: bold; color: #666; text-transform: uppercase; border-right: 1px solid #e5e7eb;">Restante</th>
                  <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: bold; color: #666; text-transform: uppercase; border-right: 1px solid #e5e7eb;">Recargos</th>
                  <th style="padding: 12px; text-align: center; font-size: 12px; font-weight: bold; color: #666; text-transform: uppercase;">Estado</th>
                </tr>
              </thead>
              <tbody>
                ${deudasConcepto.map((deuda, index) => {
                  return `
                    <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 0 ? 'background: #f9fafb;' : 'background: white;'}">
                      <td style="padding: 15px; font-weight: bold; color: #9a3412; font-size: 14px; border-right: 1px solid #e5e7eb;">
                        ${index + 1} / ${deudasConcepto.length}
                      </td>
                      <td style="padding: 15px; font-weight: bold; font-size: 15px; border-right: 1px solid #e5e7eb;">
                        $${deuda.monto_total.toLocaleString()} ${deuda.moneda}
                      </td>
                      <td style="padding: 15px; font-size: 14px; border-right: 1px solid #e5e7eb;">
                        ${new Date(deuda.fecha_vencimiento).toLocaleDateString('es-AR', { 
                          weekday: 'short', 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric' 
                        })}
                      </td>
                      <td style="padding: 15px; font-size: 14px; color: #16a34a; font-weight: bold; border-right: 1px solid #e5e7eb;">
                        $${deuda.monto_abonado.toLocaleString()}
                      </td>
                      <td style="padding: 15px; font-size: 14px; font-weight: bold; color: ${deuda.monto_restante > 0 ? '#dc2626' : '#16a34a'}; border-right: 1px solid #e5e7eb;">
                        $${deuda.monto_restante.toLocaleString()}
                      </td>
                      <td style="padding: 15px; font-size: 14px; color: ${deuda.recargos > 0 ? '#ea580c' : '#666'}; font-weight: ${deuda.recargos > 0 ? 'bold' : 'normal'}; border-right: 1px solid #e5e7eb;">
                        ${deuda.recargos > 0 ? `$${deuda.recargos.toLocaleString()}` : '-'}
                      </td>
                      <td style="padding: 15px; text-align: center;">
                        <span style="display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; 
                          background: ${deuda.estado === 'pagado' ? '#d1fae5' : deuda.estado === 'vencido' ? '#fee2e2' : '#fef3c7'}; 
                          color: ${deuda.estado === 'pagado' ? '#065f46' : deuda.estado === 'vencido' ? '#991b1b' : '#92400e'};">
                          ${deuda.estado.charAt(0).toUpperCase() + deuda.estado.slice(1)}
                        </span>
                      </td>
                    </tr>
                    ${deuda.notas ? `
                      <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td colspan="7" style="padding: 10px 15px; background: #f0f9ff; border-left: 3px solid #2563eb;">
                          <strong style="font-size: 11px; color: #666; text-transform: uppercase;">Notas Cuota ${index + 1}:</strong>
                          <span style="font-size: 12px; color: #000; margin-left: 5px;">${deuda.notas}</span>
                        </td>
                      </tr>
                    ` : ''}
                  `;
                }).join('')}
                <tr style="background: #fff7ed; border-top: 3px solid #f97316; font-weight: bold;">
                  <td style="padding: 15px; border-right: 1px solid #e5e7eb;" colspan="2">TOTALES</td>
                  <td style="padding: 15px; border-right: 1px solid #e5e7eb;">-</td>
                  <td style="padding: 15px; color: #16a34a; border-right: 1px solid #e5e7eb;">$${montoAbonadoConcepto.toLocaleString()}</td>
                  <td style="padding: 15px; color: ${montoRestanteConcepto > 0 ? '#dc2626' : '#16a34a'}; border-right: 1px solid #e5e7eb;">$${montoRestanteConcepto.toLocaleString()}</td>
                  <td style="padding: 15px; color: ${recargosConcepto > 0 ? '#ea580c' : '#666'}; border-right: 1px solid #e5e7eb;">${recargosConcepto > 0 ? `$${recargosConcepto.toLocaleString()}` : '-'}</td>
                  <td style="padding: 15px; text-align: center;">
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

  const handlePrint = () => {
    // Crear una nueva ventana para imprimir todas las deudas
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Generar el HTML para imprimir todas las deudas
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Deudas - ${cliente.nombre} ${cliente.apellido}</title>
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
            .deuda-item {
              background: #f9fafb;
              padding: 12px;
              margin-bottom: 8px;
              border-left: 3px solid #f97316;
              display: grid;
              grid-template-columns: 50px 1fr 1fr 1fr 100px;
              gap: 15px;
              align-items: center;
              font-size: 13px;
            }
            .deuda-numero {
              background: #fed7aa;
              color: #9a3412;
              width: 30px;
              height: 30px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 12px;
            }
            .deuda-monto {
              font-weight: bold;
              font-size: 14px;
            }
            .deuda-fecha {
              color: #666;
            }
            .deuda-abonado {
              color: #666;
            }
            .deuda-restante {
              font-weight: bold;
            }
            .deuda-restante.pendiente {
              color: #dc2626;
            }
            .deuda-restante.pagado {
              color: #16a34a;
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
            <h1>Estado de Deudas</h1>
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
            ${totalesARS.total > 0 || totalesUSD.total > 0 ? `
              <div style="display: grid; grid-template-columns: ${totalesARS.total > 0 && totalesUSD.total > 0 ? '1fr 1fr' : '1fr'}; gap: 20px; margin-bottom: 20px;">
                ${totalesARS.total > 0 ? `
                  <div style="border-left: 4px solid #2563eb; padding-left: 15px;">
                    <h3 style="margin: 0 0 10px 0; font-size: 12px; color: #666; text-transform: uppercase; font-weight: bold;">Pesos Argentinos (ARS)</h3>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                      <div>
                        <h4 style="margin: 0 0 5px 0; font-size: 11px; color: #666; text-transform: uppercase;">Total</h4>
                        <p style="margin: 0; font-size: 18px; font-weight: bold;">$${totalesARS.total.toLocaleString()}</p>
                      </div>
                      <div>
                        <h4 style="margin: 0 0 5px 0; font-size: 11px; color: #666; text-transform: uppercase;">Restante</h4>
                        <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${totalesARS.restante > 0 ? '#dc2626' : '#16a34a'}">
                          $${totalesARS.restante.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <h4 style="margin: 0 0 5px 0; font-size: 11px; color: #666; text-transform: uppercase;">Abonado</h4>
                        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #16a34a">
                          $${totalesARS.abonado.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ` : ''}
                ${totalesUSD.total > 0 ? `
                  <div style="border-left: 4px solid #16a34a; padding-left: 15px;">
                    <h3 style="margin: 0 0 10px 0; font-size: 12px; color: #666; text-transform: uppercase; font-weight: bold;">Dólares Estadounidenses (USD)</h3>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                      <div>
                        <h4 style="margin: 0 0 5px 0; font-size: 11px; color: #666; text-transform: uppercase;">Total</h4>
                        <p style="margin: 0; font-size: 18px; font-weight: bold;">US$${totalesUSD.total.toLocaleString()}</p>
                      </div>
                      <div>
                        <h4 style="margin: 0 0 5px 0; font-size: 11px; color: #666; text-transform: uppercase;">Restante</h4>
                        <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${totalesUSD.restante > 0 ? '#dc2626' : '#16a34a'}">
                          US$${totalesUSD.restante.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <h4 style="margin: 0 0 5px 0; font-size: 11px; color: #666; text-transform: uppercase;">Abonado</h4>
                        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #16a34a">
                          US$${totalesUSD.abonado.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ` : ''}
              </div>
            ` : ''}
            <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #e5e7eb;">
              <h3 style="margin: 0 0 5px 0; font-size: 12px; color: #666; text-transform: uppercase;">Estado General</h3>
              <p style="margin: 0; font-size: 16px; font-weight: bold; color: ${(totalesARS.restante + totalesUSD.restante) <= 0 ? '#16a34a' : '#ea580c'}">
                ${(totalesARS.restante + totalesUSD.restante) <= 0 ? 'Al día' : 'Pendiente'}
              </p>
            </div>
          </div>

          ${Object.entries(deudasPorConcepto).map(([conceptoBase, deudasConcepto]) => {
            const montoTotalConcepto = deudasConcepto.reduce((sum, d) => sum + d.monto_total, 0);
            const montoRestanteConcepto = deudasConcepto.reduce((sum, d) => sum + d.monto_restante, 0);
            
            return `
              <div class="concepto-section">
                <div class="concepto-header">
                  <h3>${conceptoBase}</h3>
                  <div class="concepto-totales">
                    Total: <strong>${deudasConcepto[0]?.moneda === 'USD' ? 'US$' : '$'}${montoTotalConcepto.toLocaleString()} ${deudasConcepto[0]?.moneda || 'ARS'}</strong>
                    ${montoRestanteConcepto > 0 ? ` | Resta: <strong style="color: #dc2626">${deudasConcepto[0]?.moneda === 'USD' ? 'US$' : '$'}${montoRestanteConcepto.toLocaleString()} ${deudasConcepto[0]?.moneda || 'ARS'}</strong>` : ''}
                  </div>
                </div>
                ${deudasConcepto.map((deuda, index) => {
                  return `
                    <div class="deuda-item">
                      <div class="deuda-numero">${index + 1}</div>
                      <div class="deuda-monto">
                        ${deuda.moneda === 'USD' ? 'US$' : '$'}${deuda.monto_total.toLocaleString()} ${deuda.moneda}
                        ${deuda.recargos > 0 ? `<span class="recargo"> (+${deuda.moneda === 'USD' ? 'US$' : '$'}${deuda.recargos.toLocaleString()} recargo)</span>` : ''}
                      </div>
                      <div class="deuda-fecha">
                        Vence: ${new Date(deuda.fecha_vencimiento).toLocaleDateString('es-AR')}
                      </div>
                      <div class="deuda-abonado">
                        Abonado: ${deuda.moneda === 'USD' ? 'US$' : '$'}${deuda.monto_abonado.toLocaleString()}
                      </div>
                      <div class="deuda-restante ${deuda.monto_restante > 0 ? 'pendiente' : 'pagado'}">
                        Resta: ${deuda.moneda === 'USD' ? 'US$' : '$'}${deuda.monto_restante.toLocaleString()}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `;
          }).join('')}

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">
              Deudas de {cliente.nombre} {cliente.apellido}
            </DialogTitle>
            {!loading && deudas.length > 0 && (
              <Button
                onClick={handlePrint}
                variant="outline"
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                Imprimir / Descargar
              </Button>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">
            <p className="text-gray-500">Cargando deudas...</p>
          </div>
        ) : deudas.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-gray-500">Este cliente no tiene deudas registradas</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumen */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Totales en Pesos (ARS) */}
                  {totalesARS.total > 0 && (
                    <div className="border-l-4 border-l-blue-600 pl-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">Pesos Argentinos (ARS)</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-600">Total Adeudado</p>
                          <p className="text-xl font-bold text-gray-900">
                            ${totalesARS.total.toLocaleString()} ARS
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Restante</p>
                          <p className={`text-xl font-bold ${totalesARS.restante > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ${totalesARS.restante.toLocaleString()} ARS
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Abonado</p>
                          <p className="text-xl font-bold text-green-600">
                            ${totalesARS.abonado.toLocaleString()} ARS
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Totales en Dólares (USD) */}
                  {totalesUSD.total > 0 && (
                    <div className="border-l-4 border-l-green-600 pl-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase">Dólares Estadounidenses (USD)</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-600">Total Adeudado</p>
                          <p className="text-xl font-bold text-gray-900">
                            US${totalesUSD.total.toLocaleString()} USD
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Restante</p>
                          <p className={`text-xl font-bold ${totalesUSD.restante > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            US${totalesUSD.restante.toLocaleString()} USD
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Abonado</p>
                          <p className="text-xl font-bold text-green-600">
                            US${totalesUSD.abonado.toLocaleString()} USD
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Estado General */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Estado General</p>
                      <Badge 
                        className={(totalesARS.restante + totalesUSD.restante) <= 0 ? 'text-green-700 bg-green-100' : 'text-orange-700 bg-orange-100'}
                        variant="outline"
                      >
                        {(totalesARS.restante + totalesUSD.restante) <= 0 ? 'Al día' : 'Pendiente'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {deudasPagadas.length > 0 && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Limpiar Deudas Pagadas ({deudasPagadas.length})
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Limpiar deudas pagadas?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se eliminarán {deudasPagadas.length} {deudasPagadas.length === 1 ? 'deuda completamente pagada' : 'deudas completamente pagadas'} de {cliente.nombre} {cliente.apellido}.
                                <br /><br />
                                <strong>Esta acción no se puede deshacer.</strong> Los pagos se registrarán en el historial antes de eliminar las deudas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={limpiarDeudasPagadas}
                                className="bg-orange-600 hover:bg-orange-700"
                              >
                                Limpiar Deudas
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {deudasPendientes.length > 1 && (
                        <PagoCompletoForm deudas={deudasPendientes} onPagoCreated={handleDeudaUpdated} />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de deudas por concepto */}
            <div className="space-y-3">
              {Object.entries(deudasPorConcepto).map(([conceptoBase, deudasConcepto]) => {
                const montoTotalConcepto = deudasConcepto.reduce((sum, d) => sum + d.monto_total, 0);
                const montoRestanteConcepto = deudasConcepto.reduce((sum, d) => sum + d.monto_restante, 0);
                
                return (
                  <Card key={conceptoBase} className="border-l-4 border-l-orange-500">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-lg text-gray-900">{conceptoBase}</h4>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Total: <span className="font-semibold">${montoTotalConcepto.toLocaleString()}</span></p>
                          {montoRestanteConcepto > 0 && (
                            <p className="text-sm text-red-600 font-semibold">
                              Resta: ${montoRestanteConcepto.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {deudasConcepto.map((deuda, index) => (
                          <div key={deuda.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="w-8 h-8 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-sm font-semibold">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <p className="font-medium text-gray-900">
                                    ${deuda.monto_total.toLocaleString()}
                                    {deuda.recargos > 0 && (
                                      <span className="text-orange-600 ml-2 text-sm">
                                        (+${deuda.recargos.toLocaleString()} recargo)
                                      </span>
                                    )}
                                  </p>
                                  <Badge 
                                    className={getEstadoBadge(deuda.estado).color}
                                    variant="outline"
                                  >
                                    {deuda.estado.charAt(0).toUpperCase() + deuda.estado.slice(1)}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Vence: {new Date(deuda.fecha_vencimiento).toLocaleDateString('es-AR')}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    Abonado: ${deuda.monto_abonado.toLocaleString()}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <CreditCard className="h-3 w-3" />
                                    <span className={deuda.monto_restante > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>
                                      Resta: ${deuda.monto_restante.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {index === 0 && (
                                <Button
                                  onClick={() => handlePrintDeuda(conceptoBase, deudasConcepto)}
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  title="Imprimir todas las cuotas de esta deuda"
                                >
                                  <Printer className="h-3 w-3" />
                                  Imprimir Deuda
                                </Button>
                              )}
                              {deuda.estado !== 'pagado' && (
                                <AbonoForm deuda={deuda} onAbonoCreated={handleDeudaUpdated} />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

