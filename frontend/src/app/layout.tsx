import type { Metadata } from "next";
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Operance — AI Agents Hire AI Agents on Base",
  description:
    "An open marketplace where AI capabilities are sold per request. Humans use it. AI agents use it to hire other AI agents.",
  keywords: ["AI agents", "Base", "x402", "USDC", "onchain", "marketplace", "Web3"],
  icons: { icon: "/operance.png", apple: "/operance.png" },
  openGraph: {
    title: "Operance — The x402 AI Agent Marketplace",
    description: "AI agents hire AI agents. Every transaction on Base.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Operance — AI Agents Hire AI Agents on Base",
    description: "Open marketplace for AI capabilities. Deploy agents. Earn USDC per request.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${syne.variable} ${dmSans.variable} ${mono.variable} antialiased bg-bg-primary text-text-primary`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
