'use client'

import { useEffect, useState } from 'react'

// Veklom identity wallet — used for Base App session verification
const VEKLOM_ID_WALLET = '0x3a74772e925b54F7dAD7FD95c9Ba30825033f970'
// Base Mainnet
const BASE_CHAIN_ID = '0x2105' // 8453 in hex

type Eth = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on: (event: string, handler: (...args: unknown[]) => void) => void
}

export default function WalletConnect({ onConnected }: { onConnected?: (address: string) => void }) {
  const [address, setAddress] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [chainOk, setChainOk] = useState(true)

  function getEth(): Eth | null {
    return ((window as unknown as { ethereum?: Eth }).ethereum) ?? null
  }

  async function switchToBase(eth: Eth) {
    try {
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: BASE_CHAIN_ID }] })
    } catch {
      // Chain not added yet — add Base Mainnet
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: BASE_CHAIN_ID,
          chainName: 'Base',
          nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://mainnet.base.org'],
          blockExplorerUrls: ['https://basescan.org']
        }]
      })
    }
  }

  async function connect() {
    setConnecting(true)
    try {
      const eth = getEth()
      if (!eth) {
        alert('Please install Base Wallet or a compatible wallet to continue.')
        return
      }
      // Request accounts
      const accounts = await eth.request({ method: 'eth_requestAccounts' }) as string[]
      const addr = accounts[0]
      if (!addr) return

      // Enforce Base Mainnet
      const chainId = await eth.request({ method: 'eth_chainId' }) as string
      if (chainId !== BASE_CHAIN_ID) {
        await switchToBase(eth)
      }
      setChainOk(true)
      setAddress(addr)
      onConnected?.(addr)
    } catch (err) {
      console.error('[wallet connect]', err)
    } finally {
      setConnecting(false)
    }
  }

  // Listen for account/chain changes
  useEffect(() => {
    const eth = getEth()
    if (!eth) return
    eth.on('accountsChanged', (accounts: unknown) => {
      const list = accounts as string[]
      setAddress(list[0] ?? null)
      if (list[0]) onConnected?.(list[0])
    })
    eth.on('chainChanged', (chainId: unknown) => {
      setChainOk(chainId === BASE_CHAIN_ID)
    })
  }, [])

  function shorten(addr: string) {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      {!chainOk && address && (
        <button
          onClick={() => { const eth = getEth(); if (eth) switchToBase(eth) }}
          style={{
            padding: '0.375rem 0.75rem',
            borderRadius: '9999px',
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.4)',
            color: '#ef4444',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Switch to Base
        </button>
      )}
      {address ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.375rem 0.75rem', borderRadius: '9999px',
          background: 'rgba(0,194,224,0.1)', border: '1px solid rgba(0,194,224,0.3)',
          fontSize: '0.875rem', color: '#00c2e0', fontFamily: 'monospace'
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          {shorten(address)}
          <span style={{
            fontSize: '0.7rem', padding: '0.1rem 0.4rem',
            borderRadius: '9999px', background: 'rgba(0,194,224,0.15)', color: '#00c2e0'
          }}>Base</span>
        </div>
      ) : (
        <button
          onClick={connect}
          disabled={connecting}
          style={{
            padding: '0.375rem 1rem', borderRadius: '9999px',
            background: 'rgba(0,194,224,0.15)', border: '1px solid rgba(0,194,224,0.4)',
            color: '#00c2e0', fontSize: '0.875rem', fontWeight: 600,
            cursor: connecting ? 'wait' : 'pointer', transition: 'all 0.18s ease'
          }}
        >
          {connecting ? 'Connecting…' : 'Connect Wallet'}
        </button>
      )}
    </div>
  )
}

export { VEKLOM_ID_WALLET }
