import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "scqqqfwlbffevsbvrpmt.supabase.co",
      },
    ],
  },
};

export default nextConfig;