import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useChatUnread() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!user) { setUnread(0); return; }

    const { data: convs } = await supabase
      .from('chat_conversations')
      .select('id')
      .or(`user_1.eq.${user.id},user_2.eq.${user.id}`);

    if (!convs || convs.length === 0) { setUnread(0); return; }

    const ids = convs.map(c => c.id);

    const { count } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', ids)
      .neq('sender_id', user.id)
      .is('read_at', null);

    setUnread(count ?? 0);
  }, [user?.id]);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('chat-unread-global')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
      }, () => fetchUnread())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchUnread]);

  return { unread, refresh: fetchUnread };
}
