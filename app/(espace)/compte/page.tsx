"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Attempt = {
  id: number;
  module_id: number;
  score: number;
  total: number;
  percentage: number;
  created_at: string;
};

type Module = {
  id: number;
  name: string;
};

type UserInfo = {
  email: string | undefined;
  created_at: string;
  last_sign_in_at: string | undefined;
};

export default function ComptePage() {
  const router = useRouter();

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [modules, setModules] = useState<Module[]>([]);

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadAccount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/connexion");
        return;
      }

      setUserInfo({
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      });

      const [attemptsResult, modulesResult] =
        await Promise.all([
          supabase
            .from("qcm_attempts")
            .select(
              "id, module_id, score, total, percentage, created_at"
            )
            .eq("user_id", user.id)
            .order("created_at", {
              ascending: false,
            })
            .limit(5),

          supabase
            .from("modules")
            .select("id, name")
            .order("id"),
        ]);

      if (attemptsResult.error) {
        setMessage(
          `Erreur activité : ${attemptsResult.error.message}`
        );
      } else {
        setAttempts(attemptsResult.data ?? []);
      }

      if (!modulesResult.error) {
        setModules(modulesResult.data ?? []);
      }

      setLoading(false);
    }

    loadAccount();
  }, [router]);

  const average = useMemo(() => {
    if (attempts.length === 0) {
      return 0;
    }

    return Math.round(
      attempts.reduce(
        (sum, attempt) =>
          sum + attempt.percentage,
        0
      ) / attempts.length
    );
  }, [attempts]);

  function getModuleName(moduleId: number) {
    return (
      modules.find(
        (module) => module.id === moduleId
      )?.name ?? `Module ${moduleId}`
    );
  }

  function formatDate(date: string) {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  }

  async function logout() {
    setLoggingOut(true);
    setMessage("");

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      setMessage(
        `Erreur de déconnexion : ${error.message}`
      );
      setLoggingOut(false);
      return;
    }

    router.push("/connexion");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
        <div className="mx-auto max-w-5xl">
          <p>Chargement de ton compte...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
      <div className="mx-auto max-w-5xl">

        <button
          onClick={() => router.push("/")}
          className="text-blue-600 hover:underline"
        >
          Retour à l'accueil
        </button>

        <div className="mt-8">
          <h1 className="text-4xl font-bold">
            Mon compte
          </h1>

          <p className="mt-2 text-gray-600">
            Gère ton compte et retrouve ton activité récente.
          </p>
        </div>

        {message && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {message}
          </div>
        )}

        {/* INFORMATIONS DU COMPTE */}

        <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                Informations du compte
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {userInfo?.email ?? "Utilisateur"}
              </h2>
            </div>

            <button
              onClick={logout}
              disabled={loggingOut}
              className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loggingOut
                ? "Déconnexion..."
                : "Se déconnecter"}
            </button>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-5">
              <p className="text-sm text-gray-500">
                Adresse e-mail
              </p>

              <p className="mt-2 font-semibold">
                {userInfo?.email ?? "-"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-5">
              <p className="text-sm text-gray-500">
                Compte créé le
              </p>

              <p className="mt-2 font-semibold">
                {userInfo?.created_at
                  ? formatDate(
                      userInfo.created_at
                    )
                  : "-"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-5">
              <p className="text-sm text-gray-500">
                Dernière connexion
              </p>

              <p className="mt-2 font-semibold">
                {userInfo?.last_sign_in_at
                  ? formatDate(
                      userInfo.last_sign_in_at
                    )
                  : "-"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-5">
              <p className="text-sm text-gray-500">
                QCM récents
              </p>

              <p className="mt-2 font-semibold">
                {attempts.length}
              </p>
            </div>
          </div>
        </section>

        {/* STATISTIQUES */}

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Moyenne des QCM récents
            </p>

            <p className="mt-2 text-4xl font-bold">
              {attempts.length > 0
                ? `${average}%`
                : "-"}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Dernier score
            </p>

            <p className="mt-2 text-4xl font-bold">
              {attempts.length > 0
                ? `${attempts[0].percentage}%`
                : "-"}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">
              Meilleur score récent
            </p>

            <p className="mt-2 text-4xl font-bold">
              {attempts.length > 0
                ? `${Math.max(
                    ...attempts.map(
                      (attempt) =>
                        attempt.percentage
                    )
                  )}%`
                : "-"}
            </p>
          </div>
        </section>

        {/* ACTIVITE RECENTE */}

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Activité récente
              </h2>

              <p className="mt-1 text-gray-500">
                Tes 5 derniers QCM.
              </p>
            </div>

            <button
              onClick={() =>
                router.push("/progression")
              }
              className="rounded-xl border px-4 py-2 font-semibold hover:bg-gray-50"
            >
              Voir toute la progression
            </button>
          </div>

          {attempts.length === 0 ? (
            <div className="mt-5 rounded-2xl border bg-white p-8 text-center shadow-sm">
              <p className="text-lg font-semibold">
                Aucun QCM réalisé.
              </p>

              <p className="mt-2 text-gray-500">
                Commence un QCM pour faire apparaître
                ton activité ici.
              </p>

              <button
                onClick={() =>
                  router.push("/qcm")
                }
                className="mt-5 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Commencer un QCM
              </button>
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="divide-y">
                {attempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-bold">
                          {getModuleName(
                            attempt.module_id
                          )}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {formatDate(
                            attempt.created_at
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-6">
                        <span className="text-gray-500">
                          {attempt.score} /{" "}
                          {attempt.total}
                        </span>

                        <span className="text-xl font-bold">
                          {attempt.percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* RACCOURCIS */}

        <section className="mt-10 pb-10">
          <h2 className="text-2xl font-bold">
            Raccourcis
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <button
              onClick={() =>
                router.push("/cours")
              }
              className="rounded-2xl border bg-white p-5 text-left shadow-sm hover:border-blue-400 hover:shadow-md"
            >
              <p className="font-bold">
                Cours
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Accéder aux cours PDF.
              </p>
            </button>

            <button
              onClick={() =>
                router.push("/fiches")
              }
              className="rounded-2xl border bg-white p-5 text-left shadow-sm hover:border-blue-400 hover:shadow-md"
            >
              <p className="font-bold">
                Fiches
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Consulter les fiches de révision.
              </p>
            </button>

            <button
              onClick={() =>
                router.push("/qcm")
              }
              className="rounded-2xl border bg-white p-5 text-left shadow-sm hover:border-blue-400 hover:shadow-md"
            >
              <p className="font-bold">
                QCM
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Reprendre tes entraînements.
              </p>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}