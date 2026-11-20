import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useHashRoute } from '@/lib/router';
import { PageHeader } from '@/components/AppShell';
import { money, Spinner, StatusBadge } from '@/lib/ui';
import type { Restaurant, Profile, Reservation, Report, ReportStatus } from '@/lib/types';
import { Store, Users, Calendar, TrendingUp, ShieldCheck, Flag, Trash2, Check, X, Utensils } from 'lucide-react';

const REPORT_STATUS_META: Record<ReportStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-red-100 text-red-700' },
  reviewing: { label: 'Reviewing', color: 'bg-amber-100 text-amber-700' },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
  dismissed: { label: 'Dismissed', color: 'bg-stone-100 text-stone-500' },
};

export default function AdminOverview() {
  const [, navigate] = useHashRoute();
  const [stats, setStats] = useState({ restaurants: 0, users: 0, reservations: 0, revenue: 0, reports: 0 });
  const [recent, setRecent] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ count: rc }, { count: uc }, { count: resc }, { count: rpc }, { data: resv }] = await Promise.all([
        supabase.from('restaurants').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('reservations').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('reservations').select('*, restaurant:restaurants(*)').order('created_at', { ascending: false }).limit(6),
      ]);
      const rev = ((resv as Reservation[]) ?? []).filter((r) => ['completed','ready','preparing','confirmed'].includes(r.status)).reduce((s, r) => s + Number(r.total_amount), 0);
      setStats({ restaurants: rc ?? 0, users: uc ?? 0, reservations: resc ?? 0, revenue: rev, reports: rpc ?? 0 });
      setRecent((resv as Reservation[]) ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;

  return (
    <div className="animate-fade-in">
      <PageHeader title="Admin overview" subtitle="Platform-wide metrics across all restaurants and users." />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card icon={Store} label="Restaurants" value={String(stats.restaurants)} tone="bg-orange-50 text-orange-600" onClick={() => navigate('/admin/restaurants')} />
        <Card icon={Users} label="Users" value={String(stats.users)} tone="bg-blue-50 text-blue-600" onClick={() => navigate('/admin/users')} />
        <Card icon={Calendar} label="Reservations" value={String(stats.reservations)} tone="bg-emerald-50 text-emerald-600" />
        <Card icon={TrendingUp} label="Gross revenue" value={money(stats.revenue)} tone="bg-stone-100 text-stone-700" />
        <Card icon={Flag} label="Open reports" value={String(stats.reports)} tone="bg-red-50 text-red-600" onClick={() => navigate('/admin/reports')} />
      </div>

      <h2 className="section-title mb-4">Recent reservations (all restaurants)</h2>
      {recent.length === 0 ? (
        <p className="text-sm text-stone-500">No reservations on the platform yet.</p>
      ) : (
        <div className="grid gap-3">
          {recent.map((r) => (
            <div key={r.id} className="card flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-600"><ShieldCheck className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{r.restaurant?.name ?? '—'}</p>
                <p className="text-xs text-stone-500">{new Date(r.reservation_time).toLocaleString()} · {r.party_size} guests · {money(Number(r.total_amount))}</p>
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ icon: Icon, label, value, tone, onClick }: { icon: typeof Store; label: string; value: string; tone: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="card p-5 text-left transition hover:shadow-md disabled:pointer-events-none" disabled={!onClick}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className="text-sm text-stone-500">{label}</p>
    </button>
  );
}

export function AdminRestaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false });
    setRestaurants((data as Restaurant[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function deleteRestaurant(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This removes the restaurant and all its data. This cannot be undone.`)) return;
    await supabase.from('menu_items').delete().eq('restaurant_id', id);
    const { data: resvIds } = await supabase.from('reservations').select('id').eq('restaurant_id', id);
    const ids = (resvIds ?? []).map((r: { id: string }) => r.id);
    if (ids.length) {
      await supabase.from('reservation_items').delete().in('reservation_id', ids);
      await supabase.from('chat_messages').delete().in('reservation_id', ids);
    }
    await supabase.from('reviews').delete().eq('restaurant_id', id);
    await supabase.from('reservations').delete().eq('restaurant_id', id);
    await supabase.from('restaurants').delete().eq('id', id);
    load();
  }

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;

  return (
    <div className="animate-fade-in">
      <PageHeader title="All restaurants" subtitle="Manage every restaurant on the platform." />
      {restaurants.length === 0 ? (
        <p className="text-sm text-stone-500">No restaurants on the platform yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((r) => (
            <div key={r.id} className="card overflow-hidden">
              <div className="h-28 bg-stone-200">
                {r.image_url ? <img src={r.image_url} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-stone-400"><Utensils className="h-8 w-8" /></div>}
              </div>
              <div className="p-4">
                <h3 className="font-bold">{r.name}</h3>
                <p className="text-xs text-stone-500">{r.cuisine} · {r.city} · {r.total_seats} seats</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`badge ${r.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>{r.status}</span>
                  <button onClick={() => deleteRestaurant(r.id, r.name)} className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-stone-400 transition hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers((data as Profile[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function deleteUser(id: string, email: string) {
    if (!confirm(`Delete user "${email}"? This permanently removes their profile. This cannot be undone.`)) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    load();
  }

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;

  return (
    <div className="animate-fade-in">
      <PageHeader title="All users" subtitle="Everyone registered on the platform." />
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {users.map((u) => (
              <tr key={u.id} className="transition hover:bg-stone-50">
                <td className="px-4 py-3 font-medium">{u.full_name || '—'}</td>
                <td className="px-4 py-3 text-stone-600">{u.email}</td>
                <td className="px-4 py-3"><span className="badge bg-stone-100 text-stone-700 capitalize">{u.role}</span></td>
                <td className="px-4 py-3 text-stone-600">{u.city || '—'}</td>
                <td className="px-4 py-3 text-stone-500">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => deleteUser(u.id, u.email)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-stone-400 transition hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReportStatus | 'all'>('all');

  async function load() {
    let q = supabase.from('reports').select('*, reporter:profiles!reporter_id(*)').order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setReports((data as Report[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  async function updateStatus(id: string, status: ReportStatus) {
    await supabase.from('reports').update({ status }).eq('id', id);
    load();
  }

  async function deleteTarget(targetType: string, targetId: string, targetName: string) {
    if (!confirm(`Delete ${targetType} "${targetName}"? This cannot be undone.`)) return;
    if (targetType === 'restaurant') {
      await supabase.from('menu_items').delete().eq('restaurant_id', targetId);
      const { data: resvIds } = await supabase.from('reservations').select('id').eq('restaurant_id', targetId);
      const ids = (resvIds ?? []).map((r: { id: string }) => r.id);
      if (ids.length) {
        await supabase.from('reservation_items').delete().in('reservation_id', ids);
        await supabase.from('chat_messages').delete().in('reservation_id', ids);
      }
      await supabase.from('reviews').delete().eq('restaurant_id', targetId);
      await supabase.from('reservations').delete().eq('restaurant_id', targetId);
      await supabase.from('restaurants').delete().eq('id', targetId);
    } else {
      await supabase.from('profiles').delete().eq('id', targetId);
    }
    load();
  }

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;

  const filters: { value: ReportStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'reviewing', label: 'Reviewing' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'dismissed', label: 'Dismissed' },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Reports" subtitle="Review user-submitted reports and take action." />

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filter === f.value ? 'bg-orange-600 text-white' : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-stone-500">No reports to show.</p>
      ) : (
        <div className="grid gap-3">
          {reports.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`badge ${REPORT_STATUS_META[r.status].color}`}>{REPORT_STATUS_META[r.status].label}</span>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold capitalize text-stone-600">{r.target_type}</span>
                    <span className="text-xs text-stone-400">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-2 text-sm">
                    <span className="font-semibold capitalize">{r.reason}</span>
                    {r.details && <span className="text-stone-600"> — {r.details}</span>}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    Reported by {r.reporter?.full_name || r.reporter?.email || 'Unknown'} · Target ID: {r.target_id.slice(0, 8)}…
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {r.status === 'open' && (
                    <button onClick={() => updateStatus(r.id, 'reviewing')} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50">
                      Review
                    </button>
                  )}
                  {(r.status === 'open' || r.status === 'reviewing') && (
                    <>
                      <button
                        onClick={() => deleteTarget(r.target_type, r.target_id, r.target_type === 'restaurant' ? 'restaurant' : 'user')}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete target
                      </button>
                      <button onClick={() => updateStatus(r.id, 'resolved')} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-50">
                        <Check className="h-3.5 w-3.5" /> Resolve
                      </button>
                      <button onClick={() => updateStatus(r.id, 'dismissed')} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-500 transition hover:bg-stone-100">
                        <X className="h-3.5 w-3.5" /> Dismiss
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
