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
