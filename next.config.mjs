/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['exceljs', 'xlsx'],
};

export default nextConfig;
