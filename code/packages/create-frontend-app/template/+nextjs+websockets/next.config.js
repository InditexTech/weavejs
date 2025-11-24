const nextConfig = {
  output: "standalone",
  reactStrictMode: false,
  webpack: (config) => {
    if (process.env.WEAVE_KONVA_PATH) {
      config.resolve.alias = {
        ...config.resolve.alias,
        konva: process.env.WEAVE_KONVA_PATH,
      };
    }
    if (process.env.WEAVE_YJS_PATH) {
      config.resolve.alias = {
        ...config.resolve.alias,
        yjs: process.env.WEAVE_YJS_PATH,
      };
    }
    config.externals = [...config.externals, { canvas: "canvas" }]; // required to make Konva work
    return config;
  },
  experimental: {
    proxyTimeout: 60000 * 5,
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/weavebff/:path*",
          destination: `${process.env.BACKEND_ENDPOINT}/:path*`, // Proxy to Backend
        },
      ],
    };
  },
  headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
    ];
  },
  images: {
    localPatterns: [
      {
        pathname: "/assets/images/**",
        search: "",
      },
      {
        pathname: "/weavebff/api/v1/weavejs/rooms/**/images/**",
        search: "",
      },
    ],
  },
};

module.exports = nextConfig;
