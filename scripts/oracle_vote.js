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
const ASSET_PDA = new PublicKey('HDcgREwSRYvWLq4HfFaDid76t1z1BghHFHz9f4Awmvd6')

function disc(name) {
  return Buffer.from(createHash('sha256').update(`global:${name}`).digest()).slice(0, 8)
}
function encodeString(s) {
  const b = Buffer.from(s, 'utf-8')
  const len = Buffer.alloc(4); len.writeUInt32LE(b.length, 0)
  return Buffer.concat([len, b])
}
function encodeBool(v) {
  const b = Buffer.alloc(1); b.writeUInt8(v ? 1 : 0, 0); return b
}

async function sendAndConfirm(ix, signers) {
  const tx = new Transaction().add(ix)
  const { blockhash } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.feePayer        = signers[0].publicKey
  tx.sign(...signers)
  const sig = await connection.sendRawTransaction(tx.serialize())
  for (let i = 0; i < 30; i++) {
    const status = await connection.getSignatureStatus(sig)
    if (status.value?.confirmationStatus === 'confirmed') {
      console.log('TX:', sig.slice(0,20)+'...')
      return sig
    }
    await new Promise(r => setTimeout(r, 1000))
  }
  throw new Error('Timeout')
}

// Зберегти/завантажити keypair з файлу
function loadOrCreate(path) {
  if (fs.existsSync(path)) {
    const data = JSON.parse(fs.readFileSync(path))
    return Keypair.fromSecretKey(Uint8Array.from(data))
  }
  const kp = Keypair.generate()
  fs.writeFileSync(path, JSON.stringify(Array.from(kp.secretKey)))
  return kp
}

async function transfer(to, lamports) {
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: admin.publicKey, toPubkey: to, lamports })
  )
  const { blockhash } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.feePayer = admin.publicKey
  tx.sign(admin)
  const sig = await connection.sendRawTransaction(tx.serialize())
  await connection.confirmTransaction(sig)
  console.log('Funded:', to.toBase58().slice(0,8))
}

async function submitVote(oracleKeypair, rationale) {
  const [votePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('oracle_vote'), ASSET_PDA.toBuffer(), oracleKeypair.publicKey.toBuffer()],
    ASSET_REGISTRY_PROGRAM_ID
  )

  const existing = await connection.getAccountInfo(votePDA)
  if (existing) {
    console.log('Vote exists:', oracleKeypair.publicKey.toBase58().slice(0,8))
    return votePDA
  }

  // Переконатись що oracle має SOL
  const bal = await connection.getBalance(oracleKeypair.publicKey)
  if (bal < 0.01 * 1e9) {
    await transfer(oracleKeypair.publicKey, 0.05 * 1e9)
  }

  const data = Buffer.concat([
    disc('submit_oracle_vote'),
    encodeBool(true),
    encodeString(rationale),
  ])

  const ix = new TransactionInstruction({
    programId: ASSET_REGISTRY_PROGRAM_ID,
    keys: [
      { pubkey: votePDA,                 isSigner: false, isWritable: true  },
      { pubkey: ASSET_PDA,               isSigner: false, isWritable: true  },
      { pubkey: oracleKeypair.publicKey, isSigner: true,  isWritable: true  },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })

  // Oracle сам підписує і платить за rent
  await sendAndConfirm(ix, [oracleKeypair])
  console.log('Vote by:', oracleKeypair.publicKey.toBase58().slice(0,8))
  return votePDA
}

async function finalizeVerification() {
  const [registryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('asset_registry')], ASSET_REGISTRY_PROGRAM_ID
  )
  const ix = new TransactionInstruction({
    programId: ASSET_REGISTRY_PROGRAM_ID,
    keys: [
      { pubkey: ASSET_PDA,       isSigner: false, isWritable: true  },
      { pubkey: registryPDA,     isSigner: false, isWritable: false },
      { pubkey: admin.publicKey, isSigner: true,  isWritable: false },
    ],
    data: disc('finalize_verification'),
  })
  await sendAndConfirm(ix, [admin])
  console.log('VERIFIED!')
}

async function listAsset() {
  const [registryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('asset_registry')], ASSET_REGISTRY_PROGRAM_ID
  )
  const ix = new TransactionInstruction({
    programId: ASSET_REGISTRY_PROGRAM_ID,
    keys: [
      { pubkey: ASSET_PDA,       isSigner: false, isWritable: true  },
      { pubkey: registryPDA,     isSigner: false, isWritable: false },
      { pubkey: admin.publicKey, isSigner: true,  isWritable: false },
    ],
    data: disc('list_asset'),
  })
  await sendAndConfirm(ix, [admin])
  console.log('LISTED!')
}

async function main() {
  // Завантажити або створити keypairs оракулів
  const oracle1 = admin
  const oracle2 = loadOrCreate('scripts/oracle2.json')
  const oracle3 = loadOrCreate('scripts/oracle3.json')

  console.log('Oracle 1 (Geologist):', oracle1.publicKey.toBase58().slice(0,8))
  console.log('Oracle 2 (Gov Audit):', oracle2.publicKey.toBase58().slice(0,8))
  console.log('Oracle 3 (Env Expert):', oracle3.publicKey.toBase58().slice(0,8))

  console.log('\nSubmitting votes...')
  await submitVote(oracle1, 'QmGeologistReport123')
  await submitVote(oracle2, 'QmGovAuditReport456')
  await submitVote(oracle3, 'QmEnvReport789')

  console.log('\nFinalizing...')
  await finalizeVerification()

  console.log('\nListing...')
  await listAsset()

  console.log('\nDone!')
  console.log('Explorer:', `https://explorer.solana.com/address/${ASSET_PDA.toBase58()}?cluster=devnet`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
