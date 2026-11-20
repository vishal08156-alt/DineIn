export type Role = 'customer' | 'owner' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: Role;
  city: string;
  avatar_url: string;
  created_at: string;
}

export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  cuisine: string;
  address: string;
  city: string;
  phone: string;
  image_url: string;
  opening_hours: Record<string, string>;
  status: 'active' | 'inactive';
  avg_prep_time_min: number;
  total_seats: number;
  slot_duration_min: number;
  map_url: string;
  created_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  available: boolean;
  prep_time_min: number;
  created_at: string;
}

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'no_show';

export interface Reservation {
  id: string;
  customer_id: string;
  restaurant_id: string;
  reservation_time: string;
  party_size: number;
  special_requests: string;
  status: ReservationStatus;
  total_amount: number;
  eta_minutes: number;
  created_at: string;
  updated_at: string;
  restaurant?: Restaurant;
  items?: ReservationItem[];
  items_count?: number;
}

export interface ReservationItem {
  id: string;
  reservation_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  menu_item?: MenuItem;
}

export type SenderType = 'customer' | 'owner' | 'ai';

export interface ChatMessage {
  id: string;
  reservation_id: string;
  sender_type: SenderType;
  sender_id: string | null;
  content: string;
  is_ai: boolean;
  created_at: string;
}

export interface AvailabilitySlot {
  restaurant_id: string;
  total_seats: number;
  rdate: string;
  slot_hour: number;
  seats_available: number;
  seats_booked: number;
}

export interface Review {
  id: string;
  reservation_id: string;
  customer_id: string;
  restaurant_id: string;
  rating: number;
  comment: string;
  created_at: string;
  customer?: Profile;
}

export type ReportTargetType = 'restaurant' | 'user';
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  details: string;
  status: ReportStatus;
  created_at: string;
  reporter?: Profile;
}
