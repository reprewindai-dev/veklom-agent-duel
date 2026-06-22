/**
 * x402 Payment-Gated Session Endpoint
 * Payments route to Veklom.com production wallet: 0xCC34553b4e6332ffb9C1b61E22436ACA53113D1d
 * Identity verified against Veklom ID wallet: 0x3a74772e925b54F7dAD7FD95c9Ba30825033f970
 * Base App ID: 6a387f28f557b72339a86f7d
 */

import { NextRequest, NextResponse } from 'next/server'

// Veklom.com production payment wallet (x402 wager payments flow here)
const PAYMENT_WALLET = '0xCC34553b4e6332ffb9C1b61E22436ACA53113D1d'
// USDC on Base Mainnet
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

const PAYMENT_AMOUNT = process.env.X402_PAYMENT_AMOUNT_USDC || '0.10'
const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://veklom-agent-duel.vercel.app'
const RESOURCE_URL = `${APP_URL}/api/session`

function buildPaymentRequired() {
  return {
    x402Version: 1,
    accepts: [
      {
        scheme: 'exact',
        network: 'base-mainnet',
        maxAmountRequired: (parseFloat(PAYMENT_AMOUNT) * 1_000_000).toString(),
        resource: RESOURCE_URL,
        description: 'Veklom Agent Duel — Game Session Access',
        mimeType: 'application/json',
        payTo: PAYMENT_WALLET,
        maxTimeoutSeconds: 300,
        asset: USDC_BASE,
        extra: {
          name: 'Veklom Agent Duel',
          version: '1'
        }
      }
    ],
    error: 'Payment required to access a game session'
  }
}

export async function GET(req: NextRequest) {
  const paymentHeader = req.headers.get('PAYMENT-SIGNATURE') || req.headers.get('X-PAYMENT')

  if (!paymentHeader) {
    const paymentRequired = buildPaymentRequired()
    return new NextResponse(
      JSON.stringify(paymentRequired),
      {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'PAYMENT-REQUIRED': JSON.stringify(paymentRequired)
        }
      }
    )
  }

  try {
    const verifyRes = await fetch(`${FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x402Version: 1,
        paymentHeader,
        resource: RESOURCE_URL
      })
    })

    if (!verifyRes.ok) {
      const err = await verifyRes.json().catch(() => ({}))
      return NextResponse.json({ error: 'Payment verification failed', detail: err }, { status: 402 })
    }

    await fetch(`${FACILITATOR_URL}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentHeader, resource: RESOURCE_URL })
    })

    const sessionToken = Buffer.from(
      JSON.stringify({ ts: Date.now(), exp: Date.now() + 30 * 60 * 1000, wallet: PAYMENT_WALLET })
    ).toString('base64')

    return NextResponse.json(
      {
        session: sessionToken,
        expiresIn: 1800,
        message: 'Session granted. Good luck in the duel.'
      },
      {
        status: 200,
        headers: {
          'PAYMENT-RESPONSE': JSON.stringify({ success: true }),
          'X-SESSION-TOKEN': sessionToken
        }
      }
    )
  } catch (err) {
    console.error('[x402 session]', err)
    return NextResponse.json({ error: 'Internal error during payment verification' }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, PAYMENT-SIGNATURE, X-PAYMENT'
    }
  })
}
