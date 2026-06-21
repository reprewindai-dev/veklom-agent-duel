/**
 * Farcaster Frame Handler
 * Handles POST interactions from Base / Farcaster Mini App embeds.
 * When a user clicks a frame button, this endpoint receives the action
 * and can respond with a new frame state.
 *
 * Docs: https://docs.base.org/mini-apps
 */
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const buttonIndex = body?.untrustedData?.buttonIndex || 1
  const agentPicked = buttonIndex === 1 ? 'Vector North' : 'Quiet Switch'

  // Simple 50/50 round result
  const won = Math.random() > 0.5
  const resultText = won
    ? `✅ ${agentPicked} won the route. Route confirmed.`
    : `❌ ${agentPicked} was hijacked. Route collapsed.`

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://duel.veklom.com'

  // Respond with a new Farcaster frame
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${appUrl}/og.png" />
        <meta property="fc:frame:button:1" content="Back Vector North" />
        <meta property="fc:frame:button:2" content="Back Quiet Switch" />
        <meta property="fc:frame:button:3" content="Play Full Game" />
        <meta property="fc:frame:button:3:action" content="link" />
        <meta property="fc:frame:button:3:target" content="${appUrl}" />
        <meta property="fc:frame:post_url" content="${appUrl}/api/frame" />
        <meta property="og:title" content="${resultText}" />
      </head>
      <body>${resultText}</body>
    </html>
  `

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' }
  })
}
