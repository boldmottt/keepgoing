/** @type {import('next').NextConfig} */
const nextConfig = {
  // 정적 호스팅(Firebase Hosting 등)을 위한 정적 익스포트.
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

module.exports = nextConfig;
