import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const plumberDetails = useAuthStore((s) => s.plumberDetails);
  const isLoading = useAuthStore((s) => s.isLoading);
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const signOut = useAuthStore((s) => s.signOut);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  return {
    session,
    profile,
    plumberDetails,
    isLoading,
    isAuthenticated: !!session,
    isCustomer: profile?.role === 'customer',
    isPlumber: profile?.role === 'plumber',
    signIn,
    signUp,
    signOut,
    updateProfile,
  };
}
