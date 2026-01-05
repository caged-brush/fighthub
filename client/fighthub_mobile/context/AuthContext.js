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
      if (!token || !id) {
        throw new Error(
          `[Auth] Bad signup params: token=${token}, id=${id}, role=${initialRole}`
        );
      }

      // update state
      setUserToken(token);
      setUserId(id);
      setIsOnBoarded(false);

      // persist
      await safeSetItem("userToken", token);
      await safeSetItem("userId", id);
      await AsyncStorage.setItem("isOnBoarded", "false");

      // persist role if provided
      if (initialRole) {
        await setUserRole(initialRole);
      } else {
        // optional: clear stale role if you want strict behavior
        // await AsyncStorage.removeItem("role");
        // setRole(null);
      }
    } catch (error) {
      console.log("signup error:", error?.message || error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token, id, incomingRole) => {
    setIsLoading(true);
    try {
      if (!token || !id) throw new Error(`[Auth] Bad login params`);

      setUserToken(token);
      setUserId(id);

      await safeSetItem("userToken", token);
      await safeSetItem("userId", id);

      // overwrite stale role every login
      if (incomingRole) {
        await setUserRole(incomingRole);
      } else {
        await AsyncStorage.removeItem("role");
        setRole(null);
      }

      const onBoardingStatus = await AsyncStorage.getItem("isOnBoarded");
      setIsOnBoarded(onBoardingStatus === "true");
    } catch (e) {
      console.log("login error:", e?.message || e);
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
        "isOnBoarded",
        "onboardingStep",
        "role",
      ]);
    } catch (error) {
      console.log("logout error:", error?.message || error);
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      setIsOnBoarded(true);
      await AsyncStorage.setItem("isOnBoarded", "true");
      await AsyncStorage.removeItem("onboardingStep");
      console.log("Onboarding completed and status saved.");
    } catch (error) {
      console.log("Failed to complete onboarding:", error?.message || error);
    }
  };

  const isLoggedIn = async () => {
    setIsLoading(true);
    try {
      const storedToken = await AsyncStorage.getItem("userToken");
      const storedUserId = await AsyncStorage.getItem("userId");
      const onBoardingStatus = await AsyncStorage.getItem("isOnBoarded");
      const storedRole = await AsyncStorage.getItem("role");

      setUserToken(storedToken);
      setUserId(storedUserId);
      setIsOnBoarded(onBoardingStatus === "true");
      setRole(storedRole);
    } catch (error) {
      console.log("isLoggedIn error:", error?.message || error);
    } finally {
      setIsLoading(false);
    }
  };

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
