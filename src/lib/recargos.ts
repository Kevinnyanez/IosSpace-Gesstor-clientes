/**
 * Cálculo de recargos por días y cada 30 días.
 * - Recargo diario: 0,5% por cada día de atraso (sobre el total acumulado).
 * - Recargo cada 30 días: a los 30, 60, 90... días desde el vencimiento se suma 10% al total.
 *   Ej: vencimiento 4/4 → a los 30 días (4/5) +10%, a los 60 días (4/6) +10%, etc.
 * Válido para deudas en ARS y USD.
 */

const PORCENTAJE_RECARGO_DIARIO = 0.5;
const PORCENTAJE_RECARGO_CADA_30_DIAS = 10;
const DIAS_PARA_RECARGO_MENSUAL = 30;

/**
 * Suma un día a una fecha (sin cambiar hora).
 */
function sumarUnDia(fecha: Date): Date {
  const next = new Date(fecha);
  next.setDate(next.getDate() + 1);
  return next;
}

/**
 * Normaliza la fecha al inicio del día (00:00:00).
 */
function inicioDelDia(fecha: Date): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Días entre dos fechas (enteros, mismo orden que las fechas).
 */
function diasEntre(desde: Date, hasta: Date): number {
  return Math.floor((hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calcula el recargo acumulado desde fechaDesde hasta fechaHasta (incluido),
 * aplicando 0,5% por día y 10% cada 30 días desde fechaDesde.
 * @param montoBase - Monto sobre el que se aplican los recargos (total actual o monto original si se recalcula todo).
 * @param fechaDesde - Primer día en que se aplica recargo (fecha vencimiento o día siguiente al último recargo).
 * @param fechaHasta - Último día a considerar (ej. hoy).
 * @returns Monto de recargo a sumar (número entero redondeado).
 */
export function calcularRecargoPorDiasYMeses(
  montoBase: number,
  fechaDesde: Date,
  fechaHasta: Date
): number {
  const desde = inicioDelDia(fechaDesde);
  const hasta = inicioDelDia(fechaHasta);

  if (desde.getTime() > hasta.getTime()) {
    return 0;
  }

  let total = montoBase;
  let fecha = new Date(desde);

  while (fecha.getTime() <= hasta.getTime()) {
    const diasTranscurridos = diasEntre(desde, fecha);
    // Cada 30 días desde el inicio (30, 60, 90...): +10%
    if (diasTranscurridos > 0 && diasTranscurridos % DIAS_PARA_RECARGO_MENSUAL === 0) {
      total = total * (1 + PORCENTAJE_RECARGO_CADA_30_DIAS / 100);
    }

    // Cada día: +0,5%
    total = total * (1 + PORCENTAJE_RECARGO_DIARIO / 100);

    fecha = sumarUnDia(fecha);
  }

  const recargo = total - montoBase;
  return Math.round(recargo);
}

export interface DetalleRecargo30Dias {
  periodo: number;
  diaDesdeInicio: number;
  montoAntes: number;
  montoRecargo: number;
  fechaAplicacion: Date;
}

export interface DesgloseRecargo {
  total: number;
  recargoPorDias: number;
  recargoPor30Dias: number;
  detallePor30Dias: DetalleRecargo30Dias[];
  diasVencidos: number;
}

/**
 * Calcula el recargo con desglose: cuánto corresponde a días (0,5%/día) y cuánto a cada 30 días (10%).
 * Útil para mostrar "detalles de deuda" en la UI.
 */
export function calcularRecargoConDesglose(
  montoBase: number,
  fechaDesde: Date,
  fechaHasta: Date
): DesgloseRecargo {
  const desde = inicioDelDia(fechaDesde);
  const hasta = inicioDelDia(fechaHasta);

  const detallePor30Dias: DetalleRecargo30Dias[] = [];
  let recargoPorDias = 0;
  let recargoPor30Dias = 0;
  let total = montoBase;
  let fecha = new Date(desde);
  let periodo30 = 0;

  if (desde.getTime() > hasta.getTime()) {
    return {
      total: 0,
      recargoPorDias: 0,
      recargoPor30Dias: 0,
      detallePor30Dias: [],
      diasVencidos: 0,
    };
  }

  const diasVencidos = diasEntre(desde, hasta) + 1;

  while (fecha.getTime() <= hasta.getTime()) {
    const diasTranscurridos = diasEntre(desde, fecha);

    if (diasTranscurridos > 0 && diasTranscurridos % DIAS_PARA_RECARGO_MENSUAL === 0) {
      periodo30++;
      const montoRecargo = Math.round(total * (PORCENTAJE_RECARGO_CADA_30_DIAS / 100));
      total += montoRecargo;
      recargoPor30Dias += montoRecargo;
      detallePor30Dias.push({
        periodo: periodo30,
        diaDesdeInicio: diasTranscurridos,
        montoAntes: total - montoRecargo,
        montoRecargo,
        fechaAplicacion: new Date(fecha),
      });
    }

    const montoRecargoDia = total * (PORCENTAJE_RECARGO_DIARIO / 100);
    total += montoRecargoDia;
    recargoPorDias += montoRecargoDia;

    fecha = sumarUnDia(fecha);
  }

  return {
    total: Math.round(total - montoBase),
    recargoPorDias: Math.round(recargoPorDias),
    recargoPor30Dias,
    detallePor30Dias,
    diasVencidos,
  };
}

/**
 * Recargo diario en modo simple: 0,5% del monto original × días.
 * Solo para mostrar en el modal de detalles (comparación). Por defecto se usa el acumulado.
 */
export function calcularRecargoSimpleDiario(montoBase: number, diasVencidos: number): number {
  return Math.round(montoBase * (PORCENTAJE_RECARGO_DIARIO / 100) * diasVencidos);
}

/**
 * Obtiene los porcentajes usados en el cálculo (para mostrar en UI).
 */
export function getPorcentajesRecargo() {
  return {
    diario: PORCENTAJE_RECARGO_DIARIO,
    cada30Dias: PORCENTAJE_RECARGO_CADA_30_DIAS,
    diasParaRecargoMensual: DIAS_PARA_RECARGO_MENSUAL,
  };
}
