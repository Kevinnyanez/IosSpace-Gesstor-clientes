
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
  estado: 'pendiente' | 'pagado' | 'vencido';
  notas: string | null;
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

// Tipo extendido para mostrar datos completos
export interface DeudaConCliente extends Deuda {
  cliente: Cliente;
}
