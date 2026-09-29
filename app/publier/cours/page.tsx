"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

const ADMIN_ID =
  "dcbeb72a-4f4a-4169-beab-53da1b3babfa";

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

export default function PublierCoursPage() {
  const [modules, setModules] =
    useState<Module[]>([]);

  const [
    selectedModule,
    setSelectedModule,
  ] = useState("");

  const [title, setTitle] =
    useState("");

  const [file, setFile] =
    useState<File | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      if (!user) {
        window.location.href =
          "/connexion?redirect=/publier/cours";
        return;
      }

      if (user.id !== ADMIN_ID) {
        window.location.href = "/";
        return;
      }

      const {
        data,
        error: modulesError,
      } =
        await supabase
          .from("modules")
          .select("id,name")
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
    setMessage("");
    setError("");

    const selected =
      event.target.files?.[0] ||
      null;

    if (!selected) {
      setFile(null);
      return;
    }

    const isPdf =
      selected.type ===
        "application/pdf" ||
      selected.name
        .toLowerCase()
        .endsWith(".pdf");

    if (!isPdf) {
      event.target.value = "";
      setFile(null);

      setError(
        "Le fichier doit être un PDF.",
      );

      return;
    }

    const maxSize =
      50 * 1024 * 1024;

    if (selected.size > maxSize) {
      event.target.value = "";
      setFile(null);

      setError(
        "Le PDF ne doit pas dépasser 50 Mo.",
      );

      return;
    }

    setFile(selected);
  }

  function resetForm() {
    setSelectedModule("");
    setTitle("");
    setFile(null);
    setMessage("");
    setError("");

    const input =
      document.getElementById(
        "course-pdf",
      ) as HTMLInputElement | null;

    if (input) {
      input.value = "";
    }
  }

  async function uploadCourse(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!selectedModule) {
      setError(
        "Sélectionne un module.",
      );
      return;
    }

    const finalTitle =
      title.trim();

    if (!finalTitle) {
      setError(
        "Donne un nom au cours.",
      );
      return;
    }

    if (!file) {
      setError(
        "Sélectionne un PDF.",
      );
      return;
    }

    setSending(true);

    let uploadedPath:
      | string
      | null = null;

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        window.location.href =
          "/connexion?redirect=/publier/cours";
        return;
      }

      if (user.id !== ADMIN_ID) {
        setError(
          "Accès administrateur requis.",
        );
        return;
      }

      const cleanName =
        sanitizeFileName(
          file.name,
        );

      const uniqueFileName =
        `${Date.now()}-${cleanName}`;

      uploadedPath =
        `${user.id}/${uniqueFileName}`;

      // ==========================================
      // UPLOAD DU PDF
      // ==========================================

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from("course-pdfs")
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
          `Upload du PDF impossible : ${uploadError.message}`,
        );
      }

      // ==========================================
      // ENREGISTREMENT EN BASE
      // ==========================================

      const {
        error: databaseError,
      } =
        await supabase
          .from("course_files")
          .insert({
            module_id:
              Number(selectedModule),
            title: finalTitle,
            file_path:
              uploadedPath,
            created_by: user.id,
          });

      if (databaseError) {
        await supabase.storage
          .from("course-pdfs")
          .remove([
            uploadedPath,
          ]);

        uploadedPath = null;

        throw new Error(
          `Enregistrement impossible : ${databaseError.message}`,
        );
      }

      setMessage(
        "✅ Le PDF a bien été ajouté au cours.",
      );

      setSelectedModule("");
      setTitle("");
      setFile(null);

      const input =
        document.getElementById(
          "course-pdf",
        ) as HTMLInputElement | null;

      if (input) {
        input.value = "";
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'ajouter le cours.",
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
            Chargement de l&apos;administration...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#182332] text-white">
      {/* ================================================
          BACKGROUND
      ================================================= */}

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-120px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[130px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize:
              "50px 50px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
        {/* ================================================
            HEADER
        ================================================= */}

        <section className="relative overflow-hidden rounded-[38px] border border-white/10 bg-gradient-to-br from-[#233246] via-[#293b4f] to-[#30475d] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.15)] sm:p-10">
          <div className="absolute right-[-100px] top-[-100px] h-[300px] w-[300px] rounded-full bg-white/[0.035] blur-[90px]" />

          <div className="relative">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Administration
            </div>

            <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
              Ajouter un cours
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Ajoute un support PDF directement dans le bon module
              pour qu&apos;il apparaisse sur la plateforme.
            </p>
          </div>
        </section>

        {/* ================================================
            MESSAGES
        ================================================= */}

        {message && (
          <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-5 py-4 text-sm font-semibold text-emerald-200">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-300/10 px-5 py-4 text-sm leading-6 text-red-200">
            {error}
          </div>
        )}

        {/* ================================================
            FORMULAIRE
        ================================================= */}

        <form
          onSubmit={uploadCourse}
          className="mt-6 space-y-5"
        >
          {/* MODULE */}

          <section className="rounded-[32px] border border-white/10 bg-[#202d3d] p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#a9c9ff]/10 text-sm font-black text-[#a9c9ff]">
                01
              </div>

              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                  Classification
                </div>

                <h2 className="mt-1 text-2xl font-black">
                  Choisir le module
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Le PDF sera affiché dans ce module.
                </p>
              </div>
            </div>

            <select
              value={selectedModule}
              onChange={(event) =>
                setSelectedModule(
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
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#a9c9ff]/10 text-sm font-black text-[#a9c9ff]">
                02
              </div>

              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                  Identification
                </div>

                <h2 className="mt-1 text-2xl font-black">
                  Nom du cours
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Le nom qui sera visible par les étudiants.
                </p>
              </div>
            </div>

            <input
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value,
                )
              }
              placeholder="Ex. M5 — Techniques numériques — Cours complet"
              className="mt-7 w-full rounded-2xl border border-white/10 bg-[#182332] px-4 py-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-[#a9c9ff]/30"
            />
          </section>

          {/* PDF */}

          <section className="rounded-[32px] border border-white/10 bg-[#202d3d] p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#a9c9ff]/10 text-sm font-black text-[#a9c9ff]">
                03
              </div>

              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                  Fichier
                </div>

                <h2 className="mt-1 text-2xl font-black">
                  Ajouter le PDF
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  PDF uniquement · taille maximale 50 Mo.
                </p>
              </div>
            </div>

            <label
              htmlFor="course-pdf"
              className="mt-7 flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-[#182332] p-10 text-center transition hover:border-[#a9c9ff]/30 hover:bg-[#1d2b3b]"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#a9c9ff]/10 text-3xl">
                📄
              </div>

              <div className="mt-5 text-base font-black text-white">
                {file
                  ? file.name
                  : "Choisir un PDF"}
              </div>

              <div className="mt-2 text-xs text-slate-500">
                Clique ici pour sélectionner ton fichier
              </div>

              <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-black text-slate-300">
                Parcourir les fichiers
              </div>

              <input
                id="course-pdf"
                type="file"
                accept="application/pdf,.pdf"
                onChange={
                  handleFileChange
                }
                className="hidden"
              />
            </label>

            {file && (
              <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-400/10 text-sm">
                    PDF
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black text-white">
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
                      setFile(
                        null,
                      );

                      const input =
                        document.getElementById(
                          "course-pdf",
                        ) as HTMLInputElement | null;

                      if (input) {
                        input.value = "";
                      }
                    }}
                    className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    Retirer
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ACTION */}

          <section className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#233246] to-[#30475d] p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#a9c9ff]">
                  Publication
                </div>

                <h2 className="mt-2 text-xl font-black">
                  Publier ce support
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Le PDF sera automatiquement associé au module sélectionné.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={
                    resetForm
                  }
                  disabled={
                    sending
                  }
                  className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3.5 text-sm font-bold text-slate-300 transition hover:bg-white/[0.09] hover:text-white disabled:opacity-50"
                >
                  Réinitialiser
                </button>

                <button
                  type="submit"
                  disabled={
                    sending
                  }
                  className="rounded-2xl bg-[#6ea8ff] px-6 py-3.5 text-sm font-black text-[#122033] transition hover:bg-[#83b5ff] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending
                    ? "Envoi du PDF..."
                    : "Publier le cours →"}
                </button>
              </div>
            </div>
          </section>
        </form>

        <div className="h-10" />
      </div>
    </main>
  );
}