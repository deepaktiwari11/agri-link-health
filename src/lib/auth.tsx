import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "farmer" | "merchant";

export interface Profile {
  id: string;
  full_name: string;
  role: AppRole;
  phone: string | null;
  location: string | null;
  about: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role, phone, location, about")
      .eq("id", userId)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
      if (newSession?.user) {
        setTimeout(() => void loadProfile(newSession.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session?.user) void loadProfile(data.session.user.id);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    profile,
    loading,
    refreshProfile: async () => {
      if (session?.user) await loadProfile(session.user.id);
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setProfile(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
