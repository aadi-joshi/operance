/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK || "base-sepolia",
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || "84532",
    NEXT_PUBLIC_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || "",
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
