export interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  fecha_registro: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Deuda {
  id: string;
  cliente_id: string;
  concepto: string;
  monto_total: number;
  monto_abonado: number;
  monto_restante: number;
  fecha_vencimiento: string;
  fecha_creacion: string;
  recargos: number;
  estado: string;
  notas: string | null;
  moneda: string;
  fecha_ultimo_recargo: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pago {
  id: string;
  deuda_id: string;
  monto: number;
  fecha_pago: string;
  metodo_pago: string | null;
  notas: string | null;
  moneda: string;
  created_at: string;
}

export interface HistorialPago {
  id: string;
  deuda_id: string | null;
  cliente_nombre: string;
  concepto: string;
  monto_pago: number;
  moneda: string;
  fecha_pago: string;
  metodo_pago: string | null;
  notas: string | null;
  created_at: string;
}

export interface Configuracion {
  id: string;
  porcentaje_recargo: number;
  dias_para_recargo: number;
  moneda_default: string;
  created_at: string;
  updated_at: string;
}

// Nuevos tipos para inventario
export interface Categoria {
  id: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock_actual: number;
  stock_minimo: number;
  categoria_id: string | null;
  codigo: string | null;
  activo: boolean;
  moneda: string;
  created_at: string;
  updated_at: string;
}

export interface MovimientoStock {
  id: string;
  producto_id: string;
  tipo_movimiento: 'entrada' | 'salida' | 'ajuste';
  cantidad: number;
  motivo: string | null;
  fecha_movimiento: string;
  created_at: string;
}

// Tipos extendidos
export interface DeudaConCliente extends Deuda {
  cliente: Cliente;
}

export interface ProductoConCategoria extends Producto {
  categoria?: Categoria;
}

// Constantes para monedas
export const MONEDAS = {
  ARS: { codigo: 'ARS', simbolo: '$', nombre: 'Peso Argentino' },
  USD: { codigo: 'USD', simbolo: 'US$', nombre: 'Dólar Estadounidense' },
} as const;

export type MonedaCodigo = keyof typeof MONEDAS;
