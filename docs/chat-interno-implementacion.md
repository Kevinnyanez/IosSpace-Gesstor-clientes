# Chat Interno - Documentación de Implementación

Sistema de mensajería directa 1:1 integrado en la aplicación, usando **Supabase** (base de datos + Realtime) y **React**.

---

## Índice

1. [Arquitectura general](#1-arquitectura-general)
2. [Base de datos (Supabase)](#2-base-de-datos-supabase)
3. [Políticas RLS (Row Level Security)](#3-políticas-rls)
4. [Requisito: que todos puedan ver perfiles](#4-requisito-que-todos-puedan-ver-perfiles)
5. [Frontend: Componentes](#5-frontend-componentes)
6. [Frontend: Hook de mensajes no leídos](#6-frontend-hook-de-mensajes-no-leídos)
7. [Cómo funciona el Realtime](#7-cómo-funciona-el-realtime)
8. [Guía paso a paso para implementar en otro proyecto](#8-guía-paso-a-paso)
9. [Ejemplo mínimo de integración](#9-ejemplo-mínimo-de-integración)

---

## 1. Arquitectura general

```
┌──────────────┐       ┌──────────────────────┐
│   Frontend   │◄─────►│  Supabase            │
│   (React)    │       │  ├─ chat_conversations│
│              │       │  ├─ chat_messages     │
│  ChatSection │       │  ├─ profiles (lectura)│
│  ChatBubble  │       │  └─ Realtime (WS)    │
│  useChatUnread│      └──────────────────────┘
└──────────────┘
```

- **chat_conversations**: Una fila por cada par de usuarios que chatearon.
- **chat_messages**: Los mensajes, cada uno asociado a una conversación.
- **Realtime**: Supabase publica cambios vía WebSocket para que los mensajes lleguen en vivo.

---

## 2. Base de datos (Supabase)

### Tabla: `chat_conversations`

```sql
CREATE TABLE IF NOT EXISTS chat_conversations (
  id SERIAL PRIMARY KEY,
  user_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chat_conversations_unique UNIQUE (user_1, user_2),
  CONSTRAINT chat_conversations_different_users CHECK (user_1 <> user_2)
);
```

**Clave de diseño**: `user_1` es SIEMPRE el UUID lexicográficamente menor. Esto garantiza que no haya duplicados (A,B y B,A serían la misma conversación).

### Tabla: `chat_messages`

```sql
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  conversation_id INT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ  -- NULL = no leído, con fecha = leído
);
```

### Índices

```sql
CREATE INDEX idx_chat_conversations_user_1 ON chat_conversations(user_1);
CREATE INDEX idx_chat_conversations_user_2 ON chat_conversations(user_2);
CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id, created_at DESC);
CREATE INDEX idx_chat_messages_unread ON chat_messages(sender_id, read_at) WHERE read_at IS NULL;
```

### Habilitar Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
```

**IMPORTANTE**: También hay que habilitar Realtime en el Dashboard de Supabase:
Database → Replication → `supabase_realtime` → asegurar que `chat_messages` y `chat_conversations` estén habilitadas.

---

## 3. Políticas RLS

```sql
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- CONVERSACIONES: cada usuario solo ve/crea/edita las suyas
CREATE POLICY "Users can view own conversations"
  ON chat_conversations FOR SELECT
  USING (auth.uid() IN (user_1, user_2));

CREATE POLICY "Users can create conversations"
  ON chat_conversations FOR INSERT
  WITH CHECK (auth.uid() IN (user_1, user_2));

CREATE POLICY "Users can update own conversations"
  ON chat_conversations FOR UPDATE
  USING (auth.uid() IN (user_1, user_2));

-- MENSAJES: solo pueden ver mensajes de sus conversaciones
CREATE POLICY "Users can view messages in own conversations"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND auth.uid() IN (c.user_1, c.user_2)
    )
  );

-- Solo pueden enviar mensajes como ellos mismos, en sus conversaciones
CREATE POLICY "Users can send messages in own conversations"
  ON chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND auth.uid() IN (c.user_1, c.user_2)
    )
  );

-- Solo el receptor puede marcar como leído
CREATE POLICY "Receiver can mark messages as read"
  ON chat_messages FOR UPDATE
  USING (
    sender_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND auth.uid() IN (c.user_1, c.user_2)
    )
  )
  WITH CHECK (
    sender_id <> auth.uid()
  );
```

---

## 4. Requisito: que todos puedan ver perfiles

Para que un usuario pueda ver la lista de otros usuarios (para iniciar conversaciones), se necesita que todos los usuarios autenticados puedan leer la tabla `profiles`:

```sql
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
```

**Sin esta policy**, los usuarios que no son admin no verán a nadie para chatear.

---

## 5. Frontend: Componentes

### 5.1 `ChatSection.tsx` — El componente principal

**Estructura visual:**
- Panel izquierdo: lista de conversaciones (nombre, último mensaje, hora, badge de no leídos)
- Panel derecho: chat activo (burbujas de mensaje, input para escribir)
- Diálogo para nueva conversación (buscar usuario)

**Flujo de datos:**

1. Al montar, llama `fetchUsers()` para listar todos los usuarios
2. Llama `fetchConversations()` que consulta `chat_conversations` donde el usuario participa
3. Para cada conversación, obtiene el último mensaje y el conteo de no leídos
4. Se suscribe a Realtime en `chat_messages` para recibir nuevos mensajes en vivo

**Lógica clave — Crear conversación:**

```typescript
const startConversation = async (targetUser) => {
  // user_1 SIEMPRE es el UUID menor (lexicográficamente)
  const [u1, u2] = myId < targetUser.id
    ? [myId, targetUser.id]
    : [targetUser.id, myId];

  // Verificar si ya existe
  const existing = conversations.find(c => c.otherUser.id === targetUser.id);
  if (existing) {
    openConversation(existing);
    return;
  }

  // Crear nueva
  const { data, error } = await supabase
    .from('chat_conversations')
    .insert({ user_1: u1, user_2: u2 })
    .select()
    .single();

  // Si error 23505 (unique violation), la conversación ya existe
  if (error?.code === '23505') {
    // Buscar la existente y abrirla
  }
};
```

**Lógica clave — Enviar mensaje:**

```typescript
const sendMessage = async () => {
  await supabase
    .from('chat_messages')
    .insert({
      conversation_id: activeConv.id,
      sender_id: myId,
      content: draft.trim(),
    });

  // Actualizar timestamp de la conversación
  await supabase
    .from('chat_conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', activeConv.id);
};
```

**Lógica clave — Marcar como leído:**

```typescript
const markAsRead = async (msgId: number) => {
  await supabase
    .from('chat_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', msgId)
    .is('read_at', null);
};
```

Se llama cuando se abre una conversación (todos los no leídos) y cuando llega un mensaje nuevo en la conversación activa.

**Indicadores de lectura (✓ y ✓✓):**
- `✓` (Check): mensaje enviado, no leído por el otro
- `✓✓` (CheckCheck): mensaje leído por el otro

### 5.2 `ChatBubble.tsx` — Botón flotante

Botón circular fijo en la esquina inferior derecha que:
- Muestra ícono de mensaje
- Muestra badge rojo con la cantidad de no leídos
- Al hacer clic, navega a la sección de chat
- Se oculta automáticamente cuando ya estás en la sección de chat

### 5.3 Integración en el Dashboard

```tsx
// En el array de navegación del sidebar:
{ key: 'chat', label: 'Mensajes', icon: MessageCircle }

// En el renderContent:
case 'chat':
  return <ChatSection />;

// Badge de no leídos en el sidebar:
const { unread: chatUnread } = useChatUnread();
// En el map de NAV_ITEMS:
const badge = item.key === 'chat' && chatUnread > 0 ? chatUnread : 0;

// Botón flotante al final del layout:
<ChatBubble
  isActive={activeSection === 'chat'}
  onNavigateChat={() => handleNav('chat')}
/>
```

---

## 6. Frontend: Hook `useChatUnread`

Hook compartido para obtener el conteo global de mensajes no leídos en tiempo real.

```typescript
export const useChatUnread = () => {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  const fetchUnread = useCallback(async () => {
    // 1. Obtener todas las conversaciones del usuario
    const { data: convs } = await supabase
      .from('chat_conversations')
      .select('id')
      .or(`user_1.eq.${user.id},user_2.eq.${user.id}`);

    // 2. Contar mensajes no leídos (donde yo NO soy el sender y read_at es null)
    const { count } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', ids)
      .neq('sender_id', user.id)
      .is('read_at', null);

    setUnread(count || 0);
  }, [user?.id]);

  // Suscripción Realtime: refresca el conteo cuando cambia chat_messages
  useEffect(() => {
    const channel = supabase
      .channel('chat-unread-global')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
      }, () => fetchUnread())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user?.id, fetchUnread]);

  return { unread, refresh: fetchUnread };
};
```

**Se usa en:**
- `ChatBubble` (badge del botón flotante)
- Dashboard sidebar (badge numérico en el item "Mensajes")

---

## 7. Cómo funciona el Realtime

Supabase Realtime usa WebSockets para enviar cambios de la DB al cliente:

1. **Suscripción a INSERT en `chat_messages`** (en `ChatSection`):
   - Cuando llega un mensaje nuevo, si es de la conversación activa, lo agrega a la lista y lo marca como leído
   - Siempre refresca la lista de conversaciones (para actualizar último mensaje y conteo)

2. **Suscripción a * en `chat_messages`** (en `useChatUnread`):
   - Cualquier cambio (INSERT, UPDATE) re-calcula el total de no leídos
   - Así, cuando abro un chat y marco mensajes como leídos, el badge se actualiza en todos lados

---

## 8. Guía paso a paso

### Paso 1: Crear las tablas en Supabase

Ejecutar el SQL de la sección 2 en el SQL Editor de Supabase (tablas + índices + realtime).

### Paso 2: Crear las políticas RLS

Ejecutar el SQL de la sección 3.

### Paso 3: Permitir lectura de perfiles

Ejecutar el SQL de la sección 4. Sin esto, los usuarios no ven a quién chatear.

### Paso 4: Habilitar Realtime en el Dashboard

En Supabase: Database → Replication → verificar que `chat_messages` y `chat_conversations` estén en `supabase_realtime`.

### Paso 5: Agregar los tipos TypeScript

En tu archivo de tipos de Supabase, agregar las interfaces para `chat_conversations` y `chat_messages` (ver `src/integrations/supabase/types.ts`).

### Paso 6: Copiar los componentes

1. `src/components/dashboard/ChatSection.tsx` — Componente principal del chat
2. `src/components/dashboard/ChatBubble.tsx` — Botón flotante
3. `src/hooks/useChatUnread.ts` — Hook de mensajes no leídos

### Paso 7: Integrar en tu Dashboard

1. Agregar "Mensajes" al array de navegación
2. Renderizar `<ChatSection />` cuando se seleccione
3. Usar `useChatUnread()` para el badge del sidebar
4. Agregar `<ChatBubble />` al layout principal

### Paso 8: Adaptar el `buildUserLabel`

En `ChatSection.tsx`, la función `buildUserLabel` construye el nombre visible de cada usuario. Adaptala a tu modelo:

```typescript
// Ejemplo genérico:
const buildUserLabel = (profile) => {
  if (profile.role === 'admin') return 'Administrador';
  return profile.name || profile.email;
};
```

---

## 9. Ejemplo mínimo de integración

Si querés solo chat admin ↔ usuario:

```typescript
// En tu Dashboard principal:
import ChatSection from './ChatSection';
import ChatBubble from './ChatBubble';
import { useChatUnread } from '@/hooks/useChatUnread';

const Dashboard = () => {
  const { unread } = useChatUnread();
  const [showChat, setShowChat] = useState(false);

  return (
    <div>
      {/* Tu contenido */}

      {/* Botón en el sidebar o nav */}
      <button onClick={() => setShowChat(true)}>
        Mensajes {unread > 0 && <span>({unread})</span>}
      </button>

      {/* Sección de chat */}
      {showChat && <ChatSection />}

      {/* Botón flotante */}
      <ChatBubble
        isActive={showChat}
        onNavigateChat={() => setShowChat(true)}
      />
    </div>
  );
};
```

---

## Dependencias

- `@supabase/supabase-js` (client + Realtime)
- `lucide-react` (íconos: MessageCircle, Send, Check, CheckCheck, etc.)
- Componentes UI: Button, Input, Badge, Dialog (shadcn/ui o similar)

## Limitaciones

- No hay límite de mensajes por diseño (Supabase free tier tiene límites de almacenamiento)
- Realtime en Supabase free tier: máximo ~200 conexiones simultáneas
- No hay soporte de archivos/imágenes (solo texto)
- No hay indicador de "escribiendo..." (se puede agregar con Supabase Presence)

---

## Archivos del proyecto relacionados

| Archivo | Descripción |
|---------|-------------|
| `supabase/migrations/20260121150000_chat_messages.sql` | Migración: tablas, RLS, Realtime |
| `supabase/migrations/20260121190000_profiles_read_for_chat.sql` | Policy para que todos lean perfiles |
| `src/components/dashboard/ChatSection.tsx` | Componente principal del chat |
| `src/components/dashboard/ChatBubble.tsx` | Botón flotante con badge |
| `src/hooks/useChatUnread.ts` | Hook de conteo de no leídos |
| `src/integrations/supabase/types.ts` | Tipos TypeScript (chat_conversations, chat_messages) |
