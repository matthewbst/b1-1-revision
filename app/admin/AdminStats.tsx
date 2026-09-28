"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Attempt = {
  user_id: string;
  module_id: number;
  percentage: number;
  wrong_question_ids: number[];
};

type Question = {
  id: number;
  question: string;
};

type Stats = {
  attempts: number;
  students: number;
  average: number;
  pendingReports: number;
  draftQuestions: number;
  approvedQuestions: number;
};

export default function AdminStats() {
  const [stats, setStats] = useState<Stats>({
    attempts: 0,
    students: 0,
    average: 0,
    pendingReports: 0,
    draftQuestions: 0,
    approvedQuestions: 0,
  });

  const [mostFailed, setMostFailed] = useState<
    { question: string; count: number }[]
  >([]);

  useEffect(() => {
    async function load() {
      const [
        attemptsResult,
        reportsResult,
        draftResult,
        approvedResult,
      ] = await Promise.all([
        supabase
          .from("qcm_attempts")
          .select(
            "user_id, module_id, percentage, wrong_question_ids"
          ),

        supabase
          .from("question_reports")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),

        supabase
          .from("questions")
          .select("id", { count: "exact", head: true })
          .eq("status", "draft"),

        supabase
          .from("questions")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved"),
      ]);

      const attempts: Attempt[] =
        attemptsResult.data ?? [];

      const uniqueStudents = new Set(
        attempts.map((attempt) => attempt.user_id)
      );

      const average =
        attempts.length > 0
          ? Math.round(
              attempts.reduce(
                (sum, attempt) =>
                  sum + attempt.percentage,
                0
              ) / attempts.length
            )
          : 0;

      const failedMap = new Map<number, number>();

      for (const attempt of attempts) {
        for (const questionId of attempt.wrong_question_ids ??
          []) {
          failedMap.set(
            questionId,
            (failedMap.get(questionId) ?? 0) + 1
          );
        }
      }

      const mostFailedIds = [...failedMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      if (mostFailedIds.length > 0) {
        const { data: questionData } = await supabase
          .from("questions")
          .select("id, question")
          .in(
            "id",
            mostFailedIds.map((item) => item[0])
          );

        const questionMap = new Map(
          (questionData ?? []).map((item: Question) => [
            item.id,
            item.question,
          ])
        );

        setMostFailed(
          mostFailedIds.map(([id, count]) => ({
            question:
              questionMap.get(id) ?? "Question inconnue",
            count,
          }))
        );
      }

      setStats({
        attempts: attempts.length,
        students: uniqueStudents.size,
        average,
        pendingReports: reportsResult.count ?? 0,
        draftQuestions: draftResult.count ?? 0,
        approvedQuestions: approvedResult.count ?? 0,
      });
    }

    load();
  }, []);

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-2xl font-bold text-gray-900">
        Statistiques
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-500">
            Élèves actifs
          </div>

          <div className="mt-2 text-3xl font-bold">
            {stats.students}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-500">
            QCM réalisés
          </div>

          <div className="mt-2 text-3xl font-bold">
            {stats.attempts}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-500">
            Moyenne classe
          </div>

          <div className="mt-2 text-3xl font-bold text-blue-600">
            {stats.average}%
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-500">
            Signalements ouverts
          </div>

          <div className="mt-2 text-3xl font-bold text-red-600">
            {stats.pendingReports}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-500">
            Questions en attente
          </div>

          <div className="mt-2 text-3xl font-bold text-orange-600">
            {stats.draftQuestions}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-500">
            Questions validées
          </div>

          <div className="mt-2 text-3xl font-bold text-green-600">
            {stats.approvedQuestions}
          </div>
        </div>
      </div>

      {mostFailed.length > 0 && (
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900">
            Questions les plus ratées
          </h3>

          <div className="mt-4 space-y-3">
            {mostFailed.map((item, index) => (
              <div
                key={index}
                className="rounded-xl bg-gray-50 p-4"
              >
                <div className="font-semibold text-gray-900">
                  {item.question}
                </div>

                <div className="mt-1 text-sm font-bold text-red-600">
                  {item.count} erreur(s)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}