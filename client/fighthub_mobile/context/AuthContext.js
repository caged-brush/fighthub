// AuthContext.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { apiFetch } from "../lib/apiFetch";

export const AuthContext = createContext();

const mustString = (key, v) => {
  if (v === null || v === undefined) {
    throw new Error(`[AsyncStorage] ${key} is ${v}`);
  }
  return String(v);
};

const safeSetItem = async (key, v) => {
  await AsyncStorage.setItem(key, mustString(key, v));
};

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isOnBoarded, setIsOnBoarded] = useState(false);
  const [role, setRole] = useState(null);

  const onboardingKeyFor = (r) => `isOnBoarded_${r}`;

  const getBackendOnboardingValue = (userRole, user) => {
    if (userRole === "fighter") return !!user.fighter_onboarded;
    if (userRole === "scout") return !!user.scout_onboarded;
    if (userRole === "coach") return !!user.coach_onboarded;
    return false;
  };

  const setUserRole = async (newRole) => {
    if (!newRole) {
      throw new Error(`[Auth] role is invalid: ${newRole}`);
    }

    setRole(newRole);
    await safeSetItem("role", newRole);
  };

  const signup = async (token, id, initialRole) => {
    setIsLoading(true);
    try {
      if (!token || !id) throw new Error("Missing token/id on signup");
      if (!initialRole) throw new Error("Missing role on signup");

      setUserToken(token);
      setUserId(id);
      setIsOnBoarded(false);
      setRole(initialRole);

      await safeSetItem("userToken", token);
      await safeSetItem("userId", id);
      await safeSetItem("role", initialRole);
      await AsyncStorage.setItem(onboardingKeyFor(initialRole), "false");
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token, id, incomingRole, incomingIsOnBoarded) => {
    setIsLoading(true);
    try {
      if (!token || !id) throw new Error("Missing token/id on login");
      if (!incomingRole) throw new Error("Missing role on login");

      setRole(incomingRole);
      setIsOnBoarded(!!incomingIsOnBoarded);
      setUserToken(token);
      setUserId(id);

      await safeSetItem("userToken", token);
      await safeSetItem("userId", id);
      await safeSetItem("role", incomingRole);

      await AsyncStorage.setItem(
        onboardingKeyFor(incomingRole),
        incomingIsOnBoarded ? "true" : "false",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();

      setUserToken(null);
      setUserId(null);
      setIsOnBoarded(false);
      setRole(null);

      await AsyncStorage.multiRemove([
        "userToken",
        "userId",
        "role",
        "onboardingStep",
        "isOnBoarded_fighter",
        "isOnBoarded_scout",
        "isOnBoarded_coach",
      ]);
    } catch (error) {
      console.log("logout error:", error?.message || error);
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      if (!role) throw new Error("No role set");

      setIsOnBoarded(true);
      await AsyncStorage.setItem(onboardingKeyFor(role), "true");
      await AsyncStorage.removeItem("onboardingStep");
    } catch (error) {
      console.log("Failed to complete onboarding:", error?.message || error);
    }
  };

  const hydrateFromSession = async (session) => {
    if (!session?.access_token) {
      setUserToken(null);
      setUserId(null);
      setRole(null);
      setIsOnBoarded(false);
      setIsLoading(false);
      return;
    }

    const token = session.access_token;

    try {
      const me = await apiFetch("/auth/me", { token });
      const user = me?.user;

      if (!user?.id || !user?.role) {
        throw new Error("Invalid /auth/me response");
      }

      const resolvedRole = user.role;
      const onboarded = getBackendOnboardingValue(resolvedRole, user);

      setUserToken(token);
      setUserId(user.id);
      setRole(resolvedRole);
      setIsOnBoarded(onboarded);

      await safeSetItem("userToken", token);
      await safeSetItem("userId", user.id);
      await safeSetItem("role", resolvedRole);
      await AsyncStorage.setItem(
        onboardingKeyFor(resolvedRole),
        onboarded ? "true" : "false",
      );
    } catch (e) {
      console.log("hydrateFromSession error:", e?.message || e);

      // do NOT instantly nuke everything on a transient bootstrap failure
      // keep session token if Supabase has one
      setUserToken(token);
    } finally {
      setIsLoading(false);
    }
  };

  async function getOnboardingStatusForRole(r) {
    const key = onboardingKeyFor(r);
    const perRole = await AsyncStorage.getItem(key);
    const legacy = await AsyncStorage.getItem("isOnBoarded");

    if (perRole === "true" || perRole === "false") {
      return perRole === "true";
    }

    if (legacy === "true") {
      await AsyncStorage.setItem(key, "true");
      await AsyncStorage.removeItem("isOnBoarded");
      return true;
    }

    return false;
  }

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;
      await hydrateFromSession(session);
    };

    boot();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AUTH EVENT]", event);

      if (!mounted) return;

      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "INITIAL_SESSION"
      ) {
        await hydrateFromSession(session);
      }

      if (event === "SIGNED_OUT") {
        setUserToken(null);
        setUserId(null);
        setRole(null);
        setIsOnBoarded(false);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        signup,
        login,
        logout,
        isLoading,
        userToken,
        userId,
        isOnBoarded,
        role,
        setUserRole,
        completeOnboarding,
        getOnboardingStatusForRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
