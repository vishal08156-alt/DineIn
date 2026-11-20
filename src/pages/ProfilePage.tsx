import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/AppShell';
import { Spinner } from '@/lib/ui';
import { User, Mail, Phone, MapPin, Camera, Save, Check } from 'lucide-react';

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    // Update profile row
    const { error: pErr } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, city, avatar_url: avatarUrl })
      .eq('id', profile!.id);
    if (pErr) { setError(pErr.message); setSaving(false); return; }

    // Also update user_metadata so the auth context picks up changes
    await supabase.auth.updateUser({
      data: { full_name: fullName, phone, city, avatar_url: avatarUrl },
    });

    await refreshProfile();

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const avatar = avatarUrl || profile.avatar_url;

  return (
    <div className="animate-fade-in max-w-2xl">
      <PageHeader title="Your profile" subtitle="Update your personal details, contact info, and location." />

      <form onSubmit={save} className="card p-6 sm:p-8">
        {/* Avatar preview */}
        <div className="mb-8 flex items-center gap-5">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-stone-200 text-2xl font-bold uppercase text-stone-500">
              {avatar ? (
                <img src={avatar} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                (fullName || profile.email || '?').charAt(0)
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-orange-600 text-white shadow ring-2 ring-white">
              <Camera className="h-3.5 w-3.5" />
            </div>
          </div>
          <div>
            <p className="font-semibold text-stone-900">{fullName || profile.email}</p>
            <p className="text-sm text-stone-500">{profile.email}</p>
            <span className="badge mt-1.5 bg-stone-100 capitalize text-stone-600">{profile.role}</span>
          </div>
        </div>

        {/* Avatar URL */}
        <div className="mb-5">
          <label className="label"><Camera className="inline h-3.5 w-3.5" /> Profile photo URL</label>
          <input
            className="input"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/photo.jpg"
          />
          <p className="mt-1 text-xs text-stone-400">Paste a link to your profile photo.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label"><User className="inline h-3.5 w-3.5" /> Full name</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
          </div>

          <div>
            <label className="label"><Mail className="inline h-3.5 w-3.5" /> Email</label>
            <input className="input bg-stone-50 text-stone-500" value={profile.email} disabled />
          </div>

          <div>
            <label className="label"><Phone className="inline h-3.5 w-3.5" /> Phone</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0100" />
          </div>

          <div>
            <label className="label"><MapPin className="inline h-3.5 w-3.5" /> City</label>
            <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="San Francisco, CA" />
          </div>
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <div className="mt-8 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-stone-600">
            {saved && <><Check className="h-4 w-4 text-green-600" /> Saved successfully</>}
          </div>
          <button type="submit" disabled={saving} className="btn-primary gap-2">
            {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
