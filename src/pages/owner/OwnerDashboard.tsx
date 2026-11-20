import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/AppShell';
import { Spinner } from '@/lib/ui';
import { TrendingUp, Users, UtensilsCrossed, AlertCircle } from 'lucide-react';

export default function OwnerDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ reservations: 0, guests: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
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

      const { data: reservations } = await supabase
        .from('reservations')
        .select('party_size, status')
        .eq('restaurant_id', restaurants.id);

      const totalGuests = (reservations || []).reduce((sum, r) => sum + (r.party_size || 0), 0);
      const totalReservations = reservations?.length || 0;

      setStats({
        reservations: totalReservations,
        guests: totalGuests,
        revenue: totalGuests * 50, // Placeholder calculation
      });
      setLoading(false);
    }

    loadStats();
  }, [profile]);

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Restaurant Dashboard" subtitle="Overview of your restaurant's performance" />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-600">Total Reservations</p>
              <p className="text-3xl font-bold">{stats.reservations}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-600">Total Guests</p>
              <p className="text-3xl font-bold">{stats.guests}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-600">Est. Revenue</p>
              <p className="text-3xl font-bold">${stats.revenue}</p>
            </div>
            <UtensilsCrossed className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      <div className="mt-6 card p-6">
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <AlertCircle className="h-4 w-4" /> Get started by managing your reservations and menu items.
        </div>
      </div>
    </div>
  );
}
