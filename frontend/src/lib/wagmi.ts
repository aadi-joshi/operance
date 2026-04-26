import { createConfig, http } from "wagmi";
import { baseSepolia, base } from "viem/chains";
import { coinbaseWallet, metaMask } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [baseSepolia, base],
  connectors: [
    coinbaseWallet({ appName: "Operance", appLogoUrl: "/operance.png" }),
    metaMask(),
  ],
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
