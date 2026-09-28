"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(
    "fr-FR",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function getUserName(profile: Profile) {
  if (
    profile.display_name &&
    profile.display_name.trim()
  ) {
    return profile.display_name.trim();
  }

  if (
    profile.email &&
    profile.email.includes("@")
  ) {
    return profile.email
      .split("@")[0]
      .replace(/[._-]+/g, " ");
  }

  return "Utilisateur";
}

export default function AdminUsersPanel() {
  const [profiles, setProfiles] = useState<
    Profile[]
  >([]);

  const [totalUsers, setTotalUsers] =
    useState(0);

  const [onlineUsers, setOnlineUsers] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadUsers = useCallback(
    async () => {
      setError("");

      const [
        profilesResult,
        countResult,
        presenceResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id,email,display_name,created_at",
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(8),

        supabase
          .from("profiles")
          .select("id", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("user_presence")
          .select("user_id")
          .gte(
            "last_seen_at",
            new Date(
              Date.now() -
                5 * 60 * 1000,
            ).toISOString(),
          ),
      ]);

      if (
        profilesResult.error ||
        countResult.error ||
        presenceResult.error
      ) {
        setError(
          profilesResult.error?.message ||
            countResult.error?.message ||
            presenceResult.error?.message ||
            "Impossible de charger les utilisateurs.",
        );
      }

      setProfiles(
        profilesResult.data || [],
      );

      setTotalUsers(
        countResult.count || 0,
      );

      const uniqueOnlineUsers =
        new Set(
          (
            presenceResult.data ||
            []
          ).map(
            (item) => item.user_id,
          ),
        );

      setOnlineUsers(
        uniqueOnlineUsers.size,
      );

      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    loadUsers();

    const interval =
      setInterval(() => {
        loadUsers();
      }, 30_000);

    return () => {
      clearInterval(interval);
    };
  }, [loadUsers]);

  return (
    <section className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      {/* =====================================================
          COMPTEURS
      ===================================================== */}

      <div className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
        <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
          Utilisateurs
        </div>

        <h2 className="mt-2 text-2xl font-black text-white">
          Activité étudiants
        </h2>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          {/* TOTAL */}

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Total inscrits
                </div>

                <div className="mt-2 text-4xl font-black text-white">
                  {loading
                    ? "—"
                    : totalUsers}
                </div>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-xl">
                👥
              </div>
            </div>
          </div>

          {/* CONNECTÉS */}

          <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.035] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" />

                  Actifs maintenant
                </div>

                <div className="mt-2 text-4xl font-black text-emerald-300">
                  {loading
                    ? "—"
                    : onlineUsers}
                </div>

                <div className="mt-1 text-[10px] text-slate-500">
                  actifs durant les 5 dernières
                  minutes
                </div>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-300/10 text-xl">
                ●
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadUsers}
          className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
        >
          Actualiser maintenant
        </button>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-xs leading-5 text-red-200">
            {error}
          </div>
        )}
      </div>

      {/* =====================================================
          NOUVEAUX INSCRITS
      ===================================================== */}

      <div className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              Nouveaux comptes
            </div>

            <h2 className="mt-2 text-2xl font-black text-white">
              Derniers inscrits
            </h2>
          </div>

          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">
            {totalUsers} total
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {loading ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-sm text-slate-500">
              Chargement des utilisateurs…
            </div>
          ) : profiles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
              <div className="text-xl">
                👤
              </div>

              <div className="mt-2 text-sm font-black text-white">
                Aucun inscrit trouvé
              </div>
            </div>
          ) : (
            profiles.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#a9c9ff]/10 text-sm font-black text-[#c5dcff]">
                  {getUserName(
                    profile,
                  )
                    .slice(0, 1)
                    .toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black text-white">
                    {getUserName(
                      profile,
                    )}
                  </div>

                  <div className="mt-0.5 truncate text-[10px] text-slate-500">
                    {profile.email ||
                      "Email non disponible"}
                  </div>
                </div>

                <div className="hidden shrink-0 text-right sm:block">
                  <div className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-600">
                    Inscrit le
                  </div>

                  <div className="mt-1 text-[10px] font-bold text-slate-400">
                    {formatDate(
                      profile.created_at,
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <Link
          href="/admin"
          className="mt-5 inline-flex text-xs font-black text-slate-500 transition hover:text-white"
        >
          Actualiser le centre admin →
        </Link>
      </div>
    </section>
  );
}