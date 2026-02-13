import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@libsql/client",
  ],
};

export default nextConfig;
