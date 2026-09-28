import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/app/components/Navbar";
import UserPresence from "@/app/components/UserPresence";

export const metadata: Metadata = {
  title: "Part-66 B1.1",
  description:
    "Plateforme de révision et d'entraînement pour la formation Part-66 B1.1.",
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

        <Navbar />

        <div className="site-theme">
          {children}
        </div>
      </body>
    </html>
  );
}