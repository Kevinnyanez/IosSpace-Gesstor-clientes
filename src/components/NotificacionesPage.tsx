import { SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  ArrowRight,
  TrendingUp,
  Globe,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';

interface Notificacion {
  id: string;
  fecha: string;
  titulo: string;
  descripcion: string;
  tipo: 'info' | 'mejora' | 'nuevo';
  icon: React.ElementType;
  detalle?: string[];
  link?: { texto: string; url: string };
}

const notificaciones: Notificacion[] = [
  {
    id: 'migracion-servidor',
    fecha: '5 de Marzo, 2026',
    titulo: 'Nuevo servidor',
    descripcion:
      'Nos mudamos a un nuevo servidor para ofrecerte una mejor experiencia de uso, con mayor velocidad y estabilidad.',
    tipo: 'info',
    icon: Globe,
    detalle: [
      'Mayor velocidad de carga en todas las secciones.',
      'Mejor estabilidad y disponibilidad del sistema.',
      'El enlace anterior dejará de funcionar progresivamente.',
      'Guardá el nuevo enlace como favorito para no perder acceso.',
    ],
    link: {
      texto: 'Ir al nuevo enlace',
      url: 'https://ios-space-gesstor-clientes.vercel.app/',
    },
  },
  {
    id: 'login-seguridad',
    fecha: '5 de Marzo, 2026',
    titulo: 'Autenticación y seguridad',
    descripcion:
      'Se implementó un sistema de inicio de sesión por seguridad y para un mejor control de accesos de terceros, siguiendo buenas prácticas.',
    tipo: 'mejora',
    icon: ShieldCheck,
    detalle: [
      'Acceso protegido con credenciales personales.',
      'Control de accesos: solo usuarios autorizados pueden ingresar.',
      'Sesión persistente: no necesitás loguearte cada vez que entrás.',
      'Botón de cerrar sesión disponible en el menú lateral.',
    ],
  },
  {
    id: 'chat-interno',
    fecha: '5 de Marzo, 2026',
    titulo: 'Chat interno para soporte y actualizaciones',
    descripcion:
      'Ahora podés comunicarte directamente con el administrador desde la app para soporte, consultas y recibir actualizaciones importantes.',
    tipo: 'nuevo',
    icon: MessageCircle,
    detalle: [
      'Chat en tiempo real integrado al sistema.',
      'Notificaciones de mensajes no leídos en el menú lateral y un botón flotante.',
      'Indicadores de lectura (check simple = enviado, doble check = leído).',
      'Canal directo para soporte técnico, consultas y avisos.',
    ],
  },
  {
    id: 'recargos-por-dia',
    fecha: '5 de Marzo, 2026',
    titulo: 'Nuevo sistema de recargos por día',
    descripcion:
      'Se actualizó la forma en la que se calculan los recargos por atraso en las deudas.',
    tipo: 'mejora',
    icon: TrendingUp,
    detalle: [
      'Recargo diario del 0,5% por cada día de atraso sobre el saldo acumulado (interés compuesto).',
      'Recargo adicional del 10% cada 30 días desde la fecha de vencimiento de la deuda.',
      'El cálculo se basa sobre el monto restante después de abonos parciales.',
      'Podés ver el desglose detallado en cada tarjeta de deuda (botón "Ver detalles de recargo").',
      'También hay una comparación con el cálculo simple (0,5% × días × monto original) para referencia.',
    ],
  },
  {
    id: 'interfaz-rediseñada',
    fecha: '5 de Marzo, 2026',
    titulo: 'Interfaz rediseñada',
    descripcion:
      'Rediseño completo de la interfaz: clientes, deudas, configuración, historial de pagos y más. Todo más limpio y rápido de usar.',
    tipo: 'nuevo',
    icon: Globe,
    detalle: [
      'Clientes en formato tabla con acciones directas y estado de deudas visible.',
      'Deudas con indicadores de color por estado (azul = pendiente, verde = al día, rojo = vencido).',
      'Historial de pagos con totales mensuales y paginación.',
      'Formularios más compactos y consistentes.',
    ],
  },
];

const tipoColor: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700',
  mejora: 'bg-emerald-100 text-emerald-700',
  nuevo: 'bg-violet-100 text-violet-700',
};

const tipoLabel: Record<string, string> = {
  info: 'Información',
  mejora: 'Mejora',
  nuevo: 'Nuevo',
};

export function NotificacionesPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" />
            Notificaciones
          </h1>
          <p className="text-sm text-gray-500">Novedades y cambios del sistema</p>
        </div>
      </div>

      <div className="space-y-4">
        {notificaciones.map((n) => (
          <Card key={n.id} className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                    <n.icon className="h-5 w-5 text-gray-700" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{n.titulo}</CardTitle>
                    <p className="text-xs text-gray-400 mt-0.5">{n.fecha}</p>
                  </div>
                </div>
                <Badge variant="secondary" className={`shrink-0 text-[10px] ${tipoColor[n.tipo]}`}>
                  {tipoLabel[n.tipo]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600 leading-relaxed">{n.descripcion}</p>

              {n.detalle && n.detalle.length > 0 && (
                <ul className="space-y-1.5 pl-1">
                  {n.detalle.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              )}

              {n.link && (
                <a
                  href={n.link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {n.link.texto}
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
