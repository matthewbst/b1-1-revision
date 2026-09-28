"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ADMIN_ID =
  "dcbeb72a-4f4a-4169-beab-53da1b3babfa";

type Module = {
  id: number;
  name: string;
  description: string | null;
};

type QuestionStatus = "draft" | "approved" | "rejected";

type QuestionRow = {
  id: number;
  module_id: number;
  status: QuestionStatus;
};

type ModuleStats = {
  total: number;
  draft: number;
  approved: number;
  rejected: number;
};

export default function AdminQuestionsPage() {
  const router = useRouter();

  const [modules, setModules] = useState<Module[]>([]);
  const [stats, setStats] = useState<
    Record<number, ModuleStats>
  >({});

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadAdmin() {
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

      const [modulesResult, questionsResult] =
        await Promise.all([
          supabase
            .from("modules")
            .select("id, name, description")
            .order("id"),

          supabase
            .from("questions")
            .select("id, module_id, status"),
        ]);

      if (modulesResult.error) {
        setMessage(
          `Erreur modules : ${modulesResult.error.message}`
        );
        setLoading(false);
        return;
      }

      if (questionsResult.error) {
        setMessage(
          `Erreur questions : ${questionsResult.error.message}`
        );
        setLoading(false);
        return;
      }

      const moduleData = modulesResult.data ?? [];
      const questionData =
        (questionsResult.data ??
          []) as QuestionRow[];

      const newStats: Record<number, ModuleStats> = {};

      for (const module of moduleData) {
        newStats[module.id] = {
          total: 0,
          draft: 0,
          approved: 0,
          rejected: 0,
        };
      }

      for (const question of questionData) {
        if (!newStats[question.module_id]) {
          newStats[question.module_id] = {
            total: 0,
            draft: 0,
            approved: 0,
            rejected: 0,
          };
        }

        newStats[question.module_id].total++;

        if (question.status === "draft") {
          newStats[question.module_id].draft++;
        }

        if (question.status === "approved") {
          newStats[question.module_id].approved++;
        }

        if (question.status === "rejected") {
          newStats[question.module_id].rejected++;
        }
      }

      setModules(moduleData);
      setStats(newStats);
      setLoading(false);
    }

    loadAdmin();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
        <div className="mx-auto max-w-7xl">
          <p>Chargement de l'administration...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="mx-auto max-w-7xl">
        <button
          onClick={() => router.push("/admin")}
          className="text-blue-600 hover:underline"
        >
          Retour à l'administration
        </button>

        <div className="mt-8">
          <h1 className="text-4xl font-bold">
            Gestion des questions
          </h1>

          <p className="mt-3 text-gray-600">
            Choisis un module pour gérer les questions du
            QCM.
          </p>
        </div>

        {message && (
          <div className="mt-6 rounded-xl border bg-white p-4 text-red-600">
            {message}
          </div>
        )}

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => {
            const moduleStats = stats[module.id] ?? {
              total: 0,
              draft: 0,
              approved: 0,
              rejected: 0,
            };

            return (
              <button
                key={module.id}
                onClick={() =>
                  router.push(
                    `/admin/questions/${module.id}`
                  )
                }
                className="rounded-2xl border bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-500 hover:shadow-lg"
              >
                <h2 className="text-xl font-bold">
                  {module.name}
                </h2>

                {module.description && (
                  <p className="mt-2 text-sm text-gray-500">
                    {module.description}
                  </p>
                )}

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">
                      Total
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {moduleStats.total}
                    </p>
                  </div>

                  <div className="rounded-xl bg-yellow-50 p-4">
                    <p className="text-xs text-yellow-700">
                      À valider
                    </p>
                    <p className="mt-1 text-2xl font-bold text-yellow-700">
                      {moduleStats.draft}
                    </p>
                  </div>

                  <div className="rounded-xl bg-green-50 p-4">
                    <p className="text-xs text-green-700">
                      Validées
                    </p>
                    <p className="mt-1 text-2xl font-bold text-green-700">
                      {moduleStats.approved}
                    </p>
                  </div>

                  <div className="rounded-xl bg-red-50 p-4">
                    <p className="text-xs text-red-700">
                      Refusées
                    </p>
                    <p className="mt-1 text-2xl font-bold text-red-700">
                      {moduleStats.rejected}
                    </p>
                  </div>
                </div>

                <div className="mt-6 font-semibold text-blue-600">
                  Gérer le module →
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}