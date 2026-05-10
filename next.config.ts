import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // unpdf bundles its own pdfjs-dist (serverless build) and works fine in
  // the bundle, so no serverExternalPackages entry is needed for it.
};

export default nextConfig;
