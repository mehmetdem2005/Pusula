/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@kavra/db', '@kavra/shared'],
  experimental: {
    typedRoutes: true,
  },
}

module.exports = nextConfig
