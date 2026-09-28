"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Module = {
  id: number;
  name: string;
};

export default function PublierCoursPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [moduleName, setModuleName] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");

  const [selectedModule, setSelectedModule] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [chapterContent, setChapterContent] = useState("");

  const [message, setMessage] = useState("");

  async function loadModules() {
    const { data } = await supabase
      .from("modules")
      .select("id, name")
      .order("id");

    setModules(data ?? []);
  }

  useEffect(() => {
    loadModules();
  }, []);

  async function createModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Tu dois être connecté pour publier.");
      return;
    }

    const { data, error } = await supabase
      .from("modules")
      .insert({
        name: moduleName,
        description: moduleDescription,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setModuleName("");
    setModuleDescription("");

    await loadModules();

    setSelectedModule(String(data.id));

    setMessage("✅ Module créé !");
  }

  async function createChapter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!selectedModule) {
      setMessage("Choisis un module.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Tu dois être connecté pour publier.");
      return;
    }

    const { error } = await supabase.from("chapters").insert({
      module_id: Number(selectedModule),
      name: chapterName,
      content: chapterContent,
      created_by: user.id,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setChapterName("");
    setChapterContent("");

    setMessage("✅ Chapitre ajouté !");
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="mx-auto max-w-4xl">
        <a
          href="/publier"
          className="text-blue-600 hover:underline"
        >
          ← Retour à publier
        </a>

        <h1 className="mt-6 text-4xl font-bold">
          📚 Publier un cours
        </h1>

        <p className="mt-3 text-gray-600">
          Crée un module puis ajoute autant de chapitres que nécessaire.
        </p>

        {message && (
          <div className="mt-6 rounded-xl bg-white border p-4">
            {message}
          </div>
        )}

        {/* NOUVEAU MODULE */}
        <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold">
            1. Créer un module
          </h2>

          <form
            onSubmit={createModule}
            className="mt-5 space-y-4"
          >
            <input
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              placeholder="Nom du module"
              required
              className="w-full rounded-xl border px-4 py-3"
            />

            <textarea
              value={moduleDescription}
              onChange={(e) =>
                setModuleDescription(e.target.value)
              }
              placeholder="Description du module"
              rows={4}
              className="w-full rounded-xl border px-4 py-3"
            />

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Créer le module
            </button>
          </form>
        </section>

        {/* CHAPITRE */}
        <section className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold">
            2. Ajouter un chapitre
          </h2>

          <form
            onSubmit={createChapter}
            className="mt-5 space-y-4"
          >
            <select
              value={selectedModule}
              onChange={(e) =>
                setSelectedModule(e.target.value)
              }
              className="w-full rounded-xl border bg-white px-4 py-3"
            >
              <option value="">
                Choisir un module
              </option>

              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.name}
                </option>
              ))}
            </select>

            <input
              value={chapterName}
              onChange={(e) =>
                setChapterName(e.target.value)
              }
              placeholder="Nom du chapitre"
              required
              className="w-full rounded-xl border px-4 py-3"
            />

            <textarea
              value={chapterContent}
              onChange={(e) =>
                setChapterContent(e.target.value)
              }
              placeholder="Écris ou colle ici ton cours..."
              rows={12}
              required
              className="w-full rounded-xl border px-4 py-3"
            />

            <button
              type="submit"
              className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
            >
              Ajouter le chapitre
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}