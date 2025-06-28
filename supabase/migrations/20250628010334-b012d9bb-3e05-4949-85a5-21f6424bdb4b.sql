
-- Agregar tabla para historial de pagos (para mantener registro aunque se borre la deuda)
CREATE TABLE public.historial_pagos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deuda_id UUID, -- Puede ser null si la deuda fue eliminada
  cliente_nombre TEXT NOT NULL,
  concepto TEXT NOT NULL,
  monto_pago NUMERIC NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'ARS',
  fecha_pago DATE NOT NULL,
  metodo_pago TEXT,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Agregar columna moneda a las tablas existentes
ALTER TABLE public.deudas ADD COLUMN moneda TEXT NOT NULL DEFAULT 'ARS';
ALTER TABLE public.pagos ADD COLUMN moneda TEXT NOT NULL DEFAULT 'ARS';
ALTER TABLE public.productos ADD COLUMN moneda TEXT NOT NULL DEFAULT 'ARS';

-- Crear función para registrar pagos en historial antes de eliminar deudas
CREATE OR REPLACE FUNCTION public.registrar_pago_en_historial()
RETURNS TRIGGER AS $$
BEGIN
    -- Registrar todos los pagos de la deuda que se va a eliminar
    INSERT INTO public.historial_pagos (
        deuda_id, 
        cliente_nombre, 
        concepto, 
        monto_pago, 
        moneda,
        fecha_pago, 
        metodo_pago, 
        notas
    )
    SELECT 
        p.deuda_id,
        c.nombre || ' ' || c.apellido,
        OLD.concepto,
        p.monto,
        COALESCE(p.moneda, OLD.moneda, 'ARS'),
        p.fecha_pago,
        p.metodo_pago,
        p.notas
    FROM public.pagos p
    JOIN public.clientes c ON c.id = OLD.cliente_id
    WHERE p.deuda_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para ejecutar antes de eliminar deudas
CREATE TRIGGER trigger_registrar_pago_historial
    BEFORE DELETE ON public.deudas
    FOR EACH ROW
    EXECUTE FUNCTION public.registrar_pago_en_historial();
