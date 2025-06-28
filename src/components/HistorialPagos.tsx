
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Calendar, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MONEDAS, type HistorialPago } from "@/types";

export function HistorialPagos() {
  const [historial, setHistorial] = useState<HistorialPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchHistorial();
  }, []);

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
      toast({
        title: "Error",
        description: "No se pudo cargar el historial de pagos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredHistorial = historial.filter(pago =>
    pago.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pago.concepto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcular estadísticas por moneda
  const statsARS = filteredHistorial
    .filter(p => p.moneda === 'ARS')
    .reduce((sum, p) => sum + p.monto_pago, 0);

  const statsUSD = filteredHistorial
    .filter(p => p.moneda === 'USD')
    .reduce((sum, p) => sum + p.monto_pago, 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-lg">Cargando historial...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Historial de Pagos</h2>
          <p className="text-gray-600">Registro completo de todos los pagos realizados</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar pagos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Cobrado (ARS)</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${statsARS.toLocaleString('es-AR')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Cobrado (USD)</CardTitle>
            <DollarSign className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              US${statsUSD.toLocaleString('en-US')}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registro de Pagos ({filteredHistorial.length} pagos)</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredHistorial.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay pagos registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistorial.map((pago) => (
                <div key={pago.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">{pago.cliente_nombre}</p>
                      <p className="text-sm text-gray-600">{pago.concepto}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(pago.fecha_pago).toLocaleDateString('es-AR')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg text-green-600">
                        {MONEDAS[pago.moneda as keyof typeof MONEDAS]?.simbolo || '$'}
                        {pago.monto_pago.toLocaleString()}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {pago.moneda}
                      </Badge>
                    </div>
                    {pago.metodo_pago && (
                      <p className="text-sm text-gray-500">{pago.metodo_pago}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
