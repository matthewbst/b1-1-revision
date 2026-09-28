"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Module = {
  id: number;
  name: string;
};

function moduleNumber(name: string) {
  return name.match(/^Module\s+(\d+)/)?.[1] || "";
}

function moduleTitle(name: string) {
  return name.replace(/^Module\s+\d+\s+—\s*/, "");
}

export default function ProposerQuestionPage() {
  const [modules, setModules] = useState<Module[]>([]);

  const [moduleId, setModuleId] = useState("");
  const [question, setQuestion] = useState("");

  const [answers, setAnswers] = useState([
    "",
    "",
    "",
  ]);

  const [correctIndex, setCorrectIndex] = useState(0);

  const [explanation, setExplanation] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [sourcePage, setSourcePage] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [success, setSuccess] = useState("");
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

      const { data } = await supabase
        .from("modules")
        .select("id, name")
        .order("id", { ascending: true });

      setModules(data || []);
      setLoading(false);
    }

    load();
  }, []);

  function updateAnswer(index: number, value: string) {
    setAnswers((previous) =>
      previous.map((answer, answerIndex) =>
        answerIndex === index ? value : answer,
      ),
    );
  }

  function resetForm() {
    setModuleId("");
    setQuestion("");
    setAnswers(["", "", ""]);
    setCorrectIndex(0);
    setExplanation("");
    setSourceReference("");
    setSourcePage("");
    setError("");
    setSuccess("");
  }

  async function submitQuestion() {
    setError("");
    setSuccess("");

    const trimmedQuestion = question.trim();

    const trimmedAnswers = answers.map((answer) =>
      answer.trim(),
    );

    if (!moduleId) {
      setError("Sélectionne un module.");
      return;
    }

    if (!trimmedQuestion) {
      setError("Écris une question.");
      return;
    }

    if (trimmedAnswers.some((answer) => !answer)) {
      setError("Remplis les trois réponses.");
      return;
    }

    const normalized = trimmedAnswers.map((answer) =>
      answer.toLowerCase().replace(/\s+/g, " "),
    );

    if (new Set(normalized).size !== 3) {
      setError("Les trois réponses doivent être différentes.");
      return;
    }

    const parsedPage =
      sourcePage.trim() === ""
        ? null
        : Number(sourcePage.trim());

    if (
      parsedPage !== null &&
      (!Number.isInteger(parsedPage) || parsedPage < 1)
    ) {
      setError(
        "La page source doit être un nombre entier positif.",
      );
      return;
    }

    setSending(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/connexion";
        return;
      }

      const { data: insertedQuestion, error: questionError } =
        await supabase
          .from("questions")
          .insert({
            module_id: Number(moduleId),
            question: trimmedQuestion,
            explanation: explanation.trim() || null,
            source_reference:
              sourceReference.trim() || null,
            source_page: parsedPage,
            created_by: user.id,
            status: "draft",
          })
          .select("id")
          .single();

      if (questionError) {
        throw questionError;
      }

      const rows = trimmedAnswers.map((answer, index) => ({
        question_id: insertedQuestion.id,
        answer,
        is_correct: index === correctIndex,
      }));

      const { error: answersError } = await supabase
        .from("answers")
        .insert(rows);

      if (answersError) {
        await supabase
          .from("questions")
          .delete()
          .eq("id", insertedQuestion.id);

        throw answersError;
      }

      setSuccess(
        "Question envoyée. Elle sera vérifiée avant publication.",
      );

      setModuleId("");
      setQuestion("");
      setAnswers(["", "", ""]);
      setCorrectIndex(0);
      setExplanation("");
      setSourceReference("");
      setSourcePage("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'envoyer la question.",
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#182332] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="rounded-2xl border border-white/10 bg-[#202d3d] px-6 py-4 text-sm font-semibold text-slate-300">
            Préparation...
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

        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
        {/* HEADER */}

        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
              <span className="h-2 w-2 rounded-full bg-[#a9c9ff]" />
              Contribution
            </div>

            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
              Créer une question
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              Propose une question de qualité pour enrichir la banque
              QCM de la formation B1.1.
            </p>
          </div>

          <Link
            href="/qcm"
            className="rounded-2xl border border-white/10 bg-[#202d3d] px-5 py-3.5 text-sm font-bold text-slate-300 transition hover:bg-[#28384b] hover:text-white"
          >
            Retour aux QCM
          </Link>
        </header>

        {/* ETAPES */}

        <div className="mb-5 grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#202d3d] p-4">
            <div className="text-[8px] font-black uppercase tracking-[0.22em] text-[#a9c9ff]">
              01
            </div>
            <div className="mt-1 text-sm font-black text-white">
              Sujet
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#202d3d] p-4">
            <div className="text-[8px] font-black uppercase tracking-[0.22em] text-[#a9c9ff]">
              02
            </div>
            <div className="mt-1 text-sm font-black text-white">
              Réponses
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#202d3d] p-4">
            <div className="text-[8px] font-black uppercase tracking-[0.22em] text-[#a9c9ff]">
              03
            </div>
            <div className="mt-1 text-sm font-black text-white">
              Validation
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {/* ETAPE 1 */}

          <section className="rounded-[32px] border border-white/10 bg-[#202d3d] p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-sm font-black text-[#a9c9ff]">
                01
              </div>

              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                  Sujet
                </div>

                <h2 className="mt-1 text-2xl font-black text-white">
                  Définis le contexte
                </h2>
              </div>
            </div>

            <div className="mt-7 space-y-6">
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                  Module
                </label>

                <select
                  value={moduleId}
                  onChange={(event) =>
                    setModuleId(event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#182332] px-4 py-4 text-sm font-bold text-white outline-none focus:border-white/20"
                >
                  <option value="">
                    Choisir un module...
                  </option>

                  {modules.map((module) => (
                    <option key={module.id} value={module.id}>
                      Module {moduleNumber(module.name)} —{" "}
                      {moduleTitle(module.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                  Question
                </label>

                <textarea
                  value={question}
                  onChange={(event) =>
                    setQuestion(event.target.value)
                  }
                  rows={6}
                  placeholder="Écris une question claire et précise..."
                  className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-[#182332] px-4 py-4 text-sm leading-7 text-white outline-none placeholder:text-slate-600 focus:border-white/20"
                />
              </div>
            </div>
          </section>

          {/* ETAPE 2 */}

          <section className="rounded-[32px] border border-white/10 bg-[#202d3d] p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-sm font-black text-[#a9c9ff]">
                02
              </div>

              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                  Réponses
                </div>

                <h2 className="mt-1 text-2xl font-black text-white">
                  Construis le QCM
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Une seule réponse doit être correcte.
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-4">
              {answers.map((answer, index) => {
                const selected = correctIndex === index;

                return (
                  <div
                    key={index}
                    className={`rounded-3xl border p-4 transition ${
                      selected
                        ? "border-emerald-300/25 bg-emerald-300/[0.06]"
                        : "border-white/10 bg-[#182332]"
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        onClick={() =>
                          setCorrectIndex(index)
                        }
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black transition ${
                          selected
                            ? "bg-emerald-300 text-[#16251f]"
                            : "bg-white/[0.06] text-slate-400 hover:bg-white/[0.10] hover:text-white"
                        }`}
                      >
                        {String.fromCharCode(65 + index)}
                      </button>

                      <div className="min-w-0 flex-1">
                        <input
                          value={answer}
                          onChange={(event) =>
                            updateAnswer(
                              index,
                              event.target.value,
                            )
                          }
                          placeholder={`Réponse ${String.fromCharCode(
                            65 + index,
                          )}`}
                          className="w-full rounded-2xl border border-white/10 bg-[#202d3d] px-4 py-4 text-sm font-medium text-white outline-none placeholder:text-slate-600 focus:border-white/20"
                        />
                      </div>

                      <div
                        className={`shrink-0 text-[9px] font-black uppercase tracking-[0.18em] ${
                          selected
                            ? "text-emerald-300"
                            : "text-slate-600"
                        }`}
                      >
                        {selected
                          ? "Bonne réponse"
                          : "Définir comme correcte"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ETAPE 3 */}

          <section className="rounded-[32px] border border-white/10 bg-[#202d3d] p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-sm font-black text-[#a9c9ff]">
                03
              </div>

              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
                  Validation
                </div>

                <h2 className="mt-1 text-2xl font-black text-white">
                  Ajoute les références
                </h2>
              </div>
            </div>

            <div className="mt-7 space-y-6">
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                  Explication
                </label>

                <textarea
                  value={explanation}
                  onChange={(event) =>
                    setExplanation(event.target.value)
                  }
                  rows={4}
                  placeholder="Explique pourquoi cette réponse est correcte..."
                  className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-[#182332] px-4 py-4 text-sm leading-7 text-white outline-none placeholder:text-slate-600 focus:border-white/20"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                    Source
                  </label>

                  <input
                    value={sourceReference}
                    onChange={(event) =>
                      setSourceReference(event.target.value)
                    }
                    placeholder="Cours, manuel, document..."
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#182332] px-4 py-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/20"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                    Page
                  </label>

                  <input
                    value={sourcePage}
                    onChange={(event) =>
                      setSourcePage(event.target.value)
                    }
                    inputMode="numeric"
                    placeholder="42"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#182332] px-4 py-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/20"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* MESSAGES */}

          {error && (
            <div className="rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-4 text-sm font-semibold leading-6 text-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-4 text-sm font-semibold leading-6 text-emerald-200">
              {success}
            </div>
          )}

          {/* ACTIONS */}

          <section className="rounded-[30px] border border-white/10 bg-gradient-to-br from-[#233246] to-[#30475d] p-6 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#a9c9ff]">
                  Final check
                </div>

                <div className="mt-2 text-lg font-black text-white">
                  Prêt à envoyer ta question ?
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  Elle sera vérifiée avant d&apos;être publiée.
                </div>
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
                  onClick={submitQuestion}
                  disabled={sending}
                  className="rounded-2xl bg-[#6ea8ff] px-6 py-3.5 text-sm font-black text-[#122033] transition hover:bg-[#83b5ff] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending
                    ? "Envoi en cours..."
                    : "Envoyer la question →"}
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