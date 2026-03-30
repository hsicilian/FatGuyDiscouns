import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@fatguydiscounts/core",
    "@fatguydiscounts/db",
    "@fatguydiscounts/types",
    "@fatguydiscounts/ui",
  ],
};

export default nextConfig;

