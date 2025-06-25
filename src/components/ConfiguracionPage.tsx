
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Percent, Calendar, DollarSign, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ConfiguracionPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    porcentajeRecargo: 5,
    diasParaRecargo: 30,
    monedaDefault: 'ARS'
  });

  const handleSave = () => {
    toast({
      title: "Configuración guardada",
      description: "Los cambios se han aplicado correctamente.",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-600 mt-2">Personaliza el comportamiento de la aplicación</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-blue-600" />
              Recargos Automáticos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="porcentaje">Porcentaje de Recargo (%)</Label>
              <Input
                id="porcentaje"
                type="number"
                value={config.porcentajeRecargo}
                onChange={(e) => setConfig({...config, porcentajeRecargo: Number(e.target.value)})}
                className="mt-2"
              />
              <p className="text-sm text-gray-600 mt-1">
                Porcentaje que se aplicará como recargo por mora
              </p>
            </div>
            
            <div>
              <Label htmlFor="dias">Días para Aplicar Recargo</Label>
              <Input
                id="dias"
                type="number"
                value={config.diasParaRecargo}
                onChange={(e) => setConfig({...config, diasParaRecargo: Number(e.target.value)})}
                className="mt-2"
              />
              <p className="text-sm text-gray-600 mt-1">
                Cantidad de días después del vencimiento para aplicar recargo
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Configuración General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="moneda">Moneda por Defecto</Label>
              <Select value={config.monedaDefault} onValueChange={(value) => setConfig({...config, monedaDefault: value})}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">Peso Argentino (ARS)</SelectItem>
                  <SelectItem value="USD">Dólar Estadounidense (USD)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            Resumen de Configuración
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Percent className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">{config.porcentajeRecargo}%</p>
                  <p className="text-sm text-blue-700">Recargo por Mora</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold text-orange-600">{config.diasParaRecargo}</p>
                  <p className="text-sm text-orange-700">Días de Gracia</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{config.monedaDefault}</p>
                  <p className="text-sm text-green-700">Moneda Default</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Cómo Funcionan los Recargos</h3>
            <p className="text-sm text-gray-600">
              Cuando una deuda pase {config.diasParaRecargo} días de su fecha de vencimiento, 
              automáticamente se aplicará un recargo del {config.porcentajeRecargo}% sobre el monto pendiente. 
              Este proceso se ejecuta diariamente para mantener los saldos actualizados.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
          <Save className="h-4 w-4 mr-2" />
          Guardar Configuración
        </Button>
      </div>
    </div>
  );
}
