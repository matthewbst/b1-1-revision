"use client";

import Link from "next/link";
import ShareSiteButton from "@/app/components/ShareSiteButton";

const SITE_URL =
  "https://b1-1-revision.vercel.app";

const QR_URL =
  "https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=20&data=https%3A%2F%2Fb1-1-revision.vercel.app";

export default function PartagerPage() {
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        SITE_URL,
      );

      window.alert(
        "Lien copié dans le presse-papiers ✓",
      );
    } catch {
      window.alert(
        `Copie ce lien : ${SITE_URL}`,
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#182332] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-[-120px] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[130px]" />

        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize:
              "50px 50px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1100px] px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[36px] border border-white/10 bg-gradient-to-br from-[#233246] via-[#293b4f] to-[#30475d] p-7 sm:p-10">
          <div className="text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
            Partage
          </div>

          <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
            Invite tes camarades
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Fais découvrir Part-66 B1.1 aux autres étudiants
            et partage facilement la plateforme.
          </p>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          {/* QR CODE */}

          <div className="rounded-[32px] border border-white/10 bg-[#202d3d] p-6 sm:p-8">
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              QR CODE
            </div>

            <h2 className="mt-2 text-2xl font-black">
              À scanner
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Tes camarades peuvent scanner ce QR code avec leur
              téléphone pour ouvrir directement le site.
            </p>

            <div className="mt-7 flex justify-center rounded-[28px] bg-white p-5">
              <img
                src={QR_URL}
                alt="QR code vers Part-66 B1.1"
                className="h-auto w-full max-w-[320px]"
              />
            </div>

            <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 text-center">
              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                Adresse
              </div>

              <div className="mt-2 break-all text-sm font-black text-[#c5dcff]">
                {SITE_URL}
              </div>
            </div>
          </div>

          {/* PARTAGE */}

          <div className="rounded-[32px] border border-white/10 bg-[#202d3d] p-6 sm:p-8">
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
              INVITATION
            </div>

            <h2 className="mt-2 text-2xl font-black">
              Partager le site
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-400">
              Utilise le bouton de partage de ton téléphone ou
              copie simplement le lien.
            </p>

            <div className="mt-7">
              <ShareSiteButton large />
            </div>

            <button
              type="button"
              onClick={copyLink}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 text-sm font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect
                  x="9"
                  y="9"
                  width="10"
                  height="10"
                  rx="2"
                />

                <path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
              </svg>

              Copier le lien
            </button>

            <div className="mt-8 rounded-3xl border border-[#a9c9ff]/10 bg-[#a9c9ff]/[0.04] p-5">
              <div className="text-[9px] font-black uppercase tracking-[0.22em] text-[#a9c9ff]">
                Message à envoyer
              </div>

              <p className="mt-3 text-sm leading-7 text-slate-300">
                Je révise mon Part-66 B1.1 ici ✈️
                <br />
                Il y a des cours, fiches, QCM et un suivi de
                progression.
                <br />
                <br />
                {SITE_URL}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                Cours
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                QCM
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                Fiches
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                Progression
              </span>
            </div>
          </div>
        </section>

        <section className="mt-5 flex flex-col gap-3 rounded-[30px] border border-white/10 bg-[#202d3d] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">
              Retour
            </div>

            <div className="mt-1 text-lg font-black">
              Continuer tes révisions
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/qcm"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-center text-sm font-black text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              Faire un QCM
            </Link>

            <Link
              href="/"
              className="rounded-2xl bg-[#6ea8ff] px-5 py-3 text-center text-sm font-black text-[#122033] transition hover:bg-[#83b5ff]"
            >
              Accueil
            </Link>
          </div>
        </section>

        <div className="h-10" />
      </div>
    </main>
  );
}