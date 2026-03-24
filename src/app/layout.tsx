import type { Metadata } from "next";
import { Geist, Geist_Mono, Oswald } from "next/font/google";
import "./globals.css";
import { AppChrome } from "@/components/app-chrome";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FIFA 23 Career Manager",
  description: "Companion para modo carreira — elenco, transferências e progresso no FIFA 23.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} dark h-full`}
    >
      <body className="min-h-full font-sans">
        <div className="relative z-10 flex min-h-screen flex-col">
          <AppChrome>{children}</AppChrome>
        </div>
      </body>
    </html>
  );
}
