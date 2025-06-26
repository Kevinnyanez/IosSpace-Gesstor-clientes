
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExchangeRate {
  compra: number;
  venta: number;
  fecha: string;
  variacion: number;
}

export function ExchangeRateCard() {
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchExchangeRate = async () => {
    try {
      setLoading(true);
      // Usando la API de Bluelytics para obtener cotización del dólar blue
      const response = await fetch('https://api.bluelytics.com.ar/v2/latest');
      const data = await response.json();
      
      if (data.blue) {
        setExchangeRate({
          compra: data.blue.value_buy,
          venta: data.blue.value_sell,
          fecha: data.last_update,
          variacion: data.blue.value_sell - data.blue.value_buy
        });
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      // Datos de fallback en caso de error
      setExchangeRate({
        compra: 1200,
        venta: 1220,
        fecha: new Date().toISOString(),
        variacion: 20
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeRate();
    // Actualizar cada 5 minutos
    const interval = setInterval(fetchExchangeRate, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !exchangeRate) {
    return (
      <Card className="hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Dólar Blue</CardTitle>
          <DollarSign className="h-5 w-5 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">Dólar Blue</CardTitle>
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchExchangeRate}
            disabled={loading}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {exchangeRate && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Compra:</span>
              <span className="font-semibold">${exchangeRate.compra}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Venta:</span>
              <span className="font-semibold">${exchangeRate.venta}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Diferencia:</span>
              <div className="flex items-center gap-1">
                {exchangeRate.variacion > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={`text-sm font-medium ${
                  exchangeRate.variacion > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${Math.abs(exchangeRate.variacion)}
                </span>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Actualizado: {lastUpdate.toLocaleTimeString('es-AR')}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
