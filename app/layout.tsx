import type { Metadata } from "next";
import { Geist, Space_Mono, Noto_Sans_SC, Noto_Sans_JP, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const notoSC = Noto_Sans_SC({
  variable: "--font-noto-sc",
  weight: ["400", "700", "900"],
  subsets: ["latin"],
});

const notoJP = Noto_Sans_JP({
  variable: "--font-noto-jp",
  weight: ["400", "700", "900"],
  subsets: ["latin"],
});

const notoKR = Noto_Sans_KR({
  variable: "--font-noto-kr",
  weight: ["400", "700", "900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WhospAI",
  description: "Watch 6 AI models play \"Who is the Spy\" against each other.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${spaceMono.variable} ${notoSC.variable} ${notoJP.variable} ${notoKR.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
