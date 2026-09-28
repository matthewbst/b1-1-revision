"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Module = {
  id: number;
  name: string;
};

type Question = {
  id: number;
  question: string;
  module_id: number;
  status: string;
};

type Attempt = {
  id: number;
  module_id: number;
  score: number;
  total: number;
  percentage: number;
  wrong_question_ids: number[];
  created_at: string;
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
    month: "short",
    year: "numeric",
  });
}

export default function QcmErreursPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  const [selectedModule, setSelectedModule] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/connexion";
        return;
      }

      const [modulesResult, questionsResult, attemptsResult] =
        await Promise.all([
          supabase
            .from("modules")
            .select("id, name")
            .order("id", { ascending: true }),

          supabase
            .from("questions")
            .select("id, question, module_id, status")
            .eq("status", "approved")
            .order("id", { ascending: true }),

          supabase
            .from("qcm_attempts")
            .select(
              "id, module_id, score, total, percentage, wrong_question_ids, created_at",
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

      if (modulesResult.error) {
        setError(modulesResult.error.message);
      } else if (questionsResult.error) {
        setError(questionsResult.error.message);
      } else if (attemptsResult.error) {
        setError(attemptsResult.error.message);
      }

      setModules(modulesResult.data || []);
      setQuestions(questionsResult.data || []);

      const safeAttempts: Attempt[] = (attemptsResult.data || []).map(
        (attempt) => ({
          id: Number(attempt.id),
          module_id: Number(attempt.module_id),
          score: Number(attempt.score),
          total: Number(attempt.total),
          percentage: Number(attempt.percentage),
          wrong_question_ids: Array.isArray(
            attempt.wrong_question_ids,
          )
            ? attempt.wrong_question_ids.map(Number)
            : [],
          created_at: attempt.created_at,
        }),
      );

      setAttempts(safeAttempts);
      setLoading(false);
    }

    loadData();
  }, []);

  const errorCounts = useMemo(() => {
    const counts = new Map<number, number>();

    for (const attempt of attempts) {
      for (const questionId of attempt.wrong_question_ids || []) {
        counts.set(
          questionId,
          (counts.get(questionId) || 0) + 1,
        );
      }
    }

    return counts;
  }, [attempts]);

  const totalErrors = useMemo(() => {
    return attempts.reduce(
      (sum, attempt) =>
        sum + (attempt.wrong_question_ids?.length || 0),
      0,
    );
  }, [attempts]);

  const uniqueErrorQuestions = useMemo(() => {
    return errorCounts.size;
  }, [errorCounts]);

  const filteredQuestions = useMemo(() => {
    const result = questions
      .filter((question) => errorCounts.has(question.id))
      .map((question) => ({
        ...question,
        errorCount: errorCounts.get(question.id) || 0,
      }))
      .sort((a, b) => {
        if (b.errorCount !== a.errorCount) {
          return b.errorCount - a.errorCount;
        }

        return a.id - b.id;
      });

    if (selectedModule === "all") {
      return result;
    }

    return result.filter(
      (question) =>
        String(question.module_id) === selectedModule,
    );
  }, [questions, errorCounts, selectedModule]);

  const moduleStats = useMemo(() => {
    return modules
      .map((module) => {
        const moduleAttempts = attempts.filter(
          (attempt) => attempt.module_id === module.id,
        );

        const moduleErrors = moduleAttempts.reduce(
          (sum, attempt) =>
            sum + (attempt.wrong_question_ids?.length || 0),
          0,
        );

        const moduleQuestions = questions.filter(
          (question) => question.module_id === module.id,
        );

        const uniqueQuestions = new Set<number>();

        for (const attempt of moduleAttempts) {
          for (const questionId of attempt.wrong_question_ids || []) {
            uniqueQuestions.add(questionId);
          }
        }

        return {
          module,
          attempts: moduleAttempts.length,
          errors: moduleErrors,
          questionsInDifficulty: uniqueQuestions.size,
          approvedQuestions: moduleQuestions.length,
        };
      })
      .filter((item) => item.attempts > 0)
      .sort((a, b) => b.errors - a.errors);
  }, [modules, attempts, questions]);

  const recentAttempts = attempts.slice(0, 8);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#182332] px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1350px]">
          <div className="h-[280px] animate-pulse rounded-[38px] bg-[#202d3d]" />

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
      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-120px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[130px]" />

        <div className="absolute left-[-140px] top-[40%] h-[500px] w-[500px] rounded-full bg-white/[0.018] blur-[130px]" />

        <div className="absolute right-[-140px] top-[20%] h-[500px] w-[500px] rounded-full bg-white/[0.015] blur-[130px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1350px] px-4 py-8 sm:px-6 lg:px-8">
        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="relative overflow-hidden rounded-[38px] border border-white/10 bg-gradient-to-br from-[#233246] via-[#293b4f] to-[#30475d] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.15)] sm:p-10">
          <div className="absolute right-[-100px] top-[-100px] h-[320px] w-[320px] rounded-full bg-white/[0.03] blur-[90px]" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                Review center
              </div>

              <h1 className="mt-4 text-4xl font-black leading-[0.92] tracking-[-0.05em] text-white sm:text-5xl">
                MES
                <br />
                <span className="text-slate-300">
                  DIFFICULTÉS
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Retrouve les questions que tu as ratées pendant
                tes QCM pour cibler ta révision.
              </p>
            </div>

            <div className="relative flex h-[220px] w-[220px] items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-white/10" />
              <div className="absolute inset-[30px] rounded-full border border-white/[0.08]" />
              <div className="absolute inset-[60px] rounded-full border border-white/[0.06]" />

              <div className="absolute left-1/2 top-0 h-7 w-px -translate-x-1/2 bg-white/25" />
              <div className="absolute bottom-0 left-1/2 h-7 w-px -translate-x-1/2 bg-white/25" />
              <div className="absolute left-0 top-1/2 h-px w-7 -translate-y-1/2 bg-white/25" />
              <div className="absolute right-0 top-1/2 h-px w-7 -translate-y-1/2 bg-white/25" />

              <svg
                viewBox="0 0 320 320"
                className="relative z-10 h-28 w-28 text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.16)]"
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

        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* =====================================================
            STATS
        ===================================================== */}

        <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">
              Erreurs cumulées
            </div>

            <div className="mt-3 text-3xl font-black text-red-300">
              {totalErrors}
            </div>

            <div className="mt-1 text-[10px] text-slate-600">
              réponses incorrectes
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">
              Questions à revoir
            </div>

            <div className="mt-3 text-3xl font-black text-white">
              {uniqueErrorQuestions}
            </div>

            <div className="mt-1 text-[10px] text-slate-600">
              questions distinctes
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">
              QCM réalisés
            </div>

            <div className="mt-3 text-3xl font-black text-white">
              {attempts.length}
            </div>

            <div className="mt-1 text-[10px] text-slate-600">
              entraînements enregistrés
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">
              Modules concernés
            </div>

            <div className="mt-3 text-3xl font-black text-[#a9c9ff]">
              {moduleStats.length}
            </div>

            <div className="mt-1 text-[10px] text-slate-600">
              avec au moins une erreur
            </div>
          </div>
        </section>

        {/* =====================================================
            FILTRE
        ===================================================== */}

        <section className="mt-10 rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.27em] text-[#a9c9ff]">
                Review filter
              </div>

              <h2 className="mt-2 text-xl font-black text-white">
                Filtrer par module
              </h2>
            </div>

            <select
              value={selectedModule}
              onChange={(event) =>
                setSelectedModule(event.target.value)
              }
              className="w-full rounded-2xl border border-white/10 bg-[#182332] px-4 py-3 text-sm font-semibold text-white outline-none md:w-[320px]"
            >
              <option value="all">
                Tous les modules
              </option>

              {modules.map((module) => (
                <option
                  key={module.id}
                  value={String(module.id)}
                >
                  {module.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* =====================================================
            QUESTIONS
        ===================================================== */}

        <section className="mt-10">
          <div className="mb-5">
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              Questions to review
            </div>

            <h2 className="mt-2 text-2xl font-black text-white">
              Questions à travailler
            </h2>
          </div>

          {filteredQuestions.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-white/10 bg-[#202d3d] p-10 text-center">
              <div className="text-lg font-black text-white">
                Aucune difficulté trouvée
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {attempts.length === 0
                  ? "Fais ton premier QCM pour commencer à analyser tes erreurs."
                  : "Aucune erreur ne correspond au filtre sélectionné."}
              </p>

              <Link
                href="/qcm"
                className="mt-6 inline-flex rounded-2xl bg-[#6ea8ff] px-5 py-3 text-sm font-black text-[#122033]"
              >
                Lancer un QCM →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((question) => {
                const module = modules.find(
                  (item) => item.id === question.module_id,
                );

                return (
                  <div
                    key={question.id}
                    className="rounded-[28px] border border-white/10 bg-[#202d3d] p-5 transition hover:border-white/15 hover:bg-[#243347]"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                      <div className="flex min-w-0 flex-1 gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-400/10 text-xs font-black text-red-300">
                          {question.errorCount}
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm font-black leading-6 text-white">
                            {question.question}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                            {module && (
                              <span>
                                M{moduleNumber(module.name)} ·{" "}
                                {moduleTitle(module.name)}
                              </span>
                            )}

                            <span>·</span>

                            <span>
                              {question.errorCount} erreur
                              {question.errorCount > 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Link
                        href={`/qcm?moduleId=${question.module_id}`}
                        className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                      >
                        Retravailler →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* =====================================================
            MODULES PROBLEMATIQUES
        ===================================================== */}

        <section className="mt-10">
          <div className="mb-5">
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              Module overview
            </div>

            <h2 className="mt-2 text-2xl font-black text-white">
              Modules avec le plus d&apos;erreurs
            </h2>
          </div>

          {moduleStats.length === 0 ? (
            <div className="rounded-[30px] border border-white/10 bg-[#202d3d] p-8 text-sm text-slate-500">
              Aucun module à analyser pour le moment.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {moduleStats.slice(0, 6).map((item) => (
                <button
                  key={item.module.id}
                  type="button"
                  onClick={() =>
                    setSelectedModule(String(item.module.id))
                  }
                  className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6 text-left transition hover:-translate-y-1 hover:border-white/20 hover:bg-[#243347]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-400/10 text-sm font-black text-red-300">
                      {moduleNumber(item.module.name)}
                    </div>

                    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                      {item.errors} erreur
                      {item.errors > 1 ? "s" : ""}
                    </div>
                  </div>

                  <h3 className="mt-5 text-lg font-black text-white">
                    {moduleTitle(item.module.name)}
                  </h3>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-white/[0.025] p-3">
                      <div className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-600">
                        QCM
                      </div>

                      <div className="mt-1 text-lg font-black text-white">
                        {item.attempts}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/[0.025] p-3">
                      <div className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-600">
                        Questions
                      </div>

                      <div className="mt-1 text-lg font-black text-white">
                        {item.questionsInDifficulty}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-red-400"
                      style={{
                        width: `${Math.min(
                          100,
                          item.errors * 10,
                        )}%`,
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* =====================================================
            HISTORIQUE
        ===================================================== */}

        <section className="mt-10 rounded-[30px] border border-white/10 bg-[#202d3d] p-6">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              Training history
            </div>

            <h2 className="mt-2 text-2xl font-black text-white">
              Historique récent
            </h2>
          </div>

          <div className="mt-6 space-y-2">
            {recentAttempts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                Aucun QCM réalisé.
              </div>
            ) : (
              recentAttempts.map((attempt) => {
                const module = modules.find(
                  (item) => item.id === attempt.module_id,
                );

                const wrongCount =
                  attempt.wrong_question_ids?.length || 0;

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
                        {" · "}
                        {wrongCount} erreur
                        {wrongCount > 1 ? "s" : ""}
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

        {/* =====================================================
            CTA
        ===================================================== */}

        <section className="mt-10 rounded-[30px] border border-white/10 bg-[#202d3d] p-6 sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#a9c9ff]">
                Training
              </div>

              <h2 className="mt-2 text-2xl font-black text-white">
                Continue ton entraînement
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Retravaille tes modules difficiles ou lance un
                nouveau QCM.
              </p>
            </div>

            <Link
              href="/qcm"
              className="shrink-0 rounded-2xl bg-[#6ea8ff] px-6 py-4 text-center text-sm font-black text-[#122033] transition hover:bg-[#83b5ff]"
            >
              Lancer un QCM →
            </Link>
          </div>
        </section>

        <div className="h-8" />
      </div>
    </main>
  );
}