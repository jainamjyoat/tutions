"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export default function AutoLogout() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        signOut({ callbackUrl: "/login?reason=idle" });
      }, IDLE_TIMEOUT_MS);
    };

    const activityEvents: (keyof WindowEventMap)[] = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ];

    resetTimer();

    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [status]);

  return null;
}