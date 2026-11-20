import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ChatMessage, Reservation } from '@/lib/types';
import { formatTimeShort } from '@/lib/ui';
import { Send, Bot, User, Store } from 'lucide-react';

interface Props {
  reservation: Reservation;
  viewer: 'customer' | 'owner';
}

export default function ChatPanel({ reservation, viewer }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('reservation_id', reservation.id)
        .order('created_at', { ascending: true });
      setMessages((data as ChatMessage[]) ?? []);
    })();

    const channel = supabase
      .channel(`chat-${reservation.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `reservation_id=eq.${reservation.id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [reservation.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    const content = text.trim();
    setText('');
    await supabase.from('chat_messages').insert({
      reservation_id: reservation.id,
      sender_type: viewer,
      content,
      is_ai: false,
    });
    setSending(false);

    // If the customer sent the message, trigger the AI auto-reply edge
    // function so the conversation isn't silent when the owner is away.
    if (viewer === 'customer') {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-auto-reply`;
        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ reservation_id: reservation.id }),
        });
      } catch {
        // Non-critical — the realtime channel still updates the UI.
      }
    }
  }

  function avatarFor(m: ChatMessage) {
    if (m.sender_type === 'ai') return <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-purple-600"><Bot className="h-4 w-4" /></div>;
    if (m.sender_type === 'owner') return <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-600"><Store className="h-4 w-4" /></div>;
    return <div className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-200 text-stone-600"><User className="h-4 w-4" /></div>;
  }

  const label = (s: string) => (s === 'ai' ? 'AI Assistant' : s === 'owner' ? 'Restaurant' : 'You');

  return (
    <div className="card flex flex-col" style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}>
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-stone-400">
            <Bot className="h-10 w-10 mb-2" />
            <p className="text-sm">No messages yet. Say hello — if the restaurant is busy, our AI may help.</p>
          </div>
        )}
        {messages.map((m) => {
          const mine = (m.sender_type === viewer);
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
              {avatarFor(m)}
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${mine ? 'bg-orange-600 text-white' : m.sender_type === 'ai' ? 'bg-purple-50 text-purple-900' : 'bg-stone-100 text-stone-800'}`}>
                {!mine && <p className="mb-0.5 text-xs font-semibold opacity-70">{label(m.sender_type)}</p>}
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p className={`mt-1 text-[10px] ${mine ? 'text-orange-200' : 'text-stone-400'}`}>{formatTimeShort(m.created_at)}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-stone-200 p-3">
        <div className="flex items-center gap-2">
          <input
            className="input flex-1"
            placeholder="Type a message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !sending) send(); }}
          />
          <button onClick={send} disabled={sending || !text.trim()} className="btn-primary px-3">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
