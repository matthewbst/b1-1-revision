"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

const ADMIN_ID =
  "dcbeb72a-4f4a-4169-beab-53da1b3babfa";

const ONLINE_WINDOW_MS =
  5 * 60 * 1000;

type Module = {
  id: number;
  name: string;
  description: string | null;
};

type Question = {
  id: number;
  module_id: number;
  question: string;
  status: string;
  created_at: string;
};

type Course = {
  id: number;
  module_id: number | null;
  title: string;
  created_at: string;
};

type Sheet = {
  id: number;
  module_id: number | null;
  title: string;
  created_at: string;
};

type Attempt = {
  id: number;
  user_id: string;
  module_id: number;
  score: number;
  total: number;
  percentage: number;
  created_at: string;
};

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
};

type Presence = {
  user_id: string;
  last_seen_at: string;
};

function moduleNumber(name: string) {
  return (
    name.match(
      /^Module\s+(\d+)/,
    )?.[1] || ""
  );
}

function moduleTitle(name: string) {
  return name.replace(
    /^Module\s+\d+\s+—\s*/,
    "",
  );
}

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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(
    "fr-FR",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function profileName(
  profile: Profile,
) {
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

function initials(
  profile: Profile,
) {
  const name = profileName(profile);

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function AdminPage() {
  const [modules, setModules] =
    useState<Module[]>([]);

  const [questions, setQuestions] =
    useState<Question[]>([]);

  const [courses, setCourses] =
    useState<Course[]>([]);

  const [sheets, setSheets] =
    useState<Sheet[]>([]);

  const [attempts, setAttempts] =
    useState<Attempt[]>([]);

  const [profiles, setProfiles] =
    useState<Profile[]>([]);

  const [onlineUserIds, setOnlineUserIds] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [usersLoading, setUsersLoading] =
    useState(true);

  const [authorized, setAuthorized] =
    useState(false);

  const [error, setError] =
    useState("");

  const [usersError, setUsersError] =
    useState("");

  const [userSearch, setUserSearch] =
    useState("");

  const [
    showOnlyOnline,
    setShowOnlyOnline,
  ] = useState(false);

  async function loadUsers() {
    setUsersLoading(true);
    setUsersError("");

    const onlineSince =
      new Date(
        Date.now() -
          ONLINE_WINDOW_MS,
      ).toISOString();

    const [
      profilesResult,
      presenceResult,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id,email,display_name,created_at",
        )
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("user_presence")
        .select(
          "user_id,last_seen_at",
        )
        .gte(
          "last_seen_at",
          onlineSince,
        ),
    ]);

    if (profilesResult.error) {
      setUsersError(
        profilesResult.error.message,
      );
    }

    if (presenceResult.error) {
      setUsersError(
        presenceResult.error.message,
      );
    }

    setProfiles(
      profilesResult.data || [],
    );

    const onlineIds = Array.from(
      new Set(
        (
          presenceResult.data ||
          []
        ).map(
          (item) => item.user_id,
        ),
      ),
    );

    setOnlineUserIds(
      onlineIds,
    );

    setUsersLoading(false);
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      if (!user) {
        window.location.href =
          "/connexion";
        return;
      }

      if (user.id !== ADMIN_ID) {
        window.location.href = "/";
        return;
      }

      setAuthorized(true);

      const [
        modulesResult,
        questionsResult,
        coursesResult,
        sheetsResult,
        attemptsResult,
      ] = await Promise.all([
        supabase
          .from("modules")
          .select(
            "id,name,description",
          )
          .order("id", {
            ascending: true,
          }),

        supabase
          .from("questions")
          .select(
            "id,module_id,question,status,created_at",
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(2000),

        supabase
          .from("course_files")
          .select(
            "id,module_id,title,created_at",
          )
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("revision_sheets")
          .select(
            "id,module_id,title,created_at",
          )
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("qcm_attempts")
          .select(
            "id,user_id,module_id,score,total,percentage,created_at",
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(2000),
      ]);

      if (modulesResult.error) {
        setError(
          modulesResult.error.message,
        );
      } else if (questionsResult.error) {
        setError(
          questionsResult.error.message,
        );
      } else if (coursesResult.error) {
        setError(
          coursesResult.error.message,
        );
      } else if (sheetsResult.error) {
        setError(
          sheetsResult.error.message,
        );
      } else if (attemptsResult.error) {
        setError(
          attemptsResult.error.message,
        );
      }

      if (!mounted) {
        return;
      }

      setModules(
        modulesResult.data || [],
      );

      setQuestions(
        questionsResult.data || [],
      );

      setCourses(
        coursesResult.data || [],
      );

      setSheets(
        sheetsResult.data || [],
      );

      setAttempts(
        attemptsResult.data || [],
      );

      setLoading(false);
    }

    load();
    loadUsers();

    const usersInterval =
      setInterval(() => {
        loadUsers();
      }, 30_000);

    return () => {
      mounted = false;
      clearInterval(usersInterval);
    };
  }, []);

  const approvedQuestions =
    questions.filter(
      (question) =>
        question.status ===
        "approved",
    ).length;

  const draftQuestions =
    questions.filter(
      (question) =>
        question.status === "draft",
    ).length;

  const rejectedQuestions =
    questions.filter(
      (question) =>
        question.status ===
        "rejected",
    ).length;

  const average = useMemo(() => {
    if (attempts.length === 0) {
      return 0;
    }

    return Math.round(
      attempts.reduce(
        (sum, attempt) =>
          sum + attempt.percentage,
        0,
      ) / attempts.length,
    );
  }, [attempts]);

  const bestScore = useMemo(() => {
    if (attempts.length === 0) {
      return 0;
    }

    return Math.max(
      ...attempts.map(
        (attempt) =>
          attempt.percentage,
      ),
    );
  }, [attempts]);

  const moduleStats = useMemo(() => {
    return modules.map((module) => {
      const moduleQuestions =
        questions.filter(
          (question) =>
            question.module_id ===
            module.id,
        );

      const moduleCourses =
        courses.filter(
          (course) =>
            course.module_id ===
            module.id,
        );

      const moduleSheets =
        sheets.filter(
          (sheet) =>
            sheet.module_id ===
            module.id,
        );

      const moduleAttempts =
        attempts.filter(
          (attempt) =>
            attempt.module_id ===
            module.id,
        );

      const moduleAverage =
        moduleAttempts.length > 0
          ? Math.round(
              moduleAttempts.reduce(
                (sum, attempt) =>
                  sum +
                  attempt.percentage,
                0,
              ) /
                moduleAttempts.length,
            )
          : 0;

      const moduleDrafts =
        moduleQuestions.filter(
          (question) =>
            question.status ===
            "draft",
        ).length;

      return {
        module,
        questions:
          moduleQuestions.length,
        drafts:
          moduleDrafts,
        courses:
          moduleCourses.length,
        sheets:
          moduleSheets.length,
        attempts:
          moduleAttempts.length,
        average:
          moduleAverage,
      };
    });
  }, [
    modules,
    questions,
    courses,
    sheets,
    attempts,
  ]);

  const recentQuestions =
    questions.slice(0, 7);

  const recentCourses =
    courses.slice(0, 6);

  const modulesWithDrafts =
    moduleStats.filter(
      (item) => item.drafts > 0,
    ).length;

  const moduleMap = useMemo(
    () =>
      new Map(
        modules.map((module) => [
          module.id,
          module,
        ]),
      ),
    [modules],
  );

  const profileMap = useMemo(
    () =>
      new Map(
        profiles.map((profile) => [
          profile.id,
          profile,
        ]),
      ),
    [profiles],
  );

  const isOnline = (
    userId: string,
  ) =>
    onlineUserIds.includes(
      userId,
    );

  const newUsersLast7Days =
    useMemo(() => {
      const since =
        Date.now() -
        7 *
          24 *
          60 *
          60 *
          1000;

      return profiles.filter(
        (profile) =>
          new Date(
            profile.created_at,
          ).getTime() >= since,
      ).length;
    }, [profiles]);

  const qcmLast7Days =
    useMemo(() => {
      const since =
        Date.now() -
        7 *
          24 *
          60 *
          60 *
          1000;

      return attempts.filter(
        (attempt) =>
          new Date(
            attempt.created_at,
          ).getTime() >= since,
      ).length;
    }, [attempts]);

  const searchedProfiles =
    useMemo(() => {
      const search =
        userSearch
          .trim()
          .toLowerCase();

      return profiles
        .filter((profile) => {
          if (
            showOnlyOnline &&
            !isOnline(profile.id)
          ) {
            return false;
          }

          if (!search) {
            return true;
          }

          const haystack =
            `${profileName(profile)} ${
              profile.email || ""
            }`.toLowerCase();

          return haystack.includes(
            search,
          );
        })
        .slice(0, 30);
    }, [
      profiles,
      userSearch,
      showOnlyOnline,
      onlineUserIds,
    ]);

  const studentStats =
    useMemo(() => {
      return profiles.map(
        (profile) => {
          const userAttempts =
            attempts.filter(
              (attempt) =>
                attempt.user_id ===
                profile.id,
            );

          const userAverage =
            userAttempts.length > 0
              ? Math.round(
                  userAttempts.reduce(
                    (sum, attempt) =>
                      sum +
                      attempt.percentage,
                    0,
                  ) /
                    userAttempts.length,
                )
              : 0;

          const lastAttempt =
            userAttempts[0] ||
            null;

          const best =
            userAttempts.length > 0
              ? Math.max(
                  ...userAttempts.map(
                    (attempt) =>
                      attempt.percentage,
                  ),
                )
              : 0;

          return {
            profile,
            attempts:
              userAttempts.length,
            average:
              userAverage,
            best,
            lastAttempt,
            online: isOnline(
              profile.id,
            ),
          };
        },
      );
    }, [
      profiles,
      attempts,
      onlineUserIds,
    ]);

  const recentStudents =
    studentStats.slice(
      0,
      6,
    );

  const topActiveStudents =
    [...studentStats]
      .sort(
        (a, b) =>
          b.attempts -
          a.attempts,
      )
      .slice(0, 5);

  const onlineStudentsCount =
    onlineUserIds.length;

  const inactiveStudentsCount =
    Math.max(
      0,
      profiles.length -
        onlineStudentsCount,
    );

  const activityByStudent =
    new Map(
      studentStats.map(
        (item) => [
          item.profile.id,
          item,
        ],
      ),
    );

  if (
    loading ||
    !authorized
  ) {
    return (
      <main className="min-h-screen bg-[#182332] text-white">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="rounded-3xl border border-white/10 bg-[#202d3d] px-6 py-5 text-sm font-semibold text-slate-300">
            Chargement du centre administration...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#182332] text-white">
      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-120px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[130px]" />

        <div className="absolute left-[-140px] top-[45%] h-[500px] w-[500px] rounded-full bg-white/[0.015] blur-[120px]" />

        <div className="absolute right-[-140px] top-[20%] h-[500px] w-[500px] rounded-full bg-white/[0.015] blur-[120px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize:
              "50px 50px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <section className="relative overflow-hidden rounded-[38px] border border-white/10 bg-gradient-to-br from-[#233246] via-[#293b4f] to-[#30475d] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.15)] sm:p-10">
          <div className="absolute right-[-100px] top-[-100px] h-[320px] w-[320px] rounded-full bg-white/[0.03] blur-[90px]" />

          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />

                Administration center
              </div>

              <h1 className="mt-4 text-4xl font-black leading-none tracking-[-0.05em] text-white sm:text-5xl">
                Centre de contrôle
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Gère les contenus, surveille les étudiants et visualise
                l&apos;activité de la plateforme Part-66 B1.1.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/[0.10] px-5 py-4">
              <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-400">
                Système
              </div>

              <div className="mt-1 flex items-center gap-2 text-sm font-black text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                ADMIN CONNECTÉ
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm font-semibold text-red-200">
            {error}
          </div>
        )}

        {/* =====================================================
            UTILISATEURS
        ===================================================== */}

        <section className="mt-5">
          <div className="mb-5">
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              Student monitoring
            </div>

            <h2 className="mt-2 text-2xl font-black">
              Gestion des étudiants
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Suis les inscriptions et l&apos;activité récente des étudiants.
            </p>
          </div>

          {/* KPI ETUDIANTS */}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                Total inscrits
              </div>

              <div className="mt-3 text-3xl font-black">
                {usersLoading
                  ? "—"
                  : profiles.length}
              </div>

              <div className="mt-1 text-[10px] text-slate-500">
                comptes étudiants
              </div>
            </div>

            <div className="rounded-[28px] border border-emerald-300/10 bg-emerald-300/[0.035] p-5">
              <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
                En ligne
              </div>

              <div className="mt-3 text-3xl font-black text-emerald-300">
                {usersLoading
                  ? "—"
                  : onlineStudentsCount}
              </div>

              <div className="mt-1 text-[10px] text-slate-500">
                actifs sur 5 min
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                Nouveaux
              </div>

              <div className="mt-3 text-3xl font-black text-[#a9c9ff]">
                {usersLoading
                  ? "—"
                  : newUsersLast7Days}
              </div>

              <div className="mt-1 text-[10px] text-slate-500">
                ces 7 derniers jours
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                QCM cette semaine
              </div>

              <div className="mt-3 text-3xl font-black text-white">
                {qcmLast7Days}
              </div>

              <div className="mt-1 text-[10px] text-slate-500">
                entraînements
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                Inactifs
              </div>

              <div className="mt-3 text-3xl font-black text-slate-300">
                {usersLoading
                  ? "—"
                  : inactiveStudentsCount}
              </div>

              <div className="mt-1 text-[10px] text-slate-500">
                pas actifs depuis 5 min
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                Moyenne globale
              </div>

              <div className="mt-3 text-3xl font-black text-[#a9c9ff]">
                {attempts.length
                  ? `${average}%`
                  : "—"}
              </div>

              <div className="mt-1 text-[10px] text-slate-500">
                tous les QCM
              </div>
            </div>
          </div>

          {/* RECHERCHE + LISTE */}

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                    Utilisateurs
                  </div>

                  <h3 className="mt-2 text-2xl font-black">
                    Liste des étudiants
                  </h3>
                </div>

                <div className="text-xs font-bold text-slate-600">
                  {searchedProfiles.length} affiché
                  {searchedProfiles.length > 1
                    ? "s"
                    : ""}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="relative">
                  <svg
                    viewBox="0 0 24 24"
                    className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <circle
                      cx="11"
                      cy="11"
                      r="6.5"
                    />

                    <path d="m16 16 4 4" />
                  </svg>

                  <input
                    value={userSearch}
                    onChange={(event) =>
                      setUserSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Rechercher un étudiant ou un email..."
                    className="w-full rounded-2xl border border-white/10 bg-[#182332] py-4 pl-12 pr-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-[#a9c9ff]/20"
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowOnlyOnline(
                      (value) =>
                        !value,
                    )
                  }
                  className={`rounded-2xl border px-5 py-4 text-xs font-black transition ${
                    showOnlyOnline
                      ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-300"
                      : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  ● En ligne uniquement
                </button>
              </div>

              {usersError && (
                <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-xs leading-6 text-red-200">
                  Impossible de charger les utilisateurs :{" "}
                  {usersError}
                </div>
              )}

              <div className="mt-5 space-y-2">
                {usersLoading ? (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-sm text-slate-500">
                    Chargement des étudiants...
                  </div>
                ) : searchedProfiles.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                    <div className="text-2xl">
                      👤
                    </div>

                    <div className="mt-3 text-sm font-black">
                      Aucun étudiant trouvé
                    </div>

                    <div className="mt-1 text-xs text-slate-600">
                      Modifie ta recherche.
                    </div>
                  </div>
                ) : (
                  searchedProfiles.map(
                    (profile) => {
                      const stats =
                        activityByStudent.get(
                          profile.id,
                        );

                      const online =
                        isOnline(
                          profile.id,
                        );

                      return (
                        <div
                          key={
                            profile.id
                          }
                          className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 sm:flex-row sm:items-center"
                        >
                          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#a9c9ff]/10 text-xs font-black text-[#c5dcff]">
                            {initials(
                              profile,
                            )}

                            {online && (
                              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#202d3d] bg-emerald-400" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-black text-white">
                              {profileName(
                                profile,
                              )}
                            </div>

                            <div className="mt-1 truncate text-[10px] text-slate-500">
                              {profile.email ||
                                "Email non disponible"}
                            </div>

                            <div className="mt-1 text-[9px] text-slate-600">
                              Inscrit le{" "}
                              {formatDate(
                                profile.created_at,
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 sm:w-[330px]">
                            <div className="rounded-xl bg-white/[0.025] p-3 text-center">
                              <div className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-600">
                                QCM
                              </div>

                              <div className="mt-1 text-sm font-black text-white">
                                {stats?.attempts ||
                                  0}
                              </div>
                            </div>

                            <div className="rounded-xl bg-white/[0.025] p-3 text-center">
                              <div className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-600">
                                Moyenne
                              </div>

                              <div className="mt-1 text-sm font-black text-[#a9c9ff]">
                                {stats?.attempts
                                  ? `${stats.average}%`
                                  : "—"}
                              </div>
                            </div>

                            <div className="rounded-xl bg-white/[0.025] p-3 text-center">
                              <div className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-600">
                                Statut
                              </div>

                              <div
                                className={`mt-1 text-[10px] font-black ${
                                  online
                                    ? "text-emerald-300"
                                    : "text-slate-600"
                                }`}
                              >
                                {online
                                  ? "EN LIGNE"
                                  : "HORS LIGNE"}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )
                )}
              </div>
            </div>

            {/* NOUVEAUX INSCRITS */}

            <div className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                    Nouvelles inscriptions
                  </div>

                  <h3 className="mt-2 text-2xl font-black">
                    Derniers inscrits
                  </h3>
                </div>

                <div className="rounded-full bg-[#a9c9ff]/10 px-3 py-1.5 text-[9px] font-black text-[#c5dcff]">
                  {newUsersLast7Days} cette semaine
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {recentStudents.map(
                  (student) => (
                    <div
                      key={
                        student.profile.id
                      }
                      className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3"
                    >
                      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-[10px] font-black text-slate-300">
                        {initials(
                          student.profile,
                        )}

                        {student.online && (
                          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#202d3d] bg-emerald-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-white">
                          {profileName(
                            student.profile,
                          )}
                        </div>

                        <div className="mt-1 text-[9px] text-slate-500">
                          {formatDate(
                            student.profile.created_at,
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[9px] font-black text-[#a9c9ff]">
                          {student.attempts} QCM
                        </div>

                        <div className="mt-1 text-[9px] text-slate-600">
                          {student.online
                            ? "En ligne"
                            : "Hors ligne"}
                        </div>
                      </div>
                    </div>
                  ),
                )}

                {recentStudents.length ===
                  0 && (
                  <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                    Aucun étudiant inscrit.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ACTIVITE ETUDIANTS */}

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                  Student activity
                </div>

                <h3 className="mt-2 text-2xl font-black">
                  Étudiants les plus actifs
                </h3>
              </div>

              <div className="mt-5 space-y-2">
                {topActiveStudents.map(
                  (student, index) => (
                    <div
                      key={
                        student.profile.id
                      }
                      className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-xs font-black text-slate-400">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-white">
                          {profileName(
                            student.profile,
                          )}
                        </div>

                        <div className="mt-1 text-[9px] text-slate-500">
                          {student.attempts} QCM
                          {student.attempts >
                          1
                            ? " réalisés"
                            : " réalisé"}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-black text-[#a9c9ff]">
                          {student.attempts
                            ? `${student.average}%`
                            : "—"}
                        </div>

                        <div className="mt-1 text-[9px] text-slate-600">
                          moyenne
                        </div>
                      </div>
                    </div>
                  ),
                )}

                {topActiveStudents.length ===
                  0 && (
                  <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                    Aucune activité QCM.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                  Platform health
                </div>

                <h3 className="mt-2 text-2xl font-black">
                  Activité de la communauté
                </h3>
              </div>

              <div className="mt-6 space-y-3">
                <div className="rounded-2xl bg-white/[0.025] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">
                      Étudiants actifs
                    </span>

                    <span className="font-black text-emerald-300">
                      {onlineStudentsCount}
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{
                        width: `${
                          profiles.length
                            ? Math.min(
                                100,
                                (onlineStudentsCount /
                                  profiles.length) *
                                  100,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-white/[0.025] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">
                      Nouveaux inscrits cette semaine
                    </span>

                    <span className="font-black text-[#a9c9ff]">
                      {newUsersLast7Days}
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-[#6ea8ff]"
                      style={{
                        width: `${
                          profiles.length
                            ? Math.min(
                                100,
                                (newUsersLast7Days /
                                  profiles.length) *
                                  100,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-white/[0.025] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">
                      QCM cette semaine
                    </span>

                    <span className="font-black text-white">
                      {qcmLast7Days}
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-white/50"
                      style={{
                        width: `${
                          attempts.length
                            ? Math.min(
                                100,
                                (qcmLast7Days /
                                  attempts.length) *
                                  100,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            KPI CONTENU
        ===================================================== */}

        <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
              Modules
            </div>

            <div className="mt-3 text-3xl font-black">
              {modules.length}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
              Cours
            </div>

            <div className="mt-3 text-3xl font-black">
              {courses.length}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
              Fiches
            </div>

            <div className="mt-3 text-3xl font-black">
              {sheets.length}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
              Questions
            </div>

            <div className="mt-3 text-3xl font-black text-[#a9c9ff]">
              {questions.length}
            </div>

            <div className="mt-1 text-[10px] text-slate-500">
              {approvedQuestions} validées
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
              À valider
            </div>

            <div className="mt-3 text-3xl font-black text-amber-300">
              {draftQuestions}
            </div>

            <div className="mt-1 text-[10px] text-slate-500">
              {modulesWithDrafts} module
              {modulesWithDrafts > 1
                ? "s"
                : ""}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
              Activité QCM
            </div>

            <div className="mt-3 text-3xl font-black">
              {attempts.length}
            </div>

            <div className="mt-1 text-[10px] text-slate-500">
              moyenne{" "}
              {attempts.length
                ? `${average}%`
                : "—"}
            </div>
          </div>
        </section>

        {/* =====================================================
            ACTIONS
        ===================================================== */}

        <section className="mt-10">
          <div className="mb-5">
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              Control center
            </div>

            <h2 className="mt-2 text-2xl font-black">
              Outils d&apos;administration
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Link
              href="/admin/questions"
              className="group rounded-[30px] border border-white/10 bg-[#202d3d] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-[#28384b]"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#a9c9ff]/10 text-xl font-black text-[#a9c9ff]">
                  ?
                </div>

                {draftQuestions > 0 && (
                  <span className="rounded-full bg-amber-400/10 px-3 py-1.5 text-[9px] font-black text-amber-300">
                    {draftQuestions} à valider
                  </span>
                )}
              </div>

              <div className="mt-5 text-[9px] font-black uppercase tracking-[0.22em] text-[#a9c9ff]">
                Content
              </div>

              <h3 className="mt-1 text-xl font-black">
                Questions
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Gérer, modifier et valider la banque de questions.
              </p>

              <div className="mt-5 text-xs font-black text-slate-500 group-hover:text-white">
                Ouvrir →
              </div>
            </Link>

            <Link
              href="/admin/signalements"
              className="group rounded-[30px] border border-white/10 bg-[#202d3d] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-[#28384b]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-xl font-black text-slate-200">
                !
              </div>

              <div className="mt-5 text-[9px] font-black uppercase tracking-[0.22em] text-[#a9c9ff]">
                Moderation
              </div>

              <h3 className="mt-1 text-xl font-black">
                Signalements
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Consulte les problèmes signalés par les étudiants.
              </p>

              <div className="mt-5 text-xs font-black text-slate-500 group-hover:text-white">
                Ouvrir →
              </div>
            </Link>

            <Link
              href="/publier/cours"
              className="group rounded-[30px] border border-white/10 bg-[#202d3d] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-[#28384b]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-xl font-black text-slate-200">
                +
              </div>

              <div className="mt-5 text-[9px] font-black uppercase tracking-[0.22em] text-[#a9c9ff]">
                Formation
              </div>

              <h3 className="mt-1 text-xl font-black">
                Ajouter un cours
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Publie un nouveau support PDF pour un module.
              </p>

              <div className="mt-5 text-xs font-black text-slate-500 group-hover:text-white">
                Publier →
              </div>
            </Link>

            <Link
              href="/"
              className="group rounded-[30px] border border-white/10 bg-[#202d3d] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-[#28384b]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-xl font-black text-slate-200">
                ↗
              </div>

              <div className="mt-5 text-[9px] font-black uppercase tracking-[0.22em] text-[#a9c9ff]">
                Platform
              </div>

              <h3 className="mt-1 text-xl font-black">
                Voir le site
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Retourne à l&apos;interface étudiante.
              </p>

              <div className="mt-5 text-xs font-black text-slate-500 group-hover:text-white">
                Ouvrir →
              </div>
            </Link>
          </div>
        </section>

        {/* =====================================================
            QUESTIONS
        ===================================================== */}

        <section className="mt-10 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                  Question database
                </div>

                <h2 className="mt-2 text-2xl font-black">
                  Questions récentes
                </h2>
              </div>

              <Link
                href="/admin/questions"
                className="text-xs font-black text-slate-500 hover:text-white"
              >
                Toutes →
              </Link>
            </div>

            <div className="mt-6 space-y-2">
              {recentQuestions.length ===
              0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                  Aucune question.
                </div>
              ) : (
                recentQuestions.map(
                  (question) => {
                    const module =
                      moduleMap.get(
                        question.module_id,
                      );

                    return (
                      <div
                        key={
                          question.id
                        }
                        className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-xs font-black text-slate-300">
                          {module
                            ? moduleNumber(
                                module.name,
                              )
                            : "?"}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-black">
                            {question.question}
                          </div>

                          <div className="mt-1 text-[10px] text-slate-500">
                            {module
                              ? moduleTitle(
                                  module.name,
                                )
                              : "Sans module"}
                            {" · "}
                            {formatDate(
                              question.created_at,
                            )}
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.12em] ${
                            question.status ===
                            "approved"
                              ? "bg-emerald-400/10 text-emerald-300"
                              : question.status ===
                                  "draft"
                                ? "bg-amber-400/10 text-amber-300"
                                : "bg-red-400/10 text-red-300"
                          }`}
                        >
                          {
                            question.status
                          }
                        </span>
                      </div>
                    );
                  },
                )
              )}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                Database health
              </div>

              <h2 className="mt-2 text-2xl font-black">
                État du contenu
              </h2>
            </div>

            <div className="mt-6 space-y-3">
              <div className="rounded-2xl bg-white/[0.025] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">
                    Questions validées
                  </span>

                  <span className="font-black text-emerald-300">
                    {approvedQuestions}
                  </span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-emerald-400"
                    style={{
                      width: `${
                        questions.length
                          ? (approvedQuestions /
                              questions.length) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-white/[0.025] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">
                    Brouillons
                  </span>

                  <span className="font-black text-amber-300">
                    {draftQuestions}
                  </span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-amber-300"
                    style={{
                      width: `${
                        questions.length
                          ? (draftQuestions /
                              questions.length) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-white/[0.025] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">
                    Questions refusées
                  </span>

                  <span className="font-black text-red-300">
                    {rejectedQuestions}
                  </span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-red-400"
                    style={{
                      width: `${
                        questions.length
                          ? (rejectedQuestions /
                              questions.length) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            MODULES
        ===================================================== */}

        <section className="mt-10">
          <div className="mb-5">
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              Module monitoring
            </div>

            <h2 className="mt-2 text-2xl font-black">
              État des modules
            </h2>
          </div>

          <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#202d3d]">
            <div className="divide-y divide-white/[0.06]">
              {moduleStats.map(
                (item) => (
                  <div
                    key={
                      item.module.id
                    }
                    className="p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                      <div className="flex items-center gap-4 xl:w-[340px]">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-xs font-black text-[#a9c9ff]">
                          {moduleNumber(
                            item.module.name,
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate font-black text-white">
                            {moduleTitle(
                              item.module.name,
                            )}
                          </div>

                          <div className="mt-1 text-[10px] text-slate-500">
                            {
                              item.questions
                            }{" "}
                            questions
                            {" · "}
                            {
                              item.courses
                            }{" "}
                            cours
                            {" · "}
                            {
                              item.sheets
                            }{" "}
                            fiches
                          </div>
                        </div>
                      </div>

                      <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-xl bg-white/[0.025] p-3">
                          <div className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-600">
                            Questions
                          </div>

                          <div className="mt-1 text-sm font-black">
                            {
                              item.questions
                            }
                          </div>
                        </div>

                        <div className="rounded-xl bg-white/[0.025] p-3">
                          <div className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-600">
                            Brouillons
                          </div>

                          <div className="mt-1 text-sm font-black text-amber-300">
                            {
                              item.drafts
                            }
                          </div>
                        </div>

                        <div className="rounded-xl bg-white/[0.025] p-3">
                          <div className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-600">
                            QCM
                          </div>

                          <div className="mt-1 text-sm font-black">
                            {
                              item.attempts
                            }
                          </div>
                        </div>

                        <div className="rounded-xl bg-white/[0.025] p-3">
                          <div className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-600">
                            Moyenne
                          </div>

                          <div className="mt-1 text-sm font-black text-[#a9c9ff]">
                            {item.attempts
                              ? `${item.average}%`
                              : "—"}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Link
                          href={`/cours/${item.module.id}`}
                          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                        >
                          Voir
                        </Link>

                        <Link
                          href={`/admin/questions/${item.module.id}`}
                          className="rounded-xl bg-[#6ea8ff] px-4 py-3 text-xs font-black text-[#122033] transition hover:bg-[#83b5ff]"
                        >
                          Gérer
                        </Link>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        {/* =====================================================
            ACTIVITE
        ===================================================== */}

        <section className="mt-10 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                QCM activity
              </div>

              <h2 className="mt-2 text-2xl font-black">
                Activité récente
              </h2>
            </div>

            <div className="mt-6 space-y-2">
              {attempts
                .slice(0, 6)
                .map(
                  (attempt) => {
                    const module =
                      moduleMap.get(
                        attempt.module_id,
                      );

                    const student =
                      profileMap.get(
                        attempt.user_id,
                      );

                    return (
                      <div
                        key={
                          attempt.id
                        }
                        className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-xs font-black">
                          {module
                            ? moduleNumber(
                                module.name,
                              )
                            : "?"}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-black">
                            {student
                              ? profileName(
                                  student,
                                )
                              : "Étudiant"}
                          </div>

                          <div className="mt-1 truncate text-[10px] text-slate-500">
                            {module
                              ? moduleTitle(
                                  module.name,
                                )
                              : "Module"}
                            {" · "}
                            {formatDateTime(
                              attempt.created_at,
                            )}
                          </div>
                        </div>

                        <div
                          className={`text-lg font-black ${
                            attempt.percentage >=
                            80
                              ? "text-emerald-300"
                              : attempt.percentage >=
                                  60
                                ? "text-[#a9c9ff]"
                                : "text-red-300"
                          }`}
                        >
                          {
                            attempt.percentage
                          }%
                        </div>
                      </div>
                    );
                  },
                )}

              {attempts.length ===
                0 && (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                  Aucun QCM enregistré.
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white/[0.025] p-4">
                <div className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-600">
                  Moyenne globale
                </div>

                <div className="mt-1 text-xl font-black text-[#a9c9ff]">
                  {attempts.length
                    ? `${average}%`
                    : "—"}
                </div>
              </div>

              <div className="rounded-2xl bg-white/[0.025] p-4">
                <div className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-600">
                  Meilleur score
                </div>

                <div className="mt-1 text-xl font-black">
                  {attempts.length
                    ? `${bestScore}%`
                    : "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                Latest content
              </div>

              <h2 className="mt-2 text-2xl font-black">
                Derniers cours ajoutés
              </h2>
            </div>

            <div className="mt-6 space-y-2">
              {recentCourses.map(
                (course) => {
                  const module =
                    moduleMap.get(
                      course.module_id ||
                        -1,
                    );

                  return (
                    <div
                      key={
                        course.id
                      }
                      className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-xs font-black">
                        {module
                          ? moduleNumber(
                              module.name,
                            )
                          : "—"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black">
                          {
                            course.title
                          }
                        </div>

                        <div className="mt-1 text-[10px] text-slate-500">
                          {module
                            ? moduleTitle(
                                module.name,
                              )
                            : "Sans module"}
                          {" · "}
                          {formatDate(
                            course.created_at,
                          )}
                        </div>
                      </div>
                    </div>
                  );
                },
              )}

              {recentCourses.length ===
                0 && (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                  Aucun cours disponible.
                </div>
              )}
            </div>

            <Link
              href="/cours"
              className="mt-6 flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              Voir les cours →
            </Link>
          </div>
        </section>

        {/* =====================================================
            FOOTER ADMIN
        ===================================================== */}

        <section className="mt-10 rounded-[30px] border border-white/10 bg-[#202d3d] p-6 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#a9c9ff]">
                Live monitoring
              </div>

              <div className="mt-2 text-lg font-black">
                Suivi des étudiants actif
              </div>

              <div className="mt-1 text-xs leading-5 text-slate-500">
                La présence est actualisée automatiquement toutes les 30 secondes.
                Un étudiant est considéré comme actif s&apos;il a utilisé la plateforme
                durant les 5 dernières minutes.
              </div>
            </div>

            <button
              type="button"
              onClick={loadUsers}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              Actualiser les étudiants
            </button>
          </div>
        </section>

        <div className="h-10" />
      </div>
    </main>
  );
}