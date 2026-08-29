"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";

export type UserRole = "ADMIN" | "ANALYST";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  merchant_id: string;
  avatar_url?: string;
}

export interface DemoAccount {
  role: UserRole;
  name: string;
  email: string;
  title: string;
  merchant_id: string;
  description: string;
}

export const DEMO_ACCOUNTS: Record<UserRole, DemoAccount> = {
  ANALYST: {
    role: "ANALYST",
    name: "MA RIZWAN",
    email: "ma.rizwan@signalx.ai",
    title: "Senior Fraud Investigator",
    merchant_id: "mch_signalx_demo",
    description:
      "Investigate review queue, execute case dispositions, and generate dispute evidence.",
  },
  ADMIN: {
    role: "ADMIN",
    name: "MARQ",
    email: "marq@signalx.ai",
    title: "Chief Risk Officer / Admin",
    merchant_id: "mch_signalx_demo",
    description:
      "Full administrative access: tune ML thresholds, risk engine rules, and manage API keys.",
  },
};

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  session: Session | null;
  loading: boolean;
  isDemoUser: boolean;
  signInWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ error: Error | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
  ) => Promise<{ error: Error | null }>;
  signInAsDemo: (role: UserRole) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_STORAGE_KEY = "signalx_demo_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(false);

  // Initialize auth state
  useEffect(() => {
    // 1. Check for stored demo user first
    const storedDemo =
      typeof window !== "undefined"
        ? localStorage.getItem(DEMO_STORAGE_KEY)
        : null;
    if (storedDemo) {
      try {
        const parsed = JSON.parse(storedDemo) as UserProfile;
        setUser(parsed);
        setIsDemoUser(true);
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem(DEMO_STORAGE_KEY);
      }
    }

    // 2. Default to Analyst demo user
    if (!isSupabaseConfigured) {
      const defaultDemo: UserProfile = {
        id: "usr_demo_analyst",
        email: DEMO_ACCOUNTS.ANALYST.email,
        name: DEMO_ACCOUNTS.ANALYST.name,
        role: "ANALYST",
        merchant_id: "mch_signalx_demo",
      };
      setUser(defaultDemo);
      setIsDemoUser(true);
      setLoading(false);
      return;
    }

    // 3. Live Supabase Auth session listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        mapSupabaseUserToProfile(session.user);
      } else {
        // Pre-fill demo user so judges can immediately explore the dashboard
        const defaultDemo: UserProfile = {
          id: "usr_demo_analyst",
          email: DEMO_ACCOUNTS.ANALYST.email,
          name: DEMO_ACCOUNTS.ANALYST.name,
          role: "ANALYST",
          merchant_id: "mch_signalx_demo",
        };
        setUser(defaultDemo);
        setIsDemoUser(true);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setIsDemoUser(false);
        if (typeof window !== "undefined") {
          localStorage.removeItem(DEMO_STORAGE_KEY);
        }
        mapSupabaseUserToProfile(session.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const mapSupabaseUserToProfile = (sbUser: SupabaseUser) => {
    const meta = sbUser.user_metadata || {};
    const role: UserRole = meta.role === "ADMIN" ? "ADMIN" : "ANALYST";
    const profile: UserProfile = {
      id: sbUser.id,
      email: sbUser.email || "user@signalx.ai",
      name:
        meta.full_name ||
        meta.name ||
        sbUser.email?.split("@")[0] ||
        "Risk Officer",
      role: role,
      merchant_id: meta.merchant_id || "mch_signalx_demo",
      avatar_url: meta.avatar_url,
    };
    setUser(profile);
  };

  const signInWithEmail = async (
    email: string,
    password: string,
  ): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) {
      // Mock sign-in
      signInAsDemo("ANALYST");
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data.user) {
        mapSupabaseUserToProfile(data.user);
        setIsDemoUser(false);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
  ): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) {
      signInAsDemo(role);
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: role,
            merchant_id: "mch_signalx_demo",
          },
        },
      });
      if (error) throw error;
      if (data.user) {
        mapSupabaseUserToProfile(data.user);
        setIsDemoUser(false);
      }
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signInAsDemo = (role: UserRole) => {
    const demo = DEMO_ACCOUNTS[role];
    const demoProfile: UserProfile = {
      id: `usr_demo_${role.toLowerCase()}`,
      email: demo.email,
      name: demo.name,
      role: role,
      merchant_id: demo.merchant_id,
    };
    setUser(demoProfile);
    setIsDemoUser(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoProfile));
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn("Sign out warning:", e);
      }
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem(DEMO_STORAGE_KEY);
    }
    setSession(null);
    setUser(null);
    setIsDemoUser(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || "ANALYST",
        session,
        loading,
        isDemoUser,
        signInWithEmail,
        signUpWithEmail,
        signInAsDemo,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
