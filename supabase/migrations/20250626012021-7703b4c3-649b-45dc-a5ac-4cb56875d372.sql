
-- Crear tabla de categorías (sin datos de ejemplo)
CREATE TABLE public.categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de productos
CREATE TABLE public.productos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio DECIMAL(12,2) NOT NULL CHECK (precio >= 0),
  stock_actual INTEGER NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
  stock_minimo INTEGER NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  codigo TEXT UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de movimientos de stock
CREATE TABLE public.movimientos_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN ('entrada', 'salida', 'ajuste')),
  cantidad INTEGER NOT NULL,
  motivo TEXT,
  fecha_movimiento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear triggers para updated_at
CREATE TRIGGER update_categorias_updated_at 
  BEFORE UPDATE ON public.categorias 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_productos_updated_at 
  BEFORE UPDATE ON public.productos 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_stock ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para acceso público
CREATE POLICY "Permitir todo en categorias" ON public.categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en productos" ON public.productos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en movimientos_stock" ON public.movimientos_stock FOR ALL USING (true) WITH CHECK (true);
