import type { Metadata } from 'next'
import './globals.css'
import '@coinbase/onchainkit/styles.css'
import { Providers } from './providers'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://veklom-agent-duel.vercel.app'

const miniAppEmbed = {
  version: '1',
  imageUrl: `${APP_URL}/og.png`,
  button: {
    title: 'Play Agent Duel',
    action: {
      type: 'launch_miniapp',
      name: 'Veklom Agent Duel',
      url: APP_URL,
      splashImageUrl: `${APP_URL}/splash.png`,
      splashBackgroundColor: '#050609'
    }
  }
}

export const metadata: Metadata = {
  title: 'Veklom Agent Duel',
  description: 'Back an agent, watch the route climb, and time your exit before the round flips.',
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: 'Veklom Agent Duel',
    description: 'Back an agent, watch the route, and time your exit.',
    url: APP_URL,
    siteName: 'Veklom',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Veklom Agent Duel' }],
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Veklom Agent Duel',
    description: 'Pick a side. Time the exit.',
    images: ['/og.png']
  },
  other: {
    'base:app_id': '6a387f28f557b72339a86f7d',
    'fc:miniapp': JSON.stringify(miniAppEmbed),
    'fc:frame': 'vNext',
    'fc:frame:image': `${APP_URL}/og.png`,
    'fc:frame:button:1': 'Back Vector North',
    'fc:frame:button:2': 'Back Quiet Switch',
    'fc:frame:post_url': `${APP_URL}/api/frame`
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&f[]=cabinet-grotesk@800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
