import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Send, Check, CheckCheck, MessageCircle } from 'lucide-react';

interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface OtherUser {
  id: string;
  email: string | null;
  role: string;
}

export function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getOrCreateConversation = useCallback(async () => {
    if (!user) return;

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, role')
      .neq('id', user.id)
      .limit(1);

    if (!profiles || profiles.length === 0) {
      setLoading(false);
      return;
    }

    const other = profiles[0];
    setOtherUser(other);

    const [u1, u2] = user.id < other.id
      ? [user.id, other.id]
      : [other.id, user.id];

    let { data: conv } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('user_1', u1)
      .eq('user_2', u2)
      .maybeSingle();

    if (!conv) {
      const { data: newConv, error } = await supabase
        .from('chat_conversations')
        .insert({ user_1: u1, user_2: u2 })
        .select('id')
        .single();

      if (error && error.code === '23505') {
        const { data: existing } = await supabase
          .from('chat_conversations')
          .select('id')
          .eq('user_1', u1)
          .eq('user_2', u2)
          .single();
        conv = existing;
      } else {
        conv = newConv;
      }
    }

    if (conv) {
      setConversationId(conv.id);
    }
    setLoading(false);
  }, [user?.id]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;

    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
    }
  }, [conversationId]);

  const markAsRead = useCallback(async () => {
    if (!conversationId || !user) return;

    await supabase
      .from('chat_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .is('read_at', null);
  }, [conversationId, user?.id]);

  useEffect(() => {
    getOrCreateConversation();
  }, [getOrCreateConversation]);

  useEffect(() => {
    if (!conversationId) return;
    fetchMessages().then(() => {
      markAsRead();
      setTimeout(scrollToBottom, 100);
    });
  }, [conversationId, fetchMessages, markAsRead]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-messages-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (newMsg.sender_id !== user?.id) {
          markAsRead();
        }
        setTimeout(scrollToBottom, 100);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const updated = payload.new as ChatMessage;
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user?.id, markAsRead]);

  const sendMessage = async () => {
    if (!draft.trim() || !conversationId || !user || sending) return;

    setSending(true);
    const content = draft.trim();
    setDraft('');

    await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
      });

    await supabase
      .from('chat_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const buildLabel = (u: OtherUser) => {
    if (u.role === 'admin') return 'Administrador (Appy Studios)';
    return u.email ?? 'Cliente';
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const hoy = new Date();
    if (d.toDateString() === hoy.toDateString()) return 'Hoy';
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    if (d.toDateString() === ayer.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const groupedMessages = messages.reduce<{ date: string; msgs: ChatMessage[] }[]>((acc, msg) => {
    const dateKey = new Date(msg.created_at).toDateString();
    const last = acc[acc.length - 1];
    if (last && last.date === dateKey) {
      last.msgs.push(msg);
    } else {
      acc.push({ date: dateKey, msgs: [msg] });
    }
    return acc;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!otherUser) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-gray-500">
        No hay otro usuario para chatear. Crealo desde Supabase.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      <header className="flex items-center gap-3 px-4 py-3 border-b bg-white shrink-0">
        <SidebarTrigger />
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <MessageCircle className="h-5 w-5 text-blue-600" />
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold text-gray-900 truncate">{buildLabel(otherUser)}</h2>
          <p className="text-xs text-gray-500">{otherUser.email}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 bg-gray-50">
        {groupedMessages.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-12">
            Enviale un mensaje para comenzar la conversacion.
          </div>
        )}
        {groupedMessages.map((group) => (
          <div key={group.date}>
            <div className="flex justify-center mb-3">
              <span className="text-xs bg-white text-gray-500 px-3 py-1 rounded-full shadow-sm">
                {formatDate(group.msgs[0].created_at)}
              </span>
            </div>
            <div className="space-y-1.5">
              {group.msgs.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-white text-gray-900 rounded-bl-md border'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <div className={`flex items-center justify-end gap-1 mt-0.5 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                        <span className="text-[10px]">{formatTime(msg.created_at)}</span>
                        {isMe && (
                          msg.read_at
                            ? <CheckCheck className="h-3.5 w-3.5" />
                            : <Check className="h-3.5 w-3.5" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t bg-white shrink-0">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            className="flex-1"
            autoFocus
          />
          <Button
            onClick={sendMessage}
            disabled={!draft.trim() || sending}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
