import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Veklom Agent Duel',
  description: 'Back an agent, watch the route climb, and time your exit before the round flips.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://duel.veklom.com'),
  openGraph: {
    title: 'Veklom Agent Duel',
    description: 'Back an agent, watch the route, and time your exit.',
    url: 'https://duel.veklom.com',
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
  // Base Mini App frame metadata
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://duel.veklom.com/og.png',
    'fc:frame:button:1': 'Back Vector North',
    'fc:frame:button:2': 'Back Quiet Switch',
    'fc:frame:post_url': 'https://duel.veklom.com/api/frame'
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
      <body>{children}</body>
    </html>
  )
}
