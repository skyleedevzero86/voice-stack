const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/tts/:path*',
        destination: 'http://localhost:8081/api/tts/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
