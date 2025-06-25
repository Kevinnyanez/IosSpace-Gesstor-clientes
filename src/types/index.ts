
export interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  direccion: string;
  fechaRegistro: Date;
  activo: boolean;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  activo: boolean;
}

export interface Deuda {
  id: string;
  clienteId: string;
  productoId: string;
  montoTotal: number;
  montoAbonado: number;
  montoRestante: number;
  fechaVencimiento: Date;
  fechaCreacion: Date;
  recargos: number;
  estado: 'pendiente' | 'pagado' | 'vencido';
}

export interface Configuracion {
  id: string;
  porcentajeRecargo: number;
  diasParaRecargo: number;
  monedaDefault: string;
}
