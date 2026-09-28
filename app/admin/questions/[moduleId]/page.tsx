"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ADMIN_ID = "dcbeb72a-4f4a-4169-beab-53da1b3babfa";

type Module = {
  id: number;
  name: string;
};

type Answer = {
  id: number;
  answer: string;
  is_correct: boolean;
};

type Question = {
  id: number;
  module_id: number;
  question: string;
  explanation: string | null;
  source_reference: string | null;
  source_page: number | null;
  status: "draft" | "approved" | "rejected";
  created_by: string | null;
  created_at: string;
  answers: Answer[];
};

type EditForm = {
  question: string;
  explanation: string;
  sourceReference: string;
  sourcePage: string;
  answers: string[];
  correctAnswer: number;
};

export default function AdminQuestionsModulePage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const router = useRouter();

  const [moduleId, setModuleId] = useState<number | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [loading, setLoading] = useState(true);
  const [busyQuestionId, setBusyQuestionId] = useState<number | null>(
    null
  );

  const [statusFilter, setStatusFilter] = useState<
    "all" | "draft" | "approved" | "rejected"
  >("draft");

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const [editingQuestionId, setEditingQuestionId] =
    useState<number | null>(null);

  const [editForm, setEditForm] = useState<EditForm | null>(null);

  useEffect(() => {
    async function loadParams() {
      const result = await params;
      const numericModuleId = Number(result.moduleId);

      if (
        !result.moduleId ||
        !Number.isInteger(numericModuleId) ||
        numericModuleId <= 0
      ) {
        router.push("/admin/questions");
        return;
      }

      setModuleId(numericModuleId);
    }

    loadParams();
  }, [params, router]);

  async function loadData(id: number) {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== ADMIN_ID) {
      router.push("/");
      return;
    }

    const [moduleResult, questionsResult] = await Promise.all([
      supabase
        .from("modules")
        .select("id, name")
        .eq("id", id)
        .single(),

      supabase
        .from("questions")
        .select(
          `
          id,
          module_id,
          question,
          explanation,
          source_reference,
          source_page,
          status,
          created_by,
          created_at,
          answers (
            id,
            answer,
            is_correct
          )
        `
        )
        .eq("module_id", id)
        .order("created_at", { ascending: false }),
    ]);

    if (moduleResult.error || !moduleResult.data) {
      router.push("/admin/questions");
      return;
    }

    if (questionsResult.error) {
      setMessage(
        "Erreur lors du chargement des questions : " +
          questionsResult.error.message
      );
    }

    setModule(moduleResult.data);
    setQuestions(questionsResult.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (moduleId) {
      loadData(moduleId);
    }
  }, [moduleId]);

  function startEditing(question: Question) {
    const sortedAnswers = [...question.answers].sort(
      (a, b) => a.id - b.id
    );

    const answers = sortedAnswers.map((answer) => answer.answer);

    while (answers.length < 3) {
      answers.push("");
    }

    let correctIndex = sortedAnswers.findIndex(
      (answer) => answer.is_correct
    );

    if (correctIndex < 0) {
      correctIndex = 0;
    }

    setEditingQuestionId(question.id);

    setEditForm({
      question: question.question,
      explanation: question.explanation ?? "",
      sourceReference: question.source_reference ?? "",
      sourcePage:
        question.source_page !== null
          ? String(question.source_page)
          : "",
      answers: answers.slice(0, 3),
      correctAnswer: correctIndex,
    });

    setMessage("");
  }

  function cancelEditing() {
    setEditingQuestionId(null);
    setEditForm(null);
  }

  function updateEditAnswer(index: number, value: string) {
    if (!editForm) {
      return;
    }

    const answers = [...editForm.answers];
    answers[index] = value;

    setEditForm({
      ...editForm,
      answers,
    });
  }

  function validateEditForm() {
    if (!editForm) {
      return false;
    }

    if (editForm.question.trim().length < 10) {
      setMessage(
        "La question doit contenir au moins 10 caractères."
      );
      return false;
    }

    if (
      editForm.answers.some(
        (answer) => answer.trim().length === 0
      )
    ) {
      setMessage("Les 3 réponses sont obligatoires.");
      return false;
    }

    const normalizedAnswers = editForm.answers.map((answer) =>
      answer.trim().toLowerCase()
    );

    if (new Set(normalizedAnswers).size !== 3) {
      setMessage("Les 3 réponses doivent être différentes.");
      return false;
    }

    if (!editForm.explanation.trim()) {
      setMessage(
        "Ajoute une explication avant de modifier la question."
      );
      return false;
    }

    if (!editForm.sourceReference.trim()) {
      setMessage("La source est obligatoire.");
      return false;
    }

    if (editForm.sourcePage.trim()) {
      const page = Number(editForm.sourcePage);

      if (!Number.isInteger(page) || page <= 0) {
        setMessage("La page doit être un nombre entier positif.");
        return false;
      }
    }

    return true;
  }

  async function saveEdit(question: Question) {
    if (!editForm) {
      return;
    }

    if (!validateEditForm()) {
      return;
    }

    setBusyQuestionId(question.id);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== ADMIN_ID) {
      setMessage("Accès administrateur refusé.");
      setBusyQuestionId(null);
      return;
    }

    const { error: questionError } = await supabase
      .from("questions")
      .update({
        question: editForm.question.trim(),
        explanation: editForm.explanation.trim(),
        source_reference: editForm.sourceReference.trim(),
        source_page: editForm.sourcePage
          ? Number(editForm.sourcePage)
          : null,
      })
      .eq("id", question.id);

    if (questionError) {
      setMessage(
        "Erreur lors de la modification de la question : " +
          questionError.message
      );
      setBusyQuestionId(null);
      return;
    }

    const { error: deleteAnswersError } = await supabase
      .from("answers")
      .delete()
      .eq("question_id", question.id);

    if (deleteAnswersError) {
      setMessage(
        "Erreur lors de la mise à jour des réponses : " +
          deleteAnswersError.message
      );
      setBusyQuestionId(null);
      return;
    }

    const answerRows = editForm.answers.map((answer, index) => ({
      question_id: question.id,
      answer: answer.trim(),
      is_correct: index === editForm.correctAnswer,
    }));

    const { error: insertAnswersError } = await supabase
      .from("answers")
      .insert(answerRows);

    if (insertAnswersError) {
      setMessage(
        "Erreur lors de l'enregistrement des nouvelles réponses : " +
          insertAnswersError.message
      );
      setBusyQuestionId(null);
      return;
    }

    cancelEditing();

    setMessage("✅ Question modifiée avec succès.");

    if (moduleId) {
      await loadData(moduleId);
    }

    setBusyQuestionId(null);
  }

  async function changeStatus(
    question: Question,
    newStatus: "draft" | "approved" | "rejected"
  ) {
    if (
      newStatus === "approved" &&
      question.answers.length !== 3
    ) {
      setMessage(
        "Impossible de valider : la question doit avoir exactement 3 réponses."
      );
      return;
    }

    if (newStatus === "approved") {
      const correctCount = question.answers.filter(
        (answer) => answer.is_correct
      ).length;

      if (correctCount !== 1) {
        setMessage(
          "Impossible de valider : il doit y avoir exactement une bonne réponse."
        );
        return;
      }

      const uniqueAnswers = new Set(
        question.answers.map((answer) =>
          answer.answer.trim().toLowerCase()
        )
      );

      if (uniqueAnswers.size !== 3) {
        setMessage(
          "Impossible de valider : les 3 réponses doivent être différentes."
        );
        return;
      }

      if (!question.source_reference?.trim()) {
        setMessage(
          "Impossible de valider : la source est obligatoire."
        );
        return;
      }

      if (!question.explanation?.trim()) {
        setMessage(
          "Impossible de valider : l'explication est obligatoire."
        );
        return;
      }
    }

    setBusyQuestionId(question.id);
    setMessage("");

    const { error } = await supabase
      .from("questions")
      .update({
        status: newStatus,
      })
      .eq("id", question.id);

    if (error) {
      setMessage(
        "Impossible de modifier le statut : " +
          error.message
      );
      setBusyQuestionId(null);
      return;
    }

    if (newStatus === "approved") {
      setMessage("✅ Question validée.");
    } else if (newStatus === "rejected") {
      setMessage("❌ Question refusée.");
    } else {
      setMessage("↩️ Question remise en attente.");
    }

    if (moduleId) {
      await loadData(moduleId);
    }

    setBusyQuestionId(null);
  }

  async function deleteQuestion(question: Question) {
    const confirmed = window.confirm(
      "Supprimer définitivement cette question ?\n\nCette action supprimera aussi ses réponses."
    );

    if (!confirmed) {
      return;
    }

    setBusyQuestionId(question.id);
    setMessage("");

    const { error } = await supabase
      .from("questions")
      .delete()
      .eq("id", question.id);

    if (error) {
      setMessage(
        "Impossible de supprimer la question : " +
          error.message
      );
      setBusyQuestionId(null);
      return;
    }

    setMessage("✅ Question supprimée.");

    if (moduleId) {
      await loadData(moduleId);
    }

    setBusyQuestionId(null);
  }

  const filteredQuestions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return questions.filter((question) => {
      const statusMatch =
        statusFilter === "all" ||
        question.status === statusFilter;

      const searchMatch =
        !normalizedSearch ||
        question.question
          .toLowerCase()
          .includes(normalizedSearch) ||
        (question.source_reference ?? "")
          .toLowerCase()
          .includes(normalizedSearch);

      return statusMatch && searchMatch;
    });
  }, [questions, statusFilter, search]);

  const draftCount = questions.filter(
    (question) => question.status === "draft"
  ).length;

  const approvedCount = questions.filter(
    (question) => question.status === "approved"
  ).length;

  const rejectedCount = questions.filter(
    (question) => question.status === "rejected"
  ).length;

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 shadow-sm">
          Chargement des questions...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-3 py-6 sm:px-4 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <button
            onClick={() => router.push("/admin/questions")}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            ← Retour à la gestion des questions
          </button>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-bold text-red-600">
                ADMINISTRATION
              </div>

              <h1 className="mt-2 text-3xl font-bold text-gray-900">
                {module?.name ?? "Module"}
              </h1>

              <p className="mt-2 text-gray-600">
                Vérifie les questions proposées avant leur apparition
                dans les QCM.
              </p>
            </div>

            <button
              onClick={() =>
                router.push(
                  `/qcm?moduleId=${moduleId}`
                )
              }
              className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
            >
              Voir le QCM
            </button>
          </div>

          {message && (
            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
              {message}
            </div>
          )}

          <div className="mt-7 grid gap-3 sm:grid-cols-4">
            <button
              onClick={() => setStatusFilter("all")}
              className={
                statusFilter === "all"
                  ? "rounded-xl bg-gray-800 p-4 text-left text-white"
                  : "rounded-xl bg-gray-100 p-4 text-left text-gray-700"
              }
            >
              <div className="text-xs font-bold uppercase">
                Toutes
              </div>
              <div className="mt-1 text-2xl font-bold">
                {questions.length}
              </div>
            </button>

            <button
              onClick={() => setStatusFilter("draft")}
              className={
                statusFilter === "draft"
                  ? "rounded-xl bg-orange-500 p-4 text-left text-white"
                  : "rounded-xl bg-orange-50 p-4 text-left text-orange-700"
              }
            >
              <div className="text-xs font-bold uppercase">
                À valider
              </div>
              <div className="mt-1 text-2xl font-bold">
                {draftCount}
              </div>
            </button>

            <button
              onClick={() => setStatusFilter("approved")}
              className={
                statusFilter === "approved"
                  ? "rounded-xl bg-green-600 p-4 text-left text-white"
                  : "rounded-xl bg-green-50 p-4 text-left text-green-700"
              }
            >
              <div className="text-xs font-bold uppercase">
                Validées
              </div>
              <div className="mt-1 text-2xl font-bold">
                {approvedCount}
              </div>
            </button>

            <button
              onClick={() => setStatusFilter("rejected")}
              className={
                statusFilter === "rejected"
                  ? "rounded-xl bg-red-600 p-4 text-left text-white"
                  : "rounded-xl bg-red-50 p-4 text-left text-red-700"
              }
            >
              <div className="text-xs font-bold uppercase">
                Refusées
              </div>
              <div className="mt-1 text-2xl font-bold">
                {rejectedCount}
              </div>
            </button>
          </div>

          <div className="mt-6">
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Rechercher une question ou une source..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-6 space-y-5">
          {filteredQuestions.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm">
              Aucune question dans cette catégorie.
            </div>
          ) : (
            filteredQuestions.map((question, index) => {
              const isEditing =
                editingQuestionId === question.id;

              const isBusy =
                busyQuestionId === question.id;

              return (
                <div
                  key={question.id}
                  className="rounded-3xl bg-white p-5 shadow-sm sm:p-7"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase text-gray-400">
                        Question {index + 1}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {question.status === "draft" && (
                          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                            À VALIDER
                          </span>
                        )}

                        {question.status === "approved" && (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                            VALIDÉE
                          </span>
                        )}

                        {question.status === "rejected" && (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                            REFUSÉE
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-gray-400">
                      {new Date(
                        question.created_at
                      ).toLocaleDateString("fr-FR")}
                    </div>
                  </div>

                  {!isEditing ? (
                    <>
                      <h2 className="mt-5 text-xl font-bold leading-7 text-gray-900">
                        {question.question}
                      </h2>

                      <div className="mt-5 space-y-2">
                        {question.answers.map((answer, answerIndex) => (
                          <div
                            key={answer.id}
                            className={
                              answer.is_correct
                                ? "rounded-xl border border-green-300 bg-green-50 p-4"
                                : "rounded-xl border border-gray-200 bg-gray-50 p-4"
                            }
                          >
                            <div className="flex gap-3">
                              <div className="font-bold text-gray-500">
                                {String.fromCharCode(
                                  65 + answerIndex
                                )}
                                .
                              </div>

                              <div className="flex-1 font-medium text-gray-800">
                                {answer.answer}
                              </div>

                              {answer.is_correct && (
                                <div className="font-bold text-green-700">
                                  ✅
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 grid gap-4 lg:grid-cols-2">
                        <div className="rounded-2xl bg-blue-50 p-4">
                          <div className="text-xs font-bold uppercase text-blue-600">
                            Explication
                          </div>

                          <p className="mt-2 text-sm leading-6 text-blue-950">
                            {question.explanation ||
                              "Aucune explication renseignée."}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-orange-50 p-4">
                          <div className="text-xs font-bold uppercase text-orange-600">
                            Source
                          </div>

                          <p className="mt-2 text-sm font-semibold leading-6 text-orange-950">
                            {question.source_reference ||
                              "Source non renseignée"}
                            {question.source_page
                              ? ` — page ${question.source_page}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            startEditing(question)
                          }
                          disabled={isBusy}
                          className="rounded-xl bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-200 disabled:opacity-50"
                        >
                          ✏️ Modifier
                        </button>

                        {question.status !== "approved" && (
                          <button
                            onClick={() =>
                              changeStatus(
                                question,
                                "approved"
                              )
                            }
                            disabled={isBusy}
                            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            ✅ Valider
                          </button>
                        )}

                        {question.status !== "rejected" && (
                          <button
                            onClick={() =>
                              changeStatus(
                                question,
                                "rejected"
                              )
                            }
                            disabled={isBusy}
                            className="rounded-xl bg-red-100 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-200 disabled:opacity-50"
                          >
                            ❌ Refuser
                          </button>
                        )}

                        {question.status !== "draft" && (
                          <button
                            onClick={() =>
                              changeStatus(
                                question,
                                "draft"
                              )
                            }
                            disabled={isBusy}
                            className="rounded-xl bg-orange-100 px-4 py-2 text-sm font-bold text-orange-700 hover:bg-orange-200 disabled:opacity-50"
                          >
                            ↩️ Remettre en attente
                          </button>
                        )}

                        <button
                          onClick={() =>
                            deleteQuestion(question)
                          }
                          disabled={isBusy}
                          className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                        >
                          🗑️ Supprimer
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="mt-5 rounded-2xl border-2 border-blue-100 bg-blue-50/50 p-4 sm:p-6">
                      <div className="text-lg font-bold text-blue-900">
                        ✏️ Modifier la question
                      </div>

                      <div className="mt-5 space-y-5">
                        <div>
                          <label className="mb-2 block text-sm font-bold text-gray-800">
                            Question
                          </label>

                          <textarea
                            value={editForm?.question ?? ""}
                            onChange={(event) =>
                              setEditForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      question:
                                        event.target.value,
                                    }
                                  : current
                              )
                            }
                            rows={4}
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
                          />
                        </div>

                        <div>
                          <div className="mb-3 text-sm font-bold text-gray-800">
                            Réponses
                          </div>

                          <div className="space-y-3">
                            {editForm?.answers.map(
                              (answer, answerIndex) => (
                                <div
                                  key={answerIndex}
                                  className="flex items-center gap-3 rounded-xl bg-white p-3"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditForm(
                                        (current) =>
                                          current
                                            ? {
                                                ...current,
                                                correctAnswer:
                                                  answerIndex,
                                              }
                                            : current
                                      )
                                    }
                                    className={
                                      editForm.correctAnswer ===
                                      answerIndex
                                        ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 font-bold text-white"
                                        : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 font-bold text-gray-600"
                                    }
                                  >
                                    {String.fromCharCode(
                                      65 + answerIndex
                                    )}
                                  </button>

                                  <input
                                    type="text"
                                    value={answer}
                                    onChange={(event) =>
                                      updateEditAnswer(
                                        answerIndex,
                                        event.target.value
                                      )
                                    }
                                    className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-gray-900"
                                  />
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-bold text-gray-800">
                            Explication
                          </label>

                          <textarea
                            value={editForm?.explanation ?? ""}
                            onChange={(event) =>
                              setEditForm((current) =>
                                current
                                  ? {
                                      ...current,
                                      explanation:
                                        event.target.value,
                                    }
                                  : current
                              )
                            }
                            rows={4}
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                          <div>
                            <label className="mb-2 block text-sm font-bold text-gray-800">
                              Source
                            </label>

                            <input
                              type="text"
                              value={
                                editForm?.sourceReference ?? ""
                              }
                              onChange={(event) =>
                                setEditForm((current) =>
                                  current
                                    ? {
                                        ...current,
                                        sourceReference:
                                          event.target.value,
                                      }
                                    : current
                                )
                              }
                              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-bold text-gray-800">
                              Page
                            </label>

                            <input
                              type="number"
                              min="1"
                              value={editForm?.sourcePage ?? ""}
                              onChange={(event) =>
                                setEditForm((current) =>
                                  current
                                    ? {
                                        ...current,
                                        sourcePage:
                                          event.target.value,
                                      }
                                    : current
                                )
                              }
                              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              saveEdit(question)
                            }
                            disabled={isBusy}
                            className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isBusy
                              ? "Enregistrement..."
                              : "💾 Enregistrer"}
                          </button>

                          <button
                            onClick={cancelEditing}
                            disabled={isBusy}
                            className="rounded-xl border bg-white px-5 py-3 font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}