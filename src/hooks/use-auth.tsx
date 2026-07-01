import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "pharmacist" | "cashier" | "store_manager" | "receptionist";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, loading };
}

export function useUserRoles(userId?: string) {
  const [roles, setRoles] = useState<AppRole[]>([]);
  useEffect(() => {
    if (!userId) return;
    supabase.from("user_roles").select("role").eq("user_id", userId).then(({ data }) => {
      setRoles((data ?? []).map((r) => r.role as AppRole));
    });
  }, [userId]);
  return roles;
}
