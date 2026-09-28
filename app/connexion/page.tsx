"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ConnexionPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Remplis ton email et ton mot de passe.");
      return;
    }

    if (mode === "signup" && password.length < 6) {
      setError(
        "Le mot de passe doit contenir au moins 6 caractères.",
      );
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const { error: loginError } =
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

        if (loginError) {
          throw loginError;
        }

        window.location.href = "/";
        return;
      }

      const { data, error: signupError } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

      if (signupError) {
        throw signupError;
      }

      if (data.session) {
        window.location.href = "/";
        return;
      }

      setMessage(
        "Compte créé. Vérifie ton email pour confirmer ton inscription.",
      );

      setMode("login");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-[calc(100vh-68px)] overflow-hidden bg-[#182332] text-white">
      {/* ======================================================
          BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[5%] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[130px]" />

        <div className="absolute left-[-150px] top-[40%] h-[450px] w-[450px] rounded-full bg-slate-200/[0.02] blur-[120px]" />

        <div className="absolute right-[-150px] top-[20%] h-[450px] w-[450px] rounded-full bg-white/[0.02] blur-[120px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-68px)] max-w-[1250px] items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          {/* ==================================================
              INTRO
          ================================================== */}

          <section className="relative overflow-hidden rounded-[38px] border border-white/10 bg-gradient-to-br from-[#233246] via-[#293b4f] to-[#30475d] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.15)] sm:p-10">
            <div className="absolute right-[-80px] top-[-80px] h-[260px] w-[260px] rounded-full bg-white/[0.03] blur-[80px]" />

            <div className="relative flex h-full flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
                  <span className="h-2 w-2 rounded-full bg-[#a9c9ff]" />
                  Part-66 training
                </div>

                <h1 className="mt-5 text-5xl font-black leading-[0.88] tracking-[-0.06em] text-white sm:text-6xl">
                  B1.1
                  <br />
                  <span className="text-slate-300">
                    STUDENT
                  </span>
                </h1>

                <p className="mt-6 max-w-md text-sm leading-7 text-slate-300">
                  Connecte-toi à ton espace de formation pour
                  retrouver tes cours, tes QCM et toute ta progression.
                </p>
              </div>

              <div className="mt-10">
                <div className="relative mx-auto flex h-[260px] w-[260px] items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-white/10" />

                  <div className="absolute inset-[35px] rounded-full border border-white/[0.08]" />

                  <div className="absolute inset-[70px] rounded-full border border-white/[0.06]" />

                  <div className="absolute left-1/2 top-0 h-8 w-px -translate-x-1/2 bg-white/25" />

                  <div className="absolute bottom-0 left-1/2 h-8 w-px -translate-x-1/2 bg-white/25" />

                  <div className="absolute left-0 top-1/2 h-px w-8 -translate-y-1/2 bg-white/25" />

                  <div className="absolute right-0 top-1/2 h-px w-8 -translate-y-1/2 bg-white/25" />

                  <svg
                    viewBox="0 0 320 320"
                    className="relative z-10 h-36 w-36 text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.18)]"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M153 28H167L181 135L162 292H158L139 135L153 28Z" />
                    <path d="M140 111L44 177L44 198L151 160L140 111Z" />
                    <path d="M180 111L276 177L276 198L169 160L180 111Z" />
                    <path d="M140 229L88 274L88 292L151 258L140 229Z" />
                    <path d="M180 229L232 274L232 292L169 258L180 229Z" />
                    <path d="M153 28L160 10L167 28Z" />
                  </svg>
                </div>
              </div>

              <div className="mt-8 border-t border-white/[0.08] pt-5">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  <span>Aircraft</span>
                  <span>B1.1</span>
                </div>

                <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  <span>Status</span>

                  <span className="flex items-center gap-2 text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Ready
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ==================================================
              FORMULAIRE
          ================================================== */}

          <section className="rounded-[38px] border border-white/10 bg-[#202d3d] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.12)] sm:p-9">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
                Student access
              </div>

              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">
                {mode === "login"
                  ? "Connexion"
                  : "Créer ton compte"}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {mode === "login"
                  ? "Retrouve ton espace étudiant."
                  : "Rejoins la plateforme de révision B1.1."}
              </p>
            </div>

            {/* SWITCH */}

            <div className="mt-7 grid grid-cols-2 rounded-2xl border border-white/10 bg-[#182332] p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setMessage("");
                }}
                className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                  mode === "login"
                    ? "bg-white/[0.10] text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Connexion
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setMessage("");
                }}
                className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                  mode === "signup"
                    ? "bg-white/[0.10] text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                Inscription
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-7 space-y-5"
            >
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="ton@email.com"
                  autoComplete="email"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#182332] px-4 py-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/20"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                  Mot de passe
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="••••••••"
                  autoComplete={
                    mode === "login"
                      ? "current-password"
                      : "new-password"
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#182332] px-4 py-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/20"
                />
              </div>

              {mode === "signup" && (
                <div>
                  <label className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                    Confirmer le mot de passe
                  </label>

                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#182332] px-4 py-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/20"
                  />
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm leading-6 text-red-200">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm leading-6 text-emerald-200">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[#6ea8ff] px-6 py-4 text-sm font-black text-[#122033] transition hover:bg-[#83b5ff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Chargement..."
                  : mode === "login"
                    ? "Se connecter →"
                    : "Créer mon compte →"}
              </button>
            </form>

            <div className="mt-7 border-t border-white/[0.07] pt-6 text-center text-xs text-slate-600">
              <Link
                href="/"
                className="transition hover:text-slate-300"
              >
                ← Retour à l&apos;accueil
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}