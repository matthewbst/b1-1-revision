"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Module = {
  id: number;
  name: string;
  description: string | null;
};

type Course = {
  id: number;
  module_id: number | null;
  title: string;
  file_path: string;
  created_at: string;
};

type Sheet = {
  id: number;
  module_id: number | null;
  title: string;
  file_path: string | null;
  content: string | null;
};

function getModuleNumber(name: string) {
  return name.match(/^Module\s+(\d+)/)?.[1] || "";
}

function getModuleTitle(name: string) {
  return name.replace(/^Module\s+\d+\s+—\s*/, "");
}

export default function CoursPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sheets, setSheets] = useState<Sheet[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      const [modulesResult, coursesResult, sheetsResult] =
        await Promise.all([
          supabase
            .from("modules")
            .select("id, name, description")
            .order("id", { ascending: true }),

          supabase
            .from("course_files")
            .select(
              "id, module_id, title, file_path, created_at",
            )
            .order("created_at", { ascending: false }),

          supabase
            .from("revision_sheets")
            .select(
              "id, module_id, title, file_path, content",
            )
            .order("created_at", { ascending: false }),
        ]);

      if (modulesResult.error) {
        setError(modulesResult.error.message);
      }

      setModules(modulesResult.data || []);
      setCourses(coursesResult.data || []);
      setSheets(sheetsResult.data || []);
      setLoading(false);
    }

    loadData();
  }, []);

  const filteredModules = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return modules;
    }

    return modules.filter((module) => {
      const haystack = [
        module.name,
        module.description || "",
        ...courses
          .filter((course) => course.module_id === module.id)
          .map((course) => course.title),
        ...sheets
          .filter((sheet) => sheet.module_id === module.id)
          .map((sheet) => sheet.title),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [modules, courses, sheets, search]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#182332] text-white">
      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-120px] h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[130px]" />

        <div className="absolute left-[-160px] top-[40%] h-[500px] w-[500px] rounded-full bg-slate-200/[0.018] blur-[130px]" />

        <div className="absolute right-[-160px] top-[25%] h-[500px] w-[500px] rounded-full bg-white/[0.018] blur-[130px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1450px] px-4 py-7 sm:px-6 lg:px-8">
        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="relative overflow-hidden rounded-[38px] border border-white/10 bg-gradient-to-br from-[#233246] via-[#293b4f] to-[#30475d] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.15)] sm:p-10">
          <div className="absolute right-[-100px] top-[-100px] h-[320px] w-[320px] rounded-full bg-white/[0.03] blur-[90px]" />

          <div className="relative grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Training library
              </div>

              <h1 className="mt-4 text-5xl font-black leading-[0.92] tracking-[-0.055em] text-white sm:text-6xl">
                CENTRE
                <br />
                <span className="text-slate-300">
                  DE COURS
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Retrouve les supports de formation, les fiches
                de révision et les ressources associées à chaque
                module Part-66 B1.1.
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                <div className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                  {modules.length} modules
                </div>

                <div className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                  {courses.length} cours
                </div>

                <div className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                  {sheets.length} fiches
                </div>
              </div>
            </div>

            {/* HUD */}

            <div className="flex justify-center lg:justify-end">
              <div className="relative flex h-[280px] w-[280px] items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-white/10" />

                <div className="absolute inset-[32px] rounded-full border border-white/[0.08]" />

                <div className="absolute inset-[66px] rounded-full border border-white/[0.06]" />

                <div className="absolute left-1/2 top-0 h-8 w-px -translate-x-1/2 bg-white/25" />
                <div className="absolute bottom-0 left-1/2 h-8 w-px -translate-x-1/2 bg-white/25" />
                <div className="absolute left-0 top-1/2 h-px w-8 -translate-y-1/2 bg-white/25" />
                <div className="absolute right-0 top-1/2 h-px w-8 -translate-y-1/2 bg-white/25" />

                <div className="absolute left-1/2 top-5 -translate-x-1/2 text-[8px] font-black uppercase tracking-[0.3em] text-slate-500">
                  COURSE SYSTEM
                </div>

                <svg
                  viewBox="0 0 320 320"
                  className="relative z-10 h-36 w-36 text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.16)]"
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

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-[0.25em] text-slate-500">
                  B1.1 · READY
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            SEARCH
        ===================================================== */}

        <section className="mt-6">
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Rechercher un module, un cours ou une fiche..."
              className="w-full rounded-[24px] border border-white/10 bg-[#202d3d] py-5 pl-14 pr-5 text-sm font-semibold text-white outline-none placeholder:text-slate-600 focus:border-white/20"
            />
          </div>
        </section>

        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-200">
            Impossible de charger les cours : {error}
          </div>
        )}

        {/* =====================================================
            MODULES
        ===================================================== */}

        <section className="mt-10">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                Flight training
              </div>

              <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-white">
                Modules disponibles
              </h2>
            </div>

            <div className="text-xs font-semibold text-slate-600">
              {filteredModules.length} résultat
              {filteredModules.length > 1 ? "s" : ""}
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[255px] animate-pulse rounded-[30px] border border-white/10 bg-[#202d3d]"
                />
              ))}
            </div>
          ) : filteredModules.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-white/10 bg-[#202d3d] px-6 py-16 text-center">
              <div className="text-lg font-black text-white">
                Aucun module trouvé
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Essaie avec un autre terme de recherche.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredModules.map((module) => {
                const moduleCourses = courses.filter(
                  (course) => course.module_id === module.id,
                );

                const moduleSheets = sheets.filter(
                  (sheet) => sheet.module_id === module.id,
                );

                return (
                  <Link
                    key={module.id}
                    href={`/cours/${module.id}`}
                    className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-[#202d3d] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-[#243347]"
                  >
                    <div className="absolute right-[-40px] top-[-40px] h-32 w-32 rounded-full bg-white/[0.025] blur-3xl" />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-black text-[#a9c9ff]">
                          {getModuleNumber(module.name)}
                        </div>

                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                          MODULE
                        </span>
                      </div>

                      <div className="mt-6">
                        <h3 className="text-xl font-black tracking-[-0.03em] text-white">
                          {getModuleTitle(module.name)}
                        </h3>

                        <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500">
                          {module.description ||
                            "Supports et ressources de formation Part-66."}
                        </p>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-2">
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
                          <div className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-600">
                            Cours
                          </div>

                          <div className="mt-1 text-lg font-black text-white">
                            {moduleCourses.length}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
                          <div className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-600">
                            Fiches
                          </div>

                          <div className="mt-1 text-lg font-black text-white">
                            {moduleSheets.length}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
                          Training module
                        </span>

                        <span className="text-xs font-black text-slate-300 transition group-hover:text-white">
                          Ouvrir →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* =====================================================
            CTA
        ===================================================== */}

        <section className="mt-10 rounded-[30px] border border-white/10 bg-[#202d3d] p-6 sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.26em] text-[#a9c9ff]">
                Training mode
              </div>

              <h2 className="mt-2 text-2xl font-black text-white">
                Prêt à tester tes connaissances ?
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Lance un QCM depuis n&apos;importe quel module et
                suis ensuite ta progression.
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