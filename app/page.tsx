"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Module = {
  id: number;
  name: string;
  description: string | null;
};

type Attempt = {
  id: number;
  module_id: number;
  score: number;
  total: number;
  percentage: number;
  created_at: string;
};

type CourseFile = {
  id: number;
  module_id: number | null;
  title: string;
  created_at: string;
};

type SavedQcm = {
  moduleId?: number;
  selectedModuleId?: number;
  moduleName?: string;
  questions?: unknown[];
  savedAt?: string;
};

function moduleNumber(name: string) {
  const match = name.match(/^Module\s+(\d+)/);
  return match?.[1] || "";
}

function moduleTitle(name: string) {
  return name.replace(/^Module\s+\d+\s+—\s*/, "");
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(
    "fr-FR",
    {
      day: "2-digit",
      month: "short",
    },
  );
}

function getDisplayName(
  user: {
    email?: string;
    user_metadata?: Record<
      string,
      unknown
    >;
  },
) {
  const metadata = user.user_metadata || {};

  const possibleNames = [
    metadata.full_name,
    metadata.name,
    metadata.first_name,
    metadata.given_name,
  ];

  for (const value of possibleNames) {
    if (
      typeof value === "string" &&
      value.trim().length > 0
    ) {
      return value.trim().split(" ")[0];
    }
  }

  if (user.email) {
    const emailName =
      user.email.split("@")[0];

    if (emailName.trim().length > 0) {
      return emailName
        .replace(/[._-]+/g, " ")
        .split(" ")[0]
        .replace(/^\w/, (letter) =>
          letter.toUpperCase(),
        );
    }
  }

  return "Matth";
}

export default function HomePage() {
  const [modules, setModules] = useState<
    Module[]
  >([]);

  const [attempts, setAttempts] = useState<
    Attempt[]
  >([]);

  const [courses, setCourses] = useState<
    CourseFile[]
  >([]);

  const [displayName, setDisplayName] =
    useState("Matth");

  const [savedQcm, setSavedQcm] =
    useState<SavedQcm | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (!session?.user) {
        window.location.href =
          "/connexion?redirect=/";
        return;
      }

      setDisplayName(
        getDisplayName(session.user),
      );

      const [
        modulesResult,
        attemptsResult,
        coursesResult,
      ] = await Promise.all([
        supabase
          .from("modules")
          .select(
            "id, name, description",
          )
          .order("id", {
            ascending: true,
          }),

        supabase
          .from("qcm_attempts")
          .select(
            "id, module_id, score, total, percentage, created_at",
          )
          .eq("user_id", session.user.id)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("course_files")
          .select(
            "id, module_id, title, created_at",
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(3),
      ]);

      setModules(
        modulesResult.data || [],
      );

      setAttempts(
        attemptsResult.data || [],
      );

      setCourses(
        coursesResult.data || [],
      );

      try {
        const saved =
          localStorage.getItem(
            "part66-qcm-en-cours",
          );

        if (saved) {
          const parsed =
            JSON.parse(saved) as SavedQcm;

          if (
            parsed &&
            Array.isArray(
              parsed.questions,
            ) &&
            parsed.questions.length > 0
          ) {
            setSavedQcm(parsed);
          }
        }
      } catch {
        localStorage.removeItem(
          "part66-qcm-en-cours",
        );
      }

      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

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

  const average =
    attempts.length > 0
      ? Math.round(
          attempts.reduce(
            (sum, attempt) =>
              sum + attempt.percentage,
            0,
          ) / attempts.length,
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

  const workedModules = new Set(
    attempts.map(
      (attempt) => attempt.module_id,
    ),
  ).size;

  const lastAttempt =
    attempts[0] || null;

  const lastModule = lastAttempt
    ? moduleMap.get(
        lastAttempt.module_id,
      )
    : null;

  const recentAttempts =
    attempts.slice(0, 5);

  const moduleStats = modules.map(
    (module) => {
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
                  sum + attempt.percentage,
                0,
              ) /
                moduleAttempts.length,
            )
          : 0;

      return {
        module,
        attempts:
          moduleAttempts.length,
        average: moduleAverage,
      };
    },
  );

  const mostWorkedModule =
    [...moduleStats]
      .filter(
        (item) =>
          item.attempts > 0,
      )
      .sort((a, b) => {
        if (
          b.attempts !==
          a.attempts
        ) {
          return (
            b.attempts -
            a.attempts
          );
        }

        return (
          b.average -
          a.average
        );
      })[0] || null;

  const difficultyModule =
    [...moduleStats]
      .filter(
        (item) =>
          item.attempts > 0,
      )
      .sort((a, b) => {
        if (
          a.average !==
          b.average
        ) {
          return (
            a.average -
            b.average
          );
        }

        return (
          b.attempts -
          a.attempts
        );
      })[0] || null;

  const strongestModule =
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

  const modulesToShow =
    moduleStats.slice(0, 6);

  const savedModuleId =
    typeof savedQcm?.moduleId ===
    "number"
      ? savedQcm.moduleId
      : typeof savedQcm?.selectedModuleId ===
          "number"
        ? savedQcm.selectedModuleId
        : null;

  const savedModule =
    savedModuleId !== null
      ? moduleMap.get(savedModuleId)
      : null;

  const resumeHref =
    savedQcm
      ? "/qcm"
      : lastAttempt
        ? `/qcm?moduleId=${lastAttempt.module_id}`
        : "/qcm";

  const resumeLabel = savedQcm
    ? "Reprendre mon dernier QCM"
    : lastAttempt
      ? "Refaire mon dernier QCM"
      : "Commencer mon premier QCM";

  if (loading) {
    return (
      <main className="min-h-screen bg-[#182332] text-white">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 text-sm font-semibold text-slate-300">
            Initialisation...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#182332] text-white">
      {/* ======================================================
          BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[5%] h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-slate-300/[0.035] blur-[130px]" />

        <div className="absolute left-[-10%] top-[30%] h-[500px] w-[500px] rounded-full bg-slate-400/[0.03] blur-[120px]" />

        <div className="absolute right-[-10%] top-[20%] h-[500px] w-[500px] rounded-full bg-slate-200/[0.025] blur-[120px]" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px)",
            backgroundSize:
              "50px 50px",
          }}
        />

        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.4) 0px, rgba(255,255,255,0.4) 1px, transparent 1px, transparent 6px)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* ======================================================
            TOP BAR
        ====================================================== */}

        <div className="mb-5 flex items-center justify-between border-b border-white/[0.10] pb-4">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.7)]" />

            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
              Système opérationnel
            </span>
          </div>

          <div className="hidden text-[9px] font-black uppercase tracking-[0.22em] text-slate-500 sm:block">
            PART-66 · B1.1 · TURBINE AIRCRAFT
          </div>
        </div>

        {/* ======================================================
            ESPACE PERSONNEL
        ====================================================== */}

        <section className="mb-5 rounded-[32px] border border-white/[0.10] bg-[#202d3d] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.14)] sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
                MON ESPACE
              </div>

              <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Bonjour {displayName} 👋
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Voici les éléments importants
                pour reprendre tes révisions
                rapidement.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[760px] xl:grid-cols-4">
              {/* REPRENDRE */}
              <Link
                href={resumeHref}
                className="group rounded-2xl border border-[#a9c9ff]/15 bg-[#a9c9ff]/[0.06] p-4 transition hover:border-[#a9c9ff]/30 hover:bg-[#a9c9ff]/[0.09]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xl">
                    ▶
                  </span>

                  <span className="text-slate-500 transition group-hover:translate-x-1 group-hover:text-white">
                    →
                  </span>
                </div>

                <div className="mt-4 text-[8px] font-black uppercase tracking-[0.22em] text-[#a9c9ff]">
                  Continuer
                </div>

                <div className="mt-1 text-sm font-black leading-5 text-white">
                  {resumeLabel}
                </div>

                <div className="mt-1 text-[10px] text-slate-500">
                  {savedQcm
                    ? savedModule?.name
                      ? moduleTitle(
                          savedModule.name,
                        )
                      : savedQcm.moduleName ||
                        "QCM sauvegardé"
                    : lastAttempt &&
                        lastModule
                      ? moduleTitle(
                          lastModule.name,
                        )
                      : "Aucun QCM terminé"}
                </div>
              </Link>

              {/* PLUS TRAVAILLÉ */}
              <Link
                href={
                  mostWorkedModule
                    ? `/cours/${mostWorkedModule.module.id}`
                    : "/cours"
                }
                className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-white/15 hover:bg-white/[0.05]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xl">
                    📚
                  </span>

                  <span className="text-slate-500 transition group-hover:translate-x-1 group-hover:text-white">
                    →
                  </span>
                </div>

                <div className="mt-4 text-[8px] font-black uppercase tracking-[0.22em] text-[#a9c9ff]">
                  Le plus travaillé
                </div>

                <div className="mt-1 truncate text-sm font-black text-white">
                  {mostWorkedModule
                    ? moduleTitle(
                        mostWorkedModule
                          .module.name,
                      )
                    : "Pas encore disponible"}
                </div>

                <div className="mt-1 text-[10px] text-slate-500">
                  {mostWorkedModule
                    ? `${mostWorkedModule.attempts} QCM réalisés`
                    : "Commence un premier QCM"}
                </div>
              </Link>

              {/* DIFFICULTÉ */}
              <Link
                href={
                  difficultyModule
                    ? `/cours/${difficultyModule.module.id}`
                    : "/difficultes"
                }
                className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-white/15 hover:bg-white/[0.05]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xl">
                    🎯
                  </span>

                  <span className="text-slate-500 transition group-hover:translate-x-1 group-hover:text-white">
                    →
                  </span>
                </div>

                <div className="mt-4 text-[8px] font-black uppercase tracking-[0.22em] text-[#a9c9ff]">
                  À retravailler
                </div>

                <div className="mt-1 truncate text-sm font-black text-white">
                  {difficultyModule
                    ? moduleTitle(
                        difficultyModule
                          .module.name,
                      )
                    : "Pas encore identifié"}
                </div>

                <div className="mt-1 text-[10px] text-slate-500">
                  {difficultyModule
                    ? `${difficultyModule.average}% de moyenne`
                    : "Fais quelques QCM"}
                </div>
              </Link>

              {/* DERNIER COURS */}
              <Link
                href={
                  courses[0]?.module_id
                    ? `/cours/${courses[0].module_id}`
                    : "/cours"
                }
                className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-white/15 hover:bg-white/[0.05]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xl">
                    📄
                  </span>

                  <span className="text-slate-500 transition group-hover:translate-x-1 group-hover:text-white">
                    →
                  </span>
                </div>

                <div className="mt-4 text-[8px] font-black uppercase tracking-[0.22em] text-[#a9c9ff]">
                  Dernier cours
                </div>

                <div className="mt-1 truncate text-sm font-black text-white">
                  {courses[0]
                    ? courses[0].title
                    : "Aucun cours disponible"}
                </div>

                <div className="mt-1 text-[10px] text-slate-500">
                  {courses[0]
                    ? formatDate(
                        courses[0].created_at,
                      )
                    : "Consulte les cours"}
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* ======================================================
            HERO
        ====================================================== */}

        <section className="relative overflow-hidden rounded-[40px] border border-white/[0.12] bg-gradient-to-br from-[#233246] via-[#26384b] to-[#30475d] shadow-[0_35px_90px_rgba(0,0,0,0.20)]">
          <div className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.025] blur-[100px]" />

          <div className="relative grid min-h-[760px] lg:grid-cols-[0.82fr_1.18fr]">
            {/* ==================================================
                TEXTE GAUCHE
            ================================================== */}

            <div className="relative z-20 flex flex-col justify-center p-7 sm:p-10 lg:p-14">
              <div className="w-fit rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-[9px] font-black uppercase tracking-[0.28em] text-slate-200">
                Maintenance training
              </div>

              <div className="mt-7 text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">
                Formation professionnelle
              </div>

              <h1 className="mt-3 text-5xl font-black leading-[0.88] tracking-[-0.06em] text-white sm:text-6xl lg:text-7xl">
                PART-66
                <br />
                <span className="text-[#a9c9ff]">
                  B1.1
                </span>
              </h1>

              <p className="mt-7 max-w-lg text-base leading-7 text-slate-300">
                Ton espace de préparation
                pour apprendre, réviser,
                t&apos;entraîner et suivre ta
                progression en maintenance
                aéronautique.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={resumeHref}
                  className="rounded-2xl bg-[#6ea8ff] px-6 py-4 text-sm font-black text-[#122033] shadow-lg shadow-black/10 transition hover:bg-[#83b5ff]"
                >
                  {savedQcm
                    ? "Reprendre mon QCM"
                    : lastAttempt
                      ? "Continuer ma révision"
                      : "Commencer un QCM"}
                </Link>

                <Link
                  href="/cours"
                  className="rounded-2xl border border-white/15 bg-white/[0.07] px-6 py-4 text-sm font-bold text-white transition hover:bg-white/[0.12]"
                >
                  Voir les cours
                </Link>
              </div>

              {lastAttempt && (
                <div className="mt-10 max-w-md rounded-2xl border border-white/10 bg-black/[0.10] p-4">
                  <div className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">
                    Dernier entraînement
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    <div className="truncate text-sm font-black text-white">
                      {lastModule
                        ? moduleTitle(
                            lastModule.name,
                          )
                        : "QCM"}
                    </div>

                    <div className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-black text-slate-200">
                      {lastAttempt.percentage}
                      %
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ==================================================
                AVION CENTRAL
            ================================================== */}

            <div className="relative min-h-[620px] lg:min-h-[760px]">
              <div className="absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-200/[0.025] blur-[100px]" />

              <div className="absolute left-[5%] right-[5%] top-1/2 h-px bg-white/[0.18]" />

              <div className="absolute left-[12%] right-[12%] top-1/2 border-t border-dashed border-white/[0.14]" />

              <div className="absolute left-[20%] right-[20%] top-[31%] border-t border-white/[0.07]" />

              <div className="absolute left-[20%] right-[20%] top-[69%] border-t border-white/[0.07]" />

              <div className="absolute left-[30%] top-[12%] bottom-[12%] w-px bg-white/[0.045]" />

              <div className="absolute right-[30%] top-[12%] bottom-[12%] w-px bg-white/[0.045]" />

              <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.16]">
                <div className="absolute inset-[42px] rounded-full border border-white/[0.11]" />

                <div className="absolute inset-[105px] rounded-full border border-white/[0.09]" />

                <div className="absolute inset-[170px] rounded-full border border-white/[0.07]" />

                <div className="absolute left-1/2 top-0 h-10 w-px -translate-x-1/2 bg-white/30" />

                <div className="absolute bottom-0 left-1/2 h-10 w-px -translate-x-1/2 bg-white/30" />

                <div className="absolute left-0 top-1/2 h-px w-10 -translate-y-1/2 bg-white/30" />

                <div className="absolute right-0 top-1/2 h-px w-10 -translate-y-1/2 bg-white/30" />
              </div>

              <div className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.015] blur-xl" />

              {/* AVION */}

              <svg
                viewBox="0 0 320 320"
                className="absolute left-1/2 top-1/2 z-20 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.18)] sm:h-[320px] sm:w-[320px]"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M153 28H167L181 135L162 292H158L139 135L153 28Z" />

                <path d="M140 111L44 177L44 198L151 160L140 111Z" />

                <path d="M180 111L276 177L276 198L169 160L180 111Z" />

                <path d="M140 229L88 274L88 292L151 258L140 229Z" />

                <path d="M180 229L232 274L232 292L169 258L180 229Z" />

                <path d="M153 28L160 10L167 28Z" />

                <path
                  d="M160 43L164 132L160 245L156 132L160 43Z"
                  fill="rgba(169,201,255,0.85)"
                />
              </svg>

              {/* REPÈRE CENTRAL */}

              <div className="absolute left-1/2 top-1/2 z-30 h-24 w-24 -translate-x-1/2 -translate-y-1/2">
                <div className="absolute left-1/2 top-0 h-9 w-px -translate-x-1/2 bg-[#a9c9ff]/60" />

                <div className="absolute bottom-0 left-1/2 h-9 w-px -translate-x-1/2 bg-[#a9c9ff]/60" />

                <div className="absolute left-0 top-1/2 h-px w-9 -translate-y-1/2 bg-[#a9c9ff]/60" />

                <div className="absolute right-0 top-1/2 h-px w-9 -translate-y-1/2 bg-[#a9c9ff]/60" />
              </div>

              {/* INFOS */}

              <div className="absolute left-7 top-7">
                <div className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                  AIRCRAFT
                </div>

                <div className="mt-1 text-xl font-black text-white">
                  B1.1
                </div>
              </div>

              <div className="absolute right-7 top-7 text-right">
                <div className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                  CONFIG
                </div>

                <div className="mt-1 text-xl font-black text-white">
                  TURBINE
                </div>
              </div>

              <div className="absolute bottom-7 left-7">
                <div className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                  MODE
                </div>

                <div className="mt-1 text-xl font-black text-white">
                  STUDENT
                </div>
              </div>

              <div className="absolute bottom-7 right-7 text-right">
                <div className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400">
                  STATUS
                </div>

                <div className="mt-1 flex items-center justify-end gap-2 text-xl font-black text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]" />

                  READY
                </div>
              </div>

              {/* GRADUATIONS */}

              <div className="absolute left-5 top-1/2 flex -translate-y-1/2 flex-col gap-6">
                <span className="h-px w-7 bg-white/15" />
                <span className="h-px w-4 bg-white/8" />
                <span className="h-px w-7 bg-white/15" />
                <span className="h-px w-4 bg-white/8" />
                <span className="h-px w-7 bg-white/15" />
                <span className="h-px w-4 bg-white/8" />
                <span className="h-px w-7 bg-white/15" />
              </div>

              <div className="absolute right-5 top-1/2 flex -translate-y-1/2 flex-col items-end gap-6">
                <span className="h-px w-7 bg-white/15" />
                <span className="h-px w-4 bg-white/8" />
                <span className="h-px w-7 bg-white/15" />
                <span className="h-px w-4 bg-white/8" />
                <span className="h-px w-7 bg-white/15" />
                <span className="h-px w-4 bg-white/8" />
                <span className="h-px w-7 bg-white/15" />
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================
            STATS
        ====================================================== */}

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400">
              QCM réalisés
            </div>

            <div className="mt-3 text-3xl font-black text-white">
              {attempts.length}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              entraînements terminés
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400">
              Moyenne
            </div>

            <div className="mt-3 text-3xl font-black text-[#a9c9ff]">
              {attempts.length
                ? `${average}%`
                : "—"}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              sur tous tes QCM
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400">
              Meilleur score
            </div>

            <div className="mt-3 text-3xl font-black text-emerald-300">
              {attempts.length
                ? `${bestScore}%`
                : "—"}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              meilleur résultat
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400">
              Formation
            </div>

            <div className="mt-3 text-3xl font-black text-white">
              B1.1
            </div>

            <div className="mt-1 text-xs text-slate-500">
              maintenance aéronautique
            </div>
          </div>
        </section>

        {/* ======================================================
            CENTRE D'ENTRAINEMENT
        ====================================================== */}

        <section className="mt-12">
          <div className="mb-5">
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
              Training
            </div>

            <h2 className="mt-2 text-2xl font-black text-white">
              Ton espace de travail
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Link
              href="/cours"
              className="group rounded-3xl border border-white/10 bg-[#202d3d] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-[#28384b]"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">
                  📚
                </span>

                <span className="text-slate-500 transition group-hover:text-white">
                  →
                </span>
              </div>

              <div className="mt-6 text-[9px] font-black uppercase tracking-[0.24em] text-[#a9c9ff]">
                Study
              </div>

              <h3 className="mt-1 text-xl font-black text-white">
                Cours
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Étudie les modules de ta
                formation.
              </p>
            </Link>

            <Link
              href="/qcm"
              className="group rounded-3xl border border-white/10 bg-[#202d3d] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-[#28384b]"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">
                  📝
                </span>

                <span className="text-slate-500 transition group-hover:text-white">
                  →
                </span>
              </div>

              <div className="mt-6 text-[9px] font-black uppercase tracking-[0.24em] text-[#a9c9ff]">
                Training
              </div>

              <h3 className="mt-1 text-xl font-black text-white">
                QCM
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Entraîne-toi et mesure ton
                niveau.
              </p>
            </Link>

            <Link
              href="/fiches"
              className="group rounded-3xl border border-white/10 bg-[#202d3d] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-[#28384b]"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">
                  📄
                </span>

                <span className="text-slate-500 transition group-hover:text-white">
                  →
                </span>
              </div>

              <div className="mt-6 text-[9px] font-black uppercase tracking-[0.24em] text-[#a9c9ff]">
                Revision
              </div>

              <h3 className="mt-1 text-xl font-black text-white">
                Fiches
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Retrouve tes supports de
                révision.
              </p>
            </Link>

            <Link
              href="/difficultes"
              className="group rounded-3xl border border-white/10 bg-[#202d3d] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-[#28384b]"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">
                  🎯
                </span>

                <span className="text-slate-500 transition group-hover:text-white">
                  →
                </span>
              </div>

              <div className="mt-6 text-[9px] font-black uppercase tracking-[0.24em] text-[#a9c9ff]">
                Analysis
              </div>

              <h3 className="mt-1 text-xl font-black text-white">
                Mes difficultés
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Retravaille tes points
                faibles.
              </p>
            </Link>
          </div>
        </section>

        {/* ======================================================
            DERNIERS COURS
        ====================================================== */}

        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
                Nouveautés
              </div>

              <h2 className="mt-2 text-2xl font-black text-white">
                Derniers cours ajoutés
              </h2>
            </div>

            <Link
              href="/cours"
              className="text-xs font-bold text-slate-400 hover:text-white"
            >
              Voir tous les cours →
            </Link>
          </div>

          {courses.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-3">
              {courses.map(
                (course) => {
                  const courseModule =
                    course.module_id
                      ? moduleMap.get(
                          course.module_id,
                        )
                      : null;

                  return (
                    <Link
                      key={course.id}
                      href={
                        course.module_id
                          ? `/cours/${course.module_id}`
                          : "/cours"
                      }
                      className="group rounded-3xl border border-white/10 bg-[#202d3d] p-5 transition hover:-translate-y-1 hover:border-white/20 hover:bg-[#28384b]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#a9c9ff]/10 text-lg">
                          📘
                        </div>

                        <span className="text-slate-500 transition group-hover:translate-x-1 group-hover:text-white">
                          →
                        </span>
                      </div>

                      <div className="mt-5 text-[8px] font-black uppercase tracking-[0.24em] text-[#a9c9ff]">
                        {courseModule
                          ? courseModule.name
                          : "Cours"}
                      </div>

                      <h3 className="mt-2 line-clamp-2 text-lg font-black leading-6 text-white">
                        {course.title}
                      </h3>

                      <div className="mt-3 text-[10px] text-slate-500">
                        Ajouté le{" "}
                        {formatDate(
                          course.created_at,
                        )}
                      </div>
                    </Link>
                  );
                },
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-[#202d3d] p-8 text-center">
              <div className="text-2xl">
                📚
              </div>

              <div className="mt-3 text-sm font-black text-white">
                Aucun nouveau cours
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Les nouveaux supports
                apparaîtront ici.
              </div>
            </div>
          )}
        </section>

        {/* ======================================================
            ZONE PERSONNELLE
        ====================================================== */}

        <section className="mt-12 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                  Activité récente
                </div>

                <h2 className="mt-2 text-2xl font-black text-white">
                  Tes derniers entraînements
                </h2>
              </div>

              <Link
                href="/progression"
                className="text-xs font-bold text-slate-400 hover:text-white"
              >
                Voir tout →
              </Link>
            </div>

            <div className="mt-6">
              {recentAttempts.length >
              0 ? (
                <div className="space-y-2">
                  {recentAttempts.map(
                    (attempt) => {
                      const module =
                        moduleMap.get(
                          attempt.module_id,
                        );

                      return (
                        <div
                          key={
                            attempt.id
                          }
                          className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-xs font-black text-slate-200">
                            {module
                              ? moduleNumber(
                                  module.name,
                                )
                              : "QCM"}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-black text-white">
                              {module
                                ? moduleTitle(
                                    module.name,
                                  )
                                : "Entraînement"}
                            </div>

                            <div className="mt-1 text-[10px] text-slate-500">
                              {formatDate(
                                attempt.created_at,
                              )}{" "}
                              ·{" "}
                              {
                                attempt.score
                              }
                              /
                              {
                                attempt.total
                              }
                            </div>
                          </div>

                          <div
                            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${
                              attempt.percentage >=
                              80
                                ? "bg-emerald-400/10 text-emerald-300"
                                : attempt.percentage >=
                                    60
                                  ? "bg-white/[0.07] text-slate-200"
                                  : "bg-orange-400/10 text-orange-300"
                            }`}
                          >
                            {
                              attempt.percentage
                            }
                            %
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                  <div className="text-2xl">
                    ✈️
                  </div>

                  <div className="mt-3 text-sm font-black text-white">
                    Aucun entraînement
                    pour le moment
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Lance ton premier
                    QCM pour commencer.
                  </div>

                  <Link
                    href="/qcm"
                    className="mt-5 inline-flex rounded-xl bg-[#6ea8ff] px-4 py-3 text-xs font-black text-[#122033] hover:bg-[#83b5ff]"
                  >
                    Commencer un
                    QCM
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-6">
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              Vue d&apos;ensemble
            </div>

            <h2 className="mt-2 text-2xl font-black text-white">
              Ton niveau
            </h2>

            <div className="mt-7">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-5xl font-black text-[#a9c9ff]">
                    {attempts.length
                      ? `${average}%`
                      : "—"}
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    moyenne générale
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black text-white">
                    {workedModules}/
                    {modules.length}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    modules travaillés
                  </div>
                </div>
              </div>

              <div className="mt-7 h-3 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-[#6ea8ff]"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(
                        100,
                        average,
                      ),
                    )}%`,
                  }}
                />
              </div>

              <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Meilleur module
                </div>

                <div className="mt-2 font-black text-white">
                  {strongestModule
                    ? moduleTitle(
                        strongestModule
                          .module.name,
                      )
                    : "Pas encore disponible"}
                </div>

                {strongestModule && (
                  <div className="mt-1 text-xs font-bold text-emerald-300">
                    {
                      strongestModule.average
                    }
                    % de moyenne
                  </div>
                )}
              </div>

              {difficultyModule && (
                <div className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                  <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">
                    À retravailler
                  </div>

                  <div className="mt-2 font-black text-white">
                    {moduleTitle(
                      difficultyModule
                        .module.name,
                    )}
                  </div>

                  <div className="mt-1 text-xs font-bold text-orange-300">
                    {
                      difficultyModule.average
                    }
                    % de moyenne
                  </div>
                </div>
              )}

              <Link
                href="/progression"
                className="mt-4 flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                Ouvrir ma progression
              </Link>
            </div>
          </div>
        </section>

        {/* ======================================================
            MODULES RAPIDES
        ====================================================== */}

        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
                Quick access
              </div>

              <h2 className="mt-2 text-2xl font-black text-white">
                Modules
              </h2>
            </div>

            <Link
              href="/cours"
              className="text-xs font-bold text-slate-400 hover:text-white"
            >
              Tous les modules →
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modulesToShow.map(
              ({
                module,
                attempts: count,
                average: avg,
              }) => (
                <Link
                  key={module.id}
                  href={`/cours/${module.id}`}
                  className="group rounded-2xl border border-white/10 bg-[#202d3d] p-4 transition hover:border-white/20 hover:bg-[#28384b]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-xs font-black text-slate-200">
                      {moduleNumber(
                        module.name,
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-black text-white">
                        {moduleTitle(
                          module.name,
                        )}
                      </div>

                      <div className="mt-1 text-[10px] text-slate-500">
                        {count
                          ? `${count} QCM · ${avg}%`
                          : "Pas encore commencé"}
                      </div>
                    </div>

                    <span className="text-slate-500 transition group-hover:translate-x-1 group-hover:text-white">
                      →
                    </span>
                  </div>
                </Link>
              ),
            )}
          </div>
        </section>

        {/* ======================================================
            CTA
        ====================================================== */}

        <section className="relative mt-12 overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-r from-[#233246] via-[#293b4f] to-[#30475d] p-8 sm:p-10">
          <div className="absolute right-[-80px] top-[-100px] h-[300px] w-[300px] rounded-full bg-white/[0.035] blur-[90px]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
                Ready for training
              </div>

              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                Prêt pour ton prochain
                entraînement ?
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                Continue tes révisions et
                progresse progressivement
                vers ton objectif B1.1.
              </p>
            </div>

            <Link
              href={
                savedQcm
                  ? "/qcm"
                  : "/qcm"
              }
              className="rounded-2xl bg-[#6ea8ff] px-7 py-4 text-center text-sm font-black text-[#122033] shadow-lg shadow-black/10 transition hover:bg-[#83b5ff]"
            >
              {savedQcm
                ? "Reprendre mon QCM →"
                : "Lancer un QCM →"}
            </Link>
          </div>
        </section>

        <div className="h-10" />
      </div>
    </main>
  );
}