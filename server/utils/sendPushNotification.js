// utils/sendPushNotification.js
import { Expo } from "expo-server-sdk";

const expo = new Expo();

export async function sendPushNotification(
  expoPushToken,
  title,
  body,
  data = {},
) {
  if (!expoPushToken) return;

  if (!Expo.isExpoPushToken(expoPushToken)) {
    console.log("[push] invalid Expo token:", expoPushToken);
    return;
  }

  const message = {
    to: expoPushToken,
    sound: "default",
    title,
    body,
    data,
  };

  try {
    const chunks = expo.chunkPushNotifications([message]);

    for (const chunk of chunks) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      console.log("[push] tickets:", tickets);
    }
  } catch (error) {
    console.error("[push] send error:", error?.message || error);
  }
}
