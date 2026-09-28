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
};

type Attempt = {
  question_ids: number[] | null;
  wrong_question_ids: number[] | null;
};

function moduleNumber(name: string) {
  return name.match(/^Module\s+(\d+)/)?.[1] || "";
}

function moduleTitle(name: string) {
  return name.replace(/^Module\s+\d+\s+—\s*/, "");
}

export default function DifficultesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
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
            .select("id, question, module_id")
            .eq("status", "approved"),

          supabase
            .from("qcm_attempts")
            .select("question_ids, wrong_question_ids")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(100),
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
      setAttempts(attemptsResult.data || []);
      setLoading(false);
    }

    load();
  }, []);

  const stats = useMemo(() => {
    const seen = new Map<number, number>();
    const wrong = new Map<number, number>();

    for (const attempt of attempts) {
      for (const questionId of attempt.question_ids || []) {
        seen.set(
          questionId,
          (seen.get(questionId) || 0) + 1,
        );
      }

      for (const questionId of attempt.wrong_question_ids || []) {
        wrong.set(
          questionId,
          (wrong.get(questionId) || 0) + 1,
        );
      }
    }

    return questions
      .map((question) => {
        const total = seen.get(question.id) || 0;
        const errors = wrong.get(question.id) || 0;

        const success =
          total > 0
            ? Math.round(((total - errors) / total) * 100)
            : 0;

        return {
          question,
          total,
          errors,
          success,
        };
      })
      .filter((item) => item.total > 0)
      .sort(
        (a, b) =>
          b.errors - a.errors ||
          a.success - b.success,
      );
  }, [attempts, questions]);

  const filtered = useMemo(() => {
    if (filter === "all") {
      return stats;
    }

    return stats.filter(
      (item) => String(item.question.module_id) === filter,
    );
  }, [stats, filter]);

  const totalErrors = useMemo(
    () =>
      attempts.reduce(
        (sum, attempt) =>
          sum + (attempt.wrong_question_ids || []).length,
        0,
      ),
    [attempts],
  );

  const questionsToReview = stats.length;

  const moduleStats = useMemo(() => {
    return modules
      .map((module) => {
        const moduleQuestions = stats.filter(
          (item) => item.question.module_id === module.id,
        );

        return {
          module,
          questions: moduleQuestions.length,
          errors: moduleQuestions.reduce(
            (sum, item) => sum + item.errors,
            0,
          ),
        };
      })
      .filter((item) => item.questions > 0)
      .sort((a, b) => b.errors - a.errors);
  }, [modules, stats]);

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="rounded-2xl border border-white/10 bg-[#202d3d] px-6 py-4 text-sm font-semibold text-slate-300">
          Analyse de tes difficultés...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* HEADER */}

      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#233246] via-[#293b4f] to-[#30475d] p-7 text-white shadow-[0_25px_70px_rgba(0,0,0,0.15)] sm:p-9">
        <div className="absolute right-[-80px] top-[-100px] h-[300px] w-[300px] rounded-full bg-white/[0.035] blur-[90px]" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
              <span className="h-2 w-2 rounded-full bg-[#a9c9ff]" />
              Analysis
            </div>

            <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
              Mes difficultés
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Retrouve les questions que tu rates le plus souvent
              pour cibler tes révisions.
            </p>
          </div>

          <Link
            href="/qcm"
            className="rounded-2xl bg-[#6ea8ff] px-6 py-4 text-center text-sm font-black text-[#122033] transition hover:bg-[#83b5ff]"
          >
            Faire un QCM →
          </Link>
        </div>
      </section>

      {/* ERREUR */}

      {error && (
        <div className="rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm font-semibold text-red-200">
          {error}
        </div>
      )}

      {/* STATS */}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-5">
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
            Erreurs cumulées
          </div>

          <div className="mt-3 text-3xl font-black text-white">
            {totalErrors}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            sur tes derniers entraînements
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-5">
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
            Questions à revoir
          </div>

          <div className="mt-3 text-3xl font-black text-[#a9c9ff]">
            {questionsToReview}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            questions différentes
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-5">
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
            Modules concernés
          </div>

          <div className="mt-3 text-3xl font-black text-white">
            {moduleStats.length}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            modules avec des erreurs
          </div>
        </div>
      </section>

      {/* FILTRE */}

      <section className="rounded-3xl border border-white/10 bg-[#202d3d] p-5">
        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
          Filtrer par module
        </label>

        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-[#182332] px-4 py-4 text-sm font-bold text-white outline-none focus:border-white/20 sm:max-w-lg"
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

      {/* MODULES A TRAVAILLER */}

      {filter === "all" && moduleStats.length > 0 && (
        <section>
          <div className="mb-5">
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              Weak points
            </div>

            <h3 className="mt-2 text-2xl font-black text-white">
              Modules à retravailler
            </h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {moduleStats.slice(0, 6).map((item) => (
              <button
                key={item.module.id}
                type="button"
                onClick={() =>
                  setFilter(String(item.module.id))
                }
                className="group rounded-3xl border border-white/10 bg-[#202d3d] p-5 text-left transition hover:border-white/20 hover:bg-[#28384b]"
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
                      {item.errors} erreur
                      {item.errors > 1 ? "s" : ""}
                    </div>
                  </div>

                  <span className="text-slate-500 transition group-hover:translate-x-1 group-hover:text-white">
                    →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* QUESTIONS */}

      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              Review queue
            </div>

            <h3 className="mt-2 text-2xl font-black text-white">
              Questions à travailler
            </h3>
          </div>

          <div className="text-xs font-bold text-slate-500">
            {filtered.length} question
            {filtered.length > 1 ? "s" : ""}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-[#202d3d] p-12 text-center">
            <div className="text-4xl">✓</div>

            <h4 className="mt-4 text-xl font-black text-white">
              Pas encore de difficultés
            </h4>

            <p className="mt-2 text-sm text-slate-500">
              Fais quelques QCM pour que ton analyse se remplisse
              automatiquement.
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
            {filtered.slice(0, 30).map((item, index) => {
              const module = modules.find(
                (entry) =>
                  entry.id === item.question.module_id,
              );

              return (
                <article
                  key={item.question.id}
                  className="rounded-3xl border border-white/10 bg-[#202d3d] p-5 transition hover:border-white/15 sm:p-6"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-400/10 text-sm font-black text-red-300">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {module && (
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-black text-slate-400">
                            M{moduleNumber(module.name)}
                          </span>
                        )}

                        <span className="rounded-full bg-red-400/10 px-3 py-1 text-[9px] font-black text-red-300">
                          {item.errors} erreur
                          {item.errors > 1 ? "s" : ""}
                        </span>

                        <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[9px] font-black text-slate-400">
                          {item.success}% réussite
                        </span>
                      </div>

                      <h4 className="mt-3 text-sm font-black leading-6 text-white sm:text-base">
                        {item.question.question}
                      </h4>

                      {module && (
                        <div className="mt-2 text-xs text-slate-500">
                          {moduleTitle(module.name)}
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/qcm?moduleId=${item.question.module_id}`}
                      className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-xs font-black text-slate-200 transition hover:bg-white/[0.09]"
                    >
                      Retravailler →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="h-8" />
    </div>
  );
}