"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function ChoiceCard({
  href,
  icon,
  eyebrow,
  title,
  description,
  tags,
}: {
  href: string;
  icon: string;
  eyebrow: string;
  title: string;
  description: string;
  tags: string[];
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-[34px] border border-white/10 bg-[#202d3d] p-7 transition hover:-translate-y-1 hover:border-[#a9c9ff]/25 hover:bg-[#28384b] sm:p-9"
    >
      <div className="absolute right-[-50px] top-[-50px] h-40 w-40 rounded-full bg-[#a9c9ff]/[0.035] blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#a9c9ff]/10 text-3xl">
            {icon}
          </div>

          <span className="text-2xl text-slate-600 transition group-hover:translate-x-1 group-hover:text-white">
            →
          </span>
        </div>

        <div className="mt-8 text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
          {eyebrow}
        </div>

        <h2 className="mt-2 text-3xl font-black text-white">
          {title}
        </h2>

        <p className="mt-4 max-w-md text-sm leading-7 text-slate-400">
          {description}
        </p>

        <div className="mt-7 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-8 text-sm font-black text-[#c5dcff]">
          Ouvrir →
        </div>
      </div>
    </Link>
  );
}

export default function ProposerPage() {
  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (!session?.user) {
        window.location.href =
          "/connexion?redirect=/proposer";
        return;
      }

      setLoading(false);
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#182332] text-white">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="rounded-2xl border border-white/10 bg-[#202d3d] px-6 py-4 text-sm font-semibold text-slate-300">
            Préparation...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#182332] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-120px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[130px]" />

        <div className="absolute left-[-10%] top-[45%] h-[500px] w-[500px] rounded-full bg-white/[0.015] blur-[120px]" />

        <div className="absolute right-[-10%] top-[25%] h-[500px] w-[500px] rounded-full bg-white/[0.015] blur-[120px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[38px] border border-white/10 bg-gradient-to-br from-[#233246] via-[#293b4f] to-[#30475d] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.15)] sm:p-10">
          <div className="absolute right-[-100px] top-[-100px] h-[300px] w-[300px] rounded-full bg-white/[0.035] blur-[90px]" />

          <div className="relative">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
              <span className="h-2 w-2 rounded-full bg-[#a9c9ff]" />
              Contribution étudiante
            </div>

            <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
              Que veux-tu créer ?
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Partage ton travail avec les autres étudiants et
              aide à enrichir la plateforme B1.1.
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-2">
          <ChoiceCard
            href="/proposer-question"
            icon="📝"
            eyebrow="Contribution 01"
            title="Créer un QCM"
            description="Propose une nouvelle question avec ses réponses, son explication et sa source."
            tags={[
              "Question",
              "3 réponses",
              "Correction",
            ]}
          />

          <ChoiceCard
            href="/proposer/fiche"
            icon="📄"
            eyebrow="Contribution 02"
            title="Créer une fiche"
            description="Ajoute une fiche de révision avec son module, son titre et ton PDF."
            tags={[
              "Résumé",
              "PDF",
              "Module",
            ]}
          />
        </section>

        <section className="mt-5 rounded-[30px] border border-white/10 bg-[#202d3d] p-6 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.05] text-xl">
              💡
            </div>

            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#a9c9ff]">
                Contribution
              </div>

              <p className="mt-1 text-sm leading-6 text-slate-400">
                Tes contributions doivent rester liées à la
                formation Part-66 B1.1 et apporter une réelle
                valeur aux autres étudiants.
              </p>
            </div>
          </div>
        </section>

        <div className="h-10" />
      </div>
    </main>
  );
}