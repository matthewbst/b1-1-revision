import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/app/components/Navbar";
import UserPresence from "@/app/components/UserPresence";
import RegisterSW from "@/app/components/RegisterSW";

// Mets NEXT_PUBLIC_SITE_URL dans Vercel (ex. https://ton-site.vercel.app)
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://b1-1-revision.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Part-66 B1.1 – Révision et QCM",
    template: "%s | Part-66 B1.1",
  },
  description:
    "Plateforme de révision et d'entraînement pour la formation Part-66 B1.1 : cours, fiches et QCM corrigés.",
  applicationName: "Part-66 B1.1",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Part-66 B1.1",
    title: "Part-66 B1.1 – Révision et QCM",
    description: "Cours, fiches et QCM corrigés pour la formation Part-66 B1.1.",
  },
  appleWebApp: { capable: true, title: "B1.1 Révision", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <UserPresence />
        <RegisterSW />

        <Navbar />

        <div className="site-theme">
          {children}
        </div>
      </body>
    </html>
  );
}
