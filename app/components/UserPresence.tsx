"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function UserPresence() {
  useEffect(() => {
    let mounted = true;
    let interval: ReturnType<typeof setInterval> | null =
      null;

    async function updatePresence() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted || !session?.user) {
        return;
      }

      await supabase
        .from("user_presence")
        .upsert(
          {
            user_id: session.user.id,
            last_seen_at:
              new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          },
        );
    }

    updatePresence();

    interval = setInterval(() => {
      updatePresence();
    }, 60_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updatePresence();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          updatePresence();
        }

        if (event === "SIGNED_OUT") {
          interval &&
            clearInterval(interval);
          interval = null;
        }
      },
    );

    return () => {
      mounted = false;

      if (interval) {
        clearInterval(interval);
      }

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      subscription.unsubscribe();
    };
  }, []);

  return null;
}