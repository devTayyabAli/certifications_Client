import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/siherdefi",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.mypinata.cloud",
      },
      {
        protocol: "https",
        hostname: "ipfs.io",
      },
    ],
  },
  turbopack: {},
  webpack: (config, { webpack }) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@x402/,
      })
    );
    return config;
  },
  async redirects() {
    return [
      // Link previews and older browsers ask for /favicon.ico at the site root,
      // outside the basePath (a rewrite can't leave the basePath)
      {
        source: "/favicon.ico",
        destination: "/siherdefi/favicon.ico",
        basePath: false,
        permanent: true,
      },
      {
        source: "/",
        destination: "/siherdefi",
        basePath: false,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
