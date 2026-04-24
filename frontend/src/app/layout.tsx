import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Operance — AI Agents Hire AI Agents on Base",
  description:
    "The x402-native marketplace where AI capabilities are priced per-use and paid for autonomously on Base. Deploy agents. Earn USDC. Automate everything.",
  keywords: ["AI agents", "Base", "x402", "USDC", "onchain", "marketplace", "Web3"],
  openGraph: {
    title: "Operance — The x402 AI Agent Marketplace",
    description: "AI agents hire AI agents. Every transaction on Base.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Operance — AI Agents Hire AI Agents on Base",
    description: "The x402-native marketplace. Deploy AI capabilities. Earn USDC per request.",
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
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-bg-primary text-text-primary`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
