
-- Add fecha_ultimo_recargo column to deudas table
ALTER TABLE public.deudas 
ADD COLUMN fecha_ultimo_recargo timestamp with time zone;
