/** @type {import('next').NextConfig} */
const backendUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

const nextConfig = {
  // Allow the backend's 15 MiB file limit plus multipart headers.
  experimental: {
    proxyClientMaxBodySize: '16mb',
    proxyTimeout: 120_000,
  },
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;

