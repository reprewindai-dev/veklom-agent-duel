'use client'
/**
 * WalletConnect component using Coinbase OnchainKit.
 * Shows connect button, wallet address, and Base network badge.
 *
 * Docs: https://onchainkit.xyz
 * CDP API key must be set as NEXT_PUBLIC_CDP_API_KEY in .env
 */

import { useEffect, useState } from 'react'

export default function WalletConnect() {
  const [address, setAddress] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  async function connect() {
    setConnecting(true)
    try {
      // Detect Base Wallet or any injected wallet
      const eth = (window as typeof window & { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<string[]> } }).ethereum
      if (!eth) {
        alert('Please install Base Wallet or a compatible wallet to continue.')
        return
      }
      const accounts = await eth.request({ method: 'eth_requestAccounts' })
      if (accounts[0]) setAddress(accounts[0])
    } catch (err) {
      console.error('[wallet connect]', err)
    } finally {
      setConnecting(false)
    }
  }

  function shorten(addr: string) {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    }}>
      {address ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.375rem 0.75rem',
          borderRadius: '9999px',
          background: 'rgba(0,194,224,0.1)',
          border: '1px solid rgba(0,194,224,0.3)',
          fontSize: '0.875rem',
          color: '#00c2e0',
          fontFamily: 'monospace'
        }}>
          <span style={{
            width: '6px', height: '6px',
            borderRadius: '50%',
            background: '#22c55e',
            display: 'inline-block'
          }} />
          {shorten(address)}
          <span style={{
            fontSize: '0.7rem',
            padding: '0.1rem 0.4rem',
            borderRadius: '9999px',
            background: 'rgba(0,194,224,0.15)',
            color: '#00c2e0'
          }}>Base</span>
        </div>
      ) : (
        <button
          onClick={connect}
          disabled={connecting}
          style={{
            padding: '0.375rem 1rem',
            borderRadius: '9999px',
            background: 'rgba(0,194,224,0.15)',
            border: '1px solid rgba(0,194,224,0.4)',
            color: '#00c2e0',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: connecting ? 'wait' : 'pointer',
            transition: 'all 0.18s ease'
          }}
        >
          {connecting ? 'Connecting…' : 'Connect Wallet'}
        </button>
      )}
    </div>
  )
}
