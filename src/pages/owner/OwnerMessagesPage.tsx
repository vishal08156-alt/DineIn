import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useHashRoute } from '@/lib/router';
import { PageHeader } from '@/components/AppShell';
import { Spinner } from '@/lib/ui';
import { MessageCircle } from 'lucide-react';

interface Conversation {
  id: string;
  reservation_id: string;
  customer_name: string;
  last_message: string;
  updated_at: string;
}

export default function OwnerMessagesPage() {
  const { profile } = useAuth();
  const [, navigate] = useHashRoute();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConversations() {
      if (!profile) return;

      // First get the owner's restaurant
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', profile.id)
        .single();

      if (!restaurants) {
        setLoading(false);
        return;
      }

      // Placeholder - would need to implement actual conversation logic
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('restaurant_id', restaurants.id)
        .order('created_at', { ascending: false });

      if (data) {
        setConversations(data.map((m: { id: string; reservation_id: string; content: string; created_at: string }) => ({
          id: m.id,
          reservation_id: m.reservation_id,
          customer_name: 'Customer',
          last_message: m.content,
          updated_at: m.created_at,
        })));
      }
      setLoading(false);
    }

    loadConversations();
  }, [profile]);

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Messages" subtitle="Communicate with customers about their reservations" />

      <div className="space-y-3">
        {conversations.length > 0 ? (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => navigate(`/owner/messages/${conv.id}`)}
              className="card w-full p-4 text-left transition hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="font-semibold">{conv.customer_name}</p>
                  <p className="mt-1 text-sm text-stone-600 line-clamp-1">{conv.last_message}</p>
                </div>
                <MessageCircle className="h-5 w-5 text-orange-600 shrink-0" />
              </div>
            </button>
          ))
        ) : (
          <div className="py-12 text-center text-stone-500">
            No conversations yet. Messages will appear here.
          </div>
        )}
      </div>
    </div>
  );
}
