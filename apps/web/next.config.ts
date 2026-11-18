import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: [
    "@fatguydiscounts/core",
    "@fatguydiscounts/db",
    "@fatguydiscounts/types",
    "@fatguydiscounts/ui",
  ],
};

export default nextConfig;

