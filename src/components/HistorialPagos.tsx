
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MONEDAS, type HistorialPago } from "@/types";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

export function HistorialPagos() {
  const [historial, setHistorial] = useState<HistorialPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const { toast } = useToast();

  useEffect(() => { fetchHistorial(); }, []);

  const fetchHistorial = async () => {
    try {
      const { data, error } = await supabase
        .from('historial_pagos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setHistorial(data || []);
    } catch (error) {
      console.error('Error fetching historial:', error);
      toast({ title: "Error", description: "No se pudo cargar el historial de pagos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredHistorial = historial.filter(pago =>
    pago.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pago.concepto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const now = new Date();
  const mesActual = now.getMonth();
  const anioActual = now.getFullYear();

  const pagosMesActual = historial.filter(p => {
    const f = new Date(p.fecha_pago);
    return f.getMonth() === mesActual && f.getFullYear() === anioActual;
  });

  const cobradoMesARS = pagosMesActual.filter(p => p.moneda === 'ARS').reduce((s, p) => s + p.monto_pago, 0);
  const cobradoMesUSD = pagosMesActual.filter(p => p.moneda === 'USD').reduce((s, p) => s + p.monto_pago, 0);

  const totalPages = Math.ceil(filteredHistorial.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const pagosPaginados = filteredHistorial.slice(startIndex, startIndex + itemsPerPage);

  const mesLabel = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border shadow-sm">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Cobrado en {mesLabel}
            </p>
            <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-600">
              {pagosMesActual.length} pagos
            </Badge>
          </div>
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            <div>
              <p className="text-2xl font-bold text-emerald-600">${cobradoMesARS.toLocaleString('es-AR')}</p>
              <p className="text-[11px] text-gray-400">ARS</p>
            </div>
            <div className="pl-4">
              <p className="text-2xl font-bold text-blue-600">US${cobradoMesUSD.toLocaleString('en-US')}</p>
              <p className="text-[11px] text-gray-400">USD</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">
              Registro de pagos
              <span className="text-xs font-normal text-gray-400 ml-2">
                {filteredHistorial.length} pagos
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
          {filteredHistorial.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-gray-400 text-sm">
                {searchTerm ? 'Sin resultados' : 'No hay pagos registrados'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-b border-gray-100 bg-gray-50/80">
                      <th className="text-left font-medium text-gray-500 text-xs uppercase tracking-wider px-4 py-2.5">Cliente</th>
                      <th className="text-left font-medium text-gray-500 text-xs uppercase tracking-wider px-4 py-2.5">Concepto</th>
                      <th className="text-left font-medium text-gray-500 text-xs uppercase tracking-wider px-4 py-2.5">Fecha</th>
                      <th className="text-right font-medium text-gray-500 text-xs uppercase tracking-wider px-4 py-2.5">Monto</th>
                      <th className="text-center font-medium text-gray-500 text-xs uppercase tracking-wider px-4 py-2.5">Moneda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pagosPaginados.map((pago) => (
                      <tr key={pago.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{pago.cliente_nombre}</td>
                        <td className="px-4 py-3 text-gray-600">{pago.concepto}</td>
                        <td className="px-4 py-3 text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            {new Date(pago.fecha_pago).toLocaleDateString('es-AR')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-semibold text-emerald-600">
                            {MONEDAS[pago.moneda as keyof typeof MONEDAS]?.simbolo || '$'}
                            {pago.monto_pago.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className="text-[10px]">{pago.moneda}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="py-4 flex items-center justify-center border-t border-gray-100">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage(currentPage - 1); }}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                href="#"
                                onClick={(e) => { e.preventDefault(); setCurrentPage(page); }}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >{page}</PaginationLink>
                            </PaginationItem>
                          );
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                          return <PaginationItem key={page}><PaginationEllipsis /></PaginationItem>;
                        }
                        return null;
                      })}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) setCurrentPage(currentPage + 1); }}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
              <div className="pb-3 text-center text-xs text-gray-400">
                {startIndex + 1} – {Math.min(startIndex + itemsPerPage, filteredHistorial.length)} de {filteredHistorial.length}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
