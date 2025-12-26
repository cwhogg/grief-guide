import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Profile } from "@/lib/supabase/types";

// Demo mode - no auth required
const DEMO_MODE = true;

interface UserState {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const DEMO_USER = {
  id: "demo-user-123",
  email: "demo@griefguide.app",
};

export const useUser = create<UserState>()(
  persist(
    (set, get) => ({
      user: DEMO_MODE ? DEMO_USER : null,
      profile: null,
      isLoading: false,
      error: null,

      initialize: async () => {
        if (DEMO_MODE) {
          set({ user: DEMO_USER, isLoading: false });
          await get().fetchProfile();
          return;
        }

        // Original auth code would go here
        set({ isLoading: false });
      },

      fetchProfile: async () => {
        const { user, profile: existingProfile } = get();
        if (!user) return;

        if (DEMO_MODE) {
          // Use existing profile from localStorage or create default
          if (!existingProfile) {
            set({
              profile: {
                id: DEMO_USER.id,
                email: DEMO_USER.email,
                full_name: null,
                avatar_url: null,
                onboarding_completed: false,
                user_role: null,
                state: null,
                deceased_name: null,
                deceased_had_spouse: null,
                deceased_had_will: null,
                deceased_had_trust: null,
                deceased_owned_property: null,
                deceased_had_retirement_accounts: null,
                has_surviving_parent: null,
                number_of_siblings: null,
                check_in_frequency: null,
                grief_stage: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            });
          }
          return;
        }
      },

      updateProfile: async (updates) => {
        const { profile } = get();
        if (!profile) return;

        if (DEMO_MODE) {
          // Just update local state
          set({
            profile: {
              ...profile,
              ...updates,
              updated_at: new Date().toISOString(),
            },
          });
          return;
        }
      },

      signOut: async () => {
        if (DEMO_MODE) {
          set({
            profile: {
              id: DEMO_USER.id,
              email: DEMO_USER.email,
              full_name: null,
              avatar_url: null,
              onboarding_completed: false,
              user_role: null,
              state: null,
              deceased_name: null,
              deceased_had_spouse: null,
              deceased_had_will: null,
              deceased_had_trust: null,
              deceased_owned_property: null,
              deceased_had_retirement_accounts: null,
              has_surviving_parent: null,
              number_of_siblings: null,
              check_in_frequency: null,
              grief_stage: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          });
          return;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "grief-guide-user",
      partialize: (state) => ({ profile: state.profile }),
    }
  )
);
