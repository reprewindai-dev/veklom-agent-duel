import { createHash, createHmac, randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const PAYMENT_AMOUNT = process.env.X402_PAYMENT_AMOUNT_USDC || '0.10'
const FACILITATOR_URL = (process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator').replace(/\/$/, '')
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://duel.veklom.com').replace(/\/$/, '')
const RESOURCE_URL = `${APP_URL}/api/session`

function paymentWallet(): string {
  return (process.env.X402_PAYMENT_ADDRESS || '').trim()
}

function sessionSecret(): string {
  return (process.env.SESSION_SECRET || '').trim()
}

function buildPaymentRequired() {
  const payTo = paymentWallet()
  if (!payTo) throw new Error('X402_PAYMENT_ADDRESS is not configured')

  return {
    x402Version: 2,
    resource: {
      url: RESOURCE_URL,
      description: 'Veklom Agent Duel — session access',
      mimeType: 'application/json',
    },
    accepts: [{
      scheme: 'exact',
      network: 'eip155:8453',
      amount: Math.round(Number(PAYMENT_AMOUNT) * 1_000_000).toString(),
      asset: USDC_BASE,
      payTo,
      maxTimeoutSeconds: 300,
      extra: { name: 'USD Coin', version: '2' },
    }],
    error: 'Payment required to create an Agent Duel session',
  }
}

function signSession(payload: Record<string, unknown>): string {
  const secret = sessionSecret()
  if (!secret) throw new Error('SESSION_SECRET is not configured')
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url')
  return `${encoded}.${signature}`
}

async function readJson(response: Response) {
  const text = await response.text()
  if (!text) return null
  try { return JSON.parse(text) } catch { return { raw: text } }
}

export async function GET(req: NextRequest) {
  if (!paymentWallet() || !sessionSecret()) {
    return NextResponse.json({ error: 'Agent Duel payment/session configuration is incomplete' }, { status: 503 })
  }

  const paymentHeader = req.headers.get('X-PAYMENT') || req.headers.get('PAYMENT-SIGNATURE')
  if (!paymentHeader) {
    try {
      const paymentRequired = buildPaymentRequired()
      return NextResponse.json(paymentRequired, {
        status: 402,
        headers: { 'PAYMENT-REQUIRED': Buffer.from(JSON.stringify(paymentRequired)).toString('base64') },
      })
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
  }

  try {
    const requirements = buildPaymentRequired()
    const verifyRes = await fetch(`${FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x402Version: 2, paymentPayload: paymentHeader, paymentRequirements: requirements.accepts[0] }),
      cache: 'no-store',
    })
    const verifyBody = await readJson(verifyRes)
    if (!verifyRes.ok || verifyBody?.isValid === false || verifyBody?.valid === false) {
      return NextResponse.json({ error: 'Payment verification failed', detail: verifyBody }, { status: 402 })
    }

    const settleRes = await fetch(`${FACILITATOR_URL}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x402Version: 2, paymentPayload: paymentHeader, paymentRequirements: requirements.accepts[0] }),
      cache: 'no-store',
    })
    const settleBody = await readJson(settleRes)
    if (!settleRes.ok || settleBody?.success === false) {
      return NextResponse.json({ error: 'Payment settlement failed', detail: settleBody }, { status: 402 })
    }

    const now = Date.now()
    const paymentProofHash = createHash('sha256').update(paymentHeader).digest('hex')
    const sessionId = randomUUID()
    const sessionToken = signSession({
      sid: sessionId,
      iat: now,
      exp: now + 30 * 60 * 1000,
      resource: RESOURCE_URL,
      paymentProofHash,
    })

    return NextResponse.json({
      session: sessionToken,
      sessionId,
      expiresIn: 1800,
      paymentVerified: true,
      settlement: settleBody,
    }, {
      status: 200,
      headers: {
        'X-SESSION-TOKEN': sessionToken,
        'X-PAYMENT-VERIFIED': 'true',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('[agent-duel x402 session]', error)
    return NextResponse.json({ error: 'Payment/session service unavailable', detail: error?.message }, { status: 502 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, PAYMENT-SIGNATURE, X-PAYMENT',
    },
  })
}
