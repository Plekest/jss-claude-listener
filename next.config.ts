import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_HIGHLIGHTED_BRAND: process.env.HIGHLIGHTED_BRAND ?? "Jspreadsheet",
  },
};

export default nextConfig;
