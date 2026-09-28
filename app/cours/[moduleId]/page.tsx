"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
  chapter_id: number | null;
  title: string;
  content: string | null;
  file_path: string | null;
  created_at: string;
};

function getModuleNumber(name: string) {
  return name.match(/^Module\s+(\d+)/)?.[1] || "";
}

function getModuleTitle(name: string) {
  return name.replace(/^Module\s+\d+\s+—\s*/, "");
}

export default function ModuleCoursPage() {
  const params = useParams();
  const moduleId = Number(params.moduleId);

  const [module, setModule] = useState<Module | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sheets, setSheets] = useState<Sheet[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!Number.isFinite(moduleId)) {
      setError("Module invalide.");
      setLoading(false);
      return;
    }

    async function loadData() {
      setLoading(true);
      setError("");

      const [moduleResult, coursesResult, sheetsResult] =
        await Promise.all([
          supabase
            .from("modules")
            .select("id, name, description")
            .eq("id", moduleId)
            .single(),

          supabase
            .from("course_files")
            .select(
              "id, module_id, title, file_path, created_at",
            )
            .eq("module_id", moduleId)
            .order("created_at", { ascending: false }),

          supabase
            .from("revision_sheets")
            .select(
              "id, module_id, chapter_id, title, content, file_path, created_at",
            )
            .eq("module_id", moduleId)
            .order("created_at", { ascending: false }),
        ]);

      if (moduleResult.error) {
        setError("Impossible de charger ce module.");
      }

      setModule(moduleResult.data || null);
      setCourses(coursesResult.data || []);
      setSheets(sheetsResult.data || []);

      setLoading(false);
    }

    loadData();
  }, [moduleId]);

  const numberedModule = module
    ? getModuleNumber(module.name)
    : "";

  const moduleTitle = module
    ? getModuleTitle(module.name)
    : "Module";

  const courseUrls = useMemo(() => {
    const result: Record<number, string> = {};

    for (const course of courses) {
      const { data } = supabase.storage
        .from("course-pdfs")
        .getPublicUrl(course.file_path);

      result[course.id] = data.publicUrl;
    }

    return result;
  }, [courses]);

  const sheetUrls = useMemo(() => {
    const result: Record<number, string> = {};

    for (const sheet of sheets) {
      if (!sheet.file_path) continue;

      const { data } = supabase.storage
        .from("revision-pdfs")
        .getPublicUrl(sheet.file_path);

      result[sheet.id] = data.publicUrl;
    }

    return result;
  }, [sheets]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#182332] px-4 py-10 text-white sm:px-6">
        <div className="mx-auto max-w-[1200px]">
          <div className="h-[280px] animate-pulse rounded-[38px] bg-[#202d3d]" />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="h-[220px] animate-pulse rounded-[30px] bg-[#202d3d]" />
            <div className="h-[220px] animate-pulse rounded-[30px] bg-[#202d3d]" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !module) {
    return (
      <main className="min-h-screen bg-[#182332] px-4 py-10 text-white sm:px-6">
        <div className="mx-auto max-w-[800px]">
          <div className="rounded-[30px] border border-red-300/20 bg-[#202d3d] p-8 text-center">
            <div className="text-2xl font-black">
              Module introuvable
            </div>

            <p className="mt-2 text-sm text-slate-500">
              {error || "Ce module n'existe pas."}
            </p>

            <Link
              href="/cours"
              className="mt-6 inline-flex rounded-2xl bg-[#6ea8ff] px-5 py-3 text-sm font-black text-[#122033]"
            >
              ← Retour aux cours
            </Link>
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
        <div className="absolute left-1/2 top-[-100px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[130px]" />

        <div className="absolute right-[-140px] top-[30%] h-[500px] w-[500px] rounded-full bg-white/[0.018] blur-[130px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-4 py-7 sm:px-6 lg:px-8">
        {/* =====================================================
            TOP
        ===================================================== */}

        <Link
          href="/cours"
          className="inline-flex items-center gap-2 text-xs font-black text-slate-500 transition hover:text-white"
        >
          ← Tous les cours
        </Link>

        {/* =====================================================
            HERO MODULE
        ===================================================== */}

        <section className="relative mt-5 overflow-hidden rounded-[38px] border border-white/10 bg-gradient-to-br from-[#233246] via-[#293b4f] to-[#30475d] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.15)] sm:p-10">
          <div className="absolute right-[-100px] top-[-100px] h-[320px] w-[320px] rounded-full bg-white/[0.03] blur-[90px]" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-sm font-black text-[#a9c9ff]">
                  {numberedModule}
                </div>

                <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                  Part-66 · B1.1
                </div>
              </div>

              <h1 className="mt-6 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
                {moduleTitle}
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
                {module.description ||
                  "Supports de formation et ressources de révision pour ce module."}
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                <div className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-300">
                  {courses.length} cours
                </div>

                <div className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-300">
                  {sheets.length} fiches
                </div>
              </div>
            </div>

            <div className="relative mx-auto flex h-[220px] w-[220px] items-center justify-center lg:mx-0">
              <div className="absolute inset-0 rounded-full border border-white/10" />

              <div className="absolute inset-[27px] rounded-full border border-white/[0.08]" />

              <div className="absolute inset-[55px] rounded-full border border-white/[0.06]" />

              <div className="absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-white/25" />
              <div className="absolute bottom-0 left-1/2 h-6 w-px -translate-x-1/2 bg-white/25" />
              <div className="absolute left-0 top-1/2 h-px w-6 -translate-y-1/2 bg-white/25" />
              <div className="absolute right-0 top-1/2 h-px w-6 -translate-y-1/2 bg-white/25" />

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
            COURS
        ===================================================== */}

        <section className="mt-10">
          <div className="mb-6">
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              Course material
            </div>

            <h2 className="mt-2 text-2xl font-black text-white">
              Supports de cours
            </h2>
          </div>

          {courses.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-white/10 bg-[#202d3d] p-10 text-center">
              <div className="text-lg font-black text-white">
                Aucun cours disponible
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Les supports de ce module seront ajoutés prochainement.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => {
                const url = courseUrls[course.id];

                return (
                  <a
                    key={course.id}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="group rounded-[30px] border border-white/10 bg-[#202d3d] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-[#243347]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06]">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-6 w-6 text-[#a9c9ff]"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          aria-hidden="true"
                        >
                          <path d="M6 3h8l4 4v14H6z" />
                          <path d="M14 3v5h5" />
                          <path d="M9 13h6" />
                          <path d="M9 17h5" />
                        </svg>
                      </div>

                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                        PDF
                      </span>
                    </div>

                    <h3 className="mt-6 text-lg font-black leading-6 text-white">
                      {course.title}
                    </h3>

                    <div className="mt-5 border-t border-white/[0.06] pt-4 text-xs font-black text-slate-500 group-hover:text-white">
                      Ouvrir le support →
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </section>

        {/* =====================================================
            FICHES
        ===================================================== */}

        <section className="mt-10">
          <div className="mb-6">
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              Revision material
            </div>

            <h2 className="mt-2 text-2xl font-black text-white">
              Fiches de révision
            </h2>
          </div>

          {sheets.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-white/10 bg-[#202d3d] p-10 text-center">
              <div className="text-lg font-black text-white">
                Aucune fiche pour ce module
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Les fiches apparaîtront ici lorsqu&apos;elles seront disponibles.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sheets.map((sheet) => {
                const url = sheetUrls[sheet.id];

                if (url) {
                  return (
                    <a
                      key={sheet.id}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="group rounded-[30px] border border-white/10 bg-[#202d3d] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-[#243347]"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-[#a9c9ff]">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-6 w-6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          aria-hidden="true"
                        >
                          <path d="M5 4h14v16H5z" />
                          <path d="M8 8h8" />
                          <path d="M8 12h8" />
                          <path d="M8 16h5" />
                        </svg>
                      </div>

                      <h3 className="mt-6 text-lg font-black leading-6 text-white">
                        {sheet.title}
                      </h3>

                      <div className="mt-5 border-t border-white/[0.06] pt-4 text-xs font-black text-slate-500 group-hover:text-white">
                        Ouvrir la fiche →
                      </div>
                    </a>
                  );
                }

                return (
                  <div
                    key={sheet.id}
                    className="rounded-[30px] border border-white/10 bg-[#202d3d] p-6"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-[#a9c9ff]">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-6 w-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden="true"
                      >
                        <path d="M5 4h14v16H5z" />
                        <path d="M8 8h8" />
                        <path d="M8 12h8" />
                        <path d="M8 16h5" />
                      </svg>
                    </div>

                    <h3 className="mt-6 text-lg font-black text-white">
                      {sheet.title}
                    </h3>

                    {sheet.content && (
                      <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-500">
                        {sheet.content}
                      </p>
                    )}

                    <div className="mt-5 border-t border-white/[0.06] pt-4 text-xs font-black text-slate-600">
                      Fiche texte
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* =====================================================
            QCM CTA
        ===================================================== */}

        <section className="mt-10 rounded-[30px] border border-white/10 bg-[#202d3d] p-6 sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#a9c9ff]">
                Training
              </div>

              <h2 className="mt-2 text-2xl font-black text-white">
                Tester ce module
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Passe directement un QCM sur ce module pour vérifier
                tes connaissances.
              </p>
            </div>

            <Link
              href={`/qcm?moduleId=${module.id}`}
              className="shrink-0 rounded-2xl bg-[#6ea8ff] px-6 py-4 text-center text-sm font-black text-[#122033] transition hover:bg-[#83b5ff]"
            >
              Lancer le QCM →
            </Link>
          </div>
        </section>

        <div className="h-8" />
      </div>
    </main>
  );
}