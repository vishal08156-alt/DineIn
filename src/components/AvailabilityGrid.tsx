import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AvailabilitySlot } from '@/lib/types';
import { Spinner } from '@/lib/ui';
import { Armchair, Users } from 'lucide-react';

interface Props {
  restaurantId: string;
  totalSeats: number;
  selectedDate: string;
  selectedTime: string;
  onPickTime: (time: string) => void;
}

export default function AvailabilityGrid({ restaurantId, totalSeats, selectedDate, selectedTime, onPickTime }: Props) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedDate) { setSlots([]); setLoading(false); return; }
    setLoading(true);
    (async () => {
      const start = new Date(`${selectedDate}T00:00:00`).toISOString();
      const { data } = await supabase
        .from('restaurant_availability')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('rdate', start)
        .order('slot_hour');
      setSlots((data as AvailabilitySlot[]) ?? []);
      setLoading(false);
    })();
  }, [restaurantId, selectedDate]);

  if (loading) return <div className="flex items-center gap-2 py-3 text-sm text-stone-500"><Spinner className="h-4 w-4" /> Checking availability…</div>;
  if (slots.length === 0) return <p className="py-2 text-sm text-stone-500">Pick a date to see available times.</p>;

  const openHours = slots.filter((s) => s.slot_hour >= 10 && s.slot_hour <= 22);

  function level(s: AvailabilitySlot): 'full' | 'low' | 'open' {
    if (s.seats_available === 0) return 'full';
    if (s.seats_available <= Math.ceil(totalSeats * 0.25)) return 'low';
    return 'open';
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm">
        <Armchair className="h-4 w-4 text-orange-600" />
        <span className="font-semibold">Live seat availability</span>
        <span className="text-stone-400">·</span>
        <span className="flex items-center gap-1 text-stone-500"><Users className="h-3.5 w-3.5" />{totalSeats} seats total</span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {openHours.map((s) => {
          const time = `${String(s.slot_hour).padStart(2, '0')}:00`;
          const lv = level(s);
          const isSelected = selectedTime === time;
          const tone =
            lv === 'full' ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
            : lv === 'low' ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
            : 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100';
          const selectedTone = isSelected ? 'ring-2 ring-orange-500 ring-offset-1 ' : '';
          return (
            <button
              key={s.slot_hour}
              disabled={lv === 'full'}
              onClick={() => onPickTime(time)}
              className={`rounded-xl border px-2 py-2 text-center text-xs font-semibold transition ${tone} ${selectedTone}`}
            >
              <p>{time}</p>
              <p className="mt-0.5 text-[10px] font-medium opacity-80">
                {lv === 'full' ? 'Full' : `${s.seats_available} left`}
              </p>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-400" /> Available</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Almost full</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-stone-300" /> Fully booked</span>
      </div>
    </div>
  );
}
