// AuthContext.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useEffect, useState } from "react";

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
  const [isLoading, setIsLoading] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isOnBoarded, setIsOnBoarded] = useState(false);
  const [role, setRole] = useState(null);
  const onboardingKeyFor = (r) => `isOnBoarded_${r}`;

  // ✅ set role safely
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

      // state
      setUserToken(token);
      setUserId(id);
      setIsOnBoarded(false);
      setRole(initialRole);

      // persist
      await safeSetItem("userToken", token);
      await safeSetItem("userId", id);
      await safeSetItem("role", initialRole);
      await AsyncStorage.setItem(onboardingKeyFor(initialRole), "false");
    } catch (e) {
      console.log("signup error:", e?.message || e);
      throw e; // optional, but consistent with login()
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

      // ✅ cache the server truth locally so app restart doesn't regress
      await AsyncStorage.setItem(
        onboardingKeyFor(incomingRole),
        incomingIsOnBoarded ? "true" : "false"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
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

      console.log("Onboarding completed for role:", role);
    } catch (error) {
      console.log("Failed to complete onboarding:", error?.message || error);
    }
  };

  const isLoggedIn = async () => {
    setIsLoading(true);
    try {
      const storedToken = await AsyncStorage.getItem("userToken");
      const storedUserId = await AsyncStorage.getItem("userId");
      const storedRole = await AsyncStorage.getItem("role");

      let onboarded = false;
      if (storedToken && storedUserId && storedRole) {
        onboarded = await getOnboardingStatusForRole(storedRole);
      }

      // set onboarding BEFORE token triggers navigation
      setIsOnBoarded(onboarded);

      setUserToken(storedToken);
      setUserId(storedUserId);
      setRole(storedRole);
    } catch (e) {
      console.log("isLoggedIn error:", e?.message || e);
    } finally {
      setIsLoading(false);
    }
  };

  async function getOnboardingStatusForRole(r) {
    const key = onboardingKeyFor(r);
    const perRole = await AsyncStorage.getItem(key);
    const legacy = await AsyncStorage.getItem("isOnBoarded");

    console.log("[OnboardingCheck]", { role: r, key, perRole, legacy });

    if (perRole === "true" || perRole === "false") return perRole === "true";

    if (legacy === "true") {
      await AsyncStorage.setItem(key, "true");
      await AsyncStorage.removeItem("isOnBoarded");
      return true;
    }

    return false;
  }

  useEffect(() => {
    isLoggedIn();
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
