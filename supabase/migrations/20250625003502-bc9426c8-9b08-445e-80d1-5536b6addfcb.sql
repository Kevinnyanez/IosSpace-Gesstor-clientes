
-- Crear tabla de clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT UNIQUE,
  telefono TEXT,
  direccion TEXT,
  fecha_registro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de configuración del sistema
CREATE TABLE public.configuracion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  porcentaje_recargo DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  dias_para_recargo INTEGER NOT NULL DEFAULT 30,
  moneda_default TEXT NOT NULL DEFAULT 'ARS',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de deudas (sin relación a productos específicos)
CREATE TABLE public.deudas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  concepto TEXT NOT NULL, -- Descripción libre de qué se debe
  monto_total DECIMAL(12,2) NOT NULL CHECK (monto_total > 0),
  monto_abonado DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (monto_abonado >= 0),
  monto_restante DECIMAL(12,2) GENERATED ALWAYS AS (monto_total - monto_abonado) STORED,
  fecha_vencimiento DATE NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recargos DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (recargos >= 0),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'vencido')),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de pagos para llevar historial
CREATE TABLE public.pagos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deuda_id UUID NOT NULL REFERENCES public.deudas(id) ON DELETE CASCADE,
  monto DECIMAL(12,2) NOT NULL CHECK (monto > 0),
  fecha_pago TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metodo_pago TEXT,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insertar configuración inicial
INSERT INTO public.configuracion (porcentaje_recargo, dias_para_recargo, moneda_default)
VALUES (10.00, 30, 'ARS');

-- Crear función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear triggers para actualizar updated_at
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deudas_updated_at BEFORE UPDATE ON public.deudas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_configuracion_updated_at BEFORE UPDATE ON public.configuracion FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Crear función para aplicar recargos automáticos
CREATE OR REPLACE FUNCTION aplicar_recargos_vencidos()
RETURNS void AS $$
DECLARE
    config_recargo DECIMAL(5,2);
    config_dias INTEGER;
    deuda_record RECORD;
BEGIN
    -- Obtener configuración actual
    SELECT porcentaje_recargo, dias_para_recargo 
    INTO config_recargo, config_dias 
    FROM public.configuracion 
    LIMIT 1;
    
    -- Aplicar recargos a deudas vencidas sin recargo previo
    FOR deuda_record IN 
        SELECT id, monto_restante, fecha_vencimiento
        FROM public.deudas 
        WHERE estado = 'pendiente' 
          AND fecha_vencimiento < CURRENT_DATE - INTERVAL '1 day' * config_dias
          AND recargos = 0
          AND monto_restante > 0
    LOOP
        UPDATE public.deudas 
        SET recargos = (deuda_record.monto_restante * config_recargo / 100),
            estado = 'vencido'
        WHERE id = deuda_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Habilitar Row Level Security (RLS) en todas las tablas
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deudas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para acceso público por ahora (puedes restringir más tarde con autenticación)
CREATE POLICY "Permitir todo en clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en deudas" ON public.deudas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en pagos" ON public.pagos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir lectura en configuracion" ON public.configuracion FOR SELECT USING (true);
CREATE POLICY "Permitir actualización en configuracion" ON public.configuracion FOR UPDATE USING (true) WITH CHECK (true);
