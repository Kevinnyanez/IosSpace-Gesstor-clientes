
-- Verificar y corregir la estructura de la tabla pagos
-- El campo fecha_pago debe ser DATE, no TIMESTAMP
ALTER TABLE public.pagos ALTER COLUMN fecha_pago TYPE DATE;

-- Agregar índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_pagos_deuda_id ON public.pagos(deuda_id);
CREATE INDEX IF NOT EXISTS idx_deudas_cliente_id ON public.deudas(cliente_id);

-- Crear trigger para actualizar automáticamente monto_restante cuando se actualiza monto_abonado
CREATE OR REPLACE FUNCTION update_monto_restante()
RETURNS TRIGGER AS $$
BEGIN
    NEW.monto_restante := NEW.monto_total - NEW.monto_abonado;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_monto_restante
    BEFORE INSERT OR UPDATE ON public.deudas
    FOR EACH ROW
    EXECUTE FUNCTION update_monto_restante();
