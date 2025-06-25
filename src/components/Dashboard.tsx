
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, CreditCard, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";

export function Dashboard() {
  // Datos mock para demostración
  const stats = {
    totalClientes: 125,
    productosActivos: 45,
    deudasPendientes: 18,
    montoTotal: 25780,
    clientesNuevos: 8,
    ventasDelMes: 15420
  };

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {trend && (
          <div className="flex items-center text-sm text-green-600 mt-1">
            <TrendingUp className="h-4 w-4 mr-1" />
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Resumen general de tu negocio</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Clientes"
          value={stats.totalClientes}
          icon={Users}
          color="text-blue-600"
          trend="+12% este mes"
        />
        <StatCard
          title="Productos Activos"
          value={stats.productosActivos}
          icon={Package}
          color="text-green-600"
        />
        <StatCard
          title="Deudas Pendientes"
          value={stats.deudasPendientes}
          icon={CreditCard}
          color="text-orange-600"
        />
        <StatCard
          title="Monto Total Adeudado"
          value={`$${stats.montoTotal.toLocaleString()}`}
          icon={DollarSign}
          color="text-red-600"
        />
        <StatCard
          title="Clientes Nuevos"
          value={stats.clientesNuevos}
          icon={Users}
          color="text-purple-600"
          trend="+5 esta semana"
        />
        <StatCard
          title="Ventas del Mes"
          value={`$${stats.ventasDelMes.toLocaleString()}`}
          icon={TrendingUp}
          color="text-blue-600"
          trend="+8% vs mes anterior"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Deudas Próximas a Vencer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <div>
                  <p className="font-medium">Juan Pérez</p>
                  <p className="text-sm text-gray-600">Producto A - $1,250</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-orange-600 font-medium">Vence en 3 días</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium">María García</p>
                  <p className="text-sm text-gray-600">Producto B - $850</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-red-600 font-medium">Vencido hace 2 días</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Nuevo cliente registrado</p>
                  <p className="text-sm text-gray-600">Ana López - hace 2 horas</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Pago recibido</p>
                  <p className="text-sm text-gray-600">Carlos Ruiz - $500 - hace 4 horas</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Producto actualizado</p>
                  <p className="text-sm text-gray-600">Producto C - hace 1 día</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
