"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Module = {
  id: number;
  name: string;
  description: string | null;
};

type Answer = {
  id: number;
  answer: string;
};

type Question = {
  id: number;
  question: string;
  explanation: string | null;
  answers: Answer[];
};

type CorrectionItem = {
  questionId: number;
  selectedAnswerId: number | null;
  correctAnswerId: number | null;
  isCorrect: boolean;
  explanation: string | null;
};

type CorrectionResult = {
  score: number;
  total: number;
  percentage: number;
  results: CorrectionItem[];
};

type SavedQcm = {
  selectedModule: string;
  questionCount: number;
  questions: Question[];
  answers: Record<number, number>;
  currentIndex: number;
  seconds: number;
  savedAt: number;
};

const SAVED_QCM_KEY = "part66-qcm-en-cours";

function moduleNumber(name: string) {
  return name.match(/^Module\s+(\d+)/)?.[1] || "";
}

function moduleTitle(name: string) {
  return name.replace(/^Module\s+\d+\s+—\s*/, "");
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");

  const secs = (seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${secs}`;
}

function saveQcmToStorage(state: SavedQcm) {
  try {
    localStorage.setItem(
      SAVED_QCM_KEY,
      JSON.stringify(state),
    );
  } catch {
    // Le stockage local peut être indisponible.
  }
}

function loadQcmFromStorage(): SavedQcm | null {
  try {
    const raw = localStorage.getItem(
      SAVED_QCM_KEY,
    );

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as SavedQcm;

    if (
      !parsed ||
      !parsed.selectedModule ||
      !Array.isArray(parsed.questions) ||
      parsed.questions.length === 0
    ) {
      localStorage.removeItem(SAVED_QCM_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function clearSavedQcm() {
  try {
    localStorage.removeItem(SAVED_QCM_KEY);
  } catch {
    // Rien à faire si le stockage est indisponible.
  }
}

function formatSavedDate(timestamp: number) {
  if (!timestamp) {
    return "";
  }

  return new Date(timestamp).toLocaleTimeString(
    "fr-FR",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

export default function QcmPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] =
    useState("");

  const [questionCount, setQuestionCount] =
    useState(10);

  const [questions, setQuestions] = useState<
    Question[]
  >([]);

  const [answers, setAnswers] = useState<
    Record<number, number>
  >({});

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const [seconds, setSeconds] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingQcm, setLoadingQcm] =
    useState(false);

  const [correcting, setCorrecting] =
    useState(false);

  const [correction, setCorrection] =
    useState<CorrectionResult | null>(null);

  const [error, setError] = useState("");

  const [savedQcm, setSavedQcm] =
    useState<SavedQcm | null>(null);

  /* =========================================================
     CHARGEMENT DES MODULES
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    async function loadModules() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (!session?.user) {
        window.location.href =
          "/connexion?redirect=/qcm";
        return;
      }

      const { data, error: modulesError } =
        await supabase
          .from("modules")
          .select(
            "id, name, description",
          )
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

    loadModules();

    /*
      On regarde s'il existe un QCM sauvegardé.
    */

    const saved = loadQcmFromStorage();

    if (mounted) {
      setSavedQcm(saved);
    }

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================================================
     CHRONOMÈTRE
  ========================================================= */

  useEffect(() => {
    if (!started || finished) {
      return;
    }

    const timer = window.setInterval(() => {
      setSeconds(
        (value) => value + 1,
      );
    }, 1000);

    return () =>
      window.clearInterval(timer);
  }, [started, finished]);

  /* =========================================================
     SAUVEGARDE AUTOMATIQUE
  ========================================================= */

  useEffect(() => {
    if (
      !started ||
      finished ||
      !questions.length ||
      !selectedModule
    ) {
      return;
    }

    /*
      On sauvegarde automatiquement :
      - immédiatement quand les questions/answers/index changent
      - toutes les 5 secondes pendant le chrono
    */

    if (
      seconds % 5 !== 0 &&
      seconds !== 0
    ) {
      return;
    }

    saveQcmToStorage({
      selectedModule,
      questionCount,
      questions,
      answers,
      currentIndex,
      seconds,
      savedAt: Date.now(),
    });
  }, [
    started,
    finished,
    selectedModule,
    questionCount,
    questions,
    answers,
    currentIndex,
    seconds,
  ]);

  /* =========================================================
     AVANT DE QUITTER LA PAGE
  ========================================================= */

  useEffect(() => {
    if (
      !started ||
      finished ||
      !questions.length ||
      !selectedModule
    ) {
      return;
    }

    function saveBeforeLeave() {
      saveQcmToStorage({
        selectedModule,
        questionCount,
        questions,
        answers,
        currentIndex,
        seconds,
        savedAt: Date.now(),
      });
    }

    window.addEventListener(
      "beforeunload",
      saveBeforeLeave,
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        saveBeforeLeave,
      );
    };
  }, [
    started,
    finished,
    selectedModule,
    questionCount,
    questions,
    answers,
    currentIndex,
    seconds,
  ]);

  /* =========================================================
     DONNÉES COURANTES
  ========================================================= */

  const currentQuestion =
    questions[currentIndex];

  const answeredCount =
    Object.keys(answers).length;

  const progress =
    questions.length > 0
      ? Math.round(
          (answeredCount /
            questions.length) *
            100,
        )
      : 0;

  const currentAnswer =
    currentQuestion
      ? answers[currentQuestion.id]
      : undefined;

  const currentCorrection =
    useMemo(() => {
      if (
        !correction ||
        !currentQuestion
      ) {
        return null;
      }

      return (
        correction.results.find(
          (item) =>
            item.questionId ===
            currentQuestion.id,
        ) || null
      );
    }, [
      correction,
      currentQuestion,
    ]);

  /* =========================================================
     DÉMARRER UN NOUVEAU QCM
  ========================================================= */

  async function startQcm() {
    if (!selectedModule) {
      setError(
        "Sélectionne d'abord un module.",
      );
      return;
    }

    setError("");
    setLoadingQcm(true);

    /*
      Un nouveau QCM remplace l'ancien.
    */

    clearSavedQcm();
    setSavedQcm(null);

    try {
      const response = await fetch(
        `/api/qcm/${selectedModule}?count=${questionCount}`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de charger le QCM.",
        );
      }

      const loadedQuestions =
        Array.isArray(data.questions)
          ? data.questions
          : [];

      if (loadedQuestions.length === 0) {
        throw new Error(
          "Aucune question disponible pour ce module.",
        );
      }

      /*
        Si moins de questions sont disponibles
        que demandé, on prévient clairement.
      */

      if (
        loadedQuestions.length <
        questionCount
      ) {
        setError(
          `Seulement ${loadedQuestions.length} question${
            loadedQuestions.length > 1
              ? "s"
              : ""
          } disponible${
            loadedQuestions.length > 1
              ? "s"
              : ""
          } pour ce module.`,
        );
      }

      setQuestions(
        loadedQuestions,
      );

      setAnswers({});
      setCurrentIndex(0);
      setSeconds(0);
      setCorrection(null);
      setFinished(false);
      setStarted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue.",
      );
    } finally {
      setLoadingQcm(false);
    }
  }

  /* =========================================================
     REPRENDRE LE QCM SAUVEGARDÉ
  ========================================================= */

  function resumeSavedQcm() {
    if (!savedQcm) {
      return;
    }

    if (
      !savedQcm.questions ||
      savedQcm.questions.length === 0
    ) {
      clearSavedQcm();
      setSavedQcm(null);
      return;
    }

    const safeIndex = Math.max(
      0,
      Math.min(
        savedQcm.currentIndex,
        savedQcm.questions.length - 1,
      ),
    );

    setSelectedModule(
      savedQcm.selectedModule,
    );

    setQuestionCount(
      savedQcm.questionCount,
    );

    setQuestions(
      savedQcm.questions,
    );

    setAnswers(
      savedQcm.answers || {},
    );

    setCurrentIndex(
      safeIndex,
    );

    setSeconds(
      Math.max(
        0,
        Number(savedQcm.seconds) || 0,
      ),
    );

    setCorrection(null);
    setFinished(false);
    setError("");
    setStarted(true);

    /*
      On retire uniquement le message de reprise.
      Le QCM est maintenant actif et sera
      de nouveau sauvegardé automatiquement.
    */

    setSavedQcm(null);
  }

  /* =========================================================
     SUPPRIMER LE QCM SAUVEGARDÉ
  ========================================================= */

  function deleteSavedQcm() {
    clearSavedQcm();
    setSavedQcm(null);
  }

  /* =========================================================
     RÉPONSE
  ========================================================= */

  function chooseAnswer(
    answerId: number,
  ) {
    if (
      finished ||
      !currentQuestion
    ) {
      return;
    }

    setAnswers(
      (previous) => ({
        ...previous,
        [currentQuestion.id]:
          answerId,
      }),
    );
  }

  /* =========================================================
     NAVIGATION
  ========================================================= */

  function nextQuestion() {
    if (
      currentIndex <
      questions.length - 1
    ) {
      setCurrentIndex(
        (value) => value + 1,
      );
    }
  }

  function previousQuestion() {
    if (currentIndex > 0) {
      setCurrentIndex(
        (value) => value - 1,
      );
    }
  }

  /* =========================================================
     CORRECTION
  ========================================================= */

  async function finishQcm() {
    if (!questions.length) {
      return;
    }

    if (
      answeredCount <
      questions.length
    ) {
      const remaining =
        questions.length -
        answeredCount;

      const ok =
        window.confirm(
          `Il reste ${remaining} question${
            remaining > 1
              ? "s"
              : ""
          } sans réponse. Terminer quand même ?`,
        );

      if (!ok) {
        return;
      }
    }

    setCorrecting(true);
    setError("");

    try {
      const submissions =
        Object.entries(
          answers,
        ).map(
          ([
            questionId,
            answerId,
          ]) => ({
            questionId:
              Number(questionId),
            answerId:
              Number(answerId),
          }),
        );

      const response =
        await fetch(
          "/api/qcm/correction",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              moduleId:
                Number(
                  selectedModule,
                ),

              /*
                Plusieurs noms sont envoyés pour
                rester compatible avec ta correction
                actuelle.
              */

              answers:
                submissions,

              submissions:
                submissions,

              responses:
                submissions,

              selectedAnswers:
                answers,

              questionIds:
                questions.map(
                  (question) =>
                    question.id,
                ),

              durationSeconds:
                seconds,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de corriger le QCM.",
        );
      }

      const results =
        data.results ||
        data.corrections ||
        data.details ||
        [];

      setCorrection({
        score: Number(
          data.score || 0,
        ),

        total: Number(
          data.total ||
            questions.length,
        ),

        percentage: Number(
          data.percentage || 0,
        ),

        results:
          results.map(
            (item: any) => ({
              questionId:
                Number(
                  item.questionId ??
                    item.question_id ??
                    item.id,
                ),

              selectedAnswerId:
                item.selectedAnswerId ??
                item.selected_answer_id ??
                null,

              correctAnswerId:
                item.correctAnswerId ??
                item.correct_answer_id ??
                null,

              isCorrect:
                Boolean(
                  item.isCorrect ??
                    item.is_correct,
                ),

              explanation:
                item.explanation ??
                item.questionExplanation ??
                null,
            }),
          ),
      });

      /*
        Le QCM est terminé :
        on efface la sauvegarde.
      */

      clearSavedQcm();
      setSavedQcm(null);

      setFinished(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue.",
      );
    } finally {
      setCorrecting(false);
    }
  }

  /* =========================================================
     RESET
  ========================================================= */

  function reset() {
    clearSavedQcm();
    setSavedQcm(null);

    setQuestions([]);
    setAnswers({});
    setCurrentIndex(0);
    setSeconds(0);
    setStarted(false);
    setFinished(false);
    setCorrection(null);
    setError("");
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#182332] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="rounded-2xl border border-white/10 bg-[#202d3d] px-6 py-4 text-sm font-semibold text-slate-300">
            Initialisation du simulateur...
          </div>
        </div>
      </main>
    );
  }

  /* =========================================================
     CONFIGURATION
  ========================================================= */

  if (!started) {
    return (
      <main className="min-h-screen overflow-hidden bg-[#182332] text-white">
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute left-1/2 top-[0%] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[130px]" />

          <div className="absolute left-[-10%] top-[35%] h-[500px] w-[500px] rounded-full bg-slate-200/[0.02] blur-[120px]" />

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

        <div className="relative mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
          {/* =================================================
              QCM SAUVEGARDÉ
          ================================================= */}

          {savedQcm && (
            <section className="relative mb-5 overflow-hidden rounded-[30px] border border-[#a9c9ff]/25 bg-gradient-to-r from-[#233246] to-[#30475d] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.12)] sm:p-6">
              <div className="absolute right-[-50px] top-[-50px] h-40 w-40 rounded-full bg-[#a9c9ff]/[0.04] blur-3xl" />

              <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.25em] text-[#a9c9ff]">
                    <span className="h-2 w-2 rounded-full bg-[#a9c9ff]" />

                    QCM sauvegardé
                  </div>

                  <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">
                    Tu peux reprendre ton QCM
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                    Ta session précédente a été
                    sauvegardée automatiquement. Tu
                    retrouveras tes réponses et ton temps.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                      {savedQcm.questions.length}{" "}
                      question
                      {savedQcm.questions.length > 1
                        ? "s"
                        : ""}
                    </span>

                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                      {Object.keys(
                        savedQcm.answers || {},
                      ).length}{" "}
                      réponse
                      {Object.keys(
                        savedQcm.answers || {},
                      ).length > 1
                        ? "s"
                        : ""}
                    </span>

                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                      {formatTime(
                        savedQcm.seconds || 0,
                      )}
                    </span>

                    {savedQcm.savedAt > 0 && (
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                        sauvegardé à{" "}
                        {formatSavedDate(
                          savedQcm.savedAt,
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={
                      resumeSavedQcm
                    }
                    className="rounded-2xl bg-[#6ea8ff] px-5 py-3 text-xs font-black text-[#122033] transition hover:bg-[#83b5ff]"
                  >
                    Reprendre →
                  </button>

                  <button
                    type="button"
                    onClick={
                      deleteSavedQcm
                    }
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* =================================================
              HERO
          ================================================= */}

          <section className="relative overflow-hidden rounded-[38px] border border-white/10 bg-gradient-to-br from-[#233246] via-[#293b4f] to-[#30475d] p-7 shadow-[0_35px_90px_rgba(0,0,0,0.20)] sm:p-10">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              {/* TEXTE */}

              <div>
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
                  <span className="h-2 w-2 rounded-full bg-[#a9c9ff]" />
                  Training simulator
                </div>

                <h1 className="mt-4 text-5xl font-black leading-[0.9] tracking-[-0.06em] text-white sm:text-6xl">
                  QCM
                  <br />
                  <span className="text-[#a9c9ff]">
                    B1.1
                  </span>
                </h1>

                <p className="mt-6 max-w-lg text-sm leading-7 text-slate-300">
                  Prépare-toi dans des conditions
                  proches de l&apos;entraînement réel et
                  mesure ton niveau sur les modules
                  Part-66.
                </p>

                <div className="mt-8 grid grid-cols-3 gap-3">
                  {[10, 20, 30].map(
                    (count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() =>
                          setQuestionCount(
                            count,
                          )
                        }
                        className={`rounded-2xl border px-4 py-4 text-center transition ${
                          questionCount ===
                          count
                            ? "border-white/25 bg-white/10 text-white"
                            : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.07]"
                        }`}
                      >
                        <div className="text-xl font-black">
                          {count}
                        </div>

                        <div className="mt-1 text-[8px] font-black uppercase tracking-[0.18em]">
                          Questions
                        </div>
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* COCKPIT */}

              <div className="relative min-h-[430px] overflow-hidden rounded-[32px] border border-white/10 bg-[#182332]/55">
                <div className="absolute left-1/2 top-1/2 h-[390px] w-[390px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10">
                  <div className="absolute inset-[45px] rounded-full border border-white/10" />

                  <div className="absolute inset-[100px] rounded-full border border-white/[0.08]" />

                  <div className="absolute left-1/2 top-0 h-8 w-px -translate-x-1/2 bg-white/25" />

                  <div className="absolute bottom-0 left-1/2 h-8 w-px -translate-x-1/2 bg-white/25" />

                  <div className="absolute left-0 top-1/2 h-px w-8 -translate-y-1/2 bg-white/25" />

                  <div className="absolute right-0 top-1/2 h-px w-8 -translate-y-1/2 bg-white/25" />
                </div>

                <div className="absolute left-[8%] right-[8%] top-1/2 h-px bg-white/10" />

                <div className="absolute bottom-[15%] left-1/2 top-[15%] w-px bg-white/[0.04]" />

                <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                  <svg
                    viewBox="0 0 320 320"
                    className="h-44 w-44 text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.18)] sm:h-52 sm:w-52"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M153 28H167L181 135L162 292H158L139 135L153 28Z" />

                    <path d="M140 111L44 177L44 198L151 160L140 111Z" />

                    <path d="M180 111L276 177L276 198L169 160L180 111Z" />

                    <path d="M140 229L88 274L88 292L151 258L140 229Z" />

                    <path d="M180 229L232 274L232 292L169 258L180 229Z" />

                    <path d="M153 28L160 10L167 28Z" />

                    <path
                      d="M160 43L164 132L160 245L156 132L160 43Z"
                      fill="rgba(169,201,255,0.8)"
                    />
                  </svg>
                </div>

                <div className="absolute left-6 top-6">
                  <div className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-500">
                    AIRFRAME
                  </div>

                  <div className="mt-1 text-lg font-black">
                    B1.1
                  </div>
                </div>

                <div className="absolute right-6 top-6 text-right">
                  <div className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-500">
                    MODE
                  </div>

                  <div className="mt-1 text-lg font-black">
                    TRAINING
                  </div>
                </div>

                <div className="absolute bottom-6 left-6">
                  <div className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-500">
                    QUESTIONS
                  </div>

                  <div className="mt-1 text-lg font-black">
                    {questionCount}
                  </div>
                </div>

                <div className="absolute bottom-6 right-6 text-right">
                  <div className="text-[8px] font-black uppercase tracking-[0.25em] text-slate-500">
                    STATUS
                  </div>

                  <div className="mt-1 flex items-center justify-end gap-2 text-lg font-black text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    READY
                  </div>
                </div>
              </div>
            </div>

            {/* FORMULAIRE */}

            <div className="mt-10 border-t border-white/[0.08] pt-8">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                    Sélection du module
                  </label>

                  <select
                    value={
                      selectedModule
                    }
                    onChange={(
                      event,
                    ) =>
                      setSelectedModule(
                        event.target
                          .value,
                      )
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#182332] px-5 py-4 text-sm font-bold text-white outline-none focus:border-white/20"
                  >
                    <option value="">
                      Choisir un module...
                    </option>

                    {modules.map(
                      (module) => (
                        <option
                          key={
                            module.id
                          }
                          value={String(
                            module.id,
                          )}
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
                </div>

                <button
                  type="button"
                  onClick={startQcm}
                  disabled={loadingQcm}
                  className="rounded-2xl bg-[#6ea8ff] px-7 py-4 text-sm font-black text-[#122033] transition hover:bg-[#83b5ff] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingQcm
                    ? "Chargement..."
                    : "Démarrer le QCM →"}
                </button>
              </div>

              {error && (
                <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm font-semibold text-red-200">
                  {error}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    );
  }

  /* ============================================================
     QCM EN COURS
  ============================================================ */

  return (
    <main className="min-h-screen overflow-hidden bg-[#182332] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[5%] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-white/[0.02] blur-[130px]" />

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

      <div className="relative mx-auto max-w-[1250px] px-4 py-7 sm:px-6 lg:px-8">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
              Training simulator
            </div>

            <h1 className="mt-2 text-2xl font-black text-white">
              QCM B1.1
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-[#202d3d] px-4 py-3">
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                Temps
              </div>

              <div className="mt-1 text-lg font-black text-white">
                {formatTime(
                  seconds,
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={reset}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-bold text-slate-300 hover:bg-white/[0.08]"
            >
              Quitter
            </button>
          </div>
        </div>

        {/* =====================================================
            PROGRESSION
        ===================================================== */}

        <div className="mb-5 rounded-3xl border border-white/10 bg-[#202d3d] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                Progression
              </div>

              <div className="mt-1 text-sm font-black text-white">
                Question{" "}
                {currentIndex + 1} /{" "}
                {questions.length}
              </div>
            </div>

            <div className="text-xs font-black text-[#a9c9ff]">
              {answeredCount}/
              {questions.length}
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-[#6ea8ff] transition-all"
              style={{
                width: `${
                  ((currentIndex + 1) /
                    questions.length) *
                  100
                }%`,
              }}
            />
          </div>
        </div>

        {/* =====================================================
            QUESTION
        ===================================================== */}

        {currentQuestion && (
          <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#202d3d] shadow-[0_25px_70px_rgba(0,0,0,0.12)]">
            <div className="absolute right-[-100px] top-[-100px] h-[300px] w-[300px] rounded-full bg-white/[0.025] blur-[80px]" />

            <div className="relative p-6 sm:p-8 lg:p-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#a9c9ff]">
                  Question{" "}
                  {currentIndex + 1}
                </div>

                {finished &&
                  currentCorrection && (
                    <div
                      className={`rounded-full px-4 py-2 text-xs font-black ${
                        currentCorrection.isCorrect
                          ? "bg-emerald-400/10 text-emerald-300"
                          : "bg-red-400/10 text-red-300"
                      }`}
                    >
                      {currentCorrection.isCorrect
                        ? "CORRECT"
                        : "INCORRECT"}
                    </div>
                  )}
              </div>

              <h2 className="mt-5 max-w-4xl text-2xl font-black leading-tight text-white sm:text-3xl">
                {
                  currentQuestion.question
                }
              </h2>

              <div className="mt-8 space-y-3">
                {currentQuestion.answers.map(
                  (
                    answer,
                    index,
                  ) => {
                    const selected =
                      currentAnswer ===
                      answer.id;

                    const isCorrect =
                      finished &&
                      currentCorrection?.correctAnswerId ===
                        answer.id;

                    const isWrongSelected =
                      finished &&
                      selected &&
                      !currentCorrection?.isCorrect;

                    return (
                      <button
                        key={answer.id}
                        type="button"
                        onClick={() =>
                          chooseAnswer(
                            answer.id,
                          )
                        }
                        disabled={
                          finished
                        }
                        className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition ${
                          isCorrect
                            ? "border-emerald-300/30 bg-emerald-400/10"
                            : isWrongSelected
                              ? "border-red-300/30 bg-red-400/10"
                              : selected
                                ? "border-white/25 bg-white/[0.10]"
                                : "border-white/10 bg-[#182332] hover:border-white/20 hover:bg-[#28384b]"
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                            isCorrect
                              ? "bg-emerald-400/15 text-emerald-300"
                              : isWrongSelected
                                ? "bg-red-400/15 text-red-300"
                                : selected
                                  ? "bg-white/10 text-white"
                                  : "bg-white/[0.05] text-slate-500"
                          }`}
                        >
                          {String.fromCharCode(
                            65 + index,
                          )}
                        </div>

                        <span className="pt-1 text-sm font-semibold leading-6 text-slate-200">
                          {answer.answer}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>

              {finished &&
                currentCorrection?.explanation && (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                    <div className="text-[8px] font-black uppercase tracking-[0.22em] text-[#a9c9ff]">
                      Explication
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {
                        currentCorrection.explanation
                      }
                    </p>
                  </div>
                )}

              {/* NAVIGATION */}

              <div className="mt-8 flex flex-col gap-3 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={
                    previousQuestion
                  }
                  disabled={
                    currentIndex === 0
                  }
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ← Précédente
                </button>

                {!finished ? (
                  currentIndex ===
                  questions.length -
                    1 ? (
                    <button
                      type="button"
                      onClick={
                        finishQcm
                      }
                      disabled={
                        correcting
                      }
                      className="rounded-2xl bg-[#6ea8ff] px-6 py-3 text-sm font-black text-[#122033] transition hover:bg-[#83b5ff] disabled:opacity-50"
                    >
                      {correcting
                        ? "Correction..."
                        : "Terminer le QCM"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={
                        nextQuestion
                      }
                      className="rounded-2xl bg-[#6ea8ff] px-6 py-3 text-sm font-black text-[#122033] transition hover:bg-[#83b5ff]"
                    >
                      Question suivante →
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={
                      nextQuestion
                    }
                    disabled={
                      currentIndex ===
                      questions.length -
                        1
                    }
                    className="rounded-2xl bg-white/[0.08] px-6 py-3 text-sm font-black text-white transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Question suivante →
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* =====================================================
            RESULTAT
        ===================================================== */}

        {finished &&
          correction && (
            <section className="mt-5 rounded-[32px] border border-white/10 bg-gradient-to-br from-[#233246] via-[#293b4f] to-[#30475d] p-6 sm:p-8">
              <div className="grid gap-6 sm:grid-cols-3 sm:items-center">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                    Résultat
                  </div>

                  <div className="mt-2 text-5xl font-black text-white">
                    {
                      correction.percentage
                    }%
                  </div>
                </div>

                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                    Score
                  </div>

                  <div className="mt-2 text-3xl font-black text-white">
                    {correction.score}/
                    {
                      correction.total
                    }
                  </div>
                </div>

                <div className="flex gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-2xl bg-[#6ea8ff] px-5 py-3 text-sm font-black text-[#122033] hover:bg-[#83b5ff]"
                  >
                    Nouveau QCM
                  </button>

                  <Link
                    href="/progression"
                    className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-bold text-white hover:bg-white/[0.10]"
                  >
                    Progression
                  </Link>
                </div>
              </div>
            </section>
          )}

        <div className="h-8" />
      </div>
    </main>
  );
}