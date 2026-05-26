/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@kavra/db', '@kavra/shared'],
  typescript: {
    // typecheck pnpm typecheck ile ayrı koşuyor; React 18/19 type
    // merging Next.js build'de patlayabiliyor.
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
