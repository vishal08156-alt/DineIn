import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Reservation, ReservationItem, Restaurant } from '@/lib/types';
import { useHashRoute } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { StatusBadge, formatTime, money, Spinner } from '@/lib/ui';
import ChatPanel from '@/components/ChatPanel';
import { ArrowLeft, Clock, Users, ShoppingBag, Star, Phone, Check, X } from 'lucide-react';

export default function ReservationDetail({ reservationId, viewer }: { reservationId: string; viewer: 'customer' | 'owner' }) {
  const { profile } = useAuth();
  const [, navigate] = useHashRoute();
  const [resv, setResv] = useState<Reservation | null>(null);
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hasReview, setHasReview] = useState(false);
  const [acting, setActing] = useState(false);

  async function load() {
    const [{ data: r }, { data: its }] = await Promise.all([
      supabase.from('reservations').select('*, restaurant:restaurants(*)').eq('id', reservationId).maybeSingle(),
      supabase.from('reservation_items').select('*, menu_item:menu_items(*)').eq('reservation_id', reservationId),
    ]);
    const resv = r as Reservation | null;
    setResv(resv);
    setItems((its as ReservationItem[]) ?? []);
    setRestaurant(resv?.restaurant ?? null);
    setLoading(false);
    if (resv && viewer === 'customer') {
      const { data: rv } = await supabase.from('reviews').select('id').eq('reservation_id', resv.id).maybeSingle();
      setHasReview(!!rv);
    }
  }

  useEffect(() => { load(); }, [reservationId]);

  async function updateStatus(status: Reservation['status']) {
    setActing(true);
    await supabase.from('reservations').update({ status }).eq('id', reservationId);
    setActing(false);
    load();
  }

  async function submitReview() {
    if (!resv || !profile) return;
    await supabase.from('reviews').insert({
      reservation_id: resv.id,
      restaurant_id: resv.restaurant_id,
      customer_id: profile.id,
      rating,
      comment,
    });
    setReviewOpen(false);
    setHasReview(true);
  }

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!resv) return <div className="py-24 text-center text-stone-500">Reservation not found.</div>;

  const back = viewer === 'customer' ? '/reservations' : '/owner/reservations';
  const canReview = viewer === 'customer' && resv.status === 'completed' && !hasReview;
  const ownerActions = viewer === 'owner';

  return (
    <div className="animate-fade-in">
      <button onClick={() => navigate(back)} className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-stone-900">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* left: details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">{restaurant?.name}</h1>
                {restaurant?.phone && <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-500"><Phone className="h-3.5 w-3.5" />{restaurant.phone}</p>}
              </div>
              <StatusBadge status={resv.status} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl bg-stone-50 p-3">
                <p className="text-xs text-stone-400">Arrival</p>
                <p className="mt-0.5 text-sm font-semibold">{formatTime(resv.reservation_time)}</p>
              </div>
              <div className="rounded-xl bg-stone-50 p-3">
                <p className="text-xs text-stone-400"><Users className="inline h-3 w-3" /> Party</p>
                <p className="mt-0.5 text-sm font-semibold">{resv.party_size} guests</p>
              </div>
              <div className="rounded-xl bg-stone-50 p-3">
                <p className="text-xs text-stone-400"><Clock className="inline h-3 w-3" /> ETA</p>
                <p className="mt-0.5 text-sm font-semibold">~{resv.eta_minutes} min</p>
              </div>
              <div className="rounded-xl bg-stone-50 p-3">
                <p className="text-xs text-stone-400">Total</p>
                <p className="mt-0.5 text-sm font-semibold">{money(items.reduce((a, i) => a + (i.menu_item?.price ?? 0) * i.quantity, 0))}</p>
              </div>
            </div>

            {ownerActions && resv.status === 'pending' && (
              <div className="mt-5 flex gap-2">
                <button onClick={() => updateStatus('confirmed')} disabled={acting} className="btn-primary flex-1 gap-2">
                  {acting ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />} Confirm
                </button>
                <button onClick={() => updateStatus('cancelled')} disabled={acting} className="btn-secondary flex-1 gap-2">
                  {acting ? <Spinner className="h-4 w-4" /> : <X className="h-4 w-4" />} Decline
                </button>
              </div>
            )}

            {ownerActions && resv.status === 'confirmed' && (
              <div className="mt-5">
                <button onClick={() => updateStatus('completed')} disabled={acting} className="btn-primary w-full gap-2">
                  {acting ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />} Mark Completed
                </button>
              </div>
            )}
          </div>

          {/* Items ordered */}
          <div className="card">
            <div className="border-b border-stone-200 px-6 py-4">
              <p className="flex items-center gap-2 font-semibold"><ShoppingBag className="h-4 w-4" /> Order Items</p>
            </div>
            <div className="space-y-2 p-6">
              {items.length > 0 ? items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span>{item.menu_item?.name} × {item.quantity}</span>
                  <span className="font-semibold">{money((item.menu_item?.price ?? 0) * item.quantity)}</span>
                </div>
              )) : <p className="text-stone-500">No items ordered.</p>}
            </div>
          </div>

          {canReview && !reviewOpen && (
            <button onClick={() => setReviewOpen(true)} className="btn-secondary w-full gap-2">
              <Star className="h-4 w-4" /> Leave a Review
            </button>
          )}

          {reviewOpen && (
            <div className="card p-6">
              <h3 className="mb-4 font-semibold">Leave a Review</h3>
              <div className="mb-4">
                <label className="label">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRating(r)}
                      className={`text-2xl transition ${r <= rating ? 'text-orange-500' : 'text-stone-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="label">Comment</label>
                <textarea
                  className="input min-h-24"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience..."
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setReviewOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={submitReview} className="btn-primary flex-1">Submit Review</button>
              </div>
            </div>
          )}
        </div>

        {/* right: chat */}
        <div className="lg:col-span-1">
          <ChatPanel reservationId={reservationId} />
        </div>
      </div>
    </div>
  );
}
