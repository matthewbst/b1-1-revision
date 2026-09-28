"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Module = {
  id: number;
  name: string;
  description: string | null;
};

type CourseFile = {
  id: number;
  module_id: number | null;
  title: string;
};

type RevisionSheet = {
  id: number;
  module_id: number | null;
  title: string;
  content: string | null;
};

type Question = {
  id: number;
  module_id: number | null;
  question: string;
};

type SearchResult = {
  type: "module" | "course" | "sheet" | "question";
  id: number;
  title: string;
  description: string;
  moduleId: number | null;
  href: string;
};

function moduleNumber(name: string) {
  return name.match(/^Module\s+(\d+)/)?.[1] || "";
}

function moduleTitle(name: string) {
  return name.replace(/^Module\s+\d+\s+—\s*/, "");
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function RecherchePage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [courses, setCourses] = useState<CourseFile[]>([]);
  const [sheets, setSheets] = useState<RevisionSheet[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "module" | "course" | "sheet" | "question"
  >("all");

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

      const [
        modulesResult,
        coursesResult,
        sheetsResult,
        questionsResult,
      ] = await Promise.all([
        supabase
          .from("modules")
          .select("id, name, description")
          .order("id", { ascending: true }),

        supabase
          .from("course_files")
          .select("id, module_id, title")
          .order("created_at", { ascending: false }),

        supabase
          .from("revision_sheets")
          .select("id, module_id, title, content")
          .order("created_at", { ascending: false }),

        supabase
          .from("questions")
          .select("id, module_id, question")
          .eq("status", "approved")
          .order("created_at", { ascending: false }),
      ]);

      setModules(modulesResult.data || []);
      setCourses(coursesResult.data || []);
      setSheets(sheetsResult.data || []);
      setQuestions(questionsResult.data || []);
      setLoading(false);
    }

    load();
  }, []);

  const allResults = useMemo<SearchResult[]>(() => {
    return [
      ...modules.map((module) => ({
        type: "module" as const,
        id: module.id,
        title: `Module ${moduleNumber(module.name)} — ${moduleTitle(
          module.name,
        )}`,
        description:
          module.description ||
          "Module de formation Part-66 B1.1",
        moduleId: module.id,
        href: `/cours/${module.id}`,
      })),

      ...courses.map((course) => ({
        type: "course" as const,
        id: course.id,
        title: course.title,
        description: "Support de cours",
        moduleId: course.module_id,
        href: course.module_id
          ? `/cours/${course.module_id}`
          : "/cours",
      })),

      ...sheets.map((sheet) => ({
        type: "sheet" as const,
        id: sheet.id,
        title: sheet.title,
        description:
          sheet.content?.slice(0, 140) ||
          "Fiche de révision",
        moduleId: sheet.module_id,
        href: "/fiches",
      })),

      ...questions.map((question) => ({
        type: "question" as const,
        id: question.id,
        title: question.question,
        description: "Question QCM approuvée",
        moduleId: question.module_id,
        href: question.module_id
          ? `/qcm?moduleId=${question.module_id}`
          : "/qcm",
      })),
    ];
  }, [modules, courses, sheets, questions]);

  const results = useMemo(() => {
    const term = normalize(search.trim());

    if (!term) {
      return [];
    }

    return allResults.filter((result) => {
      if (filter !== "all" && result.type !== filter) {
        return false;
      }

      return normalize(
        `${result.title} ${result.description}`,
      ).includes(term);
    });
  }, [allResults, search, filter]);

  const stats = useMemo(() => {
    const term = normalize(search.trim());

    if (!term) {
      return {
        modules: modules.length,
        courses: courses.length,
        sheets: sheets.length,
        questions: questions.length,
      };
    }

    const found = allResults.filter((result) =>
      normalize(
        `${result.title} ${result.description}`,
      ).includes(term),
    );

    return {
      modules: found.filter(
        (item) => item.type === "module",
      ).length,
      courses: found.filter(
        (item) => item.type === "course",
      ).length,
      sheets: found.filter(
        (item) => item.type === "sheet",
      ).length,
      questions: found.filter(
        (item) => item.type === "question",
      ).length,
    };
  }, [
    allResults,
    search,
    modules.length,
    courses.length,
    sheets.length,
    questions.length,
  ]);

  function getTypeLabel(type: SearchResult["type"]) {
    if (type === "module") return "MODULE";
    if (type === "course") return "COURS";
    if (type === "sheet") return "FICHE";
    return "QCM";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#182332] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="rounded-2xl border border-white/10 bg-[#202d3d] px-6 py-4 text-sm font-semibold text-slate-300">
            Ouverture de la recherche...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#182332] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-120px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[130px]" />

        <div className="absolute left-[-120px] top-[35%] h-[450px] w-[450px] rounded-full bg-slate-200/[0.02] blur-[120px]" />

        <div className="absolute right-[-120px] top-[30%] h-[450px] w-[450px] rounded-full bg-white/[0.02] blur-[120px]" />

        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1350px] px-4 py-8 sm:px-6 lg:px-8">
        {/* HERO RECHERCHE */}

        <section className="relative overflow-hidden rounded-[38px] border border-white/10 bg-[#202d3d]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.04),transparent_40%)]" />

          <div className="relative px-6 py-12 text-center sm:px-10 sm:py-16">
            <div className="text-[9px] font-black uppercase tracking-[0.35em] text-[#a9c9ff]">
              Navigation
            </div>

            <h1 className="mt-4 text-4xl font-black tracking-[-0.06em] sm:text-5xl lg:text-6xl">
              Recherche
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
              Trouve rapidement un module, un cours, une fiche ou
              une question dans toute la plateforme.
            </p>

            <div className="mx-auto mt-8 max-w-4xl">
              <div className="relative">
                <svg
                  viewBox="0 0 24 24"
                  className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="M16 16L21 21" />
                </svg>

                <input
                  autoFocus
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Que cherches-tu ?"
                  className="w-full rounded-3xl border border-white/10 bg-[#182332] py-5 pl-14 pr-5 text-base font-medium text-white outline-none placeholder:text-slate-600 focus:border-white/20"
                />
              </div>
            </div>
          </div>
        </section>

        {/* FILTRES */}

        <section className="mt-4 flex flex-wrap gap-2">
          {[
            ["all", "Tout"],
            ["module", "Modules"],
            ["course", "Cours"],
            ["sheet", "Fiches"],
            ["question", "Questions"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setFilter(
                  value as
                    | "all"
                    | "module"
                    | "course"
                    | "sheet"
                    | "question",
                )
              }
              className={`rounded-full border px-4 py-2.5 text-xs font-black transition ${
                filter === value
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-white/10 bg-[#202d3d] text-slate-500 hover:bg-[#28384b] hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </section>

        {/* STATS */}

        <section className="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[
            ["Modules", stats.modules],
            ["Cours", stats.courses],
            ["Fiches", stats.sheets],
            ["Questions", stats.questions],
          ].map(([label, count]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-[#202d3d] p-4"
            >
              <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">
                {label}
              </div>

              <div className="mt-2 text-2xl font-black text-white">
                {count}
              </div>
            </div>
          ))}
        </section>

        {/* RESULTATS */}

        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                Search results
              </div>

              <h2 className="mt-2 text-2xl font-black text-white">
                {search.trim()
                  ? "Résultats"
                  : "Lance une recherche"}
              </h2>
            </div>

            {search.trim() && (
              <div className="text-xs font-bold text-slate-500">
                {results.length} résultat
                {results.length > 1 ? "s" : ""}
              </div>
            )}
          </div>

          {!search.trim() ? (
            <div className="rounded-[32px] border border-dashed border-white/10 bg-[#202d3d] px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.05] text-2xl">
                ⌕
              </div>

              <h3 className="mt-5 text-xl font-black text-white">
                Recherche dans toute la plateforme
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Utilise la barre ci-dessus pour retrouver rapidement
                un contenu.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-white/10 bg-[#202d3d] px-6 py-16 text-center">
              <div className="text-3xl">⌕</div>

              <h3 className="mt-5 text-xl font-black text-white">
                Aucun résultat
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Essaie un autre terme ou enlève le filtre.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.href}
                  className="group block rounded-3xl border border-white/10 bg-[#202d3d] p-5 transition hover:border-white/20 hover:bg-[#28384b]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-sm font-black text-slate-200">
                      {result.type === "question"
                        ? "?"
                        : result.type === "sheet"
                          ? "▱"
                          : result.type === "course"
                            ? "▤"
                            : "▣"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[8px] font-black tracking-[0.16em] text-slate-400">
                          {getTypeLabel(result.type)}
                        </span>

                        {result.moduleId && (
                          <span className="rounded-full bg-white/[0.04] px-3 py-1 text-[8px] font-black text-slate-500">
                            M
                            {moduleNumber(
                              modules.find(
                                (module) =>
                                  module.id === result.moduleId,
                              )?.name || "",
                            )}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-2 truncate text-sm font-black text-white sm:text-base">
                        {result.title}
                      </h3>

                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                        {result.description}
                      </p>
                    </div>

                    <span className="text-slate-600 transition group-hover:translate-x-1 group-hover:text-white">
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="h-10" />
      </div>
    </main>
  );
}