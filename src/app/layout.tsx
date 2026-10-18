import type { Metadata } from "next";
import { Overpass, Overpass_Mono, Source_Serif_4 } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const sans = Overpass({ subsets: ["latin"], display: "swap", variable: "--font-overpass" });
const serif = Source_Serif_4({ subsets: ["latin"], display: "swap", variable: "--font-source-serif" });
const mono = Overpass_Mono({ subsets: ["latin"], display: "swap", variable: "--font-overpass-mono" });

export const metadata: Metadata = {
  title: { default: "ArrivalGuard", template: "%s | ArrivalGuard" },
  description:
    "An AI agent that pays a student's international tuition inside the limits their family sets. Simulated funds and a fictional university.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
