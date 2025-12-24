import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/supabase/types";

interface UserState {
  user: User | null;
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

export const useUser = create<UserState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  error: null,

  initialize: async () => {
    const supabase = createClient();

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;

      set({ user, isLoading: false });

      if (user) {
        await get().fetchProfile();
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        const currentUser = session?.user ?? null;
        set({ user: currentUser });

        if (currentUser) {
          await get().fetchProfile();
        } else {
          set({ profile: null });
        }
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to initialize",
        isLoading: false,
      });
    }
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      set({ profile: data });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch profile",
      });
    }
  },

  updateProfile: async (updates) => {
    const { user, profile } = get();
    if (!user || !profile) return;

    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;

      set({ profile: data });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to update profile",
      });
    }
  },

  signOut: async () => {
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      set({ user: null, profile: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to sign out",
      });
    }
  },

  clearError: () => set({ error: null }),
}));
