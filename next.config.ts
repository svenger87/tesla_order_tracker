import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@libsql/client",
    "@prisma/adapter-libsql",
    "@prisma/client",
  ],
};

export default nextConfig;
