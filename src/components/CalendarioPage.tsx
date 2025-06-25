
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Clock, User, AlertTriangle } from "lucide-react";

export function CalendarioPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Eventos mock para demostración
  const eventos = [
    {
      id: '1',
      titulo: 'Vencimiento - Juan Pérez',
      fecha: new Date('2024-07-15'),
      tipo: 'vencimiento',
      descripcion: 'Producto Premium A - $1,000'
    },
    {
      id: '2',
      titulo: 'Seguimiento - María García',
      fecha: new Date('2024-07-30'),
      tipo: 'seguimiento',
      descripcion: 'Revisar estado de pago'
    },
    {
      id: '3',
      titulo: 'Reunión con cliente',
      fecha: new Date('2024-07-28'),
      tipo: 'reunion',
      descripcion: 'Presentación de nuevos productos'
    }
  ];

  const getEventBadge = (tipo: string) => {
    const tipos = {
      'vencimiento': { color: 'bg-red-100 text-red-700', icon: AlertTriangle },
      'seguimiento': { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      'reunion': { color: 'bg-blue-100 text-blue-700', icon: User }
    };
    return tipos[tipo as keyof typeof tipos] || tipos.seguimiento;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendario</h1>
          <p className="text-gray-600 mt-2">Gestiona fechas importantes y eventos</p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <CalendarIcon className="h-4 w-4 mr-2" />
          Nuevo Evento
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Calendario</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border pointer-events-auto"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {eventos.map((evento) => {
                const badge = getEventBadge(evento.tipo);
                const Icon = badge.icon;
                return (
                  <div key={evento.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${badge.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{evento.titulo}</h3>
                          <p className="text-sm text-gray-600">{evento.descripcion}</p>
                        </div>
                      </div>
                      <Badge className={badge.color} variant="outline">
                        {evento.tipo}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                      <CalendarIcon className="h-4 w-4" />
                      {evento.fecha.toLocaleDateString('es-AR')}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen del Mes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-600">3</p>
                  <p className="text-sm text-red-700">Vencimientos</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold text-yellow-600">5</p>
                  <p className="text-sm text-yellow-700">Seguimientos</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <User className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">2</p>
                  <p className="text-sm text-blue-700">Reuniones</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
