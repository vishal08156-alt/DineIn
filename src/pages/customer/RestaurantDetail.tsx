import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Restaurant, MenuItem, Review } from '@/lib/types';
import { useHashRoute } from '@/lib/router';
import AvailabilityGrid from '@/components/AvailabilityGrid';
import { money, Spinner } from '@/lib/ui';
import { ArrowLeft, Star, Clock, MapPin, Minus, Plus, ShoppingCart, Calendar, Users, Utensils, MessageSquare, Armchair, CircleCheck, CircleX, Flag, Navigation } from 'lucide-react';
import ReportButton from '@/components/ReportButton';

interface CartLine { item: MenuItem; qty: number }

export default function RestaurantDetail({ restaurantId }: { restaurantId: string }) {
  const [, navigate] = useHashRoute();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [activeCat, setActiveCat] = useState<string>('All');
  const [showCheckout, setShowCheckout] = useState(false);
  const [resvDate, setResvDate] = useState('');
  const [resvTime, setResvTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [special, setSpecial] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: r }, { data: m }, { data: rv }] = await Promise.all([
        supabase.from('restaurants').select('*').eq('id', restaurantId).maybeSingle(),
        supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId).order('category'),
        supabase.from('reviews').select('*, customer:profiles(*)').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(5),
      ]);
      setRestaurant(r as Restaurant);
      setMenu((m as MenuItem[]) ?? []);
      setReviews((rv as Review[]) ?? []);
      setLoading(false);
    })();
  }, [restaurantId]);

  const categories = useMemo(() => {
    const set = new Set(menu.map((m) => m.category || 'Other'));
    return ['All', ...Array.from(set)];
  }, [menu]);

  const filteredMenu = activeCat === 'All' ? menu : menu.filter((m) => (m.category || 'Other') === activeCat);

  const cartLines: CartLine[] = useMemo(
    () => Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => ({ item: menu.find((m) => m.id === id)!, qty })).filter((l) => l.item),
    [cart, menu],
  );
  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0);
  const cartTotal = cartLines.reduce((s, l) => s + l.qty * Number(l.item.price), 0);

  function setQty(id: string, delta: number) {
    setCart((c) => {
      const next = Math.max(0, (c[id] ?? 0) + delta);
      return { ...c, [id]: next };
    });
  }

  async function placeOrder() {
    setError(null);
    if (!resvDate || !resvTime) { setError('Please pick a date and time.'); return; }
    if (cartLines.length === 0) { setError('Add at least one dish to your order.'); return; }
    setSubmitting(true);
    const iso = new Date(`${resvDate}T${resvTime}`).toISOString();
    const prep = Math.max(restaurant?.avg_prep_time_min ?? 30, ...cartLines.map((l) => l.item.prep_time_min));

    const { data: resv, error: e1 } = await supabase.from('reservations').insert({
      restaurant_id: restaurantId,
      reservation_time: iso,
      party_size: partySize,
      special_requests: special,
      total_amount: cartTotal,
      eta_minutes: prep,
      status: 'pending',
    }).select('*').maybeSingle();

    if (e1 || !resv) { setError(e1?.message ?? 'Could not create reservation.'); setSubmitting(false); return; }

    const items = cartLines.map((l) => ({
      reservation_id: resv.id,
      menu_item_id: l.item.id,
      quantity: l.qty,
      unit_price: Number(l.item.price),
    }));
    const { error: e2 } = await supabase.from('reservation_items').insert(items);
    if (e2) { setError(e2.message); setSubmitting(false); return; }

    // Send an automated chat intro from the customer side is optional; jump to reservation.
    setSubmitting(false);
    setShowCheckout(false);
    navigate(`/reservations/${resv.id}`);
  }

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!restaurant) return <div className="py-24 text-center text-stone-500">Restaurant not found.</div>;

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <div className="animate-fade-in">
      <button onClick={() => navigate('/')} className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-stone-900">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* hero */}
      <div className="relative mb-6 h-56 overflow-hidden rounded-2xl bg-stone-200 sm:h-72">
        {restaurant.image_url ? (
          <img src={restaurant.image_url} alt={restaurant.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-stone-400"><Utensils className="h-12 w-12" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-6 text-white">
          <div>
            <h1 className="text-3xl font-bold">{restaurant.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
              {restaurant.cuisine && <span className="badge bg-white/20 text-white backdrop-blur">{restaurant.cuisine}</span>}
              {avgRating && <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{avgRating} ({reviews.length})</span>}
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />~{restaurant.avg_prep_time_min}m</span>
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{restaurant.address || restaurant.city}</span>
              {restaurant.map_url && (
                <a
                  href={restaurant.map_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/30"
                >
                  <Navigation className="h-3 w-3" /> View on map
                </a>
              )}
            </div>
          </div>
          <ReportButton targetType="restaurant" targetId={restaurant.id} targetName={restaurant.name}>
            <button className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/25">
              <Flag className="h-3.5 w-3.5" /> Report
            </button>
          </ReportButton>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* menu */}
        <div className="lg:col-span-2">
          {/* availability */}
          <div className="card mb-6 p-5">
            <h2 className="section-title mb-1 flex items-center gap-2 text-xl"><Armchair className="h-5 w-5 text-orange-600" /> Seat availability</h2>
            <p className="mb-4 text-sm text-stone-500">See how many seats are open for each time slot. Pick your date below.</p>
            <div className="mb-4">
              <label className="label"><Calendar className="inline h-3.5 w-3.5" /> Select date</label>
              <input type="date" className="input sm:w-56" value={resvDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => { setResvDate(e.target.value); setResvTime(''); }} />
            </div>
            <AvailabilityGrid
              restaurantId={restaurantId}
              totalSeats={restaurant.total_seats}
              selectedDate={resvDate}
              selectedTime={resvTime}
              onPickTime={setResvTime}
            />
          </div>

          <h2 className="section-title mb-4">Menu</h2>

          <div className="mb-5 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  activeCat === c ? 'bg-orange-600 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {filteredMenu.length === 0 ? (
            <p className="text-sm text-stone-500">No menu items yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredMenu.map((m) => {
                const qty = cart[m.id] ?? 0;
                return (
                  <div key={m.id} className="card flex gap-4 p-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                      {m.image_url ? <img src={m.image_url} alt={m.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-stone-300"><Utensils className="h-6 w-6" /></div>}
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div>
                        <h4 className="font-semibold leading-tight">{m.name}</h4>
                        <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{m.description}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-stone-500">
                          <span className="font-bold text-orange-600">{money(Number(m.price))}</span>
                          {m.available ? (
                            <span className="flex items-center gap-0.5 font-medium text-green-600"><CircleCheck className="h-3.5 w-3.5" /> Available</span>
                          ) : (
                            <span className="flex items-center gap-0.5 font-medium text-red-500"><CircleX className="h-3.5 w-3.5" /> Sold out</span>
                          )}
                          <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{m.prep_time_min}m</span>
                        </div>
                      </div>
                      <div className="mt-auto flex items-center justify-end">
                        {qty === 0 ? (
                          <button disabled={!m.available} onClick={() => setQty(m.id, 1)} className="btn-primary px-3 py-1.5 text-xs">
                            <Plus className="h-3.5 w-3.5" /> Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button onClick={() => setQty(m.id, -1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-300 hover:bg-stone-100"><Minus className="h-3.5 w-3.5" /></button>
                            <span className="w-6 text-center text-sm font-bold">{qty}</span>
                            <button onClick={() => setQty(m.id, 1)} className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-300 hover:bg-stone-100"><Plus className="h-3.5 w-3.5" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* reviews */}
          {reviews.length > 0 && (
            <div className="mt-10">
              <h2 className="section-title mb-4">Reviews</h2>
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="card p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{r.customer?.full_name || 'Guest'}</span>
                      <span className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}`} />
                        ))}
                      </span>
                    </div>
                    {r.comment && <p className="mt-1.5 text-sm text-stone-600">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* cart / checkout sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 card p-5">
            <h3 className="flex items-center gap-2 text-lg font-bold"><ShoppingCart className="h-5 w-5 text-orange-600" /> Your order</h3>

            {cartLines.length === 0 ? (
              <p className="mt-4 text-sm text-stone-500">Add dishes from the menu to build your pre-order.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {cartLines.map((l) => (
                  <div key={l.item.id} className="flex items-center justify-between text-sm">
                    <span className="text-stone-700"><span className="font-semibold">{l.qty}×</span> {l.item.name}</span>
                    <span className="font-medium text-stone-600">{money(l.qty * Number(l.item.price))}</span>
                  </div>
                ))}
                <div className="border-t border-stone-200 pt-2 flex items-center justify-between font-bold">
                  <span>Total</span>
                  <span className="text-orange-600">{money(cartTotal)}</span>
                </div>
              </div>
            )}

            <button
              disabled={cartLines.length === 0}
              onClick={() => setShowCheckout(true)}
              className="btn-primary mt-5 w-full"
            >
              Reserve & pre-order
            </button>

            <button onClick={() => navigate('/messages')} className="btn-ghost mt-2 w-full text-xs">
              <MessageSquare className="h-3.5 w-3.5" /> Message the restaurant
            </button>
          </div>
        </div>
      </div>

      {/* checkout modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6" onClick={() => setShowCheckout(false)}>
          <div className="w-full max-w-lg animate-slide-up rounded-t-2xl bg-white p-6 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold">Confirm your reservation</h3>
            <p className="mt-1 text-sm text-stone-500">Pick when you'll arrive. The kitchen starts preparing so food is ready.</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label"><Calendar className="inline h-3.5 w-3.5" /> Date</label>
                <input type="date" className="input" value={resvDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => { setResvDate(e.target.value); setResvTime(''); }} />
              </div>
              <div>
                <label className="label"><Clock className="inline h-3.5 w-3.5" /> Time (tap a slot below)</label>
                <input type="time" className="input" value={resvTime} onChange={(e) => setResvTime(e.target.value)} />
              </div>
              <div>
                <label className="label"><Users className="inline h-3.5 w-3.5" /> Party size</label>
                <input type="number" min={1} max={20} className="input" value={partySize} onChange={(e) => setPartySize(Number(e.target.value))} />
              </div>
              <div>
                <label className="label">ETA</label>
                <div className="input flex items-center text-stone-500">~{Math.max(restaurant.avg_prep_time_min, ...cartLines.map((l) => l.item.prep_time_min))} min after confirmation</div>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Special requests (allergies, seating…)</label>
                <textarea className="input min-h-[72px]" value={special} onChange={(e) => setSpecial(e.target.value)} placeholder="e.g. window table, nut allergy" />
              </div>
              <div className="sm:col-span-2">
                <AvailabilityGrid
                  restaurantId={restaurantId}
                  totalSeats={restaurant.total_seats}
                  selectedDate={resvDate}
                  selectedTime={resvTime}
                  onPickTime={setResvTime}
                />
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-stone-50 p-3 text-sm">
              <div className="flex justify-between"><span className="text-stone-500">{cartCount} items</span><span className="font-bold text-orange-600">{money(cartTotal)}</span></div>
            </div>

            {error && <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowCheckout(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={placeOrder} disabled={submitting} className="btn-primary flex-1">
                {submitting ? <Spinner className="h-4 w-4" /> : 'Confirm reservation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
