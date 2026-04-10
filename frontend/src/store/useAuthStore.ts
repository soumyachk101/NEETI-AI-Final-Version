import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { extractErrorMessage } from '@/lib/errorUtils';

interface User {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  clearError: () => void;
}

/**
 * FIX #14: Clear ALL application stores, not just auth.
 * Defined outside the store to avoid async-in-sync issues.
 */
async function clearAllStores() {
  // 1. Clear auth store
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });

  // 2. Clear persisted auth storage to prevent stale rehydration
  localStorage.removeItem('auth-storage');

  // 3. Clear session store (lazy import avoids circular deps)
  try {
    const { useSessionStore } = await import('@/store/useSessionStore');
    useSessionStore.setState({
      sessions: [],
      currentSession: null,
      roomToken: null,
      candidateId: null,
      isLoading: false,
      error: null,
    });
  } catch {
    // Session store may not exist in test environments
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          if (data.user) {
            set({
              user: {
                id: data.user.id,
                email: data.user.email!,
                full_name: data.user.user_metadata?.full_name,
                role: data.user.user_metadata?.role,
              },
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          }
        } catch (error: unknown) {
          const message = extractErrorMessage(error, 'Login failed');
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: message,
          });
          throw error;
        }
      },

      register: async (email: string, password: string, fullName: string, role: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
                role: role,
              },
            },
          });

          if (error) throw error;

          if (data.user) {
            await supabase.auth.signInWithPassword({
              email,
              password,
            });

            set({
              user: {
                id: data.user.id,
                email: data.user.email!,
                full_name: fullName,
                role: role,
              },
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          }
        } catch (error: unknown) {
          const message = extractErrorMessage(error, 'Registration failed');
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: message,
          });
          throw error;
        }
      },

      logout: async () => {
        await supabase.auth.signOut();
        await clearAllStores();
      },

      // FIX #2: Always validate against live Supabase session on app init
      fetchCurrentUser: async () => {
        set({ isLoading: true });
        try {
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) throw error;

          if (session?.user) {
            set({
              user: {
                id: session.user.id,
                email: session.user.email!,
                full_name: session.user.user_metadata?.full_name,
                role: session.user.user_metadata?.role,
              },
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            // No valid Supabase session → clear everything
            await clearAllStores();
          }
        } catch {
          // Token expired or invalid → clear stale state
          await clearAllStores();
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// FIX #2: Listen for Supabase auth state changes (token expiry, external signout)
// Store the unsubscribe function to prevent listener leaks
const { data: { subscription: _authSubscription } } = supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    clearAllStores();
  }
});

// Export for manual cleanup if needed (e.g., in tests)
export const cleanupAuthSubscription = () => _authSubscription.unsubscribe();

// Synced for GitHub timestamp
