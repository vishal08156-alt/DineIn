import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Reservation } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { useHashRoute } from '@/lib/router';
import { PageHeader, EmptyState } from '@/components/AppShell';
import { StatusBadge, formatTime, Spinner } from '@/lib/ui';
import { MessageSquare, ArrowRight } from 'lucide-react';

export default function CustomerMessagesPage() {
  const { profile } = useAuth();
  const [, navigate] = useHashRoute();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from('reservations')
        .select('*, restaurant:restaurants(*)')
        .eq('customer_id', profile.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });
      setReservations((data as Reservation[]) ?? []);
      setLoading(false);
    })();
  }, [profile]);

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Messages" subtitle="Chat with the restaurant about any of your reservations." />
      {reservations.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No conversations yet" subtitle="Once you make a reservation, you can message the restaurant here." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {reservations.map((r) => (
            <button key={r.id} onClick={() => navigate(`/reservations/${r.id}`)} className="card flex items-center gap-3 p-4 text-left transition hover:shadow-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><MessageSquare className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r.restaurant?.name}</p>
                <p className="text-xs text-stone-500">{formatTime(r.reservation_time)}</p>
                <div className="mt-1"><StatusBadge status={r.status} /></div>
              </div>
              <ArrowRight className="h-5 w-5 text-stone-300" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
