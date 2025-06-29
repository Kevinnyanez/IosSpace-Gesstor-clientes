
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Package, AlertTriangle, TrendingUp } from "lucide-react";
import { MONEDAS, type ProductoConCategoria } from "@/types";

interface InventarioStatsProps {
  productos: ProductoConCategoria[];
}

export function InventarioStats({ productos }: InventarioStatsProps) {
  // Calcular estadísticas por moneda
  const statsARS = productos
    .filter(p => p.moneda === 'ARS')
    .reduce((acc, p) => ({
      totalProductos: acc.totalProductos + 1,
      valorTotal: acc.valorTotal + (p.precio * p.stock_actual),
      stockBajo: acc.stockBajo + (p.stock_actual <= p.stock_minimo ? 1 : 0),
      sinStock: acc.sinStock + (p.stock_actual === 0 ? 1 : 0)
    }), { totalProductos: 0, valorTotal: 0, stockBajo: 0, sinStock: 0 });

  const statsUSD = productos
    .filter(p => p.moneda === 'USD')
    .reduce((acc, p) => ({
      totalProductos: acc.totalProductos + 1,
      valorTotal: acc.valorTotal + (p.precio * p.stock_actual),
      stockBajo: acc.stockBajo + (p.stock_actual <= p.stock_minimo ? 1 : 0),
      sinStock: acc.sinStock + (p.stock_actual === 0 ? 1 : 0)
    }), { totalProductos: 0, valorTotal: 0, stockBajo: 0, sinStock: 0 });

  // Estadísticas por categoría
  const categoriaStats = productos.reduce((acc, p) => {
    const categoria = p.categoria?.nombre || 'Sin Categoría';
    if (!acc[categoria]) {
      acc[categoria] = { productos: 0, valor: 0, moneda: p.moneda };
    }
    acc[categoria].productos += 1;
    acc[categoria].valor += p.precio * p.stock_actual;
    return acc;
  }, {} as Record<string, { productos: number; valor: number; moneda: string }>);

  return (
    <div className="space-y-6">
      {/* Estadísticas generales por moneda */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Valor Inventario (ARS)</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${statsARS.valorTotal.toLocaleString('es-AR')}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {statsARS.totalProductos} productos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Valor Inventario (USD)</CardTitle>
            <DollarSign className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              US${statsUSD.valorTotal.toLocaleString('en-US')}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {statsUSD.totalProductos} productos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Stock Bajo</CardTitle>
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {statsARS.stockBajo + statsUSD.stockBajo}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Productos con stock mínimo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Sin Stock</CardTitle>
            <Package className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statsARS.sinStock + statsUSD.sinStock}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Productos agotados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas por categoría */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Valor por Categoría
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(categoriaStats).map(([categoria, stats]) => (
              <div key={categoria} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{categoria}</h3>
                  <Badge variant="outline" className="text-xs">
                    {stats.productos} productos
                  </Badge>
                </div>
                <div className="text-lg font-bold text-gray-800">
                  {MONEDAS[stats.moneda as keyof typeof MONEDAS]?.simbolo || '$'}
                  {stats.valor.toLocaleString()}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Valor total en {stats.moneda}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
