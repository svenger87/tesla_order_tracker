import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    optimizePackageImports: ['recharts', 'framer-motion', 'lucide-react', 'date-fns', 'radix-ui'],
  },
};

export default withNextIntl(nextConfig);
