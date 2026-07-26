import type { Metadata } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const siteUrl =
  "https://jotaefedoc.github.io/instrucciones-ies-aragon-2026-2027/";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Guía operativa IES Aragón 2026/2027",
  description:
    "Calendario, documentación y herramientas de apoyo para los equipos directivos de los IES de Aragón.",
  authors: [{ name: "@jotaefedoc", url: "https://github.com/jotaefedoc" }],
  creator: "@jotaefedoc",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: siteUrl,
    siteName: "Guía operativa IES Aragón 2026/2027",
    title: "Guía operativa IES Aragón 2026/2027",
    description:
      "Calendario, documentación y herramientas de apoyo para los equipos directivos de los IES de Aragón.",
    images: [
      {
        url: `${basePath}/social-card.svg`,
        width: 1200,
        height: 630,
        alt: "Guía operativa IES Aragón 2026/2027 para equipos directivos",
        type: "image/svg+xml",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Guía operativa IES Aragón 2026/2027",
    description:
      "Calendario, documentación y herramientas de apoyo para los equipos directivos de los IES de Aragón.",
    images: [`${basePath}/social-card.svg`],
    creator: "@jotaefedoc",
  },
  icons: {
    icon: `${basePath}/favicon.svg`,
    shortcut: `${basePath}/favicon.svg`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
