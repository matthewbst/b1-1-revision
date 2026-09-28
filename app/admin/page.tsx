"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const ADMIN_ID = "dcbeb72a-4f4a-4169-beab-53da1b3babfa";

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
  module_id: number;
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

export default function AdminPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
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
          .select("id, name, description")
          .order("id", { ascending: true }),

        supabase
          .from("questions")
          .select(
            "id, module_id, question, status, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(2000),

        supabase
          .from("course_files")
          .select("id, module_id, title, created_at")
          .order("created_at", { ascending: false }),

        supabase
          .from("revision_sheets")
          .select("id, module_id, title, created_at")
          .order("created_at", { ascending: false }),

        supabase
          .from("qcm_attempts")
          .select("id, module_id, percentage, created_at")
          .order("created_at", { ascending: false })
          .limit(1000),
      ]);

      if (modulesResult.error) {
        setError(modulesResult.error.message);
      }

      setModules(modulesResult.data || []);
      setQuestions(questionsResult.data || []);
      setCourses(coursesResult.data || []);
      setSheets(sheetsResult.data || []);
      setAttempts(attemptsResult.data || []);

      setLoading(false);
    }

    load();
  }, []);

  const approvedQuestions = questions.filter(
    (question) => question.status === "approved",
  ).length;

  const draftQuestions = questions.filter(
    (question) => question.status === "draft",
  ).length;

  const rejectedQuestions = questions.filter(
    (question) => question.status === "rejected",
  ).length;

  const average =
    attempts.length > 0
      ? Math.round(
          attempts.reduce(
            (sum, attempt) => sum + attempt.percentage,
            0,
          ) / attempts.length,
        )
      : 0;

  const moduleStats = useMemo(() => {
    return modules.map((module) => {
      const moduleQuestions = questions.filter(
        (question) => question.module_id === module.id,
      );

      const moduleCourses = courses.filter(
        (course) => course.module_id === module.id,
      );

      const moduleSheets = sheets.filter(
        (sheet) => sheet.module_id === module.id,
      );

      const moduleAttempts = attempts.filter(
        (attempt) => attempt.module_id === module.id,
      );

      const moduleAverage =
        moduleAttempts.length > 0
          ? Math.round(
              moduleAttempts.reduce(
                (sum, attempt) => sum + attempt.percentage,
                0,
              ) / moduleAttempts.length,
            )
          : 0;

      return {
        module,
        questions: moduleQuestions.length,
        courses: moduleCourses.length,
        sheets: moduleSheets.length,
        attempts: moduleAttempts.length,
        average: moduleAverage,
      };
    });
  }, [modules, questions, courses, sheets, attempts]);

  const recentQuestions = questions.slice(0, 8);

  const recentCourses = courses.slice(0, 6);

  if (loading || !authorized) {
    return (
      <main className="min-h-screen bg-[#182332] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="rounded-2xl border border-white/10 bg-[#202d3d] px-6 py-4 text-sm font-semibold text-slate-300">
            Chargement du centre administration...
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

        <div className="absolute left-[-120px] top-[40%] h-[450px] w-[450px] rounded-full bg-slate-200/[0.02] blur-[120px]" />

        <div className="absolute right-[-120px] top-[25%] h-[450px] w-[450px] rounded-full bg-white/[0.02] blur-[120px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
        {/* HEADER */}

        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-[#233246] via-[#293b4f] to-[#30475d] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.15)] sm:p-9">
          <div className="absolute right-[-100px] top-[-100px] h-[320px] w-[320px] rounded-full bg-white/[0.025] blur-[90px]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Administration
              </div>

              <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
                Centre de contrôle
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Vue d&apos;ensemble de la plateforme Part-66 B1.1,
                des contenus et de l&apos;activité QCM.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/[0.10] px-5 py-4">
              <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-400">
                Statut système
              </div>

              <div className="mt-1 flex items-center gap-2 text-sm font-black text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                ADMIN CONNECTÉ
              </div>
            </div>
          </div>
        </section>

        {/* ERREUR */}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm font-semibold text-red-200">
            {error}
          </div>
        )}

        {/* STATS PRINCIPALES */}

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">
              Modules
            </div>

            <div className="mt-3 text-3xl font-black text-white">
              {modules.length}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">
              Cours
            </div>

            <div className="mt-3 text-3xl font-black text-white">
              {courses.length}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">
              Fiches
            </div>

            <div className="mt-3 text-3xl font-black text-white">
              {sheets.length}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">
              Questions
            </div>

            <div className="mt-3 text-3xl font-black text-[#a9c9ff]">
              {questions.length}
            </div>

            <div className="mt-1 text-[10px] text-slate-500">
              {approvedQuestions} approuvées · {draftQuestions} brouillons
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-5">
            <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">
              QCM
            </div>

            <div className="mt-3 text-3xl font-black text-white">
              {attempts.length}
            </div>

            <div className="mt-1 text-[10px] text-slate-500">
              moyenne {attempts.length ? `${average}%` : "—"}
            </div>
          </div>
        </section>

        {/* ACCES RAPIDES */}

        <section className="mt-10">
          <div className="mb-5">
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              Control center
            </div>

            <h2 className="mt-2 text-2xl font-black text-white">
              Accès rapides
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Link
              href="/admin/questions"
              className="group rounded-3xl border border-white/10 bg-[#202d3d] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-[#28384b]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-xl">
                ?
              </div>

              <div className="mt-5 text-[9px] font-black uppercase tracking-[0.22em] text-[#a9c9ff]">
                Content
              </div>

              <h3 className="mt-1 text-xl font-black text-white">
                Questions
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Créer, modifier, valider et gérer les questions.
              </p>

              <div className="mt-5 text-xs font-black text-slate-500 group-hover:text-white">
                Gérer →
              </div>
            </Link>

            <Link
              href="/admin/signalements"
              className="group rounded-3xl border border-white/10 bg-[#202d3d] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-[#28384b]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-xl">
                !
              </div>

              <div className="mt-5 text-[9px] font-black uppercase tracking-[0.22em] text-[#a9c9ff]">
                Moderation
              </div>

              <h3 className="mt-1 text-xl font-black text-white">
                Signalements
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Vérifie les problèmes signalés sur les questions.
              </p>

              <div className="mt-5 text-xs font-black text-slate-500 group-hover:text-white">
                Ouvrir →
              </div>
            </Link>

            <Link
              href="/cours"
              className="group rounded-3xl border border-white/10 bg-[#202d3d] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-[#28384b]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-xl">
                ▤
              </div>

              <div className="mt-5 text-[9px] font-black uppercase tracking-[0.22em] text-[#a9c9ff]">
                Formation
              </div>

              <h3 className="mt-1 text-xl font-black text-white">
                Cours
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Consulte les supports disponibles sur la plateforme.
              </p>

              <div className="mt-5 text-xs font-black text-slate-500 group-hover:text-white">
                Voir →
              </div>
            </Link>

            <Link
              href="/"
              className="group rounded-3xl border border-white/10 bg-[#202d3d] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-[#28384b]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-xl">
                ↗
              </div>

              <div className="mt-5 text-[9px] font-black uppercase tracking-[0.22em] text-[#a9c9ff]">
                Platform
              </div>

              <h3 className="mt-1 text-xl font-black text-white">
                Voir le site
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Retourne sur l&apos;interface étudiante.
              </p>

              <div className="mt-5 text-xs font-black text-slate-500 group-hover:text-white">
                Ouvrir →
              </div>
            </Link>
          </div>
        </section>

        {/* QUESTIONS RECENTES */}

        <section className="mt-10 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                  Question database
                </div>

                <h2 className="mt-2 text-2xl font-black text-white">
                  Questions récentes
                </h2>
              </div>

              <Link
                href="/admin/questions"
                className="text-xs font-bold text-slate-500 hover:text-white"
              >
                Toutes →
              </Link>
            </div>

            <div className="mt-6 space-y-2">
              {recentQuestions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                  Aucune question.
                </div>
              ) : (
                recentQuestions.map((question) => {
                  const module = modules.find(
                    (item) => item.id === question.module_id,
                  );

                  return (
                    <div
                      key={question.id}
                      className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-xs font-black text-slate-300">
                        {module
                          ? moduleNumber(module.name)
                          : "?"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-black text-white">
                          {question.question}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                          {module && (
                            <span>
                              {moduleTitle(module.name)}
                            </span>
                          )}

                          <span>·</span>

                          <span>
                            {formatDate(question.created_at)}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1.5 text-[9px] font-black ${
                          question.status === "approved"
                            ? "bg-emerald-400/10 text-emerald-300"
                            : question.status === "draft"
                              ? "bg-white/[0.06] text-slate-300"
                              : "bg-red-400/10 text-red-300"
                        }`}
                      >
                        {question.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CONTENU */}

          <div className="rounded-3xl border border-white/10 bg-[#202d3d] p-6">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                Content overview
              </div>

              <h2 className="mt-2 text-2xl font-black text-white">
                Répartition
              </h2>
            </div>

            <div className="mt-6 space-y-3">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">
                    Questions approuvées
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

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">
                    Brouillons
                  </span>

                  <span className="font-black text-slate-200">
                    {draftQuestions}
                  </span>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-slate-400"
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

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">
                    Refusées
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

        {/* MODULES */}

        <section className="mt-10">
          <div className="mb-5">
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              Module monitoring
            </div>

            <h2 className="mt-2 text-2xl font-black text-white">
              État des modules
            </h2>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#202d3d]">
            <div className="divide-y divide-white/[0.06]">
              {moduleStats.map((item) => (
                <div
                  key={item.module.id}
                  className="p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div className="flex items-center gap-4 lg:w-[350px]">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-xs font-black text-slate-200">
                        {moduleNumber(item.module.name)}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate font-black text-white">
                          {moduleTitle(item.module.name)}
                        </div>

                        <div className="mt-1 text-[10px] text-slate-500">
                          {item.courses} cours · {item.sheets} fiches
                        </div>
                      </div>
                    </div>

                    <div className="grid flex-1 grid-cols-3 gap-2">
                      <div className="rounded-xl bg-white/[0.03] p-3">
                        <div className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-600">
                          Questions
                        </div>

                        <div className="mt-1 text-sm font-black text-white">
                          {item.questions}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white/[0.03] p-3">
                        <div className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-600">
                          QCM
                        </div>

                        <div className="mt-1 text-sm font-black text-white">
                          {item.attempts}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white/[0.03] p-3">
                        <div className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-600">
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
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-bold text-slate-300 hover:bg-white/[0.08] hover:text-white"
                      >
                        Voir
                      </Link>

                      <Link
                        href={`/admin/questions/${item.module.id}`}
                        className="rounded-xl bg-[#6ea8ff] px-4 py-3 text-xs font-black text-[#122033] hover:bg-[#83b5ff]"
                      >
                        Questions
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COURS RECENTS */}

        <section className="mt-10 rounded-3xl border border-white/10 bg-[#202d3d] p-6">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                Latest content
              </div>

              <h2 className="mt-2 text-2xl font-black text-white">
                Cours ajoutés récemment
              </h2>
            </div>

            <Link
              href="/cours"
              className="text-xs font-bold text-slate-500 hover:text-white"
            >
              Voir les cours →
            </Link>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {recentCourses.map((course) => {
              const module = modules.find(
                (item) => item.id === course.module_id,
              );

              return (
                <div
                  key={course.id}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-xs font-black text-slate-300">
                      {module
                        ? moduleNumber(module.name)
                        : "—"}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-white">
                        {course.title}
                      </div>

                      <div className="mt-1 text-[10px] text-slate-500">
                        {module
                          ? moduleTitle(module.name)
                          : "Sans module"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {recentCourses.length === 0 && (
              <div className="text-sm text-slate-500">
                Aucun cours disponible.
              </div>
            )}
          </div>
        </section>

        <div className="h-10" />
      </div>
    </main>
  );
}