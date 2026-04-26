"use client";

import { useAccount, useConnect, useDisconnect, useReadContract, useSwitchChain } from "wagmi";
import { coinbaseWallet } from "wagmi/connectors";
import { erc20Abi, formatUnits } from "viem";
import { baseSepolia, base } from "viem/chains";
import { useState, useRef, useEffect } from "react";
import { Wallet, LogOut, ChevronDown, ExternalLink, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { truncateAddress } from "@/lib/api";

const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  [baseSepolia.id]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  [base.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};

const TARGET_CHAIN_ID = (parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532")) as 84532 | 8453;
const EXPLORER = TARGET_CHAIN_ID === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org";

export function WalletButton() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const usdcAddress = chain?.id ? USDC_ADDRESSES[chain.id] : USDC_ADDRESSES[TARGET_CHAIN_ID];
  const onWrongNetwork = isConnected && chain?.id !== TARGET_CHAIN_ID;

  const { data: rawBalance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!usdcAddress },
  });

  const balance = rawBalance !== undefined
    ? parseFloat(formatUnits(rawBalance as bigint, 6)).toFixed(2)
    : null;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: connectors[0] })}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-blue/40 bg-blue/10 text-blue hover:bg-blue/20 hover:border-blue/60 transition-all"
      >
        <Wallet size={13} />
        Connect
      </button>
    );
  }

  if (onWrongNetwork) {
    return (
      <button
        onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-yellow-500/40 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-all"
      >
        <AlertTriangle size={13} />
        Wrong network
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] border border-border-default bg-bg-tertiary hover:bg-bg-hover transition-all"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-green flex-shrink-0" />
        <span className="text-text-secondary font-mono">{truncateAddress(address!)}</span>
        {balance && (
          <span className="text-green font-semibold tabular-nums font-mono">${balance}</span>
        )}
        <ChevronDown
          size={11}
          className={clsx("text-text-muted transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-border-default bg-bg-card shadow-xl z-50 overflow-hidden">
          <div className="p-3.5 border-b border-border-subtle">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green" />
              <span className="text-[11px] text-text-muted">{chain?.name}</span>
            </div>
            <div className="font-mono text-[11px] text-text-secondary break-all leading-relaxed">
              {address}
            </div>
            {balance && (
              <div className="mt-2.5 flex items-baseline gap-1">
                <span className="text-[16px] font-bold text-text-primary font-mono">${balance}</span>
                <span className="text-[11px] text-text-muted">USDC</span>
              </div>
            )}
          </div>
          <div className="p-1.5 space-y-0.5">
            <a
              href={`${EXPLORER}/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-all"
            >
              <ExternalLink size={12} />
              View on Basescan
            </a>
            <button
              onClick={() => { disconnect(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-red/70 hover:bg-red/8 hover:text-red transition-all"
            >
              <LogOut size={12} />
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
