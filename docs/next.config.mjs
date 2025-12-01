import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  basePath: "/weavejs",
  output: "export",
  distDir: "dist",
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    dirs: ["app", "components", "content", "layouts", "lib", "src"],
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/weavejs",
        basePath: false,
        permanent: false,
      },
    ];
  },
};

export default withMDX(config);
