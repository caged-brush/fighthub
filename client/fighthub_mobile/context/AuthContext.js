import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useState, useEffect } from "react";
import React from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [userToken, setUserToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isOnBoarded, setIsOnBoarded] = useState(false);

  const signup = async (token, userId) => {
    setIsLoading(true);
    try {
      setUserToken(token);
      setUserId(userId);
      await AsyncStorage.setItem("userToken", token);
      await AsyncStorage.setItem("userId", userId);
      await AsyncStorage.setItem("isOnBoarded", "false"); // Ensure it's set to false initially
      setIsOnBoarded(false);
      setIsLoading(false);
    } catch (error) {
      console.log(error);
      setIsLoading(false);
    }
  };

  const login = async (token, userId) => {
    setIsLoading(true);
    try {
      setUserToken(token);
      setUserId(userId);
      await AsyncStorage.setItem("userToken", token);
      await AsyncStorage.setItem("userId", userId);

      // Check if onboarding status exists, if not, default to false
      const onBoardingStatus = await AsyncStorage.getItem("isOnBoarded");
      if (onBoardingStatus === null) {
        await AsyncStorage.setItem("isOnBoarded", "false");
        setIsOnBoarded(false);
      } else {
        setIsOnBoarded(onBoardingStatus === "true");
      }

      setIsLoading(false);
    } catch (error) {
      console.log(error);
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      setUserToken(null);
      setUserId(null);
      AsyncStorage.removeItem("userToken");
      AsyncStorage.removeItem("userId");
      setIsOnBoarded(false);
      setIsLoading(false);
    } catch (error) {
      console.log(error);
    }
  };

  const completeOnboarding = async () => {
    try {
      setIsOnBoarded(true);
      await AsyncStorage.setItem("isOnBoarded", "true");
      await AsyncStorage.removeItem("onboardingStep");
      console.log("Onboarding completed and status saved.");
    } catch (error) {
      console.log("Failed to complete onboarding:", error);
    }
  };

  const checkOnBoardingStatus = async () => {
    try {
      const onBoardingStatus = await AsyncStorage.getItem("isOnBoarded");

      if (onBoardingStatus === "true") {
        setIsOnBoarded(true);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const isLoggedIn = async () => {
    try {
      setIsLoading(true);
      const userToken = await AsyncStorage.getItem("userToken");
      const storedUserId = await AsyncStorage.getItem("userId");
      const onBoardingStatus = await AsyncStorage.getItem("isOnBoarded");
      const savedStep = await AsyncStorage.getItem("onboardingStep");

      console.log("Retrieved userId:", storedUserId);
      console.log("Onboarding Status:", onBoardingStatus);
      console.log("Saved Onboarding Step:", savedStep);

      setUserToken(userToken);
      setUserId(storedUserId);

      // Ensure the onboarding status is properly set
      if (onBoardingStatus === "true") {
        setIsOnBoarded(true);
      } else {
        setIsOnBoarded(false);
      }

      setIsLoading(false);
    } catch (error) {
      console.log("isLoggedIn error:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    isLoggedIn();
    checkOnBoardingStatus();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        signup,
        login,
        logout,
        isLoading,
        userToken,
        completeOnboarding,
        checkOnBoardingStatus,
        isOnBoarded,
        userId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
