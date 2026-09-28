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
  module_id: number;
  score: number;
  total: number;
  percentage: number;
  wrong_question_ids: number[] | null;
  created_at: string;
};

type Question = {
  id: number;
  question: string;
  module_id: number;
  status: string;
  module: {
    name: string;
  } | null;
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

export default function ErrorsPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedModule, setSelectedModule] = useState("all");
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

      const [modulesResult, attemptsResult, questionsResult] =
        await Promise.all([
          supabase
            .from("modules")
            .select("id, name")
            .order("id", { ascending: true }),

          supabase
            .from("qcm_attempts")
            .select(
              "id, module_id, score, total, percentage, wrong_question_ids, created_at",
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(100),

          supabase
            .from("questions")
            .select(
              "id, question, module_id, status, module:modules!questions_module_id_fkey(name)",
            )
            .eq("status", "approved"),
        ]);

      setModules(modulesResult.data || []);
      setAttempts(attemptsResult.data || []);
      setQuestions((questionsResult.data || []) as Question[]);
      setLoading(false);
    }

    load();
  }, []);

  const errorCounts = useMemo(() => {
    const counts = new Map<number, number>();

    for (const attempt of attempts) {
      for (const id of attempt.wrong_question_ids || []) {
        counts.set(id, (counts.get(id) || 0) + 1);
      }
    }

    return counts;
  }, [attempts]);

  const errorQuestions = useMemo(() => {
    return questions
      .filter((question) => {
        if (!errorCounts.has(question.id)) {
          return false;
        }

        if (selectedModule === "all") {
          return true;
        }

        return String(question.module_id) === selectedModule;
      })
      .map((question) => ({
        ...question,
        errorCount: errorCounts.get(question.id) || 0,
      }))
      .sort((a, b) => b.errorCount - a.errorCount);
  }, [questions, errorCounts, selectedModule]);

  const totalMistakes = useMemo(() => {
    let total = 0;

    for (const attempt of attempts) {
      total += (attempt.wrong_question_ids || []).length;
    }

    return total;
  }, [attempts]);

  const moduleStats = useMemo(() => {
    return modules
      .map((module) => {
        const count = errorQuestions.filter(
          (question) => question.module_id === module.id,
        ).length;

        const attemptsWithErrors = attempts.filter(
          (attempt) =>
            attempt.module_id === module.id &&
            (attempt.wrong_question_ids || []).length > 0,
        );

        return {
          module,
          count,
          attempts: attemptsWithErrors.length,
        };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [modules, attempts, errorQuestions]);

  const mostProblematicModule = moduleStats[0] || null;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#182332] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="rounded-2xl border border-white/10 bg-[#202d3d] px-6 py-4 text-sm font-semibold text-slate-300">
            Analyse de tes erreurs...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#182332] text-white">
      {/* BACKGROUND */}

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-0 h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[130px]" />

        <div className="absolute left-[-10%] top-[35%] h-[500px] w-[500px] rounded-full bg-slate-200/[0.02] blur-[120px]" />

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
                Analysis
              </div>

              <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
                Mes erreurs
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Retrouve les questions que tu as ratées et identifie
                les notions qui méritent une nouvelle révision.
              </p>
            </div>

            <Link
              href="/qcm"
              className="rounded-2xl bg-[#6ea8ff] px-6 py-4 text-center text-sm font-black text-[#122033] transition hover:bg-[#83b5ff]"
            >
              Nouveau QCM →
            </Link>
          </div>
        </section>

        {/* STATS */}

        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
              Erreurs cumulées
            </div>

            <div className="mt-3 text-3xl font-black text-white">
              {totalMistakes}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              sur tes 100 derniers QCM
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
              Questions à revoir
            </div>

            <div className="mt-3 text-3xl font-black text-[#a9c9ff]">
              {errorQuestions.length}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              questions différentes
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
              Module prioritaire
            </div>

            <div className="mt-3 truncate text-xl font-black text-white">
              {mostProblematicModule
                ? `M${moduleNumber(
                    mostProblematicModule.module.name,
                  )}`
                : "—"}
            </div>

            <div className="mt-1 truncate text-xs text-slate-500">
              {mostProblematicModule
                ? moduleTitle(mostProblematicModule.module.name)
                : "Aucune donnée"}
            </div>
          </div>
        </section>

        {/* FILTRE */}

        <section className="mt-8 rounded-3xl border border-white/10 bg-[#202d3d] p-4 sm:p-5">
          <label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
            Filtrer par module
          </label>

          <select
            value={selectedModule}
            onChange={(event) =>
              setSelectedModule(event.target.value)
            }
            className="mt-2 w-full rounded-2xl border border-white/10 bg-[#182332] px-4 py-4 text-sm font-bold text-white outline-none focus:border-white/20"
          >
            <option value="all">Tous les modules</option>

            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                Module {moduleNumber(module.name)} —{" "}
                {moduleTitle(module.name)}
              </option>
            ))}
          </select>
        </section>

        {/* MODULES */}

        {moduleStats.length > 0 && selectedModule === "all" && (
          <section className="mt-10">
            <div className="mb-5">
              <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                Weak points
              </div>

              <h2 className="mt-2 text-2xl font-black text-white">
                Modules à retravailler
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {moduleStats.slice(0, 6).map((item) => (
                <Link
                  key={item.module.id}
                  href={`/qcm?moduleId=${item.module.id}`}
                  className="group rounded-3xl border border-white/10 bg-[#202d3d] p-5 transition hover:border-white/20 hover:bg-[#28384b]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-xs font-black text-slate-200">
                      {moduleNumber(item.module.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-black text-white">
                        {moduleTitle(item.module.name)}
                      </div>

                      <div className="mt-1 text-[10px] text-slate-500">
                        {item.count} question
                        {item.count > 1 ? "s" : ""} à revoir
                      </div>
                    </div>

                    <span className="text-slate-500 transition group-hover:translate-x-1 group-hover:text-white">
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* QUESTIONS */}

        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                Review queue
              </div>

              <h2 className="mt-2 text-2xl font-black text-white">
                Questions à revoir
              </h2>
            </div>

            <div className="text-xs font-bold text-slate-500">
              {errorQuestions.length} question
              {errorQuestions.length > 1 ? "s" : ""}
            </div>
          </div>

          {errorQuestions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-[#202d3d] p-12 text-center">
              <div className="text-4xl">✓</div>

              <h3 className="mt-4 text-xl font-black text-white">
                Rien à revoir ici
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Continue tes entraînements pour alimenter ton
                analyse personnalisée.
              </p>

              <Link
                href="/qcm"
                className="mt-6 inline-flex rounded-2xl bg-[#6ea8ff] px-5 py-3.5 text-sm font-black text-[#122033]"
              >
                Lancer un QCM
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {errorQuestions.map((question, index) => (
                <article
                  key={question.id}
                  className="rounded-3xl border border-white/10 bg-[#202d3d] p-5 transition hover:border-white/15"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-400/10 text-xs font-black text-red-300">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {question.module && (
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-black text-slate-400">
                            M{moduleNumber(question.module.name)}
                          </span>
                        )}

                        <span className="rounded-full bg-red-400/10 px-3 py-1 text-[9px] font-black text-red-300">
                          {question.errorCount} erreur
                          {question.errorCount > 1 ? "s" : ""}
                        </span>
                      </div>

                      <h3 className="mt-3 text-sm font-black leading-6 text-white sm:text-base">
                        {question.question}
                      </h3>

                      <div className="mt-2 text-xs text-slate-500">
                        {question.module
                          ? moduleTitle(question.module.name)
                          : "Module"}
                      </div>
                    </div>

                    <Link
                      href={`/qcm?moduleId=${question.module_id}`}
                      className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-xs font-black text-slate-200 transition hover:bg-white/[0.09]"
                    >
                      Retravailler
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* HISTORIQUE */}

        <section className="mt-10">
          <div className="mb-5">
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              History
            </div>

            <h2 className="mt-2 text-2xl font-black text-white">
              Tes derniers résultats
            </h2>
          </div>

          {attempts.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-8 text-center">
              <p className="text-sm text-slate-500">
                Aucun QCM enregistré pour le moment.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#202d3d]">
              <div className="divide-y divide-white/[0.06]">
                {attempts.slice(0, 8).map((attempt) => {
                  const module = modules.find(
                    (item) => item.id === attempt.module_id,
                  );

                  return (
                    <div
                      key={attempt.id}
                      className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-xs font-black text-slate-200">
                        {module
                          ? moduleNumber(module.name)
                          : "QCM"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-white">
                          {module
                            ? moduleTitle(module.name)
                            : "Entraînement"}
                        </div>

                        <div className="mt-1 text-[10px] text-slate-500">
                          {formatDate(attempt.created_at)} ·{" "}
                          {attempt.score}/{attempt.total}
                        </div>
                      </div>

                      <div
                        className={`rounded-full px-3 py-1.5 text-xs font-black ${
                          attempt.percentage >= 80
                            ? "bg-emerald-400/10 text-emerald-300"
                            : attempt.percentage >= 60
                              ? "bg-white/[0.07] text-slate-200"
                              : "bg-red-400/10 text-red-300"
                        }`}
                      >
                        {attempt.percentage}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <div className="h-10" />
      </div>
    </main>
  );
}