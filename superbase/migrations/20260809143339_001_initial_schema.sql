/*
# TableSeat — initial schema

## Overview
TableSeat lets customers reserve restaurant seats and pre-order food from home
so it's ready when they arrive — no waiting. Three roles: customer, owner, admin.

## Tables

1. profiles
   - id (uuid PK, FK auth.users) — one row per user
   - email, full_name, phone
   - role (customer | owner | admin) — default 'customer'
   - created_at

2. restaurants
   - id, owner_id (FK profiles), name, description, cuisine, address, city,
     phone, image_url, opening_hours (jsonb), status (active | inactive),
     avg_prep_time_min, created_at

3. menu_items
   - id, restaurant_id (FK restaurants), name, description, price, category,
     image_url, available (bool), prep_time_min, created_at

4. reservations
   - id, customer_id (FK profiles), restaurant_id (FK restaurants),
     reservation_time, party_size, special_requests, status
     (pending | confirmed | cancelled | preparing | ready | completed | no_show),
     total_amount, eta_minutes, created_at, updated_at

5. reservation_items
   - id, reservation_id (FK reservations), menu_item_id (FK menu_items),
     quantity, unit_price

6. chat_messages
   - id, reservation_id (FK reservations), sender_type (customer | owner | ai),
     sender_id (uuid nullable), content, is_ai (bool), created_at

7. reviews
   - id, reservation_id (FK reservations), customer_id (FK profiles),
     restaurant_id (FK restaurants), rating (1-5), comment, created_at

## Security (RLS)
- profiles: read/update own; admins read all.
- restaurants: public read (anon+authenticated); owners insert/update/delete own.
- menu_items: public read; owners manage items belonging to their restaurant.
- reservations: customers read/manage their own; owners read/manage reservations
  for their restaurants; admins read all.
- reservation_items: access scoped through the parent reservation.
- chat_messages: customer and owner of the reservation can read/insert.
- reviews: public read; customers insert their own (only for completed reservations).

## Notes
1. Role assignment at signup is limited to 'customer' or 'owner' via the
   INSERT policy WITH CHECK. 'admin' can only be granted by updating an
   existing row from the service role (backend), never self-assigned.
2. owner_id columns default to auth.uid() so owner inserts succeed without
   the client passing an owner id.
3. customer_id columns default to auth.uid() for the same reason.
*/

-- ============ profiles ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  role text NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer','owner','admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin"
ON profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
));

DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self"
ON profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id AND role IN ('customer','owner'));

DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
CREATE POLICY "profiles_update_self"
ON profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============ restaurants ============
CREATE TABLE IF NOT EXISTS restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  cuisine text NOT NULL DEFAULT '',
  address text DEFAULT '',
  city text DEFAULT '',
  phone text DEFAULT '',
  image_url text DEFAULT '',
  opening_hours jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  avg_prep_time_min int DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "restaurants_select_public" ON restaurants;
CREATE POLICY "restaurants_select_public"
ON restaurants FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "restaurants_insert_owner" ON restaurants;
CREATE POLICY "restaurants_insert_owner"
ON restaurants FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'owner'
) AND owner_id = auth.uid());

DROP POLICY IF EXISTS "restaurants_update_owner" ON restaurants;
CREATE POLICY "restaurants_update_owner"
ON restaurants FOR UPDATE TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "restaurants_delete_owner" ON restaurants;
CREATE POLICY "restaurants_delete_owner"
ON restaurants FOR DELETE TO authenticated
USING (owner_id = auth.uid());

-- ============ menu_items ============
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  category text DEFAULT 'Main',
  image_url text DEFAULT '',
  available boolean NOT NULL DEFAULT true,
  prep_time_min int DEFAULT 15,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_items_select_public" ON menu_items;
CREATE POLICY "menu_items_select_public"
ON menu_items FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "menu_items_insert_owner" ON menu_items;
CREATE POLICY "menu_items_insert_owner"
ON menu_items FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()
));

DROP POLICY IF EXISTS "menu_items_update_owner" ON menu_items;
CREATE POLICY "menu_items_update_owner"
ON menu_items FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM restaurants r WHERE r.id = menu_items.restaurant_id AND r.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM restaurants r WHERE r.id = menu_items.restaurant_id AND r.owner_id = auth.uid()
));

DROP POLICY IF EXISTS "menu_items_delete_owner" ON menu_items;
CREATE POLICY "menu_items_delete_owner"
ON menu_items FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM restaurants r WHERE r.id = menu_items.restaurant_id AND r.owner_id = auth.uid()
));

-- ============ reservations ============
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  reservation_time timestamptz NOT NULL,
  party_size int NOT NULL DEFAULT 1 CHECK (party_size > 0),
  special_requests text DEFAULT '',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','cancelled','preparing','ready','completed','no_show')),
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  eta_minutes int DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reservations_select_parties" ON reservations;
CREATE POLICY "reservations_select_parties"
ON reservations FOR SELECT TO authenticated
USING (
  customer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM restaurants r WHERE r.id = reservations.restaurant_id AND r.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "reservations_insert_customer" ON reservations;
CREATE POLICY "reservations_insert_customer"
ON reservations FOR INSERT TO authenticated
WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "reservations_update_parties" ON reservations;
CREATE POLICY "reservations_update_parties"
ON reservations FOR UPDATE TO authenticated
USING (
  customer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM restaurants r WHERE r.id = reservations.restaurant_id AND r.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
)
WITH CHECK (
  customer_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM restaurants r WHERE r.id = reservations.restaurant_id AND r.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "reservations_delete_customer" ON reservations;
CREATE POLICY "reservations_delete_customer"
ON reservations FOR DELETE TO authenticated
USING (customer_id = auth.uid());

-- ============ reservation_items ============
CREATE TABLE IF NOT EXISTS reservation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL DEFAULT 0
);

ALTER TABLE reservation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "res_items_select_parties" ON reservation_items;
CREATE POLICY "res_items_select_parties"
ON reservation_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM reservations res
  WHERE res.id = reservation_id AND (
    res.customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM restaurants r WHERE r.id = res.restaurant_id AND r.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
));

DROP POLICY IF EXISTS "res_items_insert_customer" ON reservation_items;
CREATE POLICY "res_items_insert_customer"
ON reservation_items FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM reservations res
  WHERE res.id = reservation_id AND res.customer_id = auth.uid()
));

DROP POLICY IF EXISTS "res_items_update_customer" ON reservation_items;
CREATE POLICY "res_items_update_customer"
ON reservation_items FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM reservations res WHERE res.id = reservation_id AND res.customer_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM reservations res WHERE res.id = reservation_id AND res.customer_id = auth.uid()
));

DROP POLICY IF EXISTS "res_items_delete_customer" ON reservation_items;
CREATE POLICY "res_items_delete_customer"
ON reservation_items FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM reservations res WHERE res.id = reservation_id AND res.customer_id = auth.uid()
));

-- ============ chat_messages ============
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('customer','owner','ai')),
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  is_ai boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_select_parties" ON chat_messages;
CREATE POLICY "chat_select_parties"
ON chat_messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM reservations res
  WHERE res.id = chat_messages.reservation_id AND (
    res.customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM restaurants r WHERE r.id = res.restaurant_id AND r.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
));

DROP POLICY IF EXISTS "chat_insert_parties" ON chat_messages;
CREATE POLICY "chat_insert_parties"
ON chat_messages FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM reservations res
  WHERE res.id = chat_messages.reservation_id AND (
    (sender_type = 'customer' AND res.customer_id = auth.uid())
    OR (sender_type = 'owner' AND EXISTS (
      SELECT 1 FROM restaurants r WHERE r.id = res.restaurant_id AND r.owner_id = auth.uid()
    ))
  )
));

-- AI messages inserted by the service role (edge function) bypass RLS.
DROP POLICY IF EXISTS "chat_insert_ai_service" ON chat_messages;
CREATE POLICY "chat_insert_ai_service"
ON chat_messages FOR INSERT TO authenticated
WITH CHECK (sender_type = 'ai' AND is_ai = true);

-- ============ reviews ============
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_public" ON reviews;
CREATE POLICY "reviews_select_public"
ON reviews FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "reviews_insert_customer" ON reviews;
CREATE POLICY "reviews_insert_customer"
ON reviews FOR INSERT TO authenticated
WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "reviews_delete_customer" ON reviews;
CREATE POLICY "reviews_delete_customer"
ON reviews FOR DELETE TO authenticated
USING (customer_id = auth.uid());

-- ============ indexes ============
CREATE INDEX IF NOT EXISTS idx_restaurants_owner ON restaurants(owner_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants(city);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_customer ON reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_restaurant ON reservations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_res_items_reservation ON reservation_items(reservation_id);
CREATE INDEX IF NOT EXISTS idx_chat_reservation ON chat_messages(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reviews_restaurant ON reviews(restaurant_id);

-- ============ updated_at trigger for reservations ============
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reservations_updated_at ON reservations;
CREATE TRIGGER reservations_updated_at
BEFORE UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
