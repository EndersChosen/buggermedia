import type { Metadata } from "next";
import "./globals.css";
import { GameProvider } from "@/context/GameContext";
import { fontVariables } from "./fonts";

export const metadata: Metadata = {
  title: "Card Game Score Tracker",
  description: "Keep score for any tabletop game: built-in trackers plus AI-generated score cards from a rule book or a description.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="antialiased bg-gray-50 dark:bg-gray-900">
        <GameProvider>
          <div className="min-h-screen w-full">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
              {children}
            </div>
          </div>
        </GameProvider>
      </body>
    </html>
  );
}
