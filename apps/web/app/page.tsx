'use client'
import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { connection, DEMO_ASSET_PDA } from '@/lib/solana'
import Link from 'next/link'

export default function Home() {
  const { publicKey } = useWallet()
  const [assetData, setAssetData] = useState<any>(null)

  useEffect(() => {
    connection.getAccountInfo(DEMO_ASSET_PDA).then(info => {
      if (info) setAssetData({ exists: true, lamports: info.lamports })
    })
  }, [])

  return (
    <main style={{ minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* NAV */}
      <nav style={{
        background: '#1C2E45', padding: '16px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ color: '#F7F9FB', fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>
          ⬡ MINEREAL
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link href="/explore" style={{ color: '#E8EDF2', textDecoration: 'none', fontSize: 14 }}>
            Explore
          </Link>
          {publicKey && (
            <Link href="/portfolio" style={{ color: '#E8EDF2', textDecoration: 'none', fontSize: 14 }}>
              Portfolio
            </Link>
          )}
          <WalletMultiButton style={{ background: '#2A4060', fontSize: 13 }} />
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        background: 'linear-gradient(135deg, #1C2E45 0%, #2A4060 100%)',
        padding: '80px 32px', textAlign: 'center', color: '#F7F9FB'
      }}>
        <div style={{
          display: 'inline-block', background: '#E6F2EC', color: '#1E5C35',
          fontSize: 12, fontWeight: 600, padding: '4px 12px',
          borderRadius: 4, marginBottom: 20, letterSpacing: 1
        }}>
          LIVE ON SOLANA DEVNET
        </div>
        <h1 style={{ fontSize: 48, fontWeight: 700, margin: '0 0 20px', lineHeight: 1.2 }}>
          Invest in Ukraine&apos;s<br />Mineral Future
        </h1>
        <p style={{ fontSize: 18, color: '#C8D8E8', maxWidth: 560, margin: '0 auto 40px' }}>
          Tokenized mining assets. Government-verified. Insurance-backed. From $10.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <Link href="/explore" style={{
            background: '#D4A843', color: '#1C2E45', padding: '14px 32px',
            borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 15
          }}>
            Explore Projects →
          </Link>
          <Link href="/explore" style={{
            background: 'transparent', color: '#E8EDF2', padding: '14px 32px',
            borderRadius: 8, textDecoration: 'none', fontSize: 15,
            border: '1px solid #4A6080'
          }}>
            List Your Asset
          </Link>
        </div>
      </section>

      {/* STATS */}
      <section style={{
        background: '#FFFFFF', padding: '40px 32px',
        display: 'flex', justifyContent: 'center', gap: 64, flexWrap: 'wrap'
      }}>
        {[
          { label: 'Verified Projects', value: assetData ? '1' : '...' },
          { label: 'On-chain Program', value: 'Devnet ✓' },
          { label: 'Min. Investment', value: '$10' },
          { label: 'Oracle Verifications', value: '3/3 ✓' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#1C2E45' }}>{s.value}</div>
            <div style={{ fontSize: 13, color: '#4A6080', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* DEMO PROJECT CARD */}
      <section style={{ padding: '60px 32px', maxWidth: 800, margin: '0 auto' }}>
        <h2 style={{ fontSize: 28, fontWeight: 600, color: '#1C2E45', marginBottom: 24 }}>
          Featured Project
        </h2>
        <div style={{
          background: '#FFFFFF', borderRadius: 16,
          border: '0.5px solid #E8EDF2', padding: 28,
          boxShadow: '0 2px 12px rgba(28,46,69,0.06)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#1C2E45' }}>
                Lithium Deposit — Kirovohrad Oblast
              </div>
              <div style={{ fontSize: 13, color: '#4A6080', marginTop: 4 }}>
                Class B + C &nbsp;·&nbsp; License KVH-2025-LI-0042 &nbsp;·&nbsp; Valid until 2031
              </div>
            </div>
            <span style={{
              background: '#E6F2EC', color: '#1E5C35', border: '1px solid #5A9E72',
              borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6, height: 'fit-content'
            }}>
              ● Green zone
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Token price', value: '$12.50' },
              { label: 'Est. yield', value: '8.4% APY' },
              { label: 'Reserves', value: '45,000 t' },
              { label: 'Min. invest', value: '$12.50' },
            ].map(m => (
              <div key={m.label} style={{ background: '#F7F9FB', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: '#4A6080', marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#1C2E45' }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* War risk */}
          <div style={{
            background: '#FAFAE6', border: '1px solid #B8B840',
            borderRadius: 10, padding: '12px 16px', marginBottom: 20
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#5A5A00' }}>
                ⚠ War Risk Monitor
              </span>
              <span style={{ fontSize: 13, color: '#5A5A00' }}>Yellow zone · 147 km</span>
            </div>
            <div style={{ background: '#F0F0C0', borderRadius: 3, height: 6, marginTop: 8 }}>
              <div style={{ width: '63%', background: '#B8B840', height: 6, borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 11, color: '#7A7A20', marginTop: 4 }}>
              Insurance active · Trading continues
            </div>
          </div>

          {/* Oracle verification */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ fontSize: 13, color: '#4A6080' }}>Oracle verifications</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: '#3A7A52' }} />
              ))}
              {[4,5].map(i => (
                <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: '#E8EDF2', border: '1px solid #C8D4DE' }} />
              ))}
              <span style={{ fontSize: 12, color: '#4A6080', marginLeft: 6 }}>3 / 5</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/explore/kvh-2025-li-0042" style={{
              flex: 1, background: '#1C2E45', color: '#F7F9FB',
              borderRadius: 10, padding: '12px 0', textAlign: 'center',
              textDecoration: 'none', fontWeight: 500, fontSize: 14
            }}>
              Invest now →
            </Link>
            <Link href="/explore/kvh-2025-li-0042" style={{
              background: '#F7F9FB', color: '#1C2E45',
              borderRadius: 10, padding: '12px 20px',
              textDecoration: 'none', fontSize: 14,
              border: '0.5px solid #E8EDF2'
            }}>
              Details
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        background: '#1C2E45', color: '#8AACC8',
        padding: '32px', textAlign: 'center', fontSize: 13, marginTop: 40
      }}>
        <div style={{ marginBottom: 8 }}>
          Minereal · Built on Solana · Colosseum Frontier Hackathon 2026
        </div>
        <div style={{ fontSize: 11, color: '#4A6080' }}>
          Devnet only · Not financial advice
        </div>
      </footer>
    </main>
  )
}
