import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Restaurant } from '@/lib/types';
import { useHashRoute } from '@/lib/router';
import { PageHeader, EmptyState } from '@/components/AppShell';
import { Star, Clock, MapPin, Search, Store, Utensils, Armchair, Navigation, Sparkles, ChevronDown, MapPinned } from 'lucide-react';

export default function DiscoverPage() {
  const [, navigate] = useHashRoute();
  const { profile } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);

  const userCity = profile?.city?.trim() || null;

  useEffect(() => {
    (async () => {
      const [restQ, cityQ] = await Promise.all([
        supabase.from('restaurants').select('*').eq('status', 'active'),
        supabase.from('restaurants').select('city').eq('status', 'active').not('city', 'eq', ''),
      ]);
      let restList = (restQ.data as Restaurant[]) ?? [];
      if (cuisine) restList = restList.filter((r) => r.cuisine.toLowerCase().includes(cuisine.toLowerCase()));
      restList.sort((a, b) => b.created_at.localeCompare(a.created_at));
      setRestaurants(restList);
      const uniqueCities = Array.from(new Set((cityQ.data ?? []).map((c: { city: string | null }) => c.city as string).filter(Boolean))).sort();
      setCities(uniqueCities);
      setLoading(false);
    })();
  }, [cuisine]);

  // When user has a city, default the location filter to "near me"
  useEffect(() => {
    if (userCity) setLocationFilter(userCity);
  }, [userCity]);

  const textMatch = (r: Restaurant) =>
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    r.city.toLowerCase().includes(query.toLowerCase()) ||
    r.cuisine.toLowerCase().includes(query.toLowerCase());

  const locationMatch = (r: Restaurant) =>
    !locationFilter || r.city.toLowerCase().includes(locationFilter.toLowerCase());

  const filtered = restaurants.filter((r) => textMatch(r) && locationMatch(r));

  // "Near you" = restaurants in the user's city
  const nearby = userCity
    ? restaurants.filter((r) => r.city.toLowerCase().includes(userCity.toLowerCase()))
    : [];
  const nearbyFiltered = nearby.filter(textMatch);

  const showingNearby = locationFilter && userCity && locationFilter.toLowerCase() === userCity.toLowerCase();

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Discover restaurants"
        subtitle={
          userCity
            ? `Showing recommendations near ${userCity}. Reserve and pre-order so your food is ready when you arrive.`
            : 'Reserve a table and pre-order so your food is ready when you arrive.'
        }
      />

      {/* Location bar */}
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-700">
          <Navigation className="h-4 w-4 text-orange-600" />
          Select city
        </div>
        <div className="relative flex-1">
          <MapPinned className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <select
            className="input appearance-none pl-10 pr-10"
            value={locationFilter ?? ''}
            onChange={(e) => setLocationFilter(e.target.value || null)}
          >
            <option value="">All cities</option>
            {userCity && !cities.some((c) => c.toLowerCase() === userCity.toLowerCase()) && (
              <option value={userCity}>{userCity} (your city)</option>
            )}
            {cities.map((c) => (
              <option key={c} value={c}>{c}{userCity && c.toLowerCase() === userCity.toLowerCase() ? ' (your city)' : ''}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        </div>
        {userCity && (
          <button
            onClick={() => setLocationFilter(userCity)}
            className={`btn shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              showingNearby
                ? 'bg-orange-600 text-white'
                : 'border border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            <Sparkles className="mr-1.5 inline h-3.5 w-3.5" />
            Near me ({userCity})
          </button>
        )}
        {locationFilter && (
          <button
            onClick={() => setLocationFilter(null)}
            className="shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-stone-500 hover:text-stone-700"
          >
            Clear
          </button>
        )}
      </div>

      {/* Search + cuisine */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input className="input pl-10" placeholder="Search by name, city, or cuisine…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <input className="input sm:w-56" placeholder="Cuisine (e.g. Italian)" value={cuisine} onChange={(e) => setCuisine(e.target.value)} />
      </div>

      {/* "Near you" highlight section */}
      {showingNearby && nearbyFiltered.length > 0 && (
        <div className="mb-8">
          <h2 className="section-title mb-1 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-600" />
            Recommended near you
          </h2>
          <p className="mb-4 text-sm text-stone-500">{nearbyFiltered.length} restaurant{nearbyFiltered.length > 1 ? 's' : ''} in {userCity}</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {nearbyFiltered.map((r) => <RestaurantCard key={r.id} r={r} navigate={navigate} highlight />)}
          </div>
          <div className="my-8 h-px bg-stone-200" />
          <h2 className="section-title mb-4">All restaurants</h2>
        </div>
      )}

      {/* Main list */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-stone-200" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No restaurants found"
          subtitle={locationFilter ? `No restaurants match "${locationFilter}". Try a different city or clear the filter.` : 'Check back soon — new restaurants are joining all the time.'}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => <RestaurantCard key={r.id} r={r} navigate={navigate} />)}
        </div>
      )}
    </div>
  );
}

function RestaurantCard({ r, navigate, highlight }: { r: Restaurant; navigate: (route: string) => void; highlight?: boolean }) {
  const isNear = highlight;
  return (
    <button
      onClick={() => navigate(`/restaurant/${r.id}`)}
      className={`group card overflow-hidden text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${isNear ? 'ring-2 ring-orange-200' : ''}`}
    >
      <div className="relative h-44 overflow-hidden bg-stone-200">
        {r.image_url ? (
          <img src={r.image_url} alt={r.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-stone-400">
            <Utensils className="h-10 w-10" />
          </div>
        )}
        {r.cuisine && (
          <span className="absolute left-3 top-3 badge bg-white/90 text-stone-700 backdrop-blur">{r.cuisine}</span>
        )}
        {isNear && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-orange-600 px-2.5 py-1 text-xs font-bold text-white shadow">
            <Navigation className="h-3 w-3" /> Near you
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold leading-tight group-hover:text-orange-600">{r.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-stone-500">{r.description || 'No description provided.'}</p>
        <div className="mt-3 flex items-center gap-4 text-xs text-stone-500">
          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{r.city || '—'}</span>
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />~{r.avg_prep_time_min}m</span>
          <span className="flex items-center gap-1"><Armchair className="h-3.5 w-3.5" />{r.total_seats} seats</span>
          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-400" />New</span>
        </div>
        {r.map_url && (
          <a
            href={r.map_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700"
          >
            <Navigation className="h-3 w-3" /> View on map
          </a>
        )}
      </div>
    </button>
  );
}
