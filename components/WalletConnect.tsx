'use client'

/**
 * WalletConnect — Veklom Agent Duel
 *
 * v0.4.0: Uses OnchainKit ConnectWallet component.
 * Replaces raw window.ethereum which fails on mobile (iOS Safari, Android Chrome)
 * where no wallet extension is injected.
 *
 * OnchainKit ConnectWallet uses Coinbase Smart Wallet via deep-link/QR
 * so it works on any mobile device without any extension installed.
 */

import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet'
import {
  Address,
  Avatar,
  Name,
  Identity,
} from '@coinbase/onchainkit/identity'
import { useAccount } from 'wagmi'
import { useEffect } from 'react'

export const VEKLOM_ID_WALLET = '0x3a74772e925b54F7dAD7FD95c9Ba30825033f970'

interface WalletConnectProps {
  onConnected?: (address: string) => void
}

export default function WalletConnect({ onConnected }: WalletConnectProps) {
  const { address, isConnected } = useAccount()

  useEffect(() => {
    if (isConnected && address) {
      onConnected?.(address)
    }
  }, [isConnected, address, onConnected])

  return (
    <Wallet>
      <ConnectWallet>
        <Avatar className="h-6 w-6" />
        <Name />
      </ConnectWallet>
      <WalletDropdown>
        <Identity hasCopyAddressOnClick>
          <Avatar />
          <Name />
          <Address />
        </Identity>
        <WalletDropdownDisconnect />
      </WalletDropdown>
    </Wallet>
  )
}
