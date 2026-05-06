use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

// ─── ПІСЛЯ ПЕРШОГО DEPLOY ───────────────────────────────────────────────────
// 1. solana program deploy target/sbpf-solana-solana/release/identity.so
// 2. Замінити declare_id! на отриманий Program ID
// 3. anchor build && solana program deploy --program-id <ID>
// ────────────────────────────────────────────────────────────────────────────

#[program]
pub mod identity {
    use super::*;

    /// Ініціалізація реєстру — викликається один раз адміністратором
    pub fn initialize_registry(ctx: Context<InitializeRegistry>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.admin = ctx.accounts.admin.key();
        registry.total_identities = 0;
        registry.bump = ctx.bumps.registry;
        msg!("Identity registry initialized. Admin: {}", registry.admin);
        Ok(())
    }

    /// Верифікація гаманця — KYC пройдено, роль призначена
    /// Для MVP викликається адміністратором вручну
    /// У production інтегрується з Sumsub webhook
    pub fn approve_kyc(
        ctx: Context<ApproveKyc>,
        role: IdentityRole,
        kyc_provider: String,
        kyc_reference: String,
    ) -> Result<()> {
        require!(
            kyc_provider.len() <= 32,
            IdentityError::StringTooLong
        );
        require!(
            kyc_reference.len() <= 64,
            IdentityError::StringTooLong
        );

        let identity = &mut ctx.accounts.identity;
        let registry = &mut ctx.accounts.registry;
        let clock = Clock::get()?;

        identity.wallet        = ctx.accounts.wallet.key();
        identity.role          = role.clone();
        identity.status        = IdentityStatus::Verified;
        identity.kyc_provider  = kyc_provider;
        identity.kyc_reference = kyc_reference;
        identity.verified_at   = clock.unix_timestamp;
        identity.verified_by   = ctx.accounts.admin.key();
        identity.bump          = ctx.bumps.identity;

        registry.total_identities = registry
            .total_identities
            .checked_add(1)
            .ok_or(IdentityError::Overflow)?;

        msg!(
            "KYC approved: {} | role: {:?} | by admin: {}",
            identity.wallet,
            role,
            ctx.accounts.admin.key()
        );
        Ok(())
    }

    /// Відкликання верифікації — блокує доступ до платформи
    /// Використовується при санкційних перевірках або порушеннях
    pub fn revoke_kyc(
        ctx: Context<RevokeKyc>,
        reason: String,
    ) -> Result<()> {
        require!(reason.len() <= 128, IdentityError::StringTooLong);

        let identity = &mut ctx.accounts.identity;
        require!(
            identity.status == IdentityStatus::Verified,
            IdentityError::NotVerified
        );

        identity.status    = IdentityStatus::Revoked;
        identity.revoked_at = Some(Clock::get()?.unix_timestamp);
        identity.revoke_reason = Some(reason.clone());

        msg!(
            "KYC revoked: {} | reason: {}",
            identity.wallet,
            reason
        );
        Ok(())
    }

    /// Оновлення ролі — наприклад Investor → Oracle після credential check
    pub fn update_role(
        ctx: Context<UpdateRole>,
        new_role: IdentityRole,
    ) -> Result<()> {
        let identity = &mut ctx.accounts.identity;
        require!(
            identity.status == IdentityStatus::Verified,
            IdentityError::NotVerified
        );

        let old_role = identity.role.clone();
        identity.role = new_role.clone();

        msg!(
            "Role updated: {} | {:?} → {:?}",
            identity.wallet,
            old_role,
            new_role
        );
        Ok(())
    }
}

// ─── ACCOUNTS ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    #[account(
        init,
        payer = admin,
        space = IdentityRegistry::LEN,
        seeds = [b"identity_registry"],
        bump
    )]
    pub registry: Account<'info, IdentityRegistry>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveKyc<'info> {
    #[account(
        init,
        payer = admin,
        space = IdentityRecord::LEN,
        seeds = [b"identity", wallet.key().as_ref()],
        bump
    )]
    pub identity: Account<'info, IdentityRecord>,

    #[account(
        mut,
        seeds = [b"identity_registry"],
        bump = registry.bump,
        has_one = admin @ IdentityError::Unauthorized
    )]
    pub registry: Account<'info, IdentityRegistry>,

    /// CHECK: гаманець що верифікується — не підписує, тільки записується
    pub wallet: AccountInfo<'info>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeKyc<'info> {
    #[account(
        mut,
        seeds = [b"identity", identity.wallet.as_ref()],
        bump = identity.bump
    )]
    pub identity: Account<'info, IdentityRecord>,

    #[account(
        seeds = [b"identity_registry"],
        bump = registry.bump,
        has_one = admin @ IdentityError::Unauthorized
    )]
    pub registry: Account<'info, IdentityRegistry>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateRole<'info> {
    #[account(
        mut,
        seeds = [b"identity", identity.wallet.as_ref()],
        bump = identity.bump
    )]
    pub identity: Account<'info, IdentityRecord>,

    #[account(
        seeds = [b"identity_registry"],
        bump = registry.bump,
        has_one = admin @ IdentityError::Unauthorized
    )]
    pub registry: Account<'info, IdentityRegistry>,

    pub admin: Signer<'info>,
}

// ─── STATE ────────────────────────────────────────────────────────────────────

#[account]
pub struct IdentityRegistry {
    pub admin:             Pubkey,   // 32
    pub total_identities:  u64,      // 8
    pub bump:              u8,       // 1
}

impl IdentityRegistry {
    // discriminator(8) + admin(32) + total(8) + bump(1) + padding(7)
    pub const LEN: usize = 8 + 32 + 8 + 1 + 7;
}

#[account]
pub struct IdentityRecord {
    pub wallet:         Pubkey,                // 32
    pub role:           IdentityRole,          // 1 (enum)
    pub status:         IdentityStatus,        // 1 (enum)
    pub kyc_provider:   String,                // 4 + 32
    pub kyc_reference:  String,                // 4 + 64
    pub verified_at:    i64,                   // 8
    pub verified_by:    Pubkey,                // 32
    pub revoked_at:     Option<i64>,           // 1 + 8
    pub revoke_reason:  Option<String>,        // 1 + 4 + 128
    pub bump:           u8,                    // 1
}

impl IdentityRecord {
    // discriminator(8) + wallet(32) + role(1) + status(1)
    // + kyc_provider(4+32) + kyc_reference(4+64)
    // + verified_at(8) + verified_by(32)
    // + revoked_at(1+8) + revoke_reason(1+4+128) + bump(1) + padding(3)
    pub const LEN: usize = 8 + 32 + 1 + 1
        + (4 + 32) + (4 + 64)
        + 8 + 32
        + (1 + 8) + (1 + 4 + 128) + 1 + 3;
    // = 8 + 32 + 2 + 36 + 68 + 8 + 32 + 9 + 133 + 4 = 332
}

// ─── ENUMS ────────────────────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum IdentityRole {
    /// Роздрібний або інституційний інвестор
    Investor,
    /// Видобувна компанія — емітент токенів
    Issuer,
    /// Верифікатор активів (геолог, аудитор тощо)
    Oracle,
    /// Платформний адміністратор
    Admin,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum IdentityStatus {
    /// KYC верифіковано — повний доступ
    Verified,
    /// Верифікацію відкликано — доступ заблоковано
    Revoked,
    /// KYC на розгляді (для майбутньої інтеграції)
    Pending,
}

// ─── ERRORS ───────────────────────────────────────────────────────────────────

#[error_code]
pub enum IdentityError {
    #[msg("Unauthorized: only admin can perform this action")]
    Unauthorized,

    #[msg("Identity is not in Verified status")]
    NotVerified,

    #[msg("String exceeds maximum allowed length")]
    StringTooLong,

    #[msg("Arithmetic overflow")]
    Overflow,
}
