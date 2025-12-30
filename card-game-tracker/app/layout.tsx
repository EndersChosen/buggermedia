import type { Metadata } from "next";
import "./globals.css";
import { GameProvider } from "@/context/GameContext";

export const metadata: Metadata = {
  title: "Card Game Score Tracker",
  description: "Track scores for Skull King and Cover Your Assets card games",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
