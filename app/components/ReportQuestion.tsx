"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  questionId: number;
};

const categories = [
  {
    value: "wrong_answer",
    label: "❌ Mauvaise réponse",
  },
  {
    value: "ambiguous",
    label: "⚠️ Question ambiguë",
  },
  {
    value: "course_error",
    label: "📚 Erreur dans le cours",
  },
  {
    value: "spelling",
    label: "✍️ Faute d'orthographe",
  },
  {
    value: "duplicate",
    label: "🔁 Question en double",
  },
  {
    value: "other",
    label: "💬 Autre",
  },
];

export default function ReportQuestion({
  questionId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("wrong_answer");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submitReport() {
    setMessage("");

    if (reason.trim().length < 5) {
      setMessage("Explique le problème en quelques mots.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Connecte-toi pour signaler une question.");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("question_reports")
      .insert({
        question_id: questionId,
        user_id: user.id,
        category,
        reason: reason.trim(),
      });

    if (error?.code === "23505") {
      setMessage(
        "Tu as déjà signalé cette question et le signalement est encore en attente."
      );
      setLoading(false);
      return;
    }

    if (error) {
      setMessage(
        "Impossible d'envoyer le signalement : " +
          error.message
      );
      setLoading(false);
      return;
    }

    setMessage("✅ Signalement envoyé.");
    setReason("");
    setOpen(false);
    setLoading(false);
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-sm font-semibold text-red-600 hover:text-red-700"
      >
        🚨 Signaler cette question
      </button>

      {open && (
        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="text-sm font-bold text-red-800">
            Pourquoi cette question doit être vérifiée ?
          </div>

          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value)
            }
            className="mt-3 w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-gray-900"
          >
            {categories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <textarea
            value={reason}
            onChange={(event) =>
              setReason(event.target.value)
            }
            rows={4}
            placeholder="Explique ce qui semble incorrect..."
            className="mt-3 w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-gray-900"
          />

          {message && (
            <div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-700">
              {message}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={submitReport}
              disabled={loading}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {loading ? "Envoi..." : "Envoyer"}
            </button>

            <button
              onClick={() => setOpen(false)}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-bold text-gray-700"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}