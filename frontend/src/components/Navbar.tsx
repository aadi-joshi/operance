"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Zap } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Marketplace" },
  { href: "/orchestrate", label: "Orchestrate" },
  { href: "/register", label: "Register Agent" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border-subtle bg-bg-primary/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 bg-blue rounded-lg flex items-center justify-center shadow-blue-glow group-hover:shadow-blue-glow transition-all">
            <Zap size={14} className="text-white" fill="white" />
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-text-primary">
            Operance
          </span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all",
                pathname === href
                  ? "bg-blue/15 text-blue-light border border-blue/25"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Network Badge */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-tertiary border border-border-subtle">
            <div className="relative w-1.5 h-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green" />
              <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-green animate-ping opacity-75" />
            </div>
            <span className="text-[11px] font-medium text-text-secondary font-mono">
              {process.env.NEXT_PUBLIC_NETWORK === "base" ? "Base Mainnet" : "Base Sepolia"}
            </span>
          </div>
          <a
            href="https://github.com/aadi-joshi/operance"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-text-muted hover:text-text-secondary transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}
