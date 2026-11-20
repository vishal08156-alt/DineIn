import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Reservation } from '@/lib/types';
import { useHashRoute } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { PageHeader, EmptyState } from '@/components/AppShell';
import { StatusBadge, formatTime, money, Spinner } from '@/lib/ui';
import { Calendar, Store, ArrowRight, Plus } from 'lucide-react';

export default function MyReservationsPage() {
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
        .order('created_at', { ascending: false });
      setReservations((data as Reservation[]) ?? []);
      setLoading(false);
    })();
  }, [profile]);

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="My reservations"
        subtitle="Track your bookings and pre-orders."
        action={<button onClick={() => navigate('/')} className="btn-primary"><Plus className="h-4 w-4" /> New reservation</button>}
      />
      {reservations.length === 0 ? (
        <EmptyState icon={Calendar} title="No reservations yet" subtitle="Browse restaurants and pre-order your meal." action={<button onClick={() => navigate('/')} className="btn-primary">Discover restaurants</button>} />
      ) : (
        <div className="grid gap-4">
          {reservations.map((r) => (
            <button key={r.id} onClick={() => navigate(`/reservations/${r.id}`)} className="card flex items-center gap-4 p-4 text-left transition hover:shadow-md">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <Store className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-bold">{r.restaurant?.name ?? 'Restaurant'}</h3>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-0.5 text-sm text-stone-500">{formatTime(r.reservation_time)} · {r.party_size} guests · {money(Number(r.total_amount))}</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-stone-300" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
