import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // This app is fully authenticated and reads cookies/user data on every
  // route, so there's nothing to statically prerender — Cache Components
  // (Next 16's opt-in PPR successor) would just add friction here.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
