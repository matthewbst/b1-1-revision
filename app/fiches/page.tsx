"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

type Module = {
  id: number;
  name: string;
  description: string | null;
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

function moduleNumber(
  name: string,
) {
  return (
    name.match(
      /^Module\s+(\d+)/,
    )?.[1] || ""
  );
}

function moduleTitle(
  name: string,
) {
  return name.replace(
    /^Module\s+\d+\s+—\s*/,
    "",
  );
}

function normalize(
  value: string,
) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    );
}

export default function FichesPage() {
  const [modules, setModules] =
    useState<Module[]>([]);

  const [sheets, setSheets] =
    useState<Sheet[]>([]);

  const [search, setSearch] =
    useState("");

  const [selectedModule, setSelectedModule] =
    useState("all");

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function load() {
      const [
        modulesResult,
        sheetsResult,
      ] = await Promise.all([
        supabase
          .from("modules")
          .select(
            "id, name, description",
          )
          .order("id", {
            ascending: true,
          }),

        supabase
          .from("revision_sheets")
          .select(
            "id, module_id, chapter_id, title, content, file_path, created_at",
          )
          .order("created_at", {
            ascending: false,
          }),
      ]);

      setModules(
        modulesResult.data || [],
      );

      setSheets(
        sheetsResult.data || [],
      );

      setLoading(false);
    }

    load();
  }, []);

  const filteredSheets = useMemo(
    () => {
      const term = normalize(
        search.trim(),
      );

      return sheets.filter(
        (sheet) => {
          const module =
            modules.find(
              (item) =>
                item.id ===
                sheet.module_id,
            );

          const moduleMatch =
            selectedModule ===
              "all" ||
            String(
              sheet.module_id,
            ) === selectedModule;

          const text = normalize(
            `${sheet.title} ${
              sheet.content || ""
            } ${
              module?.name || ""
            }`,
          );

          const searchMatch =
            !term ||
            text.includes(term);

          return (
            moduleMatch &&
            searchMatch
          );
        },
      );
    },
    [
      modules,
      sheets,
      search,
      selectedModule,
    ],
  );

  const publicUrl = (
    path: string | null,
  ) => {
    if (!path) {
      return null;
    }

    return supabase.storage
      .from("revision-pdfs")
      .getPublicUrl(path).data
      .publicUrl;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#182332] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="rounded-2xl border border-white/10 bg-[#202d3d] px-6 py-4 text-sm font-semibold text-slate-300">
            Chargement des fiches...
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

        <div className="absolute left-[-10%] top-[40%] h-[500px] w-[500px] rounded-full bg-slate-200/[0.02] blur-[120px]" />

        <div className="absolute right-[-10%] top-[25%] h-[500px] w-[500px] rounded-full bg-white/[0.02] blur-[120px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px)",
            backgroundSize:
              "50px 50px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
        {/* HEADER */}

        <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#233246] via-[#293b4f] to-[#30475d] p-7 shadow-[0_25px_70px_rgba(0,0,0,0.15)] sm:p-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
                <span className="h-2 w-2 rounded-full bg-[#a9c9ff]" />
                Revision
              </div>

              <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
                Fiches de révision
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Retrouve rapidement tes supports de
                révision et travaille les notions importantes
                de ta formation B1.1.
              </p>
            </div>

            <div className="grid gap-3 sm:min-w-[340px]">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/[0.10] p-4">
                  <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Fiches
                  </div>

                  <div className="mt-2 text-3xl font-black text-white">
                    {sheets.length}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/[0.10] p-4">
                  <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Modules
                  </div>

                  <div className="mt-2 text-3xl font-black text-[#a9c9ff]">
                    {modules.length}
                  </div>
                </div>
              </div>

              <Link
                href="/proposer/fiche"
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#6ea8ff] px-5 py-3.5 text-sm font-black text-[#122033] transition hover:bg-[#83b5ff]"
              >
                <span className="text-lg">
                  +
                </span>

                <span>
                  Ajouter ma fiche
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* FILTRES */}

        <section className="mt-5 rounded-3xl border border-white/10 bg-[#202d3d] p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_280px_auto]">
            <div className="relative">
              <svg
                viewBox="0 0 24 24"
                className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="6.5"
                />

                <path d="M16 16L21 21" />
              </svg>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Rechercher une fiche..."
                className="w-full rounded-2xl border border-white/10 bg-[#182332] py-4 pl-12 pr-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-white/20"
              />
            </div>

            <select
              value={
                selectedModule
              }
              onChange={(event) =>
                setSelectedModule(
                  event.target.value,
                )
              }
              className="rounded-2xl border border-white/10 bg-[#182332] px-4 py-4 text-sm font-bold text-slate-300 outline-none"
            >
              <option value="all">
                Tous les modules
              </option>

              {modules.map(
                (module) => (
                  <option
                    key={
                      module.id
                    }
                    value={
                      module.id
                    }
                  >
                    Module{" "}
                    {moduleNumber(
                      module.name,
                    )}{" "}
                    —{" "}
                    {moduleTitle(
                      module.name,
                    )}
                  </option>
                ),
              )}
            </select>

            {(search ||
              selectedModule !==
                "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedModule(
                    "all",
                  );
                }}
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 text-sm font-bold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </section>

        {/* RESULTATS */}

        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                Library
              </div>

              <h2 className="mt-2 text-2xl font-black text-white">
                Supports disponibles
              </h2>
            </div>

            <div className="text-xs font-bold text-slate-500">
              {filteredSheets.length}{" "}
              résultat
              {filteredSheets.length >
              1
                ? "s"
                : ""}
            </div>
          </div>

          {filteredSheets.length ===
          0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-[#202d3d] p-12 text-center">
              <div className="text-3xl">
                📄
              </div>

              <h3 className="mt-4 text-lg font-black text-white">
                Aucune fiche trouvée
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Modifie ta recherche ou ton filtre de module.
              </p>

              <Link
                href="/proposer/fiche"
                className="mt-6 inline-flex rounded-2xl bg-[#6ea8ff] px-5 py-3 text-sm font-black text-[#122033] transition hover:bg-[#83b5ff]"
              >
                Ajouter une fiche →
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredSheets.map(
                (sheet) => {
                  const module =
                    modules.find(
                      (item) =>
                        item.id ===
                        sheet.module_id,
                    );

                  const url =
                    publicUrl(
                      sheet.file_path,
                    );

                  return (
                    <article
                      key={
                        sheet.id
                      }
                      className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#202d3d] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-[#28384b]"
                    >
                      <div className="absolute right-[-45px] top-[-45px] h-32 w-32 rounded-full bg-white/[0.025] blur-3xl" />

                      <div className="relative">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-xl">
                            📄
                          </div>

                          {module && (
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-black text-slate-400">
                              M
                              {moduleNumber(
                                module.name,
                              )}
                            </span>
                          )}
                        </div>

                        <h3 className="mt-6 min-h-[56px] text-xl font-black leading-tight text-white">
                          {sheet.title}
                        </h3>

                        {module && (
                          <div className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                            {moduleTitle(
                              module.name,
                            )}
                          </div>
                        )}

                        {sheet.content && (
                          <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-400">
                            {
                              sheet.content
                            }
                          </p>
                        )}

                        <div className="mt-6 border-t border-white/[0.06] pt-4">
                          {url ? (
                            <a
                              href={
                                url
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between rounded-2xl bg-[#6ea8ff] px-4 py-3 text-sm font-black text-[#122033] transition hover:bg-[#83b5ff]"
                            >
                              <span>
                                Ouvrir la fiche
                              </span>

                              <span>
                                ↗
                              </span>
                            </a>
                          ) : (
                            <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-slate-400">
                              Contenu disponible
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>

        {/* CTA */}

        <section className="mt-10 rounded-[30px] border border-white/10 bg-[#202d3d] p-7 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                Contribution
              </div>

              <h2 className="mt-2 text-2xl font-black text-white">
                Tu as une fiche utile à partager ?
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Ajoute ton résumé ou ton PDF pour aider
                les autres étudiants B1.1.
              </p>
            </div>

            <Link
              href="/proposer/fiche"
              className="rounded-2xl bg-[#6ea8ff] px-6 py-4 text-center text-sm font-black text-[#122033] transition hover:bg-[#83b5ff]"
            >
              Ajouter ma fiche →
            </Link>
          </div>
        </section>

        {/* CTA QCM */}

        <section className="mt-5 rounded-[30px] border border-white/10 bg-[#202d3d] p-7 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                Next step
              </div>

              <h2 className="mt-2 text-2xl font-black text-white">
                Tu veux tester ce que tu viens de réviser ?
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Lance directement un QCM depuis ton espace
                d&apos;entraînement.
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