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
  module?: {
    name: string;
  } | null;
};

type Attempt = {
  question_ids: number[];
  wrong_question_ids: number[];
};

type QuestionStat = {
  question: Question;
  attempts: number;
  errors: number;
  successRate: number;
};

export default function AnalysePage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
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

      const [modulesResult, questionsResult, attemptsResult] =
        await Promise.all([
          supabase
            .from("modules")
            .select("id, name")
            .order("id", { ascending: true }),

          supabase
            .from("questions")
            .select(
              `
              id,
              question,
              module_id,
              module:modules!questions_module_id_fkey(name)
            `,
            )
            .eq("status", "approved"),

          supabase
            .from("qcm_attempts")
            .select("question_ids, wrong_question_ids")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(100),
        ]);

      setModules(modulesResult.data || []);
      setQuestions((questionsResult.data || []) as Question[]);
      setAttempts((attemptsResult.data || []) as Attempt[]);
      setLoading(false);
    }

    load();
  }, []);

  const stats = useMemo(() => {
    const attemptsByQuestion = new Map<number, number>();
    const errorsByQuestion = new Map<number, number>();

    for (const attempt of attempts) {
      for (const id of attempt.question_ids || []) {
        attemptsByQuestion.set(
          id,
          (attemptsByQuestion.get(id) || 0) + 1,
        );
      }

      for (const id of attempt.wrong_question_ids || []) {
        errorsByQuestion.set(
          id,
          (errorsByQuestion.get(id) || 0) + 1,
        );
      }
    }

    return questions
      .map((question) => {
        const total = attemptsByQuestion.get(question.id) || 0;
        const errors = errorsByQuestion.get(question.id) || 0;

        return {
          question,
          attempts: total,
          errors,
          successRate:
            total > 0
              ? Math.round(((total - errors) / total) * 100)
              : 0,
        };
      })
      .filter((item) => item.attempts > 0)
      .sort((a, b) => {
        if (b.errors !== a.errors) {
          return b.errors - a.errors;
        }

        return a.successRate - b.successRate;
      });
  }, [questions, attempts]);

  const filteredStats = useMemo(() => {
    if (selectedModule === "all") {
      return stats;
    }

    return stats.filter(
      (item) =>
        String(item.question.module_id) === selectedModule,
    );
  }, [stats, selectedModule]);

  if (loading) {
    return (
      <div className="py-16 text-center text-sm font-semibold text-slate-500">
        Analyse de tes résultats...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* HERO */}
      <section className="rounded-[28px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-6 text-white shadow-xl sm:p-8">
        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-300">
          Analyse personnelle
        </div>

        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          Mes difficultés
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
          Retrouve les questions que tu rates le plus souvent afin de cibler
          efficacement tes révisions.
        </p>
      </section>

      {/* FILTRE */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
          Module
        </label>

        <select
          value={selectedModule}
          onChange={(e) => setSelectedModule(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none sm:max-w-md"
        >
          <option value="all">Tous les modules</option>

          {modules.map((module) => (
            <option key={module.id} value={module.id}>
              {module.name}
            </option>
          ))}
        </select>
      </section>

      {/* QUESTIONS */}
      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-black text-slate-900">
            Questions à travailler
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Les questions sont classées individuellement selon tes erreurs.
          </p>
        </div>

        {filteredStats.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="text-4xl">🎯</div>

            <h3 className="mt-3 text-lg font-black text-slate-900">
              Pas encore de difficultés détectées
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Fais quelques QCM pour que ton espace puisse analyser tes
              résultats.
            </p>

            <Link
              href="/qcm"
              className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"
            >
              Faire un QCM
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredStats.map((item, index) => (
              <article
                key={item.question.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                  {/* NUMÉRO */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-lg font-black text-red-600">
                    {index + 1}
                  </div>

                  {/* QUESTION */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {item.question.module?.name || "Module"}
                    </div>

                    <p className="text-base font-bold leading-6 text-slate-900">
                      {item.question.question}
                    </p>
                  </div>

                  {/* STATS */}
                  <div className="grid grid-cols-3 gap-2 lg:w-[310px] lg:shrink-0">
                    <div className="rounded-xl bg-slate-50 p-3 text-center">
                      <div className="text-lg font-black text-slate-900">
                        {item.attempts}
                      </div>

                      <div className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                        passages
                      </div>
                    </div>

                    <div className="rounded-xl bg-red-50 p-3 text-center">
                      <div className="text-lg font-black text-red-600">
                        {item.errors}
                      </div>

                      <div className="text-[8px] font-bold uppercase tracking-wider text-red-400">
                        erreurs
                      </div>
                    </div>

                    <div className="rounded-xl bg-blue-50 p-3 text-center">
                      <div className="text-lg font-black text-blue-600">
                        {item.successRate}%
                      </div>

                      <div className="text-[8px] font-bold uppercase tracking-wider text-blue-400">
                        réussite
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}