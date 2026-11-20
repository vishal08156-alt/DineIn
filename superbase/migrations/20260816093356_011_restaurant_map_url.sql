/*
# Add optional map_url column to restaurants

## Changes
- Adds `map_url` (text, nullable) to the `restaurants` table.
- This is an OPTIONAL field: restaurant owners can paste a Google Maps
  (or any map service) link so customers who are travelling to an
  unfamiliar city can open directions. Not mandatory — owners who don't
  add it simply won't have a "View on map" button shown.

## Security
- No policy changes needed: existing restaurants UPDATE policy already
  allows the owner to update their own row, and the new column is
  covered by that same policy.
- No data loss — purely additive.
*/

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS map_url text DEFAULT '';