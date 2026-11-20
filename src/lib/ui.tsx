import type { ReservationStatus } from './types';
import { Clock, CheckCircle2, XCircle, ChefHat, BellRing, PartyPopper, UserX, Loader } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const STATUS_META: Record<ReservationStatus, { label: string; color: string; icon: LucideIcon }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-stone-100 text-stone-500', icon: XCircle },
  preparing: { label: 'Preparing', color: 'bg-purple-100 text-purple-700', icon: ChefHat },
  ready: { label: 'Ready', color: 'bg-green-100 text-green-700', icon: BellRing },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: PartyPopper },
  no_show: { label: 'No-show', color: 'bg-red-100 text-red-700', icon: UserX },
};

export function StatusBadge({ status }: { status: ReservationStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={`badge ${meta.color}`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader className={`h-5 w-5 animate-spin ${className}`} />;
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTimeShort(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function money(n: number) {
  return `₹${(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
