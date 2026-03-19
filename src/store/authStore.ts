import { create } from 'zustand';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import type { UserProfile, UserRole, PlumberDetails, ServicesType } from '@/types/index';
import type { Session } from '@supabase/supabase-js';

const PROFILE_RETRY_DELAY_MS = 1500;
const PROFILE_MAX_RETRIES = 2;

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  plumberDetails: PlumberDetails | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    phone?: string;
    regions?: string[];
    bio?: string;
    businessName?: string;
    servicesType?: ServicesType;
    gasSafeNumber?: string;
    consentToChecks?: boolean;
    rightToWork?: string;
    businessType?: 'sole_trader' | 'limited_company';
    vettingMetadata?: Record<string, unknown>;
  }) => Promise<{ userId: string | undefined; hasSession: boolean }>;
  signInPlumber: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// When true, onAuthStateChange skips setting session so role-checked
// sign-in methods can validate the role before navigation fires.
let _pendingRoleCheck = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  plumberDetails: null,
  isLoading: true,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session });
      if (session?.user) {
        await get().fetchProfile(session.user.id);
      }
    } catch (err) {
      console.error('Auth init error:', err);
    } finally {
      set({ isLoading: false });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (_pendingRoleCheck) return;
      set({ session });
      if (session?.user) {
        await get().fetchProfile(session.user.id);
      } else {
        set({ profile: null, plumberDetails: null });
      }
    });
  },

  fetchProfile: async (userId: string) => {
    for (let attempt = 0; attempt <= PROFILE_MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await delay(PROFILE_RETRY_DELAY_MS);
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        set({ profile: profile as UserProfile });

        if (profile.role === 'plumber') {
          const { data: details } = await supabase
            .from('plumber_details')
            .select('*')
            .eq('user_id', userId)
            .single();

          // Sync payouts status with Stripe, then read from DB
          const { data: statusData } = await supabase.functions.invoke(
            'stripe-connect-status',
            { method: 'POST', body: {} },
          ).catch(() => ({ data: null }));

          const payoutsEnabled = statusData?.payouts_enabled ?? false;

          set({
            plumberDetails: details
              ? { ...details, payouts_enabled: payoutsEnabled } as PlumberDetails
              : null,
          });
        }
        return;
      }

      if (error) {
        console.warn(
          `Profile fetch attempt ${attempt + 1}/${PROFILE_MAX_RETRIES + 1} failed:`,
          error.message,
        );
      }
    }

    // All retries exhausted — build a fallback profile from the session's
    // user metadata so the app remains functional.
    const session = get().session;
    if (session?.user) {
      const meta = session.user.user_metadata ?? {};
      const fallbackProfile: UserProfile = {
        id: session.user.id,
        email: session.user.email ?? '',
        full_name: (meta.full_name as string) ?? '',
        phone: (meta.phone as string) ?? null,
        avatar_url: null,
        role: ((meta.role as UserRole) ?? 'customer'),
        push_token: null,
        onboarding_complete: false,
        created_at: session.user.created_at ?? new Date().toISOString(),
      };
      console.warn('Using fallback profile from session metadata');
      set({ profile: fallbackProfile });
    }
  },

  signIn: async (email, password) => {
    _pendingRoleCheck = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Block plumber accounts from the main sign-in flow
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profile?.role === 'plumber') {
          await supabase.auth.signOut();
          throw new Error('Plumber accounts must sign in through the Plumber Portal.');
        }
      }

      // Role check passed — propagate session
      set({ session: data.session });
      if (data.session?.user) {
        await get().fetchProfile(data.session.user.id);
      }
    } finally {
      _pendingRoleCheck = false;
    }
  },

  signUp: async ({ email, password, fullName, role, phone, regions, bio, businessName, servicesType, gasSafeNumber, consentToChecks, rightToWork, businessType, vettingMetadata }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          phone,
          regions,
          bio,
          ...(businessName ? { business_name: businessName } : {}),
          ...(servicesType ? { services_type: servicesType } : {}),
          ...(gasSafeNumber ? { gas_safe_number: gasSafeNumber } : {}),
          ...(consentToChecks !== undefined ? { consent_to_checks: consentToChecks } : {}),
          ...(rightToWork ? { right_to_work: rightToWork } : {}),
          ...(businessType ? { business_type: businessType } : {}),
          ...(vettingMetadata ? { vetting_metadata: vettingMetadata } : {}),
        },
      },
    });
    if (error) throw error;
    if (data.session) {
      set({ session: data.session });
    }
    return { userId: data.user?.id, hasSession: !!data.session };
  },

  signInPlumber: async (email, password) => {
    _pendingRoleCheck = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profile?.role !== 'plumber') {
          await supabase.auth.signOut();
          throw new Error('This portal is for plumber accounts only. Please use the main sign-in.');
        }
      }

      // Role check passed — propagate session
      set({ session: data.session });
      if (data.session?.user) {
        await get().fetchProfile(data.session.user.id);
      }
    } finally {
      _pendingRoleCheck = false;
    }
  },

  signInWithGoogle: async () => {
    const redirectUrl = 'fluxservice://';
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });
    if (error) throw error;
    if (!data.url) throw new Error('No OAuth URL returned');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    if (result.type !== 'success') return;

    // Extract tokens from the redirect URL fragment
    const url = result.url;
    const fragment = url.split('#')[1];
    if (!fragment) throw new Error('No auth data in redirect');

    const params = new URLSearchParams(fragment);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (!access_token || !refresh_token) {
      throw new Error('Missing tokens in redirect');
    }

    _pendingRoleCheck = true;
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (sessionError) throw sessionError;

      // Block plumber accounts from Google sign-in on the main flow
      if (sessionData.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', sessionData.user.id)
          .single();

        if (profile?.role === 'plumber') {
          await supabase.auth.signOut();
          throw new Error('Plumber accounts must sign in through the Plumber Portal.');
        }
      }

      // Role check passed — propagate session
      set({ session: sessionData.session });
      if (sessionData.session?.user) {
        await get().fetchProfile(sessionData.session.user.id);
      }
    } finally {
      _pendingRoleCheck = false;
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null, plumberDetails: null });
  },

  updateProfile: async (updates) => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
    await get().fetchProfile(userId);
  },
}));
