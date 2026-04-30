/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // The composoft registry packages live in the workspace; transpile them.
    externalDir: true,
  },
  transpilePackages: ["@composoft/runtime", "@composoft/spec"],
};
export default nextConfig;
