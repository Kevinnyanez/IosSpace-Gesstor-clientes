import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useChatUnread } from '@/hooks/useChatUnread';

export function ChatBubble() {
  const navigate = useNavigate();
  const location = useLocation();
  const { unread } = useChatUnread();

  if (location.pathname === '/chat') return null;

  return (
    <button
      onClick={() => navigate('/chat')}
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
      aria-label="Abrir chat"
    >
      <MessageCircle className="h-6 w-6" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 text-[11px] font-bold bg-red-500 text-white rounded-full">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}
