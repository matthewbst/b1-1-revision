import { createServerClient } from "@supabase/ssr";
import {
  NextResponse,
  type NextRequest,
} from "next/server";

const ADMIN_ID =
  "dcbeb72a-4f4a-4169-beab-53da1b3babfa";

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
  "/admin",
];

function isProtectedRoute(pathname: string) {
  return protectedRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`),
  );
}

function isAdminRoute(pathname: string) {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

function isProtectedApi(pathname: string) {
  return (
    pathname === "/api/qcm" ||
    pathname.startsWith("/api/qcm/")
  );
}

function copySupabaseResponse(
  source: NextResponse,
  destination: NextResponse,
) {
  for (const cookie of source.cookies.getAll()) {
    destination.cookies.set(cookie);
  }

  for (const header of [
    "cache-control",
    "expires",
    "pragma",
  ]) {
    const value = source.headers.get(header);

    if (value) {
      destination.headers.set(header, value);
    }
  }

  return destination;
}

export async function updateSession(
  request: NextRequest,
) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          for (const {
            name,
            value,
          } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          supabaseResponse = NextResponse.next({
            request,
          });

          for (const {
            name,
            value,
            options,
          } of cookiesToSet) {
            supabaseResponse.cookies.set(
              name,
              value,
              options,
            );
          }
        },
      },
    },
  );

  /*
    Vérification réelle du JWT.
  */

  const {
    data: claimsData,
  } = await supabase.auth.getClaims();

  const userId =
    typeof claimsData?.claims?.sub === "string"
      ? claimsData.claims.sub
      : null;

  const pathname = request.nextUrl.pathname;

  /* =========================================================
     API QCM
  ========================================================= */

  if (isProtectedApi(pathname) && !userId) {
    const response = NextResponse.json(
      {
        error: "Authentification requise.",
      },
      {
        status: 401,
      },
    );

    return copySupabaseResponse(
      supabaseResponse,
      response,
    );
  }

  /* =========================================================
     PAGES PROTÉGÉES
  ========================================================= */

  if (
    isProtectedRoute(pathname) &&
    !userId
  ) {
    const url = request.nextUrl.clone();

    url.pathname = "/connexion";

    url.searchParams.set(
      "redirect",
      pathname,
    );

    const response =
      NextResponse.redirect(url);

    return copySupabaseResponse(
      supabaseResponse,
      response,
    );
  }

  /* =========================================================
     ADMIN
  ========================================================= */

  if (isAdminRoute(pathname)) {
    if (!userId) {
      const url = request.nextUrl.clone();

      url.pathname = "/connexion";

      url.searchParams.set(
        "redirect",
        pathname,
      );

      const response =
        NextResponse.redirect(url);

      return copySupabaseResponse(
        supabaseResponse,
        response,
      );
    }

    if (userId !== ADMIN_ID) {
      const url = request.nextUrl.clone();

      url.pathname = "/";

      const response =
        NextResponse.redirect(url);

      return copySupabaseResponse(
        supabaseResponse,
        response,
      );
    }
  }

  return supabaseResponse;
}