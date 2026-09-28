"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ADMIN_ID =
  "dcbeb72a-4f4a-4169-beab-53da1b3babfa";

type Report = {
  id: number;
  question_id: number;
  user_id: string;
  reason: string;
  status: "pending" | "resolved";
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
};

type QuestionInfo = {
  id: number;
  question: string;
  module_id: number;
  module_name: string;
};

export default function SignalementsPage() {
  const router = useRouter();

  const [reports, setReports] =
    useState<Report[]>([]);

  const [questions, setQuestions] =
    useState<QuestionInfo[]>([]);

  const [filter, setFilter] =
    useState<"pending" | "resolved">(
      "pending"
    );

  const [notes, setNotes] = useState<
    Record<number, string>
  >({});

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/connexion");
      return;
    }

    if (user.id !== ADMIN_ID) {
      router.push("/");
      return;
    }

    const { data, error } =
      await supabase
        .from("question_reports")
        .select(
          "id, question_id, user_id, reason, status, admin_note, created_at, resolved_at"
        )
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      setMessage(
        `Erreur : ${error.message}`
      );
      setLoading(false);
      return;
    }

    const reportData =
      (data ?? []) as Report[];

    setReports(reportData);

    const questionIds = [
      ...new Set(
        reportData.map(
          (report) =>
            report.question_id
        )
      ),
    ];

    if (questionIds.length > 0) {
      const { data: questionData, error: questionError } =
        await supabase
          .from("questions")
          .select(
            `
            id,
            question,
            module_id,
            modules (
              name
            )
            `
          )
          .in(
            "id",
            questionIds
          );

      if (questionError) {
        setMessage(
          `Erreur questions : ${questionError.message}`
        );
      } else {
        const formattedQuestions =
          (questionData ?? []).map(
            (item: any) => ({
              id: item.id,
              question:
                item.question,
              module_id:
                item.module_id,
              module_name:
                Array.isArray(
                  item.modules
                )
                  ? item.modules[0]?.name ??
                    `Module ${item.module_id}`
                  : item.modules?.name ??
                    `Module ${item.module_id}`,
            })
          );

        setQuestions(
          formattedQuestions
        );
      }
    }

    setLoading(false);
  }

  function getQuestion(
    questionId: number
  ) {
    return questions.find(
      (question) =>
        question.id ===
        questionId
    );
  }

  function getPendingCount() {
    return reports.filter(
      (report) =>
        report.status === "pending"
    ).length;
  }

  async function resolveReport(
    report: Report
  ) {
    setMessage("");

    const note =
      notes[report.id]?.trim() ||
      null;

    const { error } =
      await supabase
        .from("question_reports")
        .update({
          status: "resolved",
          admin_note: note,
          resolved_at: new Date().toISOString(),
        })
        .eq(
          "id",
          report.id
        );

    if (error) {
      setMessage(
        `Erreur : ${error.message}`
      );
      return;
    }

    setReports((current) =>
      current.map((item) =>
        item.id === report.id
          ? {
              ...item,
              status: "resolved",
              admin_note: note,
              resolved_at:
                new Date().toISOString(),
            }
          : item
      )
    );

    setMessage(
      "Signalement marqué comme traité."
    );
  }

  function formatDate(
    date: string
  ) {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(new Date(date));
  }

  const filteredReports =
    reports.filter(
      (report) =>
        report.status ===
        filter
    );

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
        <div className="mx-auto max-w-6xl">
          <p>
            Chargement des signalements...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="mx-auto max-w-6xl">

        <button
          onClick={() =>
            router.push("/admin")
          }
          className="text-blue-600 hover:underline"
        >
          Retour à l'administration
        </button>

        <div className="mt-8">
          <h1 className="text-4xl font-bold">
            Signalements de questions
          </h1>

          <p className="mt-3 text-gray-600">
            Vérifie les questions signalées par les élèves.
          </p>
        </div>

        {/* COMPTEURS */}

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <button
            onClick={() =>
              setFilter("pending")
            }
            className={`rounded-2xl border p-6 text-left ${
              filter === "pending"
                ? "border-red-500 bg-red-50"
                : "bg-white"
            }`}
          >
            <p className="text-sm text-red-700">
              À traiter
            </p>

            <p className="mt-2 text-4xl font-bold">
              {getPendingCount()}
            </p>
          </button>

          <button
            onClick={() =>
              setFilter("resolved")
            }
            className={`rounded-2xl border p-6 text-left ${
              filter === "resolved"
                ? "border-green-500 bg-green-50"
                : "bg-white"
            }`}
          >
            <p className="text-sm text-green-700">
              Traités
            </p>

            <p className="mt-2 text-4xl font-bold">
              {
                reports.filter(
                  (report) =>
                    report.status ===
                    "resolved"
                ).length
              }
            </p>
          </button>
        </div>

        {message && (
          <div className="mt-6 rounded-xl border bg-white p-4 text-green-700">
            {message}
          </div>
        )}

        {/* SIGNALалEMENTS */}

        <section className="mt-8">
          {filteredReports.length ===
          0 ? (
            <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
              <h2 className="text-2xl font-bold">
                Aucun signalement
              </h2>

              <p className="mt-2 text-gray-500">
                Aucun signalement dans cette catégorie.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {filteredReports.map(
                (report) => {
                  const question =
                    getQuestion(
                      report.question_id
                    );

                  return (
                    <article
                      key={report.id}
                      className="rounded-2xl border bg-white p-6 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-blue-600">
                            {question?.module_name ??
                              `Question ${report.question_id}`}
                          </p>

                          <h2 className="mt-2 text-xl font-bold">
                            {question?.question ??
                              "Question introuvable"}
                          </h2>

                          <p className="mt-2 text-xs text-gray-500">
                            Signalé le{" "}
                            {formatDate(
                              report.created_at
                            )}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-sm font-semibold ${
                            report.status ===
                            "pending"
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {report.status ===
                          "pending"
                            ? "À traiter"
                            : "Traité"}
                        </span>
                      </div>

                      <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-5">
                        <p className="text-sm font-semibold text-red-800">
                          Signalement de l'élève
                        </p>

                        <p className="mt-2 leading-relaxed text-red-900">
                          {report.reason}
                        </p>
                      </div>

                      {report.status ===
                        "pending" && (
                        <div className="mt-6">
                          <label
                            htmlFor={`note-${report.id}`}
                            className="block text-sm font-semibold"
                          >
                            Note admin
                          </label>

                          <textarea
                            id={`note-${report.id}`}
                            value={
                              notes[
                                report.id
                              ] ??
                              ""
                            }
                            onChange={(
                              event
                            ) =>
                              setNotes(
                                (
                                  current
                                ) => ({
                                  ...current,
                                  [report.id]:
                                    event
                                      .target
                                      .value,
                                })
                              )
                            }
                            placeholder="Exemple : réponse corrigée, question à supprimer..."
                            className="mt-2 min-h-24 w-full rounded-xl border p-4 text-gray-900 outline-none focus:border-blue-500"
                          />

                          <div className="mt-4 flex flex-wrap gap-3">
                            {question && (
                              <button
                                onClick={() =>
                                  router.push(
                                    `/admin/questions/${question.module_id}`
                                  )
                                }
                                className="rounded-xl border px-5 py-3 font-semibold hover:bg-gray-50"
                              >
                                Voir la question
                              </button>
                            )}

                            <button
                              onClick={() =>
                                resolveReport(
                                  report
                                )
                              }
                              className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
                            >
                              Marquer comme traité
                            </button>
                          </div>
                        </div>
                      )}

                      {report.status ===
                        "resolved" &&
                        report.admin_note && (
                        <div className="mt-6 rounded-xl bg-gray-50 p-5">
                          <p className="text-sm font-semibold">
                            Note admin
                          </p>

                          <p className="mt-2 text-gray-700">
                            {report.admin_note}
                          </p>

                          {report.resolved_at && (
                            <p className="mt-2 text-xs text-gray-500">
                              Traité le{" "}
                              {formatDate(
                                report.resolved_at
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}