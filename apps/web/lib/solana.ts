import { PublicKey, Connection, clusterApiUrl } from '@solana/web3.js'

export const IDENTITY_PROGRAM_ID     = new PublicKey('9spzg8rip7AUtHo1LVeYykzniwmm8QTbrT1K5JhmcRo4')
export const ASSET_REGISTRY_PROGRAM_ID = new PublicKey('8ZAN3ucwx8JENTz3i43biwETyYQ3ogo9DEFKhJRz9XU4')
export const MARKETPLACE_PROGRAM_ID  = new PublicKey('BMGvHfz7P9qVkYLexVtX7c1Vp8VWL6PAG5UrASmdw15u')
export const USDC_MINT_DEVNET        = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')

export const DEMO_ASSET_PDA    = new PublicKey('HDcgREwSRYvWLq4HfFaDid76t1z1BghHFHz9f4Awmvd6')
export const DEMO_LICENSE      = 'KVH-2025-LI-0042'

export const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')

export function getAssetPDA(licenseNumber: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('asset'), Buffer.from(licenseNumber)],
    ASSET_REGISTRY_PROGRAM_ID
  )[0]
}

export function getListingPDA(assetPDA: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('listing'), assetPDA.toBuffer()],
    MARKETPLACE_PROGRAM_ID
  )[0]
}
