"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { baseSepolia, base } from "viem/chains";
import { useState } from "react";

const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532");
const chain = chainId === 8453 ? base : baseSepolia;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <OnchainKitProvider
        apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY || ""}
        chain={chain}
      >
        {children}
      </OnchainKitProvider>
    </QueryClientProvider>
  );
}
