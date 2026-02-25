import { create } from 'zustand';
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
  }) => Promise<void>;
  sendOtp: (params: {
    email?: string;
    phone?: string;
    shouldCreateUser: boolean;
    fullName?: string;
    role?: UserRole;
    plumberPhone?: string;
    regions?: string[];
    bio?: string;
    businessName?: string;
    servicesType?: ServicesType;
    gasSafeNumber?: string;
    consentToChecks?: boolean;
    rightToWork?: string;
  }) => Promise<void>;
  verifyOtp: (params: {
    email?: string;
    phone?: string;
    token: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
          set({ plumberDetails: details as PlumberDetails | null });
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUp: async ({ email, password, fullName, role, phone, regions, bio, businessName, servicesType, gasSafeNumber, consentToChecks, rightToWork }) => {
    const { error } = await supabase.auth.signUp({
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
        },
      },
    });
    if (error) throw error;
  },

  sendOtp: async ({ email, phone, shouldCreateUser, fullName, role, plumberPhone, regions, bio, businessName, servicesType, gasSafeNumber, consentToChecks, rightToWork }) => {
    const options: { shouldCreateUser: boolean; data?: Record<string, unknown> } = { shouldCreateUser };
    if (shouldCreateUser && fullName) {
      options.data = {
        full_name: fullName,
        role: role ?? 'customer',
        ...(plumberPhone ? { phone: plumberPhone } : {}),
        ...(regions ? { regions } : {}),
        ...(bio ? { bio } : {}),
        ...(businessName ? { business_name: businessName } : {}),
        ...(servicesType ? { services_type: servicesType } : {}),
        ...(gasSafeNumber ? { gas_safe_number: gasSafeNumber } : {}),
        ...(consentToChecks !== undefined ? { consent_to_checks: consentToChecks } : {}),
        ...(rightToWork ? { right_to_work: rightToWork } : {}),
      };
    }
    const params = email
      ? { email, options }
      : { phone: phone!, options };
    const { error } = await supabase.auth.signInWithOtp(params);
    if (error) throw error;
  },

  verifyOtp: async ({ email, phone, token }) => {
    const params = email
      ? { email, token, type: 'email' as const }
      : { phone: phone!, token, type: 'sms' as const };
    const { error } = await supabase.auth.verifyOtp(params);
    if (error) throw error;
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
