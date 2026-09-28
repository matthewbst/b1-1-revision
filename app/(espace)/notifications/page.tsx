"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const SAVED_QCM_KEY = "part66-qcm-en-cours";
const READ_NOTIFICATIONS_KEY =
  "part66-notifications-read";

type NotificationItem = {
  id: string;
  type:
    | "qcm"
    | "result"
    | "revision"
    | "course"
    | "info";
  title: string;
  message: string;
  href: string;
  createdAt: string;
  unread: boolean;
  priority?: "normal" | "important";
};

type Module = {
  id: number;
  name: string;
};

type CourseFile = {
  id: number;
  module_id: number | null;
  title: string;
  created_at: string;
};

type RevisionSheet = {
  id: number;
  module_id: number | null;
  title: string;
  created_at: string;
};

type QcmAttempt = {
  id: number;
  module_id: number;
  score: number;
  total: number;
  percentage: number;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function notificationIcon(
  type: NotificationItem["type"],
) {
  switch (type) {
    case "qcm":
      return "▶";
    case "result":
      return "✓";
    case "revision":
      return "▤";
    case "course":
      return "▥";
    default:
      return "●";
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadNotifications() {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (!session?.user) {
        setConnected(false);
        setNotifications([]);
        setLoading(false);
        return;
      }

      setConnected(true);

      const [
        modulesResult,
        coursesResult,
        revisionsResult,
        attemptsResult,
      ] = await Promise.all([
        supabase
          .from("modules")
          .select("id,name")
          .order("id", {
            ascending: true,
          }),

        supabase
          .from("course_files")
          .select(
            "id,module_id,title,created_at",
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(1),

        supabase
          .from("revision_sheets")
          .select(
            "id,module_id,title,created_at",
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(1),

        supabase
          .from("qcm_attempts")
          .select(
            "id,module_id,score,total,percentage,created_at",
          )
          .eq("user_id", session.user.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(6),
      ]);

      const modules =
        (modulesResult.data ?? []) as Module[];

      const latestCourse =
        ((coursesResult.data ??
          []) as CourseFile[])[0] ?? null;

      const latestRevision =
        ((revisionsResult.data ??
          []) as RevisionSheet[])[0] ?? null;

      const attempts =
        (attemptsResult.data ??
          []) as QcmAttempt[];

      const moduleMap = new Map(
        modules.map((module) => [
          module.id,
          module.name,
        ]),
      );

      const generated: NotificationItem[] =
        [];

      const savedQcm =
        localStorage.getItem(SAVED_QCM_KEY);

      if (savedQcm) {
        try {
          const parsed = JSON.parse(
            savedQcm,
          );

          if (
            parsed &&
            Array.isArray(
              parsed.questions,
            ) &&
            parsed.questions.length > 0
          ) {
            const moduleName =
              parsed.moduleName ||
              "QCM en cours";

            generated.push({
              id: "saved-qcm",
              type: "qcm",
              title: "QCM en cours",
              message: `Tu as un QCM ${
                moduleName
              } sauvegardé. Tu peux reprendre là où tu t'es arrêté.`,
              href: "/qcm",
              createdAt:
                parsed.savedAt ||
                new Date().toISOString(),
              unread: true,
              priority: "important",
            });
          }
        } catch {
          localStorage.removeItem(
            SAVED_QCM_KEY,
          );
        }
      }

      const lastAttempt = attempts[0] ?? null;

      if (lastAttempt) {
        const moduleName =
          moduleMap.get(
            lastAttempt.module_id,
          ) ||
          `Module ${lastAttempt.module_id}`;

        generated.push({
          id: `result-${lastAttempt.id}`,
          type: "result",
          title: "Dernier résultat QCM",
          message: `${moduleName} : ${lastAttempt.percentage}% (${lastAttempt.score}/${lastAttempt.total}).`,
          href: "/progression",
          createdAt: lastAttempt.created_at,
          unread: true,
          priority:
            lastAttempt.percentage < 60
              ? "important"
              : "normal",
        });

        if (
          lastAttempt.percentage < 60
        ) {
          generated.push({
            id: `review-${lastAttempt.id}`,
            type: "info",
            title: "Révision recommandée",
            message: `Ton dernier QCM sur ${moduleName} est inférieur à 60 %. Une révision du module peut être utile avant de refaire un QCM.`,
            href: `/cours/${lastAttempt.module_id}`,
            createdAt: lastAttempt.created_at,
            unread: true,
            priority: "important",
          });
        }
      }

      if (latestCourse) {
        const moduleName =
          latestCourse.module_id
            ? moduleMap.get(
                latestCourse.module_id,
              )
            : null;

        generated.push({
          id: `course-${latestCourse.id}`,
          type: "course",
          title: "Dernier cours ajouté",
          message: moduleName
            ? `${latestCourse.title} — ${moduleName}`
            : latestCourse.title,
          href: latestCourse.module_id
            ? `/cours/${latestCourse.module_id}`
            : "/cours",
          createdAt:
            latestCourse.created_at,
          unread: true,
        });
      }

      if (latestRevision) {
        const moduleName =
          latestRevision.module_id
            ? moduleMap.get(
                latestRevision.module_id,
              )
            : null;

        generated.push({
          id: `revision-${latestRevision.id}`,
          type: "revision",
          title: "Dernière fiche disponible",
          message: moduleName
            ? `${latestRevision.title} — ${moduleName}`
            : latestRevision.title,
          href: "/fiches",
          createdAt:
            latestRevision.created_at,
          unread: true,
        });
      }

      generated.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      );

      const readRaw =
        localStorage.getItem(
          READ_NOTIFICATIONS_KEY,
        );

      let readIds: string[] = [];

      if (readRaw) {
        try {
          const parsed = JSON.parse(
            readRaw,
          );

          if (Array.isArray(parsed)) {
            readIds = parsed.filter(
              (value): value is string =>
                typeof value === "string",
            );
          }
        } catch {
          readIds = [];
        }
      }

      const finalNotifications =
        generated.map((notification) => ({
          ...notification,
          unread:
            !readIds.includes(
              notification.id,
            ),
        }));

      setNotifications(
        finalNotifications,
      );
      setLoading(false);
    }

    loadNotifications();

    return () => {
      mounted = false;
    };
  }, []);

  function saveReadIds(
    ids: string[],
  ) {
    localStorage.setItem(
      READ_NOTIFICATIONS_KEY,
      JSON.stringify(ids),
    );
  }

  function markAsRead(id: string) {
    const raw =
      localStorage.getItem(
        READ_NOTIFICATIONS_KEY,
      );

    let ids: string[] = [];

    if (raw) {
      try {
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed)) {
          ids = parsed.filter(
            (value): value is string =>
              typeof value === "string",
          );
        }
      } catch {
        ids = [];
      }
    }

    if (!ids.includes(id)) {
      ids.push(id);
    }

    saveReadIds(ids);

    setNotifications((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              unread: false,
            }
          : item,
      ),
    );
  }

  function markAllAsRead() {
    const ids = notifications.map(
      (item) => item.id,
    );

    saveReadIds(ids);

    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        unread: false,
      })),
    );
  }

  function clearReadHistory() {
    localStorage.removeItem(
      READ_NOTIFICATIONS_KEY,
    );

    window.location.reload();
  }

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (item) => item.unread,
      ).length,
    [notifications],
  );

  if (!connected && !loading) {
    return (
      <main className="min-h-screen px-4 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 text-xs font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
            Centre de notifications
          </div>

          <div className="rounded-[32px] border border-white/10 bg-[#202d3d] p-8 shadow-2xl">
            <div className="mb-3 text-2xl font-black">
              Connexion requise
            </div>

            <p className="mb-6 max-w-xl text-sm leading-7 text-slate-400">
              Connecte-toi pour consulter
              tes notifications, tes résultats
              récents et les QCM sauvegardés.
            </p>

            <Link
              href="/connexion?redirect=/notifications"
              className="inline-flex items-center rounded-2xl border border-[#a9c9ff]/30 bg-[#a9c9ff]/10 px-5 py-3 text-sm font-black text-[#c5dcff] transition hover:bg-[#a9c9ff]/15"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="relative mb-8 overflow-hidden rounded-[36px] border border-white/10 bg-[#202d3d] p-6 shadow-2xl sm:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-[#6ea8ff]/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/[0.03] blur-3xl" />
          </div>

          <div className="relative">
            <div className="mb-3 text-xs font-black uppercase tracking-[0.32em] text-[#a9c9ff]">
              CENTRE DE NOTIFICATIONS
            </div>

            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                  Notifications
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                  Retrouve ici les informations
                  importantes liées à ta
                  progression, tes QCM et les
                  nouveaux contenus.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Non lues
                  </div>

                  <div className="mt-1 text-2xl font-black text-[#c5dcff]">
                    {unreadCount}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
              Ta boîte de réception
            </div>

            <div className="mt-1 text-sm text-slate-400">
              {notifications.length === 0
                ? "Aucune notification pour le moment."
                : `${notifications.length} notification${
                    notifications.length > 1
                      ? "s"
                      : ""
                  }`}
            </div>
          </div>

          {notifications.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Tout marquer comme lu
                </button>
              )}

              <button
                type="button"
                onClick={clearReadHistory}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs font-black text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-300"
              >
                Réinitialiser les lectures
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="rounded-[30px] border border-white/10 bg-[#202d3d] p-8">
            <div className="animate-pulse text-sm font-bold text-slate-500">
              Chargement des notifications…
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-[32px] border border-white/10 bg-[#202d3d] p-8 sm:p-10">
            <div className="mb-4 text-4xl">
              ✓
            </div>

            <h2 className="text-2xl font-black">
              Tout est calme
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">
              Tes nouvelles activités et
              informations importantes
              apparaîtront automatiquement ici.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/qcm"
                className="rounded-2xl border border-[#a9c9ff]/30 bg-[#a9c9ff]/10 px-5 py-3 text-sm font-black text-[#c5dcff] transition hover:bg-[#a9c9ff]/15"
              >
                Faire un QCM
              </Link>

              <Link
                href="/cours"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                Voir les cours
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {notifications.map(
              (notification) => (
                <div
                  key={notification.id}
                  className={`rounded-[30px] border p-5 transition sm:p-6 ${
                    notification.unread
                      ? notification.priority ===
                        "important"
                        ? "border-[#a9c9ff]/25 bg-[#28384b]"
                        : "border-white/10 bg-[#202d3d]"
                      : "border-white/[0.06] bg-[#1c2837] opacity-80"
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-lg font-black ${
                        notification.unread
                          ? "border-[#a9c9ff]/20 bg-[#a9c9ff]/10 text-[#c5dcff]"
                          : "border-white/10 bg-white/[0.04] text-slate-500"
                      }`}
                    >
                      {notificationIcon(
                        notification.type,
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-black text-white sm:text-lg">
                              {
                                notification.title
                              }
                            </h2>

                            {notification.unread && (
                              <span className="rounded-full border border-[#a9c9ff]/20 bg-[#a9c9ff]/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-[#c5dcff]">
                                Nouveau
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-sm leading-7 text-slate-400">
                            {
                              notification.message
                            }
                          </p>
                        </div>

                        <div className="shrink-0 text-xs font-bold text-slate-600">
                          {formatDate(
                            notification.createdAt,
                          )}
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <Link
                          href={notification.href}
                          onClick={() =>
                            markAsRead(
                              notification.id,
                            )
                          }
                          className="rounded-xl border border-[#a9c9ff]/20 bg-[#a9c9ff]/10 px-4 py-2.5 text-xs font-black text-[#c5dcff] transition hover:bg-[#a9c9ff]/15"
                        >
                          Ouvrir
                        </Link>

                        {notification.unread && (
                          <button
                            type="button"
                            onClick={() =>
                              markAsRead(
                                notification.id,
                              )
                            }
                            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-black text-slate-400 transition hover:bg-white/[0.07] hover:text-white"
                          >
                            Marquer comme lue
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        )}

        <div className="mt-8 rounded-[30px] border border-white/[0.08] bg-[#1b2736] p-5 sm:p-6">
          <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-600">
            Fonctionnement
          </div>

          <p className="mt-2 text-sm leading-7 text-slate-500">
            Les notifications sont générées
            à partir de ton activité sur la
            plateforme : QCM sauvegardé,
            résultats récents et nouveaux
            contenus disponibles.
          </p>
        </div>
      </div>
    </main>
  );
}