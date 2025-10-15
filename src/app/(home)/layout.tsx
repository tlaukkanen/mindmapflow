import "@/styles/globals.css";
import type { CSSProperties } from "react";

import { Metadata, Viewport } from "next";
import { Link } from "@mui/material";

import { siteConfig } from "@/config/site";
import { Navbar } from "@/components/navbar";
import {
  DEFAULT_PALETTE_ID,
  getPaletteById,
  paletteToCssVariables,
  palettes,
} from "@/config/palettes";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon-512x512.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const palette =
    getPaletteById(DEFAULT_PALETTE_ID) ?? getPaletteById("tech") ?? palettes[0];
  const paletteVars = paletteToCssVariables(palette);

  return (
    <div
      className="relative flex flex-col min-h-screen text-body bg-landing"
      style={{
        ...(paletteVars as CSSProperties),
        background: paletteVars["--page-background"],
        color: paletteVars["--color-body-text"],
      }}
    >
      <Navbar />
      <main className="container mx-auto max-w-7xl pt-16 px-6 flex-grow ">
        {children}
      </main>
      <footer className="w-full flex flex-col items-center justify-center py-5 gap-3">
        <div className="flex gap-6 items-center">
          {siteConfig.footerItems?.map((item, index) => (
            <Link
              key={`footer-${index}`}
              className="text-muted text-sm no-underline hover:text-link"
              href={item.href}
              underline="none"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <Link
          className="flex items-center gap-1 text-current no-underline mt-2"
          href="https://www.linkedin.com/in/tlaukkanen/"
          title="Tommi Laukkanen"
          underline="none"
        >
          <span className="text-muted">Created with ❤️ by&nbsp;</span>
          <p className="text-link">Tommi Laukkanen</p>
        </Link>
      </footer>
    </div>
  );
}
