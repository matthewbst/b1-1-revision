"use client";

import { useState } from "react";

export default function ShareSiteButton({
  large = false,
}: {
  large?: boolean;
}) {
  const [message, setMessage] =
    useState("");

  async function handleShare() {
    const url =
      "https://b1-1-revision.vercel.app";

    const text =
      "Je révise mon Part-66 B1.1 ici ✈️";

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.share
      ) {
        await navigator.share({
          title:
            "Part-66 B1.1",
          text,
          url,
        });

        setMessage(
          "Partage ouvert ✓",
        );

        return;
      }

      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard
      ) {
        await navigator.clipboard.writeText(
          `${text}\n${url}`,
        );

        setMessage(
          "Lien copié ✓",
        );

        return;
      }

      setMessage(
        "Copie ce lien : " +
          url,
      );
    } catch {
      setMessage("");
    }

    setTimeout(() => {
      setMessage("");
    }, 2500);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleShare}
        className={
          large
            ? "flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6ea8ff] px-6 py-4 text-sm font-black text-[#122033] transition hover:bg-[#83b5ff]"
            : "flex items-center gap-2 rounded-xl bg-[#6ea8ff] px-4 py-2.5 text-xs font-black text-[#122033] transition hover:bg-[#83b5ff]"
        }
      >
        <svg
          width={large ? 18 : 16}
          height={large ? 18 : 16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle
            cx="18"
            cy="5"
            r="3"
          />

          <circle
            cx="6"
            cy="12"
            r="3"
          />

          <circle
            cx="18"
            cy="19"
            r="3"
          />

          <path d="m8.6 13.5 6.8 4" />
          <path d="m15.4 6.5-6.8 4" />
        </svg>

        <span>
          {large
            ? "Inviter un camarade"
            : "Inviter"}
        </span>
      </button>

      {message && (
        <div className="text-[10px] font-bold text-emerald-300">
          {message}
        </div>
      )}
    </div>
  );
}