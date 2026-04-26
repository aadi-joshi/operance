/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK || "base-sepolia",
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || "84532",
    NEXT_PUBLIC_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || "",
    NEXT_PUBLIC_ORCHESTRATOR_ADDRESS:
      process.env.NEXT_PUBLIC_ORCHESTRATOR_ADDRESS ||
      "0xDDB7B29F0128fe45E8Ef571e7F85E1588bf7c221",
  },
  // Proxy /backend/* to EC2 so Vercel (HTTPS) doesn't block calls to the HTTP backend
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: "http://52.204.254.189/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
