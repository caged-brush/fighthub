import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export const signInWithGoogle = async () => {
  const redirectTo = "kavyx://auth/callback";

  console.log("Google redirectTo:", redirectTo);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error("Google did not return an authentication URL.");
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === "cancel" || result.type === "dismiss") {
    return null;
  }

  if (result.type !== "success") {
    throw new Error("Google authentication did not complete.");
  }

  const url = new URL(result.url);

  const params = new URLSearchParams(
    url.hash.startsWith("#") ? url.hash.substring(1) : url.search,
  );

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) {
    console.log("OAuth callback:", result.url);

    throw new Error(
      "Google login completed but no Supabase session was returned.",
    );
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

  if (sessionError) {
    throw sessionError;
  }

  return sessionData;
};
