import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile, Role } from './types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, role: Role, fullName: string, phone: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid: string, currentUser: User | null) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error) {
      console.error('Profile load error', error);
      setProfile(null);
      return;
    }
    // If no profile row yet, create one from user metadata captured at signup.
    if (!data && currentUser) {
      const meta = currentUser.user_metadata as Record<string, string> | undefined;
      const newProfile = {
        id: uid,
        email: currentUser.email ?? '',
        full_name: meta?.full_name ?? meta?.name ?? '',
        phone: meta?.phone ?? '',
        role: (meta?.role as Role) ?? 'customer',
        avatar_url: meta?.avatar_url ?? meta?.picture ?? '',
        city: meta?.city ?? '',
      };
      const { data: inserted, error: insErr } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select('*')
        .maybeSingle();
      if (insErr) {
        // Insert may race with the one from signUp — re-query.
        const { data: retry } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .maybeSingle();
        setProfile(retry as Profile | null);
        return;
      }
      setProfile(inserted as Profile);
      return;
    }
    setProfile(data as Profile | null);
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadProfile(data.session.user.id, data.session.user).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      (async () => {
        setSession(sess);
        setUser(sess?.user ?? null);
        if (sess?.user) {
          await loadProfile(sess.user.id, sess.user);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };

  }, []);

  const signUp: AuthState['signUp'] = async (email, password, role, fullName, phone) => {
    if (role === 'admin') return { error: 'Admin accounts cannot be created through sign-up.' };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone, role } },
    });
    if (error) return { error: error.message };
    if (data.user) {
      // Try to create profile immediately; RLS allows self-insert.
      await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        full_name: fullName,
        phone,
        role,
      });
    }
    return { error: null };
  };

  const signIn: AuthState['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id, user);
  };

  const signInWithGoogle: AuthState['signInWithGoogle'] = async () => {
    const inIframe = window.self !== window.top;
    if (inIframe) {
      return {
        error:
          'Google sign-in cannot run inside the Bolt preview window. Please publish your site (or open it in a new tab) and try again. You also need to configure Google credentials in Settings → Authentication → Continue with Google.',
      };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signUp, signIn, signOut, refreshProfile, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
