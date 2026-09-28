"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Module = {
  id: number;
  name: string;
};

function moduleNumber(name: string) {
  return (
    name.match(
      /^Module\s+(\d+)/,
    )?.[1] || ""
  );
}

function moduleTitle(name: string) {
  return name.replace(
    /^Module\s+\d+\s+—\s*/,
    "",
  );
}

function sanitizeFileName(
  fileName: string,
) {
  return fileName
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "-",
    )
    .replace(/-+/g, "-")
    .toLowerCase();
}

export default function ProposerFichePage() {
  const [modules, setModules] =
    useState<Module[]>([]);

  const [moduleId, setModuleId] =
    useState("");

  const [title, setTitle] =
    useState("");

  const [content, setContent] =
    useState("");

  const [file, setFile] =
    useState<File | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (!session?.user) {
        window.location.href =
          "/connexion?redirect=/proposer/fiche";
        return;
      }

      const {
        data,
        error: modulesError,
      } = await supabase
        .from("modules")
        .select("id, name")
        .order("id", {
          ascending: true,
        });

      if (!mounted) {
        return;
      }

      if (modulesError) {
        setError(
          modulesError.message,
        );
      }

      setModules(data || []);
      setLoading(false);
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    setError("");
    setSuccess(false);

    const selected =
      event.target.files?.[0] ||
      null;

    if (!selected) {
      setFile(null);
      return;
    }

    if (
      selected.type !==
        "application/pdf" &&
      !selected.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      setError(
        "Le fichier doit être au format PDF.",
      );

      event.target.value = "";
      setFile(null);
      return;
    }

    if (
      selected.size >
      10 * 1024 * 1024
    ) {
      setError(
        "Le PDF ne doit pas dépasser 10 Mo.",
      );

      event.target.value = "";
      setFile(null);
      return;
    }

    setFile(selected);
  }

  function resetForm() {
    setModuleId("");
    setTitle("");
    setContent("");
    setFile(null);
    setError("");
    setSuccess(false);

    const input =
      document.getElementById(
        "revision-file",
      ) as HTMLInputElement | null;

    if (input) {
      input.value = "";
    }
  }

  async function submitFiche() {
    setError("");
    setSuccess(false);

    const trimmedTitle =
      title.trim();

    const trimmedContent =
      content.trim();

    if (!moduleId) {
      setError(
        "Sélectionne un module.",
      );
      return;
    }

    if (!trimmedTitle) {
      setError(
        "Donne un titre à ta fiche.",
      );
      return;
    }

    if (
      trimmedTitle.length < 3
    ) {
      setError(
        "Le titre doit contenir au moins 3 caractères.",
      );
      return;
    }

    if (!file) {
      setError(
        "Ajoute un PDF à ta fiche.",
      );
      return;
    }

    setSending(true);

    let uploadedPath: string | null =
      null;

    try {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      const user = session?.user;

      if (!user) {
        window.location.href =
          "/connexion?redirect=/proposer/fiche";
        return;
      }

      const cleanName =
        sanitizeFileName(
          file.name,
        );

      const uniqueName =
        `${Date.now()}-${cleanName}`;

      uploadedPath =
        `${user.id}/${uniqueName}`;

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from("revision-pdfs")
          .upload(
            uploadedPath,
            file,
            {
              cacheControl: "3600",
              upsert: false,
              contentType:
                "application/pdf",
            },
          );

      if (uploadError) {
        throw new Error(
          `Upload PDF impossible : ${uploadError.message}`,
        );
      }

      const {
        error: insertError,
      } =
        await supabase
          .from("revision_sheets")
          .insert({
            module_id:
              Number(moduleId),
            title: trimmedTitle,
            content:
              trimmedContent ||
              null,
            file_path:
              uploadedPath,
            created_by: user.id,
          });

      if (insertError) {
        await supabase.storage
          .from("revision-pdfs")
          .remove([
            uploadedPath,
          ]);

        uploadedPath = null;

        throw new Error(
          `Enregistrement impossible : ${insertError.message}`,
        );
      }

      setSuccess(true);
      setModuleId("");
      setTitle("");
      setContent("");
      setFile(null);

      const input =
        document.getElementById(
          "revision-file",
        ) as HTMLInputElement | null;

      if (input) {
        input.value = "";
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'ajouter la fiche.",
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#182332] text-white">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="rounded-2xl border border-white/10 bg-[#202d3d] px-6 py-4 text-sm font-semibold text-slate-300">
            Chargement...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#182332] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-100px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[130px]" />

        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize:
              "50px 50px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1050px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
              Contribution étudiante
            </div>

            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
              Ajouter une fiche
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              Ajoute ton résumé et ton PDF pour partager ta fiche
              de révision avec les autres étudiants B1.1.
            </p>
          </div>

          <Link
            href="/proposer"
            className="rounded-2xl border border-white/10 bg-[#202d3d] px-5 py-3.5 text-sm font-bold text-slate-300 transition hover:bg-[#28384b] hover:text-white"
          >
            ← Retour
          </Link>
        </div>

        {success && (
          <div className="mb-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5">
            <div className="text-sm font-black text-emerald-200">
              Fiche ajoutée avec succès ✅
            </div>

            <p className="mt-2 text-sm leading-6 text-emerald-100/70">
              Ton PDF et ta fiche sont maintenant disponibles dans
              l&apos;onglet Fiches.
            </p>

            <Link
              href="/fiches"
              className="mt-4 inline-flex rounded-xl bg-emerald-300 px-4 py-3 text-xs font-black text-[#122033] transition hover:bg-emerald-200"
            >
              Voir les fiches →
            </Link>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-300/20 bg-red-300/10 p-5 text-sm leading-6 text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* MODULE */}

          <section className="rounded-[32px] border border-white/10 bg-[#202d3d] p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-sm font-black text-[#a9c9ff]">
                01
              </div>

              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                  Classification
                </div>

                <h2 className="mt-1 text-2xl font-black">
                  Choisir le module
                </h2>
              </div>
            </div>

            <select
              value={moduleId}
              onChange={(event) =>
                setModuleId(
                  event.target.value,
                )
              }
              className="mt-7 w-full rounded-2xl border border-white/10 bg-[#182332] px-4 py-4 text-sm font-bold text-white outline-none focus:border-[#a9c9ff]/30"
            >
              <option value="">
                Choisir un module...
              </option>

              {modules.map(
                (module) => (
                  <option
                    key={module.id}
                    value={module.id}
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
          </section>

          {/* TITRE */}

          <section className="rounded-[32px] border border-white/10 bg-[#202d3d] p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-sm font-black text-[#a9c9ff]">
                02
              </div>

              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                  Identification
                </div>

                <h2 className="mt-1 text-2xl font-black">
                  Nom de la fiche
                </h2>
              </div>
            </div>

            <input
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value,
                )
              }
              placeholder="Ex. Résumé électricité — courant continu"
              className="mt-7 w-full rounded-2xl border border-white/10 bg-[#182332] px-4 py-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-[#a9c9ff]/30"
            />
          </section>

          {/* CONTENU */}

          <section className="rounded-[32px] border border-white/10 bg-[#202d3d] p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-sm font-black text-[#a9c9ff]">
                03
              </div>

              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                  Description
                </div>

                <h2 className="mt-1 text-2xl font-black">
                  Résumé de la fiche
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Facultatif : tu peux ajouter quelques explications
                  ou notions importantes.
                </p>
              </div>
            </div>

            <textarea
              value={content}
              onChange={(event) =>
                setContent(
                  event.target.value,
                )
              }
              rows={8}
              placeholder="Écris ici un résumé, des définitions, formules, conseils ou points importants..."
              className="mt-7 w-full resize-y rounded-2xl border border-white/10 bg-[#182332] px-4 py-4 text-sm leading-7 text-white outline-none placeholder:text-slate-600 focus:border-[#a9c9ff]/30"
            />
          </section>

          {/* PDF */}

          <section className="rounded-[32px] border border-white/10 bg-[#202d3d] p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-sm font-black text-[#a9c9ff]">
                04
              </div>

              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                  Document
                </div>

                <h2 className="mt-1 text-2xl font-black">
                  Ajouter ton PDF
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Le PDF est obligatoire pour publier la fiche.
                  Taille maximale : 10 Mo.
                </p>
              </div>
            </div>

            <label
              htmlFor="revision-file"
              className="mt-7 flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-[#182332] p-9 text-center transition hover:border-[#a9c9ff]/30 hover:bg-[#1d2b3b]"
            >
              <div className="text-5xl">
                📎
              </div>

              <div className="mt-4 text-sm font-black text-white">
                {file
                  ? file.name
                  : "Sélectionner un PDF"}
              </div>

              <div className="mt-2 text-xs text-slate-500">
                PDF uniquement · 10 Mo maximum
              </div>

              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-black text-slate-300">
                Choisir le fichier
              </div>

              <input
                id="revision-file"
                type="file"
                accept="application/pdf,.pdf"
                onChange={
                  handleFileChange
                }
                className="hidden"
              />
            </label>

            {file && (
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-xs font-black text-white">
                    {file.name}
                  </div>

                  <div className="mt-1 text-[10px] text-slate-500">
                    {(
                      file.size /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    Mo
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFile(null);

                    const input =
                      document.getElementById(
                        "revision-file",
                      ) as HTMLInputElement | null;

                    if (input) {
                      input.value = "";
                    }
                  }}
                  className="ml-3 shrink-0 text-xs font-black text-slate-500 hover:text-white"
                >
                  Retirer
                </button>
              </div>
            )}
          </section>

          {/* ENVOI */}

          <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#233246] to-[#30475d] p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#a9c9ff]">
                  Finalisation
                </div>

                <h2 className="mt-2 text-xl font-black">
                  Prête à être partagée ?
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Vérifie le module, le titre et ton PDF avant
                  de publier.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={sending}
                  className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3.5 text-sm font-bold text-slate-300 transition hover:bg-white/[0.09] hover:text-white disabled:opacity-50"
                >
                  Réinitialiser
                </button>

                <button
                  type="button"
                  onClick={submitFiche}
                  disabled={sending}
                  className="rounded-2xl bg-[#6ea8ff] px-6 py-3.5 text-sm font-black text-[#122033] transition hover:bg-[#83b5ff] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending
                    ? "Envoi du PDF..."
                    : "Publier ma fiche →"}
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="h-10" />
      </div>
    </main>
  );
}