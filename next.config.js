/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for x402 and Coinbase compatibility
  async headers() {
    return [
      {
        // Allow Base app to embed this as a Mini App
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.base.org https://*.farcaster.xyz https://warpcast.com"
          }
        ]
      },
      {
        // CORS for x402 payment endpoints
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,PAYMENT-SIGNATURE,PAYMENT-REQUIRED,X-SESSION-TOKEN' }
        ]
      },
      {
        // Serve farcaster.json with correct content-type
        source: '/.well-known/farcaster.json',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=3600' }
        ]
      }
    ]
  }
}

module.exports = nextConfig
