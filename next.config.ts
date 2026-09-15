import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  output: "standalone",
  serverExternalPackages: ["@node-rs/argon2", "adm-zip", "better-sqlite3"],
};

export default nextConfig;
