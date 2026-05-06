# MINEREAL — Session Context Document
# Завантаж цей файл в нову сесію Claude для продовження без повторення контексту
# Дата: May 6, 2026 | Статус: Day 1 розпочато

---

## 1. ПРОЕКТ — СУТЬ

**Minereal** — B2B2C платформа токенізації мінеральних активів України на Solana.
- Емітенти (видобувні компанії) токенізують родовища → залучають капітал
- Інвестори (роздрібні, від $10) купують токени → отримують royalty
- Регуляторна рамка: UA Subsoil Code + EU MiCA/MiFID II
- Blockchain: Solana Devnet (MVP) → Mainnet Q4 2026
- **Дедлайн: Colosseum Frontier Hackathon, May 11, 2026**

---

## 2. ЗАФІКСОВАНІ РІШЕННЯ

| Параметр | Рішення |
|---|---|
| Wallet | Phantom + Solflare ONLY (без embedded wallet) |
| Мінімальна інвестиція | $10 (1 токен) |
| Первинний sale | Фіксована ціна в USDC |
| Мова інтерфейсу | English only |
| Аудиторія | Роздрібні інвестори + видобувні компанії (B2B2C) |
| Anchor версія | 0.29.0 (НЕЗМІННО) |
| web3.js версія | 1.95.3 (НЕЗМІННО) |
| Frontend | НЕ використовувати Anchor на фронтенді — тільки ручні TX |
| Settlement currency | USDC (devnet: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`) |
| Deploy | Vercel (frontend) + Railway (oracle-service) |
| RPC | Helius (prod) / public devnet (MVP) |

---

## 3. МОНОРЕПО СТРУКТУРА

```
minereal/
├── programs/
│   ├── identity/src/lib.rs          ← НАПИСАНО в цій сесії
│   ├── asset_registry/src/lib.rs    ← НАСТУПНА ЗАДАЧА
│   └── marketplace/src/lib.rs       ← ПІСЛЯ asset_registry
├── apps/
│   └── web/                         ← Next.js 14, TypeScript, Tailwind
│       └── src/
│           ├── app/
│           │   ├── (landing)/page.tsx
│           │   ├── app/explore/
│           │   ├── app/portfolio/
│           │   └── portal/assets/
│           ├── components/
│           ├── hooks/
│           ├── lib/
│           │   ├── solana.ts        ← Program IDs (hardcoded)
│           │   └── tx.ts            ← disc(), encodeString(), sendTx()
│           └── providers/
├── scripts/                         ← Node.js admin scripts
│   ├── discriminators.json          ← згенерувати після build
│   ├── init_identity.js
│   ├── approve_kyc.js
│   ├── register_asset.js
│   ├── oracle_vote.js
│   ├── list_asset.js
│   ├── create_listing.js
│   ├── buy_tokens.js
│   └── update_war_risk.js
├── oracle-service/                  ← Node.js, Railway deploy
├── Anchor.toml
├── package.json                     ← ROOT з фіксованими версіями
└── .gitignore
```

---

## 4. PACKAGE.JSON ROOT (КРИТИЧНО)

```json
{
  "name": "minereal",
  "private": true,
  "workspaces": {
    "packages": ["apps/*"],
    "nohoist": [
      "**/@tanstack/react-query",
      "**/@tanstack/react-query/**",
      "**/@solana/wallet-adapter-*",
      "**/@solana/wallet-adapter-*/**"
    ]
  },
  "dependencies": {
    "@coral-xyz/anchor": "0.29.0",
    "@solana/web3.js": "1.95.3"
  },
  "overrides": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

---

## 5. MVP SMART CONTRACTS (3 програми)

### Програма 1: `identity` — НАПИСАНО ✓
Файл: `programs/identity/src/lib.rs`
Інструкції: `initialize_registry`, `approve_kyc`, `revoke_kyc`
PDA seeds: `[b"identity_registry"]`, `[b"identity", wallet.key().as_ref()]`

### Програма 2: `asset_registry` — НАСТУПНА ЗАДАЧА
PDA seeds:
- Registry: `[b"asset_registry"]`
- Asset: `[b"asset", license_number.as_bytes()]`
- Oracle vote: `[b"oracle_vote", asset_pda.as_ref(), oracle.key().as_ref()]`

Інструкції:
- `initialize` — один раз, admin
- `register_asset(args: RegisterAssetArgs)` — емітент
- `submit_oracle_vote(approved: bool, rationale_ipfs: String)` — оракул
- `list_asset()` — авто після votes >= required
- `update_war_risk(score: u8, zone: WarRiskZone)` — oracle-service
- `pause_asset()` / `resume_asset()` — admin або auto-trigger

Ключові enum:
```rust
pub enum AssetStatus {
    PendingVerification, Verified, Listed,
    PartialSold, InExtraction, Settled, Paused, Revoked,
}
pub enum WarRiskZone { Green, Yellow, Orange, Red }
pub enum MineralType {
    Lithium, Titanium, Gold, Iron, Coal,
    NaturalGas, Oil, Graphite, Uranium, Other,
}
pub enum OracleRole {
    Geologist, MiningEngineer, GovernmentAuditor,
    EnvironmentalExpert, LegalAdvisor,
}
```

### Програма 3: `marketplace` — ПІСЛЯ asset_registry
PDA seeds:
- Listing: `[b"listing", asset_pda.as_ref()]`
- Purchase: `[b"purchase", listing_pda.as_ref(), buyer.key().as_ref()]`

Інструкції:
- `create_listing(price_per_token: u64, whitelist_discount_bps: u16, sale_end: i64)`
- `buy_tokens(amount: u64)` — USDC transfer + SPL token mint to buyer
- `distribute_royalty(total_amount: u64)` — proportional до holdings

---

## 6. DEMO ASSET (пілотний проект для демо)

```rust
// Захардкоджено для demo scenario
name:             "Lithium Deposit — Kirovohrad Oblast"
mineral_type:     MineralType::Lithium
license_number:   "KVH-2025-LI-0042"
reserves_tonnes:  45_000
crirsco:          "Proved"
price_per_token:  12_500_000  // $12.50 USDC (6 decimals)
total_supply:     10_000
yield_bps:        840         // 8.4% APY
war_risk_score:   18          // Yellow zone
frontline_km:     147
oracle_votes:     3           // Geologist + GovAuditor + EnvExpert
geological_report_ipfs: "QmDemo..."
```

---

## 7. FRONTEND — КЛЮЧОВІ ФАЙЛИ

### `lib/solana.ts` — HARDCODE IDs (не .env)
```typescript
import { PublicKey } from '@solana/web3.js'

// Заповнити після anchor deploy
export const IDENTITY_PROGRAM_ID    = new PublicKey('PLACEHOLDER_IDENTITY')
export const ASSET_REGISTRY_PROGRAM_ID = new PublicKey('PLACEHOLDER_ASSET')
export const MARKETPLACE_PROGRAM_ID = new PublicKey('PLACEHOLDER_MARKET')

export const USDC_MINT_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')

// PDA helpers
export function getIdentityPDA(wallet: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('identity'), wallet.toBuffer()],
    IDENTITY_PROGRAM_ID
  )
}
export function getAssetPDA(licenseNumber: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('asset'), Buffer.from(licenseNumber)],
    ASSET_REGISTRY_PROGRAM_ID
  )
}
export function getListingPDA(assetPDA: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('listing'), assetPDA.toBuffer()],
    MARKETPLACE_PROGRAM_ID
  )
}
```

### `lib/tx.ts` — Manual TX builders
```typescript
import { createHash } from 'crypto'
import BN from 'bn.js'
import { Connection, Transaction, TransactionInstruction,
         Keypair, PublicKey, WalletContextState } from '@solana/web3.js'

export function disc(name: string): Buffer {
  return Buffer.from(
    createHash('sha256').update(`global:${name}`).digest()
  ).slice(0, 8)
}

export function encodeString(s: string): Buffer {
  const b = Buffer.from(s, 'utf-8')
  const len = Buffer.alloc(4)
  len.writeUInt32LE(b.length, 0)
  return Buffer.concat([len, b])
}

export function encodeU8(n: number): Buffer {
  const b = Buffer.alloc(1); b.writeUInt8(n, 0); return b
}

export function encodeU64(n: BN): Buffer {
  return n.toArrayLike(Buffer, 'le', 8)
}

export async function sendTx(
  connection: Connection,
  wallet: WalletContextState,
  instructions: TransactionInstruction[],
  signers: Keypair[] = []
): Promise<string> {
  const tx = new Transaction()
  instructions.forEach(ix => tx.add(ix))
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.feePayer = wallet.publicKey!
  if (signers.length) tx.partialSign(...signers)
  const signed = await wallet.signTransaction!(tx)
  const sig = await connection.sendRawTransaction(signed.serialize())
  // Polling замість subscribe — надійніше
  for (let i = 0; i < 30; i++) {
    const status = await connection.getSignatureStatus(sig)
    if (status.value?.confirmationStatus === 'confirmed') return sig
    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error('Transaction timeout')
}
```

---

## 8. ДИЗАЙН-СИСТЕМА (MINEREAL PALETTE)

```css
:root {
  --mn-navy:        #1C2E45;   /* Primary — buttons, navbar */
  --mn-navy-mid:    #2A4060;   /* Secondary navy */
  --mn-slate:       #4A6080;   /* Muted text on dark */
  --mn-fog:         #E8EDF2;   /* Card backgrounds */
  --mn-cloud:       #F7F9FB;   /* Page background */

  /* Risk zones */
  --mn-green-bg:    #E6F2EC;   --mn-green-bd: #5A9E72;  --mn-green-tx: #1E5C35;
  --mn-yellow-bg:   #FAFAE6;   --mn-yellow-bd: #B8B840; --mn-yellow-tx: #5A5A00;
  --mn-orange-bg:   #FDF0E6;   --mn-orange-bd: #D4894A; --mn-orange-tx: #7A3B0A;
  --mn-red-bg:      #FDE8E8;   --mn-red-bd:    #C45A5A; --mn-red-tx:    #7A1A1A;
}
```

**Правила:**
- Navy ТІЛЬКИ для primary actions і brand
- Зони ніколи не змішуються в одному компоненті
- Fog + Cloud — єдині нейтральні фони

---

## 9. COLOSSEUM SUBMISSION CHECKLIST

**Дедлайн: May 11, 2026**

```
[ ] GitHub repo (public) — commits з датами хакатону
[ ] Pitch video — макс 3 хв: команда, проблема, рішення, ринок
[ ] Tech demo video — макс 3 хв: live Devnet demo + код + Solana usage
[ ] Project name: Minereal
[ ] One-liner: "Tokenized access to Ukraine's mineral wealth — from $10"
[ ] Description: whitepaper executive summary (секція 1 з DOCX)
```

**Pitch структура (3 хв):**
1. Hook — "Ukraine = найбільші запаси титану в Європі. Ти не можеш в них інвестувати. Ми це виправляємо."
2. Problem — мінімум $100K+, нема ліквідності, war risk не врахований
3. Solution — live demo (Project Detail + buy token)
4. Why Solana — sub-cent fees для $10 min, SPL tokens, Anchor
5. Market — $500B+ UA minerals, EU CRMA, US-Ukraine Mineral Deal 2025
6. Ask — "Infrastructure for post-war reconstruction capital"

**Tech demo структура (3 хв):**
1. 3 Anchor programs on Devnet Explorer
2. register_asset via admin script — live terminal
3. oracle_vote × 3 → asset Listed
4. Frontend: buy tokens → Phantom sign → confirmed
5. Manual TX construction — disc() + encodeString()

---

## 10. ADMIN SCRIPTS TEMPLATE

```javascript
// scripts/_template.js — copy для кожного скрипту
const { Connection, Keypair, PublicKey, Transaction,
        TransactionInstruction, clusterApiUrl } = require('@solana/web3.js')
const fs = require('fs')
const os = require('os')
const { createHash } = require('crypto')

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
const secretKey = JSON.parse(fs.readFileSync(`${os.homedir()}/.config/solana/id.json`))
const admin = Keypair.fromSecretKey(Uint8Array.from(secretKey))

// Program IDs — заповнити після deploy
const IDENTITY_PROGRAM_ID     = new PublicKey('AFTER_DEPLOY')
const ASSET_REGISTRY_PROGRAM_ID = new PublicKey('AFTER_DEPLOY')
const MARKETPLACE_PROGRAM_ID  = new PublicKey('AFTER_DEPLOY')

function disc(name) {
  return Buffer.from(createHash('sha256').update(`global:${name}`).digest()).slice(0, 8)
}
function encodeString(s) {
  const b = Buffer.from(s, 'utf-8')
  const len = Buffer.alloc(4)
  len.writeUInt32LE(b.length, 0)
  return Buffer.concat([len, b])
}
function encodeU8(n) { const b = Buffer.alloc(1); b.writeUInt8(n,0); return b }

async function sendTx(ix) {
  const tx = new Transaction().add(ix)
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.feePayer = admin.publicKey
  tx.sign(admin)
  const sig = await connection.sendRawTransaction(tx.serialize())
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight })
  console.log('TX:', sig)
  return sig
}

// main() тут
```

---

## 11. НАСТУПНІ КРОКИ (для нової сесії)

**Завдання в порядку пріоритету:**

1. `programs/asset_registry/src/lib.rs` — повний Rust код
2. `programs/marketplace/src/lib.rs` — повний Rust код
3. `scripts/discriminators.json` — згенерувати після anchor build
4. `scripts/init_identity.js` + `scripts/approve_kyc.js`
5. `scripts/register_asset.js` + `scripts/oracle_vote.js` + `scripts/list_asset.js`
6. `scripts/create_listing.js` + `scripts/buy_tokens.js`
7. `apps/web/src/providers/` — SolanaProvider + QueryProvider
8. `apps/web/src/app/(landing)/page.tsx` — лендінг
9. `apps/web/src/app/app/explore/page.tsx` — каталог
10. `apps/web/src/app/app/portfolio/page.tsx` — портфель

**Команда для нової сесії:**
"Продовжуємо розробку Minereal. Завантаж MINEREAL_CONTEXT.md.
Наступна задача: написати programs/asset_registry/src/lib.rs"

---

*Minereal Context v1.0 — May 6, 2026*
*GitHub: github.com/[YOUR_USER]/minereal*
