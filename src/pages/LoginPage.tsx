import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  LogIn, Eye, EyeOff, ArrowRight, AlertTriangle,
  Server, Shield, MessageCircle, TrendingUp, Sparkles,
} from 'lucide-react';

const NUEVO_ENLACE = 'https://ios-space-gesstor-clientes.vercel.app/';
const estoyEnEnlaceCorrecto = window.location.origin.includes('ios-space-gesstor-clientes.vercel.app');

const novedades = [
  {
    icon: Server,
    title: 'Nuevo servidor',
    desc: 'Nos mudamos para ofrecerte mayor velocidad y estabilidad.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: TrendingUp,
    title: 'Recargos automáticos',
    desc: 'Recargo diario del 0,5% compuesto + 10% cada 30 días vencidos.',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    icon: MessageCircle,
    title: 'Chat interno',
    desc: 'Soporte directo y actualizaciones en tiempo real desde la app.',
    color: 'bg-violet-100 text-violet-600',
  },
  {
    icon: Shield,
    title: 'Autenticación',
    desc: 'Acceso seguro por buenas prácticas y control de accesos de terceros.',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: Sparkles,
    title: 'Interfaz rediseñada',
    desc: 'Nuevo diseño en clientes, deudas, configuración y más.',
    color: 'bg-pink-100 text-pink-600',
  },
];

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: loginError } = await signIn(email.trim(), password);
    if (loginError) setError('Credenciales incorrectas. Verificá tu email y contraseña.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Panel izquierdo - Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 sm:px-12 py-12 bg-white">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-1.5">
            <img
              src="/iosspace27-logo.svg"
              alt="IOSSpace27"
              className="h-10 object-contain mb-4"
            />
            <h1 className="text-2xl font-bold text-gray-900">Bienvenido</h1>
            <p className="text-sm text-gray-500">Ingresá con tu cuenta para continuar</p>
          </div>

          {!estoyEnEnlaceCorrecto && (
            <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-900">Este enlace dejará de funcionar</p>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Nos mudamos para una mejor experiencia. Guardá el nuevo enlace.
                </p>
                <a
                  href={NUEVO_ENLACE}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800"
                >
                  Ir al nuevo enlace <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-gray-600">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-gray-600">Contraseña</label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10 h-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">{error}</p>
            )}

            <Button type="submit" className="w-full h-10 bg-blue-600 hover:bg-blue-700 shadow-sm" disabled={loading}>
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </Button>
          </form>

          <p className="text-[10px] text-gray-400">
            Powered by <span className="font-medium">Appy Studios</span>
          </p>
        </div>
      </div>

      {/* Panel derecho - Novedades */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 sm:px-12 py-12 bg-gray-50 border-t lg:border-t-0 lg:border-l border-gray-100">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5">
            <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 mb-2">
              v2.0
            </Badge>
            <h2 className="text-xl font-bold text-gray-900">¿Qué hay de nuevo?</h2>
            <p className="text-sm text-gray-500">Últimas actualizaciones del sistema</p>
          </div>

          <div className="space-y-2.5">
            {novedades.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 p-3 rounded-lg bg-white border border-gray-100 hover:shadow-sm transition-shadow"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-gray-400">
            Más detalles en la sección <span className="font-medium text-gray-500">Notificaciones</span> dentro de la app.
          </p>
        </div>
      </div>
    </div>
  );
}
