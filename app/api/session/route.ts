/**
 * x402 Payment-Gated Session Endpoint
 *
 * Flow:
 * 1. Client hits GET /api/session
 * 2. If no valid PAYMENT-SIGNATURE header → respond 402 with payment requirements
 * 3. Client signs payment using Base wallet + x402-fetch
 * 4. Client retries with PAYMENT-SIGNATURE header
 * 5. This route verifies via x402 facilitator
 * 6. On success → issue short-lived session token + return game session
 *
 * See AGENT_NOTES.md for full flow diagram.
 * Docs: https://docs.cdp.coinbase.com/x402
 */

import { NextRequest, NextResponse } from 'next/server'

const PAYMENT_AMOUNT = process.env.X402_PAYMENT_AMOUNT_USDC || '0.10'
const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator'
const RESOURCE_URL = process.env.X402_RESOURCE_URL || 'https://duel.veklom.com/api/session'

// Payment requirements object (sent on 402)
function buildPaymentRequired() {
  return {
    x402Version: 1,
    accepts: [
      {
        scheme: 'exact',
        network: 'base-mainnet',
        maxAmountRequired: (parseFloat(PAYMENT_AMOUNT) * 1_000_000).toString(), // USDC 6 decimals
        resource: RESOURCE_URL,
        description: 'Veklom Agent Duel — Game Session Access',
        mimeType: 'application/json',
        payTo: process.env.VEKLOM_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000',
        maxTimeoutSeconds: 300,
        asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base mainnet
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

  // Step 2: No payment signature — return 402
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

  // Step 5: Verify payment via x402 facilitator
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

    // Settle payment via facilitator
    await fetch(`${FACILITATOR_URL}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentHeader, resource: RESOURCE_URL })
    })

    // Step 6: Issue session token (simple signed timestamp — replace with JWT in production)
    const sessionToken = Buffer.from(
      JSON.stringify({ ts: Date.now(), exp: Date.now() + 30 * 60 * 1000 })
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
