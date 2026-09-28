"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/progression",
    label: "Progression",
    description: "Voir tes résultats",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M4 19V5" />
        <path d="M4 19H20" />
        <path d="M8 15V11" />
        <path d="M12 15V8" />
        <path d="M16 15V5" />
      </svg>
    ),
  },
  {
    href: "/difficultes",
    label: "Mes difficultés",
    description: "Tes points à renforcer",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8V13" />
        <path d="M12 16.5V16.6" />
      </svg>
    ),
  },
  {
    href: "/compte",
    label: "Compte",
    description: "Ton profil étudiant",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20C5.8 16.7 8.1 15 12 15s6.2 1.7 7 5" />
      </svg>
    ),
  },
];

export default function EspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-[#182332] text-white">
      {/* ======================================================
          FOND
      ====================================================== */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-160px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-white/[0.025] blur-[130px]" />

        <div className="absolute left-[-140px] top-[35%] h-[450px] w-[450px] rounded-full bg-slate-300/[0.02] blur-[120px]" />

        <div className="absolute right-[-140px] top-[20%] h-[450px] w-[450px] rounded-full bg-white/[0.02] blur-[120px]" />

        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1450px] px-4 py-7 sm:px-6 lg:px-8">
        {/* ======================================================
            HEADER
        ====================================================== */}

        <header className="mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-[#a9c9ff]">
                <span className="h-2 w-2 rounded-full bg-[#8fb8ef] shadow-[0_0_10px_rgba(143,184,239,0.55)]" />
                Mon espace
              </div>

              <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">
                Centre étudiant
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                Suis ton évolution, retrouve tes difficultés et gère
                ton profil de formation B1.1.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#202d3d] px-4 py-3">
              <div className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-500">
                Formation
              </div>

              <div className="mt-1 text-xl font-black text-white">
                PART-66 B1.1
              </div>
            </div>
          </div>
        </header>

        {/* ======================================================
            NAVIGATION ESPACE
        ====================================================== */}

        <nav className="mb-8 grid gap-3 md:grid-cols-3">
          {tabs.map((tab) => {
            const active =
              pathname === tab.href ||
              (tab.href === "/progression" &&
                pathname.startsWith("/progression")) ||
              (tab.href === "/difficultes" &&
                pathname.startsWith("/difficultes")) ||
              (tab.href === "/compte" &&
                pathname.startsWith("/compte"));

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`group rounded-3xl border p-4 transition ${
                  active
                    ? "border-white/20 bg-[#30445a] shadow-[0_12px_35px_rgba(0,0,0,0.10)]"
                    : "border-white/10 bg-[#202d3d] hover:border-white/20 hover:bg-[#28384b]"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      active
                        ? "bg-white/10 text-white"
                        : "bg-white/[0.05] text-slate-400 group-hover:text-white"
                    }`}
                  >
                    {tab.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div
                      className={`font-black ${
                        active ? "text-white" : "text-slate-200"
                      }`}
                    >
                      {tab.label}
                    </div>

                    <div className="mt-1 text-[11px] text-slate-500">
                      {tab.description}
                    </div>
                  </div>

                  <span
                    className={`text-sm transition ${
                      active
                        ? "translate-x-0 text-white"
                        : "text-slate-600 group-hover:translate-x-1 group-hover:text-white"
                    }`}
                  >
                    →
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* ======================================================
            CONTENU
        ====================================================== */}

        <section className="relative">
          {children}
        </section>

        <div className="h-8" />
      </div>
    </main>
  );
}