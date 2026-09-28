"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ADMIN_ID =
  "dcbeb72a-4f4a-4169-beab-53da1b3babfa";

type IconName =
  | "home"
  | "book"
  | "file"
  | "quiz"
  | "chart"
  | "search"
  | "plus"
  | "user"
  | "admin";

function NavIcon({
  name,
  size = 18,
}: {
  name: IconName;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
          <path d="M9.5 21v-6h5v6" />
        </svg>
      );

    case "book":
      return (
        <svg {...common}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z" />
          <path d="M4 5.5V19" />
          <path d="M8 7h8" />
          <path d="M8 11h7" />
        </svg>
      );

    case "file":
      return (
        <svg {...common}>
          <path d="M6 3h8l4 4v14H6z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6" />
          <path d="M9 17h5" />
        </svg>
      );

    case "quiz":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-.8.7-1.7 1.1-1.7 2.3" />
          <path d="M12 17h.01" />
        </svg>
      );

    case "chart":
      return (
        <svg {...common}>
          <path d="M5 20V10" />
          <path d="M12 20V4" />
          <path d="M19 20v-7" />
        </svg>
      );

    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
      );

    case "plus":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        </svg>
      );

    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3" />
          <path d="M5 21a7 7 0 0 1 14 0" />
        </svg>
      );

    case "admin":
      return (
        <svg {...common}>
          <path d="M12 3 20 6v5c0 5.2-3.3 8.7-8 10-4.7-1.3-8-4.8-8-10V6l8-3Z" />
          <path d="M9 12h6" />
          <path d="M12 9v6" />
        </svg>
      );

    default:
      return null;
  }
}

const navItems = [
  {
    href: "/",
    label: "Accueil",
    icon: "home" as IconName,
  },
  {
    href: "/cours",
    label: "Cours",
    icon: "book" as IconName,
  },
  {
    href: "/fiches",
    label: "Fiches",
    icon: "file" as IconName,
  },
  {
    href: "/qcm",
    label: "QCM",
    icon: "quiz" as IconName,
  },
  {
    href: "/progression",
    label: "Progression",
    icon: "chart" as IconName,
  },
  {
    href: "/recherche",
    label: "Recherche",
    icon: "search" as IconName,
  },
  {
    href: "/proposer-question",
    label: "Proposer",
    icon: "plus" as IconName,
  },
];

export default function Navbar() {
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkUser() {
      /*
        getSession() évite un appel réseau juste pour afficher
        l'état du bouton compte/admin.
      */

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      const user = session?.user;

      setConnected(Boolean(user));
      setIsAdmin(user?.id === ADMIN_ID);
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) {
          return;
        }

        setConnected(Boolean(session?.user));
        setIsAdmin(session?.user?.id === ADMIN_ID);
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    if (href === "/progression") {
      return (
        pathname === "/progression" ||
        pathname === "/difficultes" ||
        pathname === "/compte"
      );
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#182332]/95 backdrop-blur-xl">
      <div className="mx-auto max-w-[1500px] px-3 sm:px-6 lg:px-8">
        <div className="flex min-h-[68px] items-center gap-3">
          {/* =====================================================
              LOGO
          ===================================================== */}

          <Link
            href="/"
            onClick={closeMenu}
            className="flex shrink-0 items-center gap-2.5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#202d3d]">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 text-white"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M11.2 2h1.6l1.7 7.8 5.7 4.3-1.1 1.4-6-2.9v5.1l2.2 2.2V22H8.7v-2.1l2.2-2.2v-5.1l-6 2.9-1.1-1.4 5.7-4.3L11.2 2Z" />
              </svg>
            </div>

            <div className="hidden sm:block">
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#a9c9ff]">
                Part-66
              </div>

              <div className="text-sm font-black tracking-tight text-white">
                B1.1
              </div>
            </div>
          </Link>

          {/* =====================================================
              NAVIGATION DESKTOP
          ===================================================== */}

          <nav className="ml-2 hidden items-center gap-0.5 lg:flex">
            {navItems.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition-colors ${
                    active
                      ? "bg-white/[0.08] text-white"
                      : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-200"
                  }`}
                >
                  <NavIcon
                    name={item.icon}
                    size={16}
                  />

                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* =====================================================
              ESPACE
          ===================================================== */}

          <div className="flex-1" />

          {/* =====================================================
              ACTIONS DROITE
          ===================================================== */}

          <div className="flex shrink-0 items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                onClick={closeMenu}
                className={`hidden items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-black transition-colors sm:flex ${
                  pathname.startsWith("/admin")
                    ? "border-[#a9c9ff]/30 bg-[#a9c9ff]/10 text-[#c5dcff]"
                    : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                <NavIcon name="admin" size={16} />
                <span>Mode admin</span>
              </Link>
            )}

            <Link
              href={
                connected
                  ? "/compte"
                  : "/connexion"
              }
              onClick={closeMenu}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#202d3d] text-slate-300 transition-colors hover:bg-[#28384b] hover:text-white"
              aria-label={
                connected
                  ? "Mon compte"
                  : "Connexion"
              }
            >
              <NavIcon name="user" size={18} />
            </Link>

            {/* =================================================
                MENU MOBILE
            ================================================= */}

            <button
              type="button"
              onClick={() =>
                setMenuOpen((value) => !value)
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#202d3d] text-slate-300 transition-colors hover:bg-[#28384b] hover:text-white lg:hidden"
              aria-label="Ouvrir le menu"
              aria-expanded={menuOpen}
            >
              <span className="flex flex-col gap-1.5">
                <span className="h-px w-5 bg-current" />
                <span className="h-px w-5 bg-current" />
                <span className="h-px w-5 bg-current" />
              </span>
            </button>
          </div>
        </div>

        {/* =======================================================
            MENU MOBILE
        ======================================================= */}

        {menuOpen && (
          <div className="border-t border-white/[0.07] pb-4 pt-3 lg:hidden">
            <nav className="grid gap-1">
              {navItems.map((item) => {
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-black ${
                      active
                        ? "bg-white/[0.08] text-white"
                        : "text-slate-400"
                    }`}
                  >
                    <NavIcon
                      name={item.icon}
                      size={18}
                    />

                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={closeMenu}
                  className={`mt-2 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-black ${
                    pathname.startsWith("/admin")
                      ? "border-[#a9c9ff]/30 bg-[#a9c9ff]/10 text-[#c5dcff]"
                      : "border-white/10 bg-white/[0.04] text-slate-300"
                  }`}
                >
                  <NavIcon
                    name="admin"
                    size={18}
                  />

                  <span>Mode admin</span>
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}