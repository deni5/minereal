'use client'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState } from 'react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { connection } from '@/lib/solana'
import Link from 'next/link'

export default function Nav({ active }: { active?: string }) {
  const { publicKey } = useWallet()
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    if (!publicKey) { setBalance(null); return }
    connection.getBalance(publicKey).then(bal => setBalance(bal / LAMPORTS_PER_SOL))
  }, [publicKey])

  return (
    <nav style={{
      background: '#1C2E45', padding: '16px 32px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      position: 'sticky', top: 0, zIndex: 100
    }}>
      <Link href="/" style={{ color: '#F7F9FB', fontSize: 20, fontWeight: 700, textDecoration: 'none', letterSpacing: 1 }}>
        ⬡ MINEREAL
      </Link>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <Link href="/explore" style={{ color: active === 'explore' ? '#D4A843' : '#E8EDF2', textDecoration: 'none', fontSize: 14, fontWeight: active === 'explore' ? 500 : 400 }}>
          Explore
        </Link>
        <Link href="/portfolio" style={{ color: active === 'portfolio' ? '#D4A843' : '#E8EDF2', textDecoration: 'none', fontSize: 14, fontWeight: active === 'portfolio' ? 500 : 400 }}>
          Portfolio
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {publicKey && balance !== null && (
            <div style={{
              background: '#2A4060', borderRadius: 8,
              padding: '6px 12px', fontSize: 12, color: '#E8EDF2',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-end'
            }}>
              <span style={{ color: '#D4A843', fontWeight: 600 }}>{balance.toFixed(3)} SOL</span>
              <span style={{ color: '#8AACC8', fontSize: 11 }}>
                {publicKey.toBase58().slice(0,4)}...{publicKey.toBase58().slice(-4)}
              </span>
            </div>
          )}
          <WalletMultiButton style={{
            background: publicKey ? '#3A6040' : '#2A4060',
            fontSize: 13, height: 36, borderRadius: 8
          }} />
        </div>
      </div>
    </nav>
  )
}
