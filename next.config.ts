import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@node-rs/argon2", "adm-zip", "better-sqlite3"],
};

export default nextConfig;
