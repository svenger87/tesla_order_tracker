import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@libsql/client",
    "@prisma/adapter-libsql",
  ],
};

export default nextConfig;
