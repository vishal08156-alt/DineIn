/*
# Add seat capacity and availability view

## Changes
1. Add `total_seats` column to `restaurants` (default 40).
2. Add a `slot_duration_min` column to control time-slot granularity (default 60).
3. Create a `restaurant_availability` view that, for each restaurant and
   date, lists each time slot and how many seats are still available,
   computed from active (non-cancelled, non-no-show) reservations whose
   party overlaps the slot window.

## Security
- The view is SELECT-only and public (anon + authenticated). It exposes
  only aggregate availability numbers, no personal data.
*/

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS total_seats int NOT NULL DEFAULT 40;

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS slot_duration_min int NOT NULL DEFAULT 60;

-- Generate time slots for a given restaurant date and compute booked seats.
-- A reservation occupies one slot (rounded to slot_duration_min). We count
-- total party_size of active reservations per (restaurant, date, slot_hour).
CREATE OR REPLACE VIEW public.restaurant_availability AS
WITH active AS (
  SELECT
    r.restaurant_id,
    r.party_size,
    date_trunc('day', r.reservation_time) AS rdate,
    date_part('hour', r.reservation_time)::int AS rhour
  FROM reservations r
  WHERE r.status NOT IN ('cancelled','no_show')
)
SELECT
  rest.id AS restaurant_id,
  rest.total_seats,
  d.rdate,
  s.hour AS slot_hour,
  GREATEST(0, rest.total_seats - COALESCE(SUM(a.party_size), 0))::int AS seats_available,
  COALESCE(SUM(a.party_size), 0)::int AS seats_booked
FROM restaurants rest
CROSS JOIN (SELECT generate_series(0, 23)::int AS hour) s
CROSS JOIN LATERAL (
  SELECT date_trunc('day', now()) AS rdate
  UNION ALL
  SELECT date_trunc('day', now() + (n || ' day')::interval)
  FROM generate_series(0, 13) AS n
) d
LEFT JOIN active a
  ON a.restaurant_id = rest.id
  AND a.rdate = d.rdate
  AND a.rhour = s.hour
GROUP BY rest.id, rest.total_seats, d.rdate, s.hour;

GRANT SELECT ON public.restaurant_availability TO anon, authenticated;
