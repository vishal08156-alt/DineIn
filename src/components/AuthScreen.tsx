import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';
import { UtensilsCrossed, Store, User, Loader2 } from 'lucide-react';

const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default function AuthScreen() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [role, setRole] = useState<Role>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    if (mode === 'signup') {
      const { error } = await signUp(email, password, role, fullName, phone);
      if (error) setError(error);
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    }
    setBusy(false);
  }

  const roles: { value: Role; label: string; icon: typeof User }[] = [
    { value: 'customer', label: 'Customer', icon: User },
    { value: 'owner', label: 'Restaurant Owner', icon: Store },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-stone-900 p-12 text-white">
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 20% 80%, #e85d2f 0%, transparent 50%), radial-gradient(circle at 80% 20%, #b45309 0%, transparent 50%)' }} />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold">TableSeat</span>
        </div>
        <div className="relative space-y-5">
          <h1 className="text-4xl font-bold leading-tight">Skip the wait.<br />Reserve & pre-order in advance.</h1>
          <p className="text-lg text-stone-300">Book your table, order your food, and arrive to a hot meal. No more waiting in line.</p>
          <div className="grid gap-3 pt-4">
            {['Reserve seats ahead of time', 'Pre-order so food is ready', 'Chat with the restaurant'].map((f) => (
              <div key={f} className="flex items-center gap-3 text-stone-200">
                <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-sm text-stone-400">© 2026 TableSeat</p>
      </div>

      {/* right form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden mb-8 flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">TableSeat</span>
          </div>

          <h2 className="text-2xl font-bold">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="mt-1 text-sm text-stone-500">
            {mode === 'signin' ? 'Sign in to manage your reservations' : 'Choose your role and get started'}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label">I am a…</label>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition ${
                        role === r.value
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-stone-200 text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      <r.icon className="h-5 w-5" />
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <>
                <div>
                  <label className="label">Full name</label>
                  <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Jane Doe" />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0100" />
                </div>
              </>
            )}

            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
            )}

            <button className="btn-primary w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {/* Google SSO divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-stone-200" />
            <span className="text-xs font-medium text-stone-400">OR</span>
            <div className="h-px flex-1 bg-stone-200" />
          </div>

          <button
            onClick={async () => { setError(null); const { error } = await signInWithGoogle(); if (error) setError(error); }}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="mt-6 text-center text-sm text-stone-500">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
              className="font-semibold text-orange-600 hover:text-orange-700"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
