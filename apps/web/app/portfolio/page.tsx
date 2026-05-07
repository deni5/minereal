'use client'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Link from 'next/link'

const DEMO_HOLDINGS = [
  {
    name: 'Lithium Deposit — Kirovohrad',
    license: 'KVH-2025-LI-0042',
    tokens: 4,
    priceUSD: 12.50,
    yieldBps: 840,
    warZone: 'Yellow',
    assetPDA: 'HDcgREwSRYvWLq4HfFaDid76t1z1BghHFHz9f4Awmvd6',
  }
]

export default function PortfolioPage() {
  const { publicKey } = useWallet()

  const totalValue = DEMO_HOLDINGS.reduce((s, h) => s + h.tokens * h.priceUSD, 0)
  const monthlyRoyalty = DEMO_HOLDINGS.reduce((s, h) =>
    s + (h.tokens * h.priceUSD * h.yieldBps / 10000 / 12), 0)

  return (
    <main style={{ minHeight: '100vh', background: '#F7F9FB', fontFamily: 'Inter, sans-serif' }}>
      <nav style={{
        background: '#1C2E45', padding: '16px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <Link href="/" style={{ color: '#F7F9FB', fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>
          ⬡ MINEREAL
        </Link>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link href="/explore" style={{ color: '#E8EDF2', textDecoration: 'none', fontSize: 14 }}>Explore</Link>
          <Link href="/portfolio" style={{ color: '#D4A843', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Portfolio</Link>
          <WalletMultiButton style={{ background: '#2A4060', fontSize: 13 }} />
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C2E45', marginBottom: 32 }}>
          My Portfolio
        </h1>

        {!publicKey ? (
          <div style={{
            background: '#FFFFFF', borderRadius: 16, padding: 48,
            textAlign: 'center', border: '0.5px solid #E8EDF2'
          }}>
            <div style={{ fontSize: 16, color: '#4A6080', marginBottom: 20 }}>
              Connect your wallet to view your holdings
            </div>
            <WalletMultiButton style={{ background: '#1C2E45', fontSize: 14 }} />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
              {[
                { label: 'Portfolio value', value: `$${totalValue.toFixed(2)}`, sub: 'USDC', color: '#1C2E45' },
                { label: 'Monthly royalty', value: `$${monthlyRoyalty.toFixed(2)}`, sub: 'Paid automatically', color: '#1E5C35' },
                { label: 'Active projects', value: `${DEMO_HOLDINGS.length}`, sub: 'All verified', color: '#1C2E45' },
              ].map(s => (
                <div key={s.label} style={{
                  background: '#FFFFFF', borderRadius: 12, padding: '20px 24px',
                  border: '0.5px solid #E8EDF2'
                }}>
                  <div style={{ fontSize: 12, color: '#4A6080', marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: '#8AACC8', marginTop: 4 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Holdings */}
            <div style={{ background: '#FFFFFF', borderRadius: 16, border: '0.5px solid #E8EDF2', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '0.5px solid #E8EDF2' }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#1C2E45' }}>Holdings</div>
              </div>
              {DEMO_HOLDINGS.map(h => (
                <div key={h.license} style={{ padding: '20px 24px', borderBottom: '0.5px solid #F0F2F5' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#1C2E45', marginBottom: 4 }}>{h.name}</div>
                      <div style={{ fontSize: 12, color: '#4A6080' }}>
                        {h.tokens} tokens · ${h.priceUSD}/token · {h.yieldBps/100}% APY
                      </div>
                      <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#8AACC8', marginTop: 4 }}>
                        {h.assetPDA.slice(0,20)}...
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#1C2E45' }}>
                        ${(h.tokens * h.priceUSD).toFixed(2)}
                      </div>
                      <div style={{ fontSize: 12, color: '#3A7A52' }}>
                        +${(h.tokens * h.priceUSD * h.yieldBps / 10000 / 12).toFixed(2)}/mo royalty
                      </div>
                      <span style={{
                        display: 'inline-block', marginTop: 6,
                        background: '#FAFAE6', color: '#5A5A00',
                        border: '1px solid #B8B840', borderRadius: 12,
                        padding: '2px 10px', fontSize: 11
                      }}>
                        ● {h.warZone} zone
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Wallet info */}
            <div style={{ marginTop: 20, fontSize: 12, color: '#8AACC8', textAlign: 'center' }}>
              Wallet: {publicKey.toBase58().slice(0,8)}...{publicKey.toBase58().slice(-8)} · Solana Devnet
            </div>
          </>
        )}
      </div>
    </main>
  )
}
