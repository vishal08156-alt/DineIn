import { AuthProvider, useAuth } from '@/lib/auth';
import { useHashRoute } from '@/lib/router';
import AuthScreen from '@/components/AuthScreen';
import AppShell from '@/components/AppShell';
import { Spinner } from '@/lib/ui';

import DiscoverPage from '@/pages/customer/DiscoverPage';
import RestaurantDetail from '@/pages/customer/RestaurantDetail';
import MyReservationsPage from '@/pages/customer/MyReservationsPage';
import CustomerMessagesPage from '@/pages/customer/CustomerMessagesPage';
import ReservationDetail from '@/pages/ReservationDetail';

import OwnerDashboard from '@/pages/owner/OwnerDashboard';
import OwnerReservationsPage from '@/pages/owner/OwnerReservationsPage';
import OwnerMenuPage from '@/pages/owner/OwnerMenuPage';
import OwnerMessagesPage from '@/pages/owner/OwnerMessagesPage';

import AdminOverview, { AdminRestaurants, AdminUsers, AdminReports } from '@/pages/admin/AdminPages';
import ProfilePage from '@/pages/ProfilePage';

function Router() {
  const [route] = useHashRoute();
  const { profile, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Spinner className="h-8 w-8 text-orange-600" /></div>;
  }
  if (!profile) return <AuthScreen />;

  const r = profile.role;

  // shared reservation detail (customer & owner)
  const resvMatch = route.match(/^\/reservations\/(.+)$/);
  if (resvMatch) {
    return <AppShell><ReservationDetail reservationId={resvMatch[1]} viewer="customer" /></AppShell>;
  }
  const ownerResvMatch = route.match(/^\/owner\/reservations\/(.+)$/);
  if (ownerResvMatch) {
    return <AppShell><ReservationDetail reservationId={ownerResvMatch[1]} viewer="owner" /></AppShell>;
  }

  // Shared profile route (all roles)
  if (route === '/profile') return <AppShell><ProfilePage /></AppShell>;

  if (r === 'customer') {
    if (route === '/' || route === '') return <AppShell><DiscoverPage /></AppShell>;
    const restMatch = route.match(/^\/restaurant\/(.+)$/);
    if (restMatch) return <AppShell><RestaurantDetail restaurantId={restMatch[1]} /></AppShell>;
    if (route === '/reservations') return <AppShell><MyReservationsPage /></AppShell>;
    if (route === '/messages') return <AppShell><CustomerMessagesPage /></AppShell>;
    return <AppShell><DiscoverPage /></AppShell>;
  }

  if (r === 'owner') {
    if (route === '/owner' || route === '/') return <AppShell><OwnerDashboard /></AppShell>;
    if (route === '/owner/reservations') return <AppShell><OwnerReservationsPage /></AppShell>;
    if (route === '/owner/messages') return <AppShell><OwnerMessagesPage /></AppShell>;
    const menuMatch = route.match(/^\/owner\/menu(?:\/(.+))?$/);
    if (menuMatch) return <AppShell><OwnerMenuPage restaurantId={menuMatch[1]} /></AppShell>;
    return <AppShell><OwnerDashboard /></AppShell>;
  }

  if (r === 'admin') {
    if (route === '/admin' || route === '/') return <AppShell><AdminOverview /></AppShell>;
    if (route === '/admin/restaurants') return <AppShell><AdminRestaurants /></AppShell>;
    if (route === '/admin/users') return <AppShell><AdminUsers /></AppShell>;
    if (route === '/admin/reports') return <AppShell><AdminReports /></AppShell>;
    return <AppShell><AdminOverview /></AppShell>;
  }

  return <AuthScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
