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

function moduleNumber(name: string) {
  return name.match(/^Module\s+(\d+)/)?.[1] || "";
}

function moduleTitle(name: string) {
  return name.replace(/^Module\s+\d+\s+—\s*/, "");
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ProgressionPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/connexion";
        return;
      }

      const [modulesResult, attemptsResult] = await Promise.all([
        supabase
          .from("modules")
          .select("id, name, description")
          .order("id", { ascending: true }),

        supabase
          .from("qcm_attempts")
          .select(
            "id, module_id, score, total, percentage, created_at",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      setModules(modulesResult.data || []);
      setAttempts(attemptsResult.data || []);
      setLoading(false);
    }

    load();
  }, []);

  const average =
    attempts.length > 0
      ? Math.round(
          attempts.reduce(
            (sum, attempt) => sum + attempt.percentage,
            0,
          ) / attempts.length,
        )
      : 0;

  const bestScore =
    attempts.length > 0
      ? Math.max(...attempts.map((attempt) => attempt.percentage))
      : 0;

  const workedModules = new Set(
    attempts.map((attempt) => attempt.module_id),
  ).size;

  const moduleStats = useMemo(() => {
    return modules.map((module) => {
      const moduleAttempts = attempts.filter(
        (attempt) => attempt.module_id === module.id,
      );

      const average =
        moduleAttempts.length > 0
          ? Math.round(
              moduleAttempts.reduce(
                (sum, attempt) => sum + attempt.percentage,
                0,
              ) / moduleAttempts.length,
            )
          : 0;

      const best =
        moduleAttempts.length > 0
          ? Math.max(
              ...moduleAttempts.map(
                (attempt) => attempt.percentage,
              ),
            )
          : 0;

      const lastAttempt = moduleAttempts[0] || null;

      return {
        module,
        attempts: moduleAttempts.length,
        average,
        best,
        lastAttempt,
      };
    });
  }, [modules, attempts]);

  const activeModules = moduleStats.filter(
    (item) => item.attempts > 0,
  );

  const strongest =
    [...activeModules].sort(
      (a, b) => b.average - a.average,
    )[0] || null;

  const needsWork =
    [...activeModules].sort(
      (a, b) => a.average - b.average,
    )[0] || null;

  const recentAttempts = attempts.slice(0, 8);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#182332] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="rounded-2xl border border-white/10 bg-[#202d3d] px-6 py-4 text-sm font-semibold text-slate-300">
            Chargement de ta progression...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#182332] text-white">
      {/* BACKGROUND */}

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-100px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[130px]" />

        <div className="absolute left-[-10%] top-[40%] h-[500px] w-[500px] rounded-full bg-slate-200/[0.02] blur-[120px]" />

        <div className="absolute right-[-10%] top-[25%] h-[500px] w-[500px] rounded-full bg-white/[0.02] blur-[120px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1450px] px-4 py-7 sm:px-6 lg:px-8">
        {/* HEADER */}

        <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#233246] via-[#293b4f] to-[#30475d] p-7 shadow-[0_25px_70px_rgba(0,0,0,0.15)] sm:p-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
                <span className="h-2 w-2 rounded-full bg-[#a9c9ff]" />
                Mon espace
              </div>

              <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
                Ma progression
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Visualise ton niveau général, tes résultats par
                module et l&apos;évolution de tes entraînements.
              </p>
            </div>

            <Link
              href="/qcm"
              className="rounded-2xl bg-[#6ea8ff] px-6 py-4 text-center text-sm font-black text-[#122033] transition hover:bg-[#83b5ff]"
            >
              Continuer à m&apos;entraîner →
            </Link>
          </div>
        </section>

        {/* STATS */}

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
              Moyenne générale
            </div>

            <div className="mt-3 text-4xl font-black text-[#a9c9ff]">
              {attempts.length ? `${average}%` : "—"}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              tous les QCM confondus
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
              Meilleur score
            </div>

            <div className="mt-3 text-4xl font-black text-emerald-300">
              {attempts.length ? `${bestScore}%` : "—"}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              meilleur résultat enregistré
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
              Entraînements
            </div>

            <div className="mt-3 text-4xl font-black text-white">
              {attempts.length}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              QCM terminés
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
              Modules travaillés
            </div>

            <div className="mt-3 text-4xl font-black text-white">
              {workedModules}
              <span className="text-xl text-slate-500">
                /{modules.length}
              </span>
            </div>

            <div className="mt-1 text-xs text-slate-500">
              modules avec un résultat
            </div>
          </div>
        </section>

        {/* VUE GENERALE */}

        <section className="mt-10 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-6 sm:p-7">
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              Niveau général
            </div>

            <h2 className="mt-2 text-2xl font-black text-white">
              Vue d&apos;ensemble
            </h2>

            <div className="mt-7 flex items-end justify-between gap-5">
              <div>
                <div className="text-6xl font-black tracking-[-0.05em] text-white">
                  {attempts.length ? `${average}%` : "—"}
                </div>

                <div className="mt-2 text-sm text-slate-500">
                  moyenne de tes entraînements
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-black text-white">
                  {workedModules}/{modules.length}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  modules travaillés
                </div>
              </div>
            </div>

            <div className="mt-8 h-4 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-[#6ea8ff] transition-all"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, average),
                  )}%`,
                }}
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Niveau le plus élevé
                </div>

                <div className="mt-2 truncate font-black text-white">
                  {strongest
                    ? moduleTitle(strongest.module.name)
                    : "Pas encore disponible"}
                </div>

                {strongest && (
                  <div className="mt-1 text-xs font-bold text-emerald-300">
                    {strongest.average}%
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                  À retravailler
                </div>

                <div className="mt-2 truncate font-black text-white">
                  {needsWork
                    ? moduleTitle(needsWork.module.name)
                    : "Pas encore disponible"}
                </div>

                {needsWork && (
                  <div className="mt-1 text-xs font-bold text-slate-400">
                    {needsWork.average}%
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-6 sm:p-7">
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              Activité
            </div>

            <h2 className="mt-2 text-2xl font-black text-white">
              Derniers résultats
            </h2>

            <div className="mt-6 space-y-2">
              {recentAttempts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                  Aucun résultat pour le moment.
                </div>
              ) : (
                recentAttempts.map((attempt) => {
                  const module = modules.find(
                    (item) => item.id === attempt.module_id,
                  );

                  return (
                    <div
                      key={attempt.id}
                      className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-[10px] font-black text-slate-300">
                        {module
                          ? moduleNumber(module.name)
                          : "QCM"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-black text-white">
                          {module
                            ? moduleTitle(module.name)
                            : "Entraînement"}
                        </div>

                        <div className="mt-1 text-[9px] text-slate-600">
                          {formatDate(attempt.created_at)}
                        </div>
                      </div>

                      <div
                        className={`text-xs font-black ${
                          attempt.percentage >= 80
                            ? "text-emerald-300"
                            : attempt.percentage >= 60
                              ? "text-slate-200"
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
          </div>
        </section>

        {/* MODULES */}

        <section className="mt-10">
          <div className="mb-5">
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              Module performance
            </div>

            <h2 className="mt-2 text-2xl font-black text-white">
              Progression par module
            </h2>
          </div>

          <div className="space-y-3">
            {moduleStats.map(
              ({
                module,
                attempts: moduleAttempts,
                average: moduleAverage,
                best: moduleBest,
                lastAttempt,
              }) => (
                <div
                  key={module.id}
                  className="rounded-3xl border border-white/10 bg-[#202d3d] p-5"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                    <div className="flex items-center gap-4 lg:w-[370px]">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-sm font-black text-slate-200">
                        {moduleNumber(module.name)}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate font-black text-white">
                          {moduleTitle(module.name)}
                        </div>

                        <div className="mt-1 text-[10px] text-slate-500">
                          {moduleAttempts
                            ? `${moduleAttempts} QCM`
                            : "Pas encore travaillé"}
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">
                          Niveau
                        </span>

                        <span className="text-sm font-black text-[#a9c9ff]">
                          {moduleAttempts
                            ? `${moduleAverage}%`
                            : "—"}
                        </span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-[#6ea8ff]"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, moduleAverage),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:w-[300px]">
                      <div className="rounded-xl bg-white/[0.03] p-3">
                        <div className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-600">
                          Meilleur
                        </div>

                        <div className="mt-1 text-sm font-black text-white">
                          {moduleAttempts
                            ? `${moduleBest}%`
                            : "—"}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white/[0.03] p-3">
                        <div className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-600">
                          QCM
                        </div>

                        <div className="mt-1 text-sm font-black text-white">
                          {moduleAttempts}
                        </div>
                      </div>

                      <div className="col-span-2 rounded-xl bg-white/[0.03] p-3 sm:col-span-1">
                        <div className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-600">
                          Dernier
                        </div>

                        <div className="mt-1 text-[10px] font-bold text-slate-300">
                          {lastAttempt
                            ? formatDate(
                                lastAttempt.created_at,
                              )
                            : "—"}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/cours/${module.id}`}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-bold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                      >
                        Cours
                      </Link>

                      <Link
                        href={`/qcm?moduleId=${module.id}`}
                        className="rounded-xl bg-[#6ea8ff] px-4 py-3 text-xs font-black text-[#122033] transition hover:bg-[#83b5ff]"
                      >
                        QCM
                      </Link>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        </section>

        {/* CTA */}

        <section className="mt-10 rounded-[32px] border border-white/10 bg-gradient-to-br from-[#233246] via-[#293b4f] to-[#30475d] p-7 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                Keep training
              </div>

              <h2 className="mt-2 text-2xl font-black text-white">
                Continue à progresser
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Travaille régulièrement les modules qui demandent le
                plus d&apos;attention.
              </p>
            </div>

            <Link
              href="/qcm"
              className="rounded-2xl bg-[#6ea8ff] px-6 py-4 text-center text-sm font-black text-[#122033] transition hover:bg-[#83b5ff]"
            >
              Lancer un QCM →
            </Link>
          </div>
        </section>

        <div className="h-10" />
      </div>
    </main>
  );
}