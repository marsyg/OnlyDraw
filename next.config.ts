import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      yjs: path.resolve(__dirname, "node_modules/yjs"),
    };
    return config;
  },
};

export default nextConfig;

