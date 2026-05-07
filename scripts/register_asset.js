const {
  Connection, Keypair, PublicKey,
  Transaction, TransactionInstruction,
  SystemProgram, clusterApiUrl,
} = require('@solana/web3.js')
const fs  = require('fs')
const os  = require('os')
const { createHash } = require('crypto')

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
const secretKey  = JSON.parse(fs.readFileSync(`${os.homedir()}/.config/solana/id.json`))
const admin      = Keypair.fromSecretKey(Uint8Array.from(secretKey))

const ASSET_REGISTRY_PROGRAM_ID = new PublicKey('8ZAN3ucwx8JENTz3i43biwETyYQ3ogo9DEFKhJRz9XU4')

function disc(name) {
  return Buffer.from(createHash('sha256').update(`global:${name}`).digest()).slice(0, 8)
}
function encodeString(s) {
  const b = Buffer.from(s, 'utf-8')
  const len = Buffer.alloc(4)
  len.writeUInt32LE(b.length, 0)
  return Buffer.concat([len, b])
}
function encodeU64(n) {
  const b = Buffer.alloc(8)
  b.writeBigUInt64LE(BigInt(n), 0)
  return b
}
function encodeU16(n) {
  const b = Buffer.alloc(2)
  b.writeUInt16LE(n, 0)
  return b
}
function encodeU8(n) {
  const b = Buffer.alloc(1)
  b.writeUInt8(n, 0)
  return b
}
function encodeEnum(variant) {
  return encodeU8(variant)
}

async function sendAndConfirm(ix) {
  const tx = new Transaction().add(ix)
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.feePayer        = admin.publicKey
  tx.sign(admin)
  const sig = await connection.sendRawTransaction(tx.serialize())
  for (let i = 0; i < 30; i++) {
    const status = await connection.getSignatureStatus(sig)
    if (status.value?.confirmationStatus === 'confirmed') {
      console.log('Confirmed:', sig)
      return sig
    }
    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error('Timeout')
}

async function initRegistry() {
  const [registryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('asset_registry')],
    ASSET_REGISTRY_PROGRAM_ID
  )
  const existing = await connection.getAccountInfo(registryPDA)
  if (existing) {
    console.log('Registry exists:', registryPDA.toBase58())
    return registryPDA
  }
  const ix = new TransactionInstruction({
    programId: ASSET_REGISTRY_PROGRAM_ID,
    keys: [
      { pubkey: registryPDA,             isSigner: false, isWritable: true  },
      { pubkey: admin.publicKey,          isSigner: true,  isWritable: true  },
      { pubkey: SystemProgram.programId,  isSigner: false, isWritable: false },
    ],
    data: disc('initialize'),
  })
  await sendAndConfirm(ix)
  console.log('Registry initialized:', registryPDA.toBase58())
  return registryPDA
}

async function registerAsset(args) {
  const [registryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('asset_registry')],
    ASSET_REGISTRY_PROGRAM_ID
  )
  const [assetPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('asset'), Buffer.from(args.licenseNumber)],
    ASSET_REGISTRY_PROGRAM_ID
  )

  const existing = await connection.getAccountInfo(assetPDA)
  if (existing) {
    console.log('Asset exists:', assetPDA.toBase58())
    return assetPDA
  }

  // MineralType enum: Lithium=0, Titanium=1, Gold=2...
  const mineralTypeMap = {
    Lithium: 0, Titanium: 1, Gold: 2, Iron: 3,
    Coal: 4, NaturalGas: 5, Oil: 6, Graphite: 7, Uranium: 8, Other: 9
  }

  const data = Buffer.concat([
    disc('register_asset'),
    // RegisterAssetArgs struct
    encodeString(args.licenseNumber),
    encodeEnum(mineralTypeMap[args.mineralType] ?? 0),
    encodeString(args.locationGps),
    encodeU64(args.estimatedReserves),
    encodeString(args.geologicalReportIpfs),
    encodeU64(args.totalSupply),
    encodeU64(args.pricePerToken),
    encodeU16(args.yieldBps),
    encodeU8(args.requiredVerifications),
  ])

  const ix = new TransactionInstruction({
    programId: ASSET_REGISTRY_PROGRAM_ID,
    keys: [
      { pubkey: assetPDA,                isSigner: false, isWritable: true  },
      { pubkey: registryPDA,             isSigner: false, isWritable: true  },
      { pubkey: admin.publicKey,          isSigner: true,  isWritable: true  },
      { pubkey: SystemProgram.programId,  isSigner: false, isWritable: false },
    ],
    data,
  })

  await sendAndConfirm(ix)
  console.log('Asset registered:', assetPDA.toBase58())
  console.log('License:', args.licenseNumber)
  return assetPDA
}

async function main() {
  await initRegistry()

  // Demo asset — пілотний проект для hackathon
  const assetPDA = await registerAsset({
    licenseNumber:        'KVH-2025-LI-0042',
    mineralType:          'Lithium',
    locationGps:          '48.5132,32.2597',
    estimatedReserves:    45000,
    geologicalReportIpfs: 'QmDemo123456789',
    totalSupply:          10000,
    pricePerToken:        12_500_000,  // $12.50 USDC (6 decimals)
    yieldBps:             840,         // 8.4%
    requiredVerifications: 3,
  })

  console.log('\nDemo asset PDA:', assetPDA.toBase58())
  console.log('Explorer:', `https://explorer.solana.com/address/${assetPDA.toBase58()}?cluster=devnet`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
