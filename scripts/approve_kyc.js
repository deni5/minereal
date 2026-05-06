// scripts/approve_kyc.js
// Використання: node scripts/approve_kyc.js <wallet_address> <role>
// Ролі: Investor | Issuer | Oracle | Admin
// Приклад: node scripts/approve_kyc.js 7xPq...k3Nf Investor

const {
  Connection, Keypair, PublicKey,
  Transaction, TransactionInstruction,
  SystemProgram, clusterApiUrl,
} = require('@solana/web3.js')
const fs   = require('fs')
const os   = require('os')
const { createHash } = require('crypto')

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
const secretKey  = JSON.parse(
  fs.readFileSync(`${os.homedir()}/.config/solana/id.json`)
)
const admin = Keypair.fromSecretKey(Uint8Array.from(secretKey))

// Замінити після anchor deploy
const IDENTITY_PROGRAM_ID = new PublicKey('REPLACE_AFTER_DEPLOY')

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function disc(name) {
  return Buffer.from(
    createHash('sha256').update(`global:${name}`).digest()
  ).slice(0, 8)
}

function encodeString(s) {
  const b   = Buffer.from(s, 'utf-8')
  const len = Buffer.alloc(4)
  len.writeUInt32LE(b.length, 0)
  return Buffer.concat([len, b])
}

function encodeEnum(variant) {
  // Порядок enum IdentityRole: Investor=0, Issuer=1, Oracle=2, Admin=3
  const map = { Investor: 0, Issuer: 1, Oracle: 2, Admin: 3 }
  const b = Buffer.alloc(1)
  b.writeUInt8(map[variant] ?? 0, 0)
  return b
}

async function sendAndConfirm(ix) {
  const tx = new Transaction().add(ix)
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash()
  tx.recentBlockhash      = blockhash
  tx.feePayer             = admin.publicKey
  tx.sign(admin)
  const sig = await connection.sendRawTransaction(tx.serialize())

  // Polling — надійніше за subscribe на Devnet
  for (let i = 0; i < 30; i++) {
    const status = await connection.getSignatureStatus(sig)
    if (status.value?.confirmationStatus === 'confirmed') {
      console.log('Confirmed:', sig)
      return sig
    }
    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error('Transaction timeout')
}

// ─── INITIALIZE REGISTRY (один раз) ─────────────────────────────────────────
async function initializeRegistry() {
  const [registryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('identity_registry')],
    IDENTITY_PROGRAM_ID
  )

  // Перевірити чи вже існує
  const existing = await connection.getAccountInfo(registryPDA)
  if (existing) {
    console.log('Registry already initialized:', registryPDA.toBase58())
    return registryPDA
  }

  const data = Buffer.concat([
    disc('initialize_registry'),
  ])

  const ix = new TransactionInstruction({
    programId: IDENTITY_PROGRAM_ID,
    keys: [
      { pubkey: registryPDA,          isSigner: false, isWritable: true  },
      { pubkey: admin.publicKey,       isSigner: true,  isWritable: true  },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })

  await sendAndConfirm(ix)
  console.log('Registry initialized:', registryPDA.toBase58())
  return registryPDA
}

// ─── APPROVE KYC ─────────────────────────────────────────────────────────────
async function approveKyc(walletAddress, role, kycProvider, kycReference) {
  const wallet = new PublicKey(walletAddress)

  const [registryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('identity_registry')],
    IDENTITY_PROGRAM_ID
  )
  const [identityPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('identity'), wallet.toBuffer()],
    IDENTITY_PROGRAM_ID
  )

  // Перевірити чи вже верифіковано
  const existing = await connection.getAccountInfo(identityPDA)
  if (existing) {
    console.log('Already verified:', walletAddress)
    return identityPDA
  }

  const data = Buffer.concat([
    disc('approve_kyc'),
    encodeEnum(role),
    encodeString(kycProvider),
    encodeString(kycReference),
  ])

  const ix = new TransactionInstruction({
    programId: IDENTITY_PROGRAM_ID,
    keys: [
      { pubkey: identityPDA,          isSigner: false, isWritable: true  },
      { pubkey: registryPDA,          isSigner: false, isWritable: true  },
      { pubkey: wallet,               isSigner: false, isWritable: false },
      { pubkey: admin.publicKey,       isSigner: true,  isWritable: true  },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })

  await sendAndConfirm(ix)
  console.log(`KYC approved: ${walletAddress} | role: ${role}`)
  console.log('Identity PDA:', identityPDA.toBase58())
  return identityPDA
}

// ─── REVOKE KYC ──────────────────────────────────────────────────────────────
async function revokeKyc(walletAddress, reason) {
  const wallet = new PublicKey(walletAddress)

  const [registryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('identity_registry')],
    IDENTITY_PROGRAM_ID
  )
  const [identityPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('identity'), wallet.toBuffer()],
    IDENTITY_PROGRAM_ID
  )

  const data = Buffer.concat([
    disc('revoke_kyc'),
    encodeString(reason),
  ])

  const ix = new TransactionInstruction({
    programId: IDENTITY_PROGRAM_ID,
    keys: [
      { pubkey: identityPDA,  isSigner: false, isWritable: true  },
      { pubkey: registryPDA,  isSigner: false, isWritable: false },
      { pubkey: admin.publicKey, isSigner: true, isWritable: false },
    ],
    data,
  })

  await sendAndConfirm(ix)
  console.log(`KYC revoked: ${walletAddress} | reason: ${reason}`)
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)

  if (args[0] === 'init') {
    await initializeRegistry()
    return
  }

  if (args[0] === 'approve') {
    const walletAddr  = args[1]
    const role        = args[2] || 'Investor'
    const kycProvider = args[3] || 'admin-manual'
    const kycRef      = args[4] || `kyc-${Date.now()}`

    if (!walletAddr) {
      console.error('Usage: node approve_kyc.js approve <wallet> [role] [provider] [ref]')
      process.exit(1)
    }

    // Переконатись що registry існує
    await initializeRegistry()
    await approveKyc(walletAddr, role, kycProvider, kycRef)
    return
  }

  if (args[0] === 'revoke') {
    const walletAddr = args[1]
    const reason     = args[2] || 'Admin revoked'

    if (!walletAddr) {
      console.error('Usage: node approve_kyc.js revoke <wallet> [reason]')
      process.exit(1)
    }

    await revokeKyc(walletAddr, reason)
    return
  }

  console.log(`
Minereal Identity Script

Commands:
  node scripts/approve_kyc.js init
    → Initialize registry (run once)

  node scripts/approve_kyc.js approve <wallet> [role] [provider] [ref]
    → Approve KYC for wallet
    → roles: Investor | Issuer | Oracle | Admin
    → example: node scripts/approve_kyc.js approve 7xPq...k3Nf Investor

  node scripts/approve_kyc.js revoke <wallet> [reason]
    → Revoke KYC
    → example: node scripts/approve_kyc.js revoke 7xPq...k3Nf "Sanctions hit"
  `)
}

main().catch(e => {
  console.error('Error:', e.message)
  process.exit(1)
})
