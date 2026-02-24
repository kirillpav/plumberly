import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { UserProfile, UserRole, PlumberDetails } from '@/types/index';
import type { Session } from '@supabase/supabase-js';

const ONBOARDING_STORAGE_KEY = '@plumberly_onboarding_complete';

const PROFILE_RETRY_DELAY_MS = 1500;
const PROFILE_MAX_RETRIES = 2;

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  plumberDetails: PlumberDetails | null;
  isLoading: boolean;
  onboardingComplete: boolean;
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
  }) => Promise<void>;
  verifyOtp: (params: {
    email?: string;
    phone?: string;
    token: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  plumberDetails: null,
  isLoading: true,
  onboardingComplete: false,

  initialize: async () => {
    try {
      const [{ data: { session } }, storedFlag] = await Promise.all([
        supabase.auth.getSession(),
        AsyncStorage.getItem(ONBOARDING_STORAGE_KEY),
      ]);
      set({ session, onboardingComplete: storedFlag === 'true' });
      if (session?.user) {
        await get().fetchProfile(session.user.id);
        // Sync onboarding state from profile if available
        const profile = get().profile;
        if (profile?.onboarding_complete) {
          set({ onboardingComplete: true });
        }
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

  signUp: async ({ email, password, fullName, role, phone, regions, bio }) => {
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
        },
      },
    });
    if (error) throw error;
  },

  sendOtp: async ({ email, phone, shouldCreateUser, fullName, role, plumberPhone, regions, bio }) => {
    const options: { shouldCreateUser: boolean; data?: Record<string, unknown> } = { shouldCreateUser };
    if (shouldCreateUser && fullName) {
      options.data = {
        full_name: fullName,
        role: role ?? 'customer',
        ...(plumberPhone ? { phone: plumberPhone } : {}),
        ...(regions ? { regions } : {}),
        ...(bio ? { bio } : {}),
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

  completeOnboarding: async () => {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    set({ onboardingComplete: true });

    const userId = get().session?.user?.id;
    if (userId) {
      await supabase
        .from('profiles')
        .update({ onboarding_complete: true })
        .eq('id', userId);
      await get().fetchProfile(userId);
    }
  },
}));
