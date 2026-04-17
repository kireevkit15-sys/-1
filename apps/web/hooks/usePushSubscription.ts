"use client";

import { useState, useCallback, useEffect } from "react";
import { API_BASE } from "@/lib/api/base";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

const VISIT_COUNT_KEY = "razum_visit_count";
const PUSH_DISMISSED_KEY = "razum_push_dismissed";
const PUSH_SUBSCRIBED_KEY = "razum_push_subscribed";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushSubscription() {
  const [shouldPrompt, setShouldPrompt] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Increment visit count
    const count = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || "0", 10) + 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(count));

    // Check if already subscribed or dismissed
    if (localStorage.getItem(PUSH_SUBSCRIBED_KEY) === "true") {
      setIsSubscribed(true);
      return;
    }
    if (localStorage.getItem(PUSH_DISMISSED_KEY) === "true") return;

    // Show prompt after 3rd visit
    if (count >= 3 && "Notification" in window && Notification.permission === "default") {
      setShouldPrompt(true);
    }
  }, []);

  const subscribe = useCallback(async (token?: string | null) => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setShouldPrompt(false);
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const options: PushSubscriptionOptionsInit = {
        userVisibleOnly: true,
      };
      if (VAPID_PUBLIC_KEY) {
        options.applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer;
      }
      const subscription = await registration.pushManager.subscribe(options);

      // Send subscription to backend
      const authToken = token || localStorage.getItem("admin_token") || "";
      const keys = subscription.toJSON().keys || {};
      await fetch(`${API_BASE}/notifications/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        }),
      });

      localStorage.setItem(PUSH_SUBSCRIBED_KEY, "true");
      setIsSubscribed(true);
      setShouldPrompt(false);
      return true;
    } catch {
      setShouldPrompt(false);
      return false;
    }
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(PUSH_DISMISSED_KEY, "true");
    setShouldPrompt(false);
  }, []);

  return { shouldPrompt, isSubscribed, subscribe, dismiss };
}
