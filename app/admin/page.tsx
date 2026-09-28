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

const DAYS_TO_ANALYZE = 14;

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

function formatShortDate(
  value: string,
) {
  return new Date(value).toLocaleDateString(
    "fr-FR",
    {
      day: "2-digit",
      month: "2-digit",
    },
  );
}

function formatDateTime(
  value: string,
) {
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

function dayKey(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLastDays(count: number) {
  const result: Date[] = [];

  const today = new Date();

  today.setHours(
    0,
    0,
    0,
    0,
  );

  for (
    let index = count - 1;
    index >= 0;
    index--
  ) {
    const date = new Date(today);

    date.setDate(
      today.getDate() - index,
    );

    result.push(date);
  }

  return result;
}

function scoreBucket(
  percentage: number,
) {
  if (percentage < 60) {
    return "Moins de 60 %";
  }

  if (percentage < 80) {
    return "60–79 %";
  }

  if (percentage < 90) {
    return "80–89 %";
  }

  return "90 % et +";
}

/* ============================================================
   MINI GRAPHIQUE EN LIGNE
============================================================ */

function LineChart({
  data,
  label,
  suffix = "",
}: {
  data: {
    label: string;
    value: number;
  }[];
  label: string;
  suffix?: string;
}) {
  const width = 720;
  const height = 220;
  const paddingX = 24;
  const paddingY = 28;

  const maxValue =
    Math.max(
      1,
      ...data.map(
        (item) => item.value,
      ),
    );

  const points = data.map(
    (item, index) => {
      const x =
        paddingX +
        (index /
          Math.max(
            1,
            data.length - 1,
          )) *
          (width -
            paddingX * 2);

      const y =
        height -
        paddingY -
        (item.value /
          maxValue) *
          (height -
            paddingY * 2);

      return {
        ...item,
        x,
        y,
      };
    },
  );

  const linePoints = points
    .map(
      (point) =>
        `${point.x},${point.y}`,
    )
    .join(" ");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
          {label}
        </div>

        <div className="text-[9px] font-bold text-slate-600">
          max {maxValue}
          {suffix}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#182332] p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[220px] w-full"
          preserveAspectRatio="none"
          aria-label={label}
        >
          {[0.25, 0.5, 0.75].map(
            (ratio) => {
              const y =
                height -
                paddingY -
                ratio *
                  (height -
                    paddingY * 2);

              return (
                <line
                  key={ratio}
                  x1={paddingX}
                  x2={width - paddingX}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="1"
                />
              );
            },
          )}

          <polyline
            points={linePoints}
            fill="none"
            stroke="rgba(169,201,255,0.95)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map(
            (point) => (
              <g
                key={`${point.label}-${point.x}`}
              >
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="#182332"
                  stroke="rgba(169,201,255,0.95)"
                  strokeWidth="2"
                />
              </g>
            ),
          )}
        </svg>

        <div className="mt-2 grid grid-cols-7 gap-1 text-[8px] font-bold text-slate-600">
          {data
            .filter(
              (_, index) =>
                index === 0 ||
                index ===
                  data.length - 1 ||
                index %
                    2 ===
                  0,
            )
            .map(
              (item) => (
                <span
                  key={
                    item.label
                  }
                  className="text-center"
                >
                  {item.label}
                </span>
              ),
            )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   BARRE HORIZONTALE
============================================================ */

function StatBar({
  label,
  value,
  max,
  suffix = "",
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
}) {
  const width =
    max > 0
      ? Math.max(
          value > 0 ? 4 : 0,
          Math.min(
            100,
            (value / max) * 100,
          ),
        )
      : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="truncate text-xs font-bold text-slate-300">
          {label}
        </span>

        <span className="shrink-0 text-xs font-black text-[#a9c9ff]">
          {value}
          {suffix}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-[#6ea8ff]"
          style={{
            width: `${width}%`,
          }}
        />
      </div>
    </div>
  );
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
        })
        .limit(5000),

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

    const onlineIds =
      Array.from(
        new Set(
          (
            presenceResult.data ||
            []
          ).map(
            (item) =>
              item.user_id,
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
          .limit(5000),

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
          .limit(5000),
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

    const interval =
      setInterval(
        loadUsers,
        30_000,
      );

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  /* ============================================================
     MAPS
  ============================================================ */

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

  /* ============================================================
     KPI GENERALES
  ============================================================ */

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

  const average =
    attempts.length > 0
      ? Math.round(
          attempts.reduce(
            (sum, attempt) =>
              sum +
              attempt.percentage,
            0,
          ) /
            attempts.length,
        )
      : 0;

  const bestScore =
    attempts.length > 0
      ? Math.max(
          ...attempts.map(
            (attempt) =>
              attempt.percentage,
          ),
        )
      : 0;

  /* ============================================================
     DATES
  ============================================================ */

  const chartDays = useMemo(
    () =>
      getLastDays(
        DAYS_TO_ANALYZE,
      ),
    [],
  );

  const recentSince =
    Date.now() -
    7 *
      24 *
      60 *
      60 *
      1000;

  const newUsersLast7Days =
    profiles.filter(
      (profile) =>
        new Date(
          profile.created_at,
        ).getTime() >=
        recentSince,
    ).length;

  const attemptsLast7Days =
    attempts.filter(
      (attempt) =>
        new Date(
          attempt.created_at,
        ).getTime() >=
        recentSince,
    );

  const activeStudentsLast7Days =
    new Set(
      attemptsLast7Days.map(
        (attempt) =>
          attempt.user_id,
      ),
    ).size;

  /* ============================================================
     GRAPHIQUE INSCRIPTIONS
  ============================================================ */

  const registrationChart =
    useMemo(() => {
      return chartDays.map(
        (date) => {
          const key =
            dayKey(date);

          const count =
            profiles.filter(
              (profile) =>
                dayKey(
                  new Date(
                    profile.created_at,
                  ),
                ) === key,
            ).length;

          return {
            label:
              formatShortDate(
                date.toISOString(),
              ),
            value: count,
          };
        },
      );
    }, [
      chartDays,
      profiles,
    ]);

  /* ============================================================
     GRAPHIQUE QCM
  ============================================================ */

  const qcmChart = useMemo(
    () => {
      return chartDays.map(
        (date) => {
          const key =
            dayKey(date);

          const count =
            attempts.filter(
              (attempt) =>
                dayKey(
                  new Date(
                    attempt.created_at,
                  ),
                ) === key,
            ).length;

          return {
            label:
              formatShortDate(
                date.toISOString(),
              ),
            value: count,
          };
        },
      );
    },
    [
      chartDays,
      attempts,
    ],
  );

  /* ============================================================
     GRAPHIQUE SCORE MOYEN
  ============================================================ */

  const scoreChart = useMemo(
    () => {
      return chartDays.map(
        (date) => {
          const key =
            dayKey(date);

          const dayAttempts =
            attempts.filter(
              (attempt) =>
                dayKey(
                  new Date(
                    attempt.created_at,
                  ),
                ) === key,
            );

          const value =
            dayAttempts.length >
            0
              ? Math.round(
                  dayAttempts.reduce(
                    (
                      sum,
                      attempt,
                    ) =>
                      sum +
                      attempt.percentage,
                    0,
                  ) /
                    dayAttempts.length,
                )
              : 0;

          return {
            label:
              formatShortDate(
                date.toISOString(),
              ),
            value,
          };
        },
      );
    },
    [
      chartDays,
      attempts,
    ],
  );

  /* ============================================================
     STATS MODULES
  ============================================================ */

  const moduleStats = useMemo(() => {
    return modules
      .map((module) => {
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
          moduleAttempts.length
            ? Math.round(
                moduleAttempts.reduce(
                  (
                    sum,
                    attempt,
                  ) =>
                    sum +
                    attempt.percentage,
                  0,
                ) /
                  moduleAttempts.length,
              )
            : 0;

        const moduleBest =
          moduleAttempts.length
            ? Math.max(
                ...moduleAttempts.map(
                  (attempt) =>
                    attempt.percentage,
                ),
              )
            : 0;

        const drafts =
          moduleQuestions.filter(
            (question) =>
              question.status ===
              "draft",
          ).length;

        return {
          module,
          questions:
            moduleQuestions.length,
          courses:
            moduleCourses.length,
          sheets:
            moduleSheets.length,
          attempts:
            moduleAttempts.length,
          average:
            moduleAverage,
          best: moduleBest,
          drafts,
        };
      })
      .sort(
        (a, b) =>
          b.attempts -
          a.attempts,
      );
  }, [
    modules,
    questions,
    courses,
    sheets,
    attempts,
  ]);

  const mostWorkedModules =
    moduleStats.slice(0, 7);

  /* ============================================================
     REPARTITION DES SCORES
  ============================================================ */

  const scoreDistribution =
    useMemo(() => {
      const buckets = [
        {
          label: "Moins de 60 %",
          value: 0,
        },
        {
          label: "60–79 %",
          value: 0,
        },
        {
          label: "80–89 %",
          value: 0,
        },
        {
          label: "90 % et +",
          value: 0,
        },
      ];

      for (const attempt of attempts) {
        const bucket =
          scoreBucket(
            attempt.percentage,
          );

        const item =
          buckets.find(
            (entry) =>
              entry.label ===
              bucket,
          );

        if (item) {
          item.value += 1;
        }
      }

      return buckets;
    }, [attempts]);

  const scoreDistributionMax =
    Math.max(
      1,
      ...scoreDistribution.map(
        (item) =>
          item.value,
      ),
    );

  /* ============================================================
     STATS ETUDIANTS
  ============================================================ */

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
            userAttempts.length
              ? Math.round(
                  userAttempts.reduce(
                    (
                      sum,
                      attempt,
                    ) =>
                      sum +
                      attempt.percentage,
                    0,
                  ) /
                    userAttempts.length,
                )
              : 0;

          const userBest =
            userAttempts.length
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
            best:
              userBest,
            lastAttempt:
              userAttempts[0] ||
              null,
            online:
              onlineUserIds.includes(
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

  const topActiveStudents =
    [...studentStats]
      .sort(
        (a, b) =>
          b.attempts -
          a.attempts,
      )
      .slice(0, 6);

  const searchedProfiles =
    useMemo(() => {
      const search =
        userSearch
          .trim()
          .toLowerCase();

      return studentStats
        .filter((student) => {
          if (
            showOnlyOnline &&
            !student.online
          ) {
            return false;
          }

          if (!search) {
            return true;
          }

          const text =
            `${profileName(
              student.profile,
            )} ${
              student.profile
                .email || ""
            }`.toLowerCase();

          return text.includes(
            search,
          );
        })
        .slice(0, 30);
    }, [
      studentStats,
      userSearch,
      showOnlyOnline,
    ]);

  /* ============================================================
     MODULE LE PLUS TRAVAILLE
  ============================================================ */

  const hardestModule =
    [...moduleStats]
      .filter(
        (item) =>
          item.attempts > 0,
      )
      .sort(
        (a, b) =>
          a.average -
          b.average,
      )[0] || null;

  const bestModule =
    [...moduleStats]
      .filter(
        (item) =>
          item.attempts > 0,
      )
      .sort(
        (a, b) =>
          b.average -
          a.average,
      )[0] || null;

  const maxModuleAttempts =
    Math.max(
      1,
      ...moduleStats.map(
        (item) =>
          item.attempts,
      ),
    );

  const recentQuestions =
    questions.slice(0, 7);

  const recentCourses =
    courses.slice(0, 6);

  const modulesWithDrafts =
    moduleStats.filter(
      (item) =>
        item.drafts > 0,
    ).length;

  const onlineUsers =
    onlineUserIds.length;

  const inactiveUsers =
    Math.max(
      0,
      profiles.length -
        onlineUsers,
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
        <div className="absolute left-1/2 top-[-120px] h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[140px]" />

        <div className="absolute left-[-150px] top-[40%] h-[500px] w-[500px] rounded-full bg-white/[0.015] blur-[120px]" />

        <div className="absolute right-[-150px] top-[20%] h-[500px] w-[500px] rounded-full bg-white/[0.015] blur-[120px]" />

        <div
          className="absolute inset-0 opacity-[0.022]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize:
              "50px 50px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1550px] px-4 py-7 sm:px-6 lg:px-8">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <section className="relative overflow-hidden rounded-[38px] border border-white/10 bg-gradient-to-br from-[#233246] via-[#293b4f] to-[#30475d] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.15)] sm:p-10">
          <div className="absolute right-[-100px] top-[-100px] h-[320px] w-[320px] rounded-full bg-white/[0.03] blur-[90px]" />

          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)]" />
                Administration center
              </div>

              <h1 className="mt-4 text-4xl font-black leading-none tracking-[-0.05em] sm:text-5xl">
                Centre de contrôle
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Analyse l&apos;activité de la plateforme, suis les étudiants
                et surveille l&apos;ensemble des contenus Part-66 B1.1.
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
            KPI PRINCIPAUX
        ===================================================== */}

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
              Étudiants
            </div>

            <div className="mt-3 text-3xl font-black">
              {profiles.length}
            </div>

            <div className="mt-1 text-[10px] text-slate-500">
              inscrits
            </div>
          </div>

          <div className="rounded-[28px] border border-emerald-300/10 bg-emerald-300/[0.035] p-5">
            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Actifs
            </div>

            <div className="mt-3 text-3xl font-black text-emerald-300">
              {onlineUsers}
            </div>

            <div className="mt-1 text-[10px] text-slate-500">
              sur les 5 dernières min
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
              Nouveaux
            </div>

            <div className="mt-3 text-3xl font-black text-[#a9c9ff]">
              {newUsersLast7Days}
            </div>

            <div className="mt-1 text-[10px] text-slate-500">
              cette semaine
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
              QCM
            </div>

            <div className="mt-3 text-3xl font-black">
              {attempts.length}
            </div>

            <div className="mt-1 text-[10px] text-slate-500">
              {attemptsLast7Days.length} cette semaine
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
              Moyenne
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

          <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
              Actifs 7 jours
            </div>

            <div className="mt-3 text-3xl font-black">
              {activeStudentsLast7Days}
            </div>

            <div className="mt-1 text-[10px] text-slate-500">
              étudiants différents
            </div>
          </div>
        </section>

        {/* =====================================================
            ANALYTICS
        ===================================================== */}

        <section className="mt-10">
          <div className="mb-5">
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              Analytics
            </div>

            <h2 className="mt-2 text-2xl font-black">
              Statistiques de la plateforme
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Evolution sur les {DAYS_TO_ANALYZE} derniers jours.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
              <LineChart
                data={registrationChart}
                label="Nouvelles inscriptions par jour"
              />
            </div>

            <div className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
              <LineChart
                data={qcmChart}
                label="QCM réalisés par jour"
              />
            </div>

            <div className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
              <LineChart
                data={scoreChart}
                label="Score moyen par jour"
                suffix="%"
              />
            </div>

            {/* REPARTITION SCORES */}

            <div className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
              <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                Performance
              </div>

              <h3 className="mt-2 text-2xl font-black">
                Répartition des scores
              </h3>

              <div className="mt-7 space-y-5">
                {scoreDistribution.map(
                  (item) => (
                    <StatBar
                      key={item.label}
                      label={item.label}
                      value={item.value}
                      max={
                        scoreDistributionMax
                      }
                      suffix=" QCM"
                    />
                  ),
                )}
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/[0.025] p-4">
                  <div className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-600">
                    Meilleur score
                  </div>

                  <div className="mt-2 text-2xl font-black text-emerald-300">
                    {attempts.length
                      ? `${bestScore}%`
                      : "—"}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/[0.025] p-4">
                  <div className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-600">
                    Moyenne
                  </div>

                  <div className="mt-2 text-2xl font-black text-[#a9c9ff]">
                    {attempts.length
                      ? `${average}%`
                      : "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            MODULES LES PLUS TRAVAILLES
        ===================================================== */}

        <section className="mt-10 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                Modules
              </div>

              <h2 className="mt-2 text-2xl font-black">
                Modules les plus travaillés
              </h2>

              <p className="mt-2 text-xs text-slate-500">
                Basé sur le nombre de QCM réalisés.
              </p>
            </div>

            <div className="mt-6 space-y-5">
              {mostWorkedModules.map(
                (item) => (
                  <div
                    key={
                      item.module.id
                    }
                  >
                    <div className="mb-2 flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-[10px] font-black text-[#a9c9ff]">
                        {moduleNumber(
                          item.module.name,
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black">
                          {moduleTitle(
                            item.module.name,
                          )}
                        </div>

                        <div className="mt-0.5 text-[9px] text-slate-600">
                          {
                            item.attempts
                          }{" "}
                          QCM ·{" "}
                          {
                            item.average
                          }
                          % de moyenne
                        </div>
                      </div>

                      <div className="text-sm font-black text-[#a9c9ff]">
                        {
                          item.attempts
                        }
                      </div>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-[#6ea8ff]"
                        style={{
                          width: `${
                            Math.max(
                              item.attempts >
                                0
                                ? 4
                                : 0,
                              (item.attempts /
                                maxModuleAttempts) *
                                100,
                            )
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ),
              )}

              {mostWorkedModules.length ===
                0 && (
                <div className="rounded-2xl border border-dashed border-white/10 p-7 text-center text-sm text-slate-500">
                  Aucun QCM réalisé pour le moment.
                </div>
              )}
            </div>
          </div>

          {/* MODULES A SURVEILLER */}

          <div className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                Analyse pédagogique
              </div>

              <h2 className="mt-2 text-2xl font-black">
                Modules à surveiller
              </h2>
            </div>

            <div className="mt-6 space-y-3">
              <div className="rounded-2xl border border-orange-300/10 bg-orange-300/[0.035] p-5">
                <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600">
                  Moyenne la plus basse
                </div>

                <div className="mt-2 text-lg font-black text-white">
                  {hardestModule
                    ? moduleTitle(
                        hardestModule
                          .module.name,
                      )
                    : "Pas encore disponible"}
                </div>

                {hardestModule && (
                  <div className="mt-1 text-xs font-black text-orange-300">
                    {
                      hardestModule.average
                    }{" "}
                    % ·{" "}
                    {
                      hardestModule.attempts
                    }{" "}
                    QCM
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.035] p-5">
                <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-600">
                  Meilleure moyenne
                </div>

                <div className="mt-2 text-lg font-black text-white">
                  {bestModule
                    ? moduleTitle(
                        bestModule
                          .module.name,
                      )
                    : "Pas encore disponible"}
                </div>

                {bestModule && (
                  <div className="mt-1 text-xs font-black text-emerald-300">
                    {bestModule.average}{" "}
                    % ·{" "}
                    {
                      bestModule.attempts
                    }{" "}
                    QCM
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">
                    Modules avec brouillons
                  </span>

                  <span className="text-lg font-black text-amber-300">
                    {
                      modulesWithDrafts
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            ACTIVITE ETUDIANTS
        ===================================================== */}

        <section className="mt-10">
          <div className="mb-5">
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              Student analytics
            </div>

            <h2 className="mt-2 text-2xl font-black">
              Activité des étudiants
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            {/* RECHERCHE */}

            <div className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#a9c9ff]">
                    Utilisateurs
                  </div>

                  <h3 className="mt-2 text-2xl font-black">
                    Liste des étudiants
                  </h3>
                </div>

                <div className="text-xs font-bold text-slate-600">
                  {profiles.length} inscrits
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
                    onChange={(
                      event,
                    ) =>
                      setUserSearch(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Rechercher un étudiant..."
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
                  ● En ligne
                </button>
              </div>

              {usersError && (
                <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-xs leading-6 text-red-200">
                  {usersError}
                </div>
              )}

              <div className="mt-5 space-y-2">
                {usersLoading ? (
                  <div className="rounded-2xl border border-white/[0.06] p-6 text-sm text-slate-500">
                    Chargement...
                  </div>
                ) : searchedProfiles.length ===
                  0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-7 text-center text-sm text-slate-500">
                    Aucun étudiant trouvé.
                  </div>
                ) : (
                  searchedProfiles.map(
                    (student) => (
                      <div
                        key={
                          student.profile
                            .id
                        }
                        className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 sm:flex-row sm:items-center"
                      >
                        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#a9c9ff]/10 text-xs font-black text-[#c5dcff]">
                          {initials(
                            student.profile,
                          )}

                          {student.online && (
                            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#202d3d] bg-emerald-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-black text-white">
                            {profileName(
                              student.profile,
                            )}
                          </div>

                          <div className="mt-1 truncate text-[10px] text-slate-500">
                            {student.profile
                              .email ||
                              "Email non disponible"}
                          </div>

                          <div className="mt-1 text-[9px] text-slate-600">
                            Inscrit le{" "}
                            {formatDate(
                              student.profile
                                .created_at,
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 sm:w-[340px]">
                          <div className="rounded-xl bg-white/[0.025] p-3 text-center">
                            <div className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-600">
                              QCM
                            </div>

                            <div className="mt-1 text-sm font-black">
                              {
                                student.attempts
                              }
                            </div>
                          </div>

                          <div className="rounded-xl bg-white/[0.025] p-3 text-center">
                            <div className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-600">
                              Moy.
                            </div>

                            <div className="mt-1 text-sm font-black text-[#a9c9ff]">
                              {student.attempts
                                ? `${student.average}%`
                                : "—"}
                            </div>
                          </div>

                          <div className="rounded-xl bg-white/[0.025] p-3 text-center">
                            <div className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-600">
                              Statut
                            </div>

                            <div
                              className={`mt-1 text-[9px] font-black ${
                                student.online
                                  ? "text-emerald-300"
                                  : "text-slate-600"
                              }`}
                            >
                              {student.online
                                ? "EN LIGNE"
                                : "HORS LIGNE"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ),
                  )
                )}
              </div>
            </div>

            {/* TOP ACTIFS */}

            <div className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#a9c9ff]">
                  Classement activité
                </div>

                <h3 className="mt-2 text-2xl font-black">
                  Étudiants les plus actifs
                </h3>

                <p className="mt-2 text-xs text-slate-500">
                  Basé sur le nombre de QCM réalisés.
                </p>
              </div>

              <div className="mt-6 space-y-2">
                {topActiveStudents.map(
                  (
                    student,
                    index,
                  ) => (
                    <div
                      key={
                        student.profile
                          .id
                      }
                      className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-xs font-black text-slate-500">
                        {index + 1}
                      </div>

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#a9c9ff]/10 text-[10px] font-black text-[#c5dcff]">
                        {initials(
                          student.profile,
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black">
                          {profileName(
                            student.profile,
                          )}
                        </div>

                        <div className="mt-1 text-[9px] text-slate-500">
                          {student.attempts} QCM
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
                  <div className="rounded-2xl border border-dashed border-white/10 p-7 text-center text-sm text-slate-500">
                    Pas encore d&apos;activité.
                  </div>
                )}
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
              Brouillons
            </div>

            <div className="mt-3 text-3xl font-black text-amber-300">
              {draftQuestions}
            </div>

            <div className="mt-1 text-[10px] text-slate-500">
              à valider
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
              Refusées
            </div>

            <div className="mt-3 text-3xl font-black text-red-300">
              {rejectedQuestions}
            </div>

            <div className="mt-1 text-[10px] text-slate-500">
              questions
            </div>
          </div>
        </section>

        {/* =====================================================
            OUTILS ADMIN
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

                {draftQuestions >
                  0 && (
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
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-xl font-black">
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
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-xl font-black">
                +
              </div>

              <div className="mt-5 text-[9px] font-black uppercase tracking-[0.22em] text-[#a9c9ff]">
                Formation
              </div>

              <h3 className="mt-1 text-xl font-black">
                Ajouter un cours
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Publie un nouveau support PDF.
              </p>

              <div className="mt-5 text-xs font-black text-slate-500 group-hover:text-white">
                Publier →
              </div>
            </Link>

            <Link
              href="/"
              className="group rounded-[30px] border border-white/10 bg-[#202d3d] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-[#28384b]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-xl font-black">
                ↗
              </div>

              <div className="mt-5 text-[9px] font-black uppercase tracking-[0.22em] text-[#a9c9ff]">
                Platform
              </div>

              <h3 className="mt-1 text-xl font-black">
                Voir le site
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Retourner à l&apos;interface étudiante.
              </p>

              <div className="mt-5 text-xs font-black text-slate-500 group-hover:text-white">
                Ouvrir →
              </div>
            </Link>
          </div>
        </section>

        {/* =====================================================
            CONTENU RECENT
        ===================================================== */}

        <section className="mt-10 grid gap-4 lg:grid-cols-2">
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
              {recentQuestions.map(
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
                          {
                            question.question
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
              )}

              {recentQuestions.length ===
                0 && (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                  Aucune question.
                </div>
              )}
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
                      course.module_id ??
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
          </div>
        </section>

        {/* =====================================================
            ETAT CONTENU
        ===================================================== */}

        <section className="mt-10 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                Module monitoring
              </div>

              <h2 className="mt-2 text-2xl font-black">
                État des modules
              </h2>
            </div>

            <div className="mt-6 space-y-2">
              {moduleStats.slice(
                0,
                8,
              ).map(
                (item) => (
                  <div
                    key={
                      item.module.id
                    }
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-xs font-black text-[#a9c9ff]">
                        {moduleNumber(
                          item.module.name,
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black">
                          {moduleTitle(
                            item.module.name,
                          )}
                        </div>

                        <div className="mt-1 text-[9px] text-slate-600">
                          {
                            item.questions
                          }{" "}
                          questions ·{" "}
                          {
                            item.courses
                          }{" "}
                          cours ·{" "}
                          {
                            item.sheets
                          }{" "}
                          fiches
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-black text-[#a9c9ff]">
                          {item.attempts
                            ? `${item.average}%`
                            : "—"}
                        </div>

                        <div className="mt-1 text-[9px] text-slate-600">
                          moyenne
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                Health
              </div>

              <h2 className="mt-2 text-2xl font-black">
                Santé de la plateforme
              </h2>
            </div>

            <div className="mt-6 space-y-3">
              <div className="rounded-2xl bg-white/[0.025] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">
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
                  <span className="text-xs text-slate-400">
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
                  <span className="text-xs text-slate-400">
                    Étudiants actifs
                  </span>

                  <span className="font-black text-emerald-300">
                    {onlineUsers}
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
                              (onlineUsers /
                                profiles.length) *
                                100,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-600">
                      Statut
                    </div>

                    <div className="mt-1 text-sm font-black text-emerald-300">
                      Système opérationnel
                    </div>
                  </div>

                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="h-10" />
      </div>
    </main>
  );
}