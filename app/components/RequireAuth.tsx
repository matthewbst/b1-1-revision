"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const protectedRoutes = [
  "/cours",
  "/fiches",
  "/qcm",
  "/progression",
  "/difficultes",
  "/recherche",
  "/proposer-question",
  "/compte",
  "/publier",
];

function isProtectedRoute(pathname: string) {
  return protectedRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`),
  );
}

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      /*
        Les pages publiques restent accessibles immédiatement.
      */

      if (!isProtectedRoute(pathname)) {
        if (!mounted) {
          return;
        }

        setAllowed(true);
        setChecking(false);
        return;
      }

      /*
        getSession() lit la session déjà présente
        dans le navigateur et évite un appel réseau inutile.
      */

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (!session?.user) {
        setAllowed(false);
        setChecking(false);

        router.replace(
          `/connexion?redirect=${encodeURIComponent(pathname)}`,
        );

        return;
      }

      setAllowed(true);
      setChecking(false);
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) {
          return;
        }

        setAllowed(Boolean(session?.user));

        if (
          isProtectedRoute(pathname) &&
          !session?.user
        ) {
          router.replace(
            `/connexion?redirect=${encodeURIComponent(pathname)}`,
          );
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (checking) {
    return (
      <main className="flex min-h-[calc(100vh-68px)] items-center justify-center bg-[#182332] px-4 text-white">
        <div className="rounded-3xl border border-white/10 bg-[#202d3d] px-6 py-5 text-center">
          <div className="mx-auto h-3 w-3 rounded-full bg-[#a9c9ff]" />

          <div className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
            Chargement...
          </div>
        </div>
      </main>
    );
  }

  if (isProtectedRoute(pathname) && !allowed) {
    return null;
  }

  return <>{children}</>;
}