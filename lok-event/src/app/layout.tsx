import "@/styles/globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Footer from "@/components/Footer";
import TopBar from "@/components/TopBar";
import { ThemeProvider } from "@/lib/ThemeContext";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://lokevent.eden-group.co"),
  title: "LOKEVENT - L'excellence événementielle en Côte d'Ivoire",
  description: "Découvrez les meilleurs prestataires pour vos événements : traiteurs, salles, photographes, DJ et plus encore en Côte d'Ivoire.",
  keywords: "événementiel, Côte d'Ivoire, traiteurs, salles, photographie, mariage, gala",
  authors: [{ name: "LOKEVENT" }],
  alternates: {
    canonical: "https://lokevent.eden-group.co",
  },
  openGraph: {
    title: "LOKEVENT - L'excellence événementielle",
    description: "Découvrez les meilleurs prestataires pour vos événements en Côte d'Ivoire",
    url: "https://lokevent.eden-group.co",
    siteName: "LOKEVENT",
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="scroll-smooth">
      <head>
        {/* Anti-flash : applique le thème mémorisé AVANT le rendu,
            pour éviter un clignotement sombre → clair au chargement */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('lokevent_theme')==='light')document.documentElement.classList.add('light')}catch(e){}`,
          }}
        />
      </head>
      {/* Le fond du body suit désormais le token : #050505 en sombre, gris clair en light */}
      <body className={`${inter.className} antialiased min-h-screen bg-[var(--color-background)] text-[var(--color-on-surface)]`}>
        <ThemeProvider>
          {/* Le fond fixe qui ne bouge pas et ne bloque pas les animations */}
          <div className="fixed inset-0 -z-10 global-bg" />

          {/* Structure principale avec flex pour pousser le footer en bas */}
          <div className="relative z-10 min-h-screen flex flex-col">
            {/* Header/TopBar */}
            <TopBar />

            {/* Contenu principal */}
            <main className="flex-1">
              {children}
            </main>

            {/* Footer */}
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}