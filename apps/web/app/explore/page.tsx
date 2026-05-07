'use client'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Link from 'next/link'
import { useState } from 'react'

const DEMO_PROJECT = {
  id: 'kvh-2025-li-0042',
  name: 'Lithium Deposit — Kirovohrad Oblast',
  license: 'KVH-2025-LI-0042',
  mineral: 'Lithium',
  assetPDA: 'HDcgREwSRYvWLq4HfFaDid76t1z1BghHFHz9f4Awmvd6',
  price: 12.50,
  yield: 8.4,
  reserves: '45,000 t',
  supply: 10000,
  sold: 2847,
  warZone: 'Yellow',
  frontlineKm: 147,
  oracleVotes: 3,
  status: 'Listed',
  licenseValid: '2031',
  classes: 'B + C',
}

export default function ExplorePage() {
  const { publicKey } = useWallet()
  const [amount, setAmount] = useState(4)
  const [buying, setBuying] = useState(false)
  const [bought, setBought] = useState(false)

  const totalCost = (amount * DEMO_PROJECT.price).toFixed(2)
  const soldPct = Math.round((DEMO_PROJECT.sold / DEMO_PROJECT.supply) * 100)

  async function handleBuy() {
    if (!publicKey) return
    setBuying(true)
    await new Promise(r => setTimeout(r, 2000))
    setBuying(false)
    setBought(true)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F7F9FB', fontFamily: 'Inter, sans-serif' }}>
      {/* NAV */}
      <nav style={{
        background: '#1C2E45', padding: '16px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <Link href="/" style={{ color: '#F7F9FB', fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>
          ⬡ MINEREAL
        </Link>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link href="/explore" style={{ color: '#D4A843', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Explore</Link>
          <Link href="/portfolio" style={{ color: '#E8EDF2', textDecoration: 'none', fontSize: 14 }}>Portfolio</Link>
          <WalletMultiButton style={{ background: '#2A4060', fontSize: 13 }} />
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1C2E45', margin: '0 0 8px' }}>
            Explore Projects
          </h1>
          <p style={{ color: '#4A6080', fontSize: 14, margin: 0 }}>
            Government-verified mineral assets on Solana Devnet
          </p>
        </div>

        {/* PROJECT DETAIL CARD */}
        <div style={{
          background: '#FFFFFF', borderRadius: 16,
          border: '0.5px solid #E8EDF2', padding: 32,
          boxShadow: '0 2px 16px rgba(28,46,69,0.07)'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1C2E45', marginBottom: 6 }}>
                {DEMO_PROJECT.name}
              </div>
              <div style={{ fontSize: 13, color: '#4A6080' }}>
                Class {DEMO_PROJECT.classes} &nbsp;·&nbsp; License {DEMO_PROJECT.license} &nbsp;·&nbsp; Valid until {DEMO_PROJECT.licenseValid}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{
                background: '#E6F2EC', color: '#1E5C35', border: '1px solid #5A9E72',
                borderRadius: 20, padding: '5px 14px', fontSize: 13, fontWeight: 500
              }}>● Green zone</span>
              <span style={{
                background: '#E8EDF2', color: '#1C2E45',
                borderRadius: 20, padding: '5px 14px', fontSize: 13, fontWeight: 500
              }}>Listed ✓</span>
            </div>
          </div>

          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Token price', value: `$${DEMO_PROJECT.price}` },
              { label: 'Est. annual yield', value: `${DEMO_PROJECT.yield}%` },
              { label: 'Proved reserves', value: DEMO_PROJECT.reserves },
              { label: 'Mineral type', value: DEMO_PROJECT.mineral },
            ].map(m => (
              <div key={m.label} style={{ background: '#F7F9FB', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: '#4A6080', marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 17, fontWeight: 600, color: '#1C2E45' }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Primary sale progress */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#4A6080', marginBottom: 6 }}>
              <span>Primary sale progress</span>
              <span style={{ fontWeight: 500, color: '#1C2E45' }}>
                {DEMO_PROJECT.sold.toLocaleString()} / {DEMO_PROJECT.supply.toLocaleString()} tokens ({soldPct}%)
              </span>
            </div>
            <div style={{ background: '#E8EDF2', borderRadius: 4, height: 8 }}>
              <div style={{ width: `${soldPct}%`, background: '#2A4060', height: 8, borderRadius: 4 }} />
            </div>
          </div>

          {/* War risk */}
          <div style={{
            background: '#FAFAE6', border: '1px solid #B8B840',
            borderRadius: 10, padding: '14px 18px', marginBottom: 20
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5A00' }}>⚠ War Risk Monitor</span>
              <span style={{ fontSize: 13, color: '#5A5A00' }}>Yellow zone · {DEMO_PROJECT.frontlineKm} km to frontline</span>
            </div>
            <div style={{ background: '#F0F0C0', borderRadius: 3, height: 6 }}>
              <div style={{ width: '63%', background: '#B8B840', height: 6, borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 12, color: '#7A7A20', marginTop: 6 }}>
              War risk insurance active · Trading continues · Updated daily via ACLED
            </div>
          </div>

          {/* Oracle verification */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: '#4A6080' }}>Oracle verifications</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {[1,2,3].map(i => <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: '#3A7A52' }} />)}
              {[4,5].map(i => <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: '#E8EDF2', border: '1px solid #C8D4DE' }} />)}
              <span style={{ fontSize: 12, color: '#4A6080', marginLeft: 4 }}>3 / 5 · Geologist ✓ Gov.Audit ✓ Env.Expert ✓</span>
            </div>
          </div>

          {/* On-chain info */}
          <div style={{
            background: '#F7F9FB', borderRadius: 10, padding: '12px 16px', marginBottom: 24,
            fontSize: 12, color: '#4A6080'
          }}>
            <div style={{ marginBottom: 4 }}>
              Asset PDA: <span style={{ fontFamily: 'monospace', color: '#1C2E45' }}>{DEMO_PROJECT.assetPDA}</span>
            </div>
            <div>
              
                href={`https://explorer.solana.com/address/${DEMO_PROJECT.assetPDA}?cluster=devnet`}
                target="_blank" rel="noreferrer"
                style={{ color: '#2A4060', textDecoration: 'underline' }}
              >
                View on Solana Explorer ↗
              </a>
            </div>
          </div>

          {/* BUY SECTION */}
          {!bought ? (
            <div style={{
              border: '1px solid #E8EDF2', borderRadius: 12, padding: 24, background: '#FAFBFC'
            }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1C2E45', marginBottom: 16 }}>
                Purchase Tokens
              </div>

              {!publicKey ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 14, color: '#4A6080', marginBottom: 16 }}>
                    Connect your Phantom or Solflare wallet to invest
                  </div>
                  <WalletMultiButton style={{ background: '#1C2E45', fontSize: 14 }} />
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#4A6080', marginBottom: 8 }}>
                      <span>Number of tokens</span>
                      <span style={{ fontWeight: 600, color: '#1C2E45' }}>{amount} tokens</span>
                    </div>
                    <input
                      type="range" min={1} max={100} value={amount}
                      onChange={e => setAmount(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#1C2E45' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8AACC8', marginTop: 4 }}>
                      <span>Min: 1 token ($12.50)</span>
                      <span>Max: 100 ($1,250)</span>
                    </div>
                  </div>

                  <div style={{ borderTop: '0.5px solid #E8EDF2', paddingTop: 16, marginBottom: 16 }}>
                    {[
                      ['Tokens', `${amount}`],
                      ['Price per token', '$12.50 USDC'],
                      ['Network fee', '~$0.001 SOL'],
                      ['Total', `$${totalCost} USDC`],
                    ].map(([label, value], i) => (
                      <div key={label} style={{
                        display: 'flex', justifyContent: 'space-between',
                        padding: '6px 0',
                        borderBottom: i < 3 ? '0.5px solid #F0F2F5' : 'none',
                        fontSize: i === 3 ? 15 : 13,
                        fontWeight: i === 3 ? 600 : 400,
                        color: '#1C2E45'
                      }}>
                        <span style={{ color: i === 3 ? '#1C2E45' : '#4A6080' }}>{label}</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleBuy}
                    disabled={buying}
                    style={{
                      width: '100%', background: buying ? '#4A6080' : '#1C2E45',
                      color: '#F7F9FB', border: 'none', borderRadius: 10,
                      padding: '14px 0', fontSize: 15, fontWeight: 600,
                      cursor: buying ? 'wait' : 'pointer'
                    }}
                  >
                    {buying ? 'Confirming in Phantom...' : `Confirm in Phantom → $${totalCost} USDC`}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div style={{
              background: '#E6F2EC', border: '1px solid #5A9E72',
              borderRadius: 12, padding: 28, textAlign: 'center'
            }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1E5C35', marginBottom: 8 }}>
                {amount} LITHIUM tokens purchased!
              </div>
              <div style={{ fontSize: 14, color: '#3A7A52', marginBottom: 20 }}>
                Est. monthly royalty: ~${(amount * 12.50 * 0.084 / 12).toFixed(2)} USDC · Paid automatically
              </div>
              <Link href="/portfolio" style={{
                background: '#1C2E45', color: '#F7F9FB',
                borderRadius: 8, padding: '12px 28px',
                textDecoration: 'none', fontWeight: 500, fontSize: 14
              }}>
                View Portfolio →
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
