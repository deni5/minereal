use anchor_lang::prelude::*;

declare_id!("J1kvJpWWCfjyk2j9jySrbq9Fg8eVu4zqq11jzvVQG6FL");

#[program]
pub mod identity {
    use super::*;

    pub fn initialize_registry(ctx: Context<InitializeRegistry>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.admin = ctx.accounts.admin.key();
        registry.total_identities = 0;
        registry.bump = ctx.bumps.registry;
        msg!("Identity registry initialized. Admin: {}", registry.admin);
        Ok(())
    }

    pub fn approve_kyc(
        ctx: Context<ApproveKyc>,
        role: IdentityRole,
        kyc_provider: String,
        kyc_reference: String,
    ) -> Result<()> {
        require!(kyc_provider.len() <= 32, IdentityError::StringTooLong);
        require!(kyc_reference.len() <= 64, IdentityError::StringTooLong);

        let identity  = &mut ctx.accounts.identity;
        let registry  = &mut ctx.accounts.registry;
        let clock     = Clock::get()?;

        identity.wallet        = ctx.accounts.wallet.key();
        identity.role          = role.clone();
        identity.status        = IdentityStatus::Verified;
        identity.kyc_provider  = kyc_provider;
        identity.kyc_reference = kyc_reference;
        identity.verified_at   = clock.unix_timestamp;
        identity.verified_by   = ctx.accounts.admin.key();
        identity.revoked_at    = None;
        identity.revoke_reason = None;
        identity.bump          = ctx.bumps.identity;

        registry.total_identities = registry
            .total_identities
            .checked_add(1)
            .ok_or(IdentityError::Overflow)?;

        msg!("KYC approved: {} | role: {:?}", identity.wallet, role);
        Ok(())
    }

    pub fn revoke_kyc(ctx: Context<RevokeKyc>, reason: String) -> Result<()> {
        require!(reason.len() <= 128, IdentityError::StringTooLong);
        let identity = &mut ctx.accounts.identity;
        require!(
            identity.status == IdentityStatus::Verified,
            IdentityError::NotVerified
        );
        identity.status        = IdentityStatus::Revoked;
        identity.revoked_at    = Some(Clock::get()?.unix_timestamp);
        identity.revoke_reason = Some(reason.clone());
        msg!("KYC revoked: {} | reason: {}", identity.wallet, reason);
        Ok(())
    }

    pub fn update_role(ctx: Context<UpdateRole>, new_role: IdentityRole) -> Result<()> {
        let identity = &mut ctx.accounts.identity;
        require!(
            identity.status == IdentityStatus::Verified,
            IdentityError::NotVerified
        );
        identity.role = new_role.clone();
        msg!("Role updated: {} → {:?}", identity.wallet, new_role);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    #[account(
        init,
        payer  = admin,
        space  = IdentityRegistry::LEN,
        seeds  = [b"identity_registry"],
        bump
    )]
    pub registry:       Account<'info, IdentityRegistry>,
    #[account(mut)]
    pub admin:          Signer<'info>,
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
    pub identity:       Account<'info, IdentityRecord>,
    #[account(
        mut,
        seeds  = [b"identity_registry"],
        bump   = registry.bump,
        has_one = admin @ IdentityError::Unauthorized
    )]
    pub registry:       Account<'info, IdentityRegistry>,
    /// CHECK: wallet being verified — not a signer
    pub wallet:         AccountInfo<'info>,
    #[account(mut)]
    pub admin:          Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeKyc<'info> {
    #[account(
        mut,
        seeds = [b"identity", identity.wallet.as_ref()],
        bump  = identity.bump
    )]
    pub identity: Account<'info, IdentityRecord>,
    #[account(
        seeds  = [b"identity_registry"],
        bump   = registry.bump,
        has_one = admin @ IdentityError::Unauthorized
    )]
    pub registry: Account<'info, IdentityRegistry>,
    pub admin:    Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateRole<'info> {
    #[account(
        mut,
        seeds = [b"identity", identity.wallet.as_ref()],
        bump  = identity.bump
    )]
    pub identity: Account<'info, IdentityRecord>,
    #[account(
        seeds  = [b"identity_registry"],
        bump   = registry.bump,
        has_one = admin @ IdentityError::Unauthorized
    )]
    pub registry: Account<'info, IdentityRegistry>,
    pub admin:    Signer<'info>,
}

#[account]
pub struct IdentityRegistry {
    pub admin:            Pubkey,
    pub total_identities: u64,
    pub bump:             u8,
}
impl IdentityRegistry {
    pub const LEN: usize = 8 + 32 + 8 + 1 + 7;
}

#[account]
pub struct IdentityRecord {
    pub wallet:         Pubkey,
    pub role:           IdentityRole,
    pub status:         IdentityStatus,
    pub kyc_provider:   String,
    pub kyc_reference:  String,
    pub verified_at:    i64,
    pub verified_by:    Pubkey,
    pub revoked_at:     Option<i64>,
    pub revoke_reason:  Option<String>,
    pub bump:           u8,
}
impl IdentityRecord {
    pub const LEN: usize = 8 + 32 + 1 + 1
        + (4 + 32) + (4 + 64)
        + 8 + 32
        + (1 + 8) + (1 + 4 + 128)
        + 1 + 3;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum IdentityRole {
    Investor,
    Issuer,
    Oracle,
    Admin,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum IdentityStatus {
    Verified,
    Revoked,
    Pending,
}

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
