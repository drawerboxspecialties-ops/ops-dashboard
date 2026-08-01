import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ops Dashboard · CutFlow",
  description: "Cut sheet organizer by ship-date paper color and material family",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=Manrope:wght@500;600;700;800&family=Newsreader:opsz,wght@6..72,600;6..72,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
