
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Users, Calculator, TrendingUp, Shield, HelpCircle } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AyudaPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ayuda y Recomendaciones</h1>
          <p className="text-gray-600 mt-2">Guía completa de uso del sistema y soporte técnico</p>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            Sistema de Gestión de Deudas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo y descripción principal */}
          <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex-shrink-0">
              <img 
                src="/lovable-uploads/139ccb2f-7ba1-4720-9a2e-04dbfc1f46a3.png" 
                alt="Logo del Sistema" 
                className="w-24 h-24 object-contain"
              />
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold text-gray-900 mb-2">IoSpace Control</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                Una aplicación web integral diseñada para la gestión eficiente de clientes, deudas, pagos e inventario. 
                Automatiza procesos financieros y proporciona herramientas completas para el control administrativo empresarial.
              </p>
            </div>
          </div>

          {/* Funcionalidades principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-green-50 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-green-900">Gestión de Clientes</h4>
              </div>
              <p className="text-sm text-green-800">
                Administra información completa de clientes, contactos y historial de transacciones de manera centralizada.
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-5 w-5 text-purple-600" />
                <h4 className="font-semibold text-purple-900">Control de Deudas</h4>
              </div>
              <p className="text-sm text-purple-800">
                Registra, monitorea y gestiona deudas con cálculo automático de recargos por vencimiento y seguimiento de pagos.
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-orange-50 border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                <h4 className="font-semibold text-orange-900">Inventario</h4>
              </div>
              <p className="text-sm text-orange-800">
                Controla stock, productos y categorías con alertas de inventario bajo y gestión de precios actualizada.
              </p>
            </div>

            <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">Automatización</h4>
              </div>
              <p className="text-sm text-blue-800">
                Aplica recargos automáticos, limpia historial y mantiene datos organizados con procesos programados.
              </p>
            </div>
          </div>

          {/* Recomendaciones de uso */}
          <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
            <h4 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Recomendaciones para el Uso Correcto
            </h4>
            <div className="space-y-2 text-sm text-yellow-800">
              <p>• <strong>Configuración inicial:</strong> Establece el porcentaje de recargo y días de gracia según tu política comercial</p>
              <p>• <strong>Registro regular:</strong> Mantén actualizada la información de clientes y deudas para un control preciso</p>
              <p>• <strong>Revisión periódica:</strong> Verifica el estado de las deudas y aplica recargos de manera consistente</p>
              <p>• <strong>Respaldo de datos:</strong> Realiza copias de seguridad regulares de la información importante</p>
              <p>• <strong>Limpieza de historial:</strong> Usa las herramientas de limpieza para mantener el rendimiento óptimo</p>
              <p>• <strong>Monitoreo de inventario:</strong> Revisa regularmente los niveles de stock y actualiza precios</p>
            </div>
          </div>

          {/* Guía de uso paso a paso */}
          <div className="p-4 border rounded-lg bg-indigo-50 border-indigo-200">
            <h4 className="font-semibold text-indigo-900 mb-3">Guía de Uso Paso a Paso</h4>
            <div className="space-y-3 text-sm text-indigo-800">
              <div>
                <h5 className="font-medium">1. Configuración Inicial</h5>
                <p>• Accede a Configuración y establece los parámetros de recargo</p>
                <p>• Define la moneda y días de gracia para tu negocio</p>
              </div>
              <div>
                <h5 className="font-medium">2. Gestión de Clientes</h5>
                <p>• Registra todos tus clientes con información completa</p>
                <p>• Mantén actualizados los datos de contacto</p>
              </div>
              <div>
                <h5 className="font-medium">3. Control de Deudas</h5>
                <p>• Registra nuevas deudas con fechas de vencimiento</p>
                <p>• Realiza seguimiento de pagos y abonos</p>
                <p>• Aplica recargos cuando corresponda</p>
              </div>
              <div>
                <h5 className="font-medium">4. Inventario</h5>
                <p>• Mantén actualizado el stock de productos</p>
                <p>• Organiza por categorías para mejor control</p>
              </div>
            </div>
          </div>

          {/* Soporte técnico */}
          <div className="p-4 border rounded-lg bg-gray-50 border-gray-300 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <HelpCircle className="h-5 w-5 text-gray-600" />
              <h4 className="font-semibold text-gray-900">Soporte Técnico</h4>
            </div>
            <p className="text-sm text-gray-700 mb-3">
              ¿Necesitas ayuda o tienes alguna consulta sobre el funcionamiento del sistema?
            </p>
            <p className="text-sm font-medium text-gray-900">
              Contacta con nuestro equipo de soporte técnico para obtener asistencia personalizada
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Disponible para resolver dudas, configuraciones avanzadas y mantenimiento del sistema
            </p>
          </div>

          {/* Información adicional */}
          <div className="p-4 border rounded-lg bg-emerald-50 border-emerald-200">
            <h4 className="font-semibold text-emerald-900 mb-2">Características del Sistema</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-emerald-800">
              <p>• Interfaz intuitiva y fácil de usar</p>
              <p>• Cálculos automáticos de recargos</p>
              <p>• Reportes y estadísticas en tiempo real</p>
              <p>• Gestión completa de inventario</p>
              <p>• Historial detallado de transacciones</p>
              <p>• Sistema de notificaciones</p>
              <p>• Respaldo automático de datos</p>
              <p>• Acceso desde cualquier dispositivo</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
