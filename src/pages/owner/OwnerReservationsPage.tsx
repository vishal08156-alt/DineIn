import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useHashRoute } from '@/lib/router';
import { PageHeader } from '@/components/AppShell';
import { Spinner, StatusBadge, formatTime } from '@/lib/ui';
import type { Reservation } from '@/lib/types';
import { Calendar, Users, Clock } from 'lucide-react';

export default function OwnerReservationsPage() {
  const { profile } = useAuth();
  const [, navigate] = useHashRoute();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all');

  useEffect(() => {
    async function loadReservations() {
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

      let query = supabase
        .from('reservations')
        .select('*')
        .eq('restaurant_id', restaurants.id)
        .order('reservation_time', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data } = await query;
      setReservations((data as Reservation[]) || []);
      setLoading(false);
    }

    loadReservations();
  }, [profile, filter]);

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Reservations" subtitle="Manage your incoming reservations" />

      <div className="mb-6 flex gap-2">
        {(['all', 'pending', 'confirmed', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f ? 'bg-orange-600 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {reservations.length > 0 ? (
          reservations.map((resv) => (
            <button
              key={resv.id}
              onClick={() => navigate(`/owner/reservations/${resv.id}`)}
              className="card w-full p-4 text-left transition hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="font-semibold">{resv.customer_id}</p>
                  <div className="mt-2 flex gap-4 text-sm text-stone-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> {formatTime(resv.reservation_time)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {resv.party_size} guests
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> ~{resv.eta_minutes} min
                    </span>
                  </div>
                </div>
                <StatusBadge status={resv.status} />
              </div>
            </button>
          ))
        ) : (
          <div className="py-12 text-center text-stone-500">
            No reservations found
          </div>
        )}
      </div>
    </div>
  );
}
