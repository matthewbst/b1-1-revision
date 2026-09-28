"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Module = {
  id: number;
  name: string;
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

type ModuleStat = {
  moduleId: number;
  moduleName: string;
  attempts: number;
  average: number;
  best: number;
};

function moduleNumber(name: string) {
  return name.match(/^Module\s+(\d+)/)?.[1] || "";
}

function moduleTitle(name: string) {
  return name.replace(/^Module\s+\d+\s+—\s*/, "");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function QcmAnalysePage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/connexion";
        return;
      }

      const [attemptsResult, modulesResult] = await Promise.all([
        supabase
          .from("qcm_attempts")
          .select(
            "id, user_id, module_id, score, total, percentage, created_at",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("modules")
          .select("id, name")
          .order("id", { ascending: true }),
      ]);

      if (attemptsResult.error) {
        setError(attemptsResult.error.message);
      }

      if (modulesResult.error && !attemptsResult.error) {
        setError(modulesResult.error.message);
      }

      setAttempts(attemptsResult.data || []);
      setModules(modulesResult.data || []);

      setLoading(false);
    }

    loadData();
  }, []);

  const globalAverage = useMemo(() => {
    if (attempts.length === 0) return 0;

    return Math.round(
      attempts.reduce(
        (sum, attempt) => sum + attempt.percentage,
        0,
      ) / attempts.length,
    );
  }, [attempts]);

  const bestScore = useMemo(() => {
    if (attempts.length === 0) return 0;

    return Math.max(
      ...attempts.map((attempt) => attempt.percentage),
    );
  }, [attempts]);

  const moduleStats = useMemo<ModuleStat[]>(() => {
    return modules
      .map((module) => {
        const moduleAttempts = attempts.filter(
          (attempt) => attempt.module_id === module.id,
        );

        if (moduleAttempts.length === 0) {
          return {
            moduleId: module.id,
            moduleName: module.name,
            attempts: 0,
            average: 0,
            best: 0,
          };
        }

        const average = Math.round(
          moduleAttempts.reduce(
            (sum, attempt) => sum + attempt.percentage,
            0,
          ) / moduleAttempts.length,
        );

        const best = Math.max(
          ...moduleAttempts.map(
            (attempt) => attempt.percentage,
          ),
        );

        return {
          moduleId: module.id,
          moduleName: module.name,
          attempts: moduleAttempts.length,
          average,
          best,
        };
      })
      .filter((item) => item.attempts > 0);
  }, [modules, attempts]);

  const recentAttempts = attempts.slice(0, 10);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#182332] px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1300px]">
          <div className="h-56 animate-pulse rounded-[34px] bg-[#202d3d]" />

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-[28px] bg-[#202d3d]"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#182332] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-120px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[130px]" />

        <div className="absolute right-[-140px] top-[35%] h-[500px] w-[500px] rounded-full bg-white/[0.018] blur-[130px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1300px] px-4 py-8 sm:px-6 lg:px-8">
        {/* HERO */}

        <section className="relative overflow-hidden rounded-[38px] border border-white/10 bg-gradient-to-br from-[#233246] via-[#293b4f] to-[#30475d] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.15)] sm:p-10">
          <div className="absolute right-[-100px] top-[-100px] h-[320px] w-[320px] rounded-full bg-white/[0.03] blur-[90px]" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                QCM analysis
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
                ANALYSE
                <br />
                <span className="text-slate-300">
                  DE MES QCM
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Retrouve ici un résumé de tes entraînements,
                tes moyennes et les modules sur lesquels tu
                t&apos;es le plus entraîné.
              </p>
            </div>

            <div className="relative flex h-[210px] w-[210px] items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-white/10" />
              <div className="absolute inset-[30px] rounded-full border border-white/[0.08]" />
              <div className="absolute inset-[58px] rounded-full border border-white/[0.06]" />

              <div className="absolute left-1/2 top-0 h-7 w-px -translate-x-1/2 bg-white/25" />
              <div className="absolute bottom-0 left-1/2 h-7 w-px -translate-x-1/2 bg-white/25" />

              <div className="absolute left-0 top-1/2 h-px w-7 -translate-y-1/2 bg-white/25" />
              <div className="absolute right-0 top-1/2 h-px w-7 -translate-y-1/2 bg-white/25" />

              <svg
                viewBox="0 0 320 320"
                className="relative z-10 h-24 w-24 text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.16)]"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M153 28H167L181 135L162 292H158L139 135L153 28Z" />
                <path d="M140 111L44 177L44 198L151 160L140 111Z" />
                <path d="M180 111L276 177L276 198L169 160L180 111Z" />
                <path d="M140 229L88 274L88 292L151 258L140 229Z" />
                <path d="M180 229L232 274L232 292L169 258L180 229Z" />
                <path d="M153 28L160 10L167 28Z" />
              </svg>
            </div>
          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* STATS */}

        <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">
              QCM réalisés
            </div>

            <div className="mt-3 text-3xl font-black text-white">
              {attempts.length}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">
              Moyenne
            </div>

            <div className="mt-3 text-3xl font-black text-[#a9c9ff]">
              {attempts.length ? `${globalAverage}%` : "—"}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">
              Meilleur score
            </div>

            <div className="mt-3 text-3xl font-black text-white">
              {attempts.length ? `${bestScore}%` : "—"}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">
              Modules travaillés
            </div>

            <div className="mt-3 text-3xl font-black text-white">
              {moduleStats.length}
            </div>
          </div>
        </section>

        {/* MODULE STATS */}

        <section className="mt-10">
          <div className="mb-5">
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              Module performance
            </div>

            <h2 className="mt-2 text-2xl font-black text-white">
              Tes modules
            </h2>
          </div>

          {moduleStats.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-white/10 bg-[#202d3d] p-10 text-center">
              <div className="text-lg font-black text-white">
                Aucun QCM réalisé
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Lance ton premier QCM pour commencer à remplir
                tes statistiques.
              </p>

              <Link
                href="/qcm"
                className="mt-6 inline-flex rounded-2xl bg-[#6ea8ff] px-5 py-3 text-sm font-black text-[#122033]"
              >
                Lancer un QCM →
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {moduleStats.map((item) => {
                const number = moduleNumber(item.moduleName);
                const title = moduleTitle(item.moduleName);

                return (
                  <div
                    key={item.moduleId}
                    className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-sm font-black text-[#a9c9ff]">
                        {number}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-lg font-black text-white">
                          {title}
                        </h3>

                        <div className="mt-1 text-[10px] text-slate-500">
                          {item.attempts} QCM réalisé
                          {item.attempts > 1 ? "s" : ""}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-black text-[#a9c9ff]">
                          {item.average}%
                        </div>

                        <div className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-600">
                          moyenne
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-[#6ea8ff]"
                        style={{
                          width: `${Math.min(
                            100,
                            item.average,
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs">
                      <span className="text-slate-600">
                        Meilleur score
                      </span>

                      <span className="font-black text-white">
                        {item.best}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* RECENT HISTORY */}

        <section className="mt-10 rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                Training history
              </div>

              <h2 className="mt-2 text-2xl font-black text-white">
                Derniers QCM
              </h2>
            </div>

            <Link
              href="/progression"
              className="text-xs font-black text-slate-500 transition hover:text-white"
            >
              Ma progression →
            </Link>
          </div>

          <div className="mt-6 space-y-2">
            {recentAttempts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                Aucun entraînement pour le moment.
              </div>
            ) : (
              recentAttempts.map((attempt) => {
                const module = modules.find(
                  (item) => item.id === attempt.module_id,
                );

                return (
                  <div
                    key={attempt.id}
                    className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-xs font-black text-slate-300">
                      {module
                        ? moduleNumber(module.name)
                        : "?"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black text-white">
                        {module
                          ? moduleTitle(module.name)
                          : "Module"}
                      </div>

                      <div className="mt-1 text-[10px] text-slate-500">
                        {formatDate(attempt.created_at)}
                        {" · "}
                        {attempt.score}/{attempt.total}
                      </div>
                    </div>

                    <div
                      className={`text-lg font-black ${
                        attempt.percentage >= 80
                          ? "text-emerald-300"
                          : attempt.percentage >= 60
                            ? "text-[#a9c9ff]"
                            : "text-red-300"
                      }`}
                    >
                      {attempt.percentage}%
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ACTIONS */}

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <Link
            href="/qcm"
            className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6 transition hover:-translate-y-1 hover:bg-[#28384b]"
          >
            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#a9c9ff]">
              Training
            </div>

            <h3 className="mt-2 text-xl font-black text-white">
              Refaire un QCM
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Continue ton entraînement sur les modules de ton choix.
            </p>

            <div className="mt-5 text-xs font-black text-slate-400">
              Lancer →
            </div>
          </Link>

          <Link
            href="/difficultes"
            className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6 transition hover:-translate-y-1 hover:bg-[#28384b]"
          >
            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#a9c9ff]">
              Review
            </div>

            <h3 className="mt-2 text-xl font-black text-white">
              Voir mes difficultés
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Reviens sur les questions qui t&apos;ont posé problème.
            </p>

            <div className="mt-5 text-xs font-black text-slate-400">
              Ouvrir →
            </div>
          </Link>
        </section>

        <div className="h-8" />
      </div>
    </main>
  );
}