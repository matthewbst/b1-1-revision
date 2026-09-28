export default function PublierPage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-4xl font-bold">
          ✏️ Publier du contenu
        </h1>

        <p className="mt-3 text-gray-600">
          Partage tes cours, fiches et QCM avec toute la classe.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <a
            href="/publier/cours"
            className="rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="text-4xl">📚</div>

            <h2 className="mt-4 text-2xl font-bold">
              Publier un cours
            </h2>

            <p className="mt-2 text-gray-600">
              Crée un module et ajoute ses chapitres.
            </p>
          </a>

          <a
            href="/publier/fiche"
            className="rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="text-4xl">📄</div>

            <h2 className="mt-4 text-2xl font-bold">
              Publier une fiche
            </h2>

            <p className="mt-2 text-gray-600">
              Crée une fiche de révision et partage-la.
            </p>
          </a>

          <a
            href="/publier/qcm"
            className="rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="text-4xl">📝</div>

            <h2 className="mt-4 text-2xl font-bold">
              Créer un QCM
            </h2>

            <p className="mt-2 text-gray-600">
              Prépare des questions et leurs corrections.
            </p>
          </a>
        </div>
      </div>
    </main>
  );
}
