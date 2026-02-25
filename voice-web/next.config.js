const backendUrl = process.env.VOICE_API_URL || 'http://localhost:8081';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/tts/:path*',
        destination: `${backendUrl}/api/tts/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
