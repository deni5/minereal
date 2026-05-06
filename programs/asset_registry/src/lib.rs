use anchor_lang::prelude::*;

declare_id!("8ZAN3ucwx8JENTz3i43biwETyYQ3ogo9DEFKhJRz9XU4");

#[program]
pub mod asset_registry {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.admin        = ctx.accounts.admin.key();
        registry.total_assets = 0;
        registry.bump         = ctx.bumps.registry;
        msg!("Asset registry initialized");
        Ok(())
    }

    pub fn register_asset(
        ctx: Context<RegisterAsset>,
        args: RegisterAssetArgs,
    ) -> Result<()> {
        require!(args.license_number.len()         <= 32, AssetError::StringTooLong);
        require!(args.location_gps.len()           <= 64, AssetError::StringTooLong);
        require!(args.geological_report_ipfs.len() <= 64, AssetError::StringTooLong);
        require!(args.price_per_token > 0,                AssetError::InvalidPrice);
        require!(args.total_supply    > 0,                AssetError::InvalidSupply);
        require!(args.required_verifications >= 3
              && args.required_verifications <= 5,        AssetError::InvalidVerifications);

        let asset    = &mut ctx.accounts.asset;
        let registry = &mut ctx.accounts.registry;
        let clock    = Clock::get()?;

        asset.issuer                  = ctx.accounts.issuer.key();
        asset.license_number          = args.license_number;
        asset.mineral_type            = args.mineral_type;
        asset.location_gps            = args.location_gps;
        asset.estimated_reserves      = args.estimated_reserves;
        asset.geological_report_ipfs  = args.geological_report_ipfs;
        asset.total_supply            = args.total_supply;
        asset.tokens_sold             = 0;
        asset.price_per_token         = args.price_per_token;
        asset.yield_bps               = args.yield_bps;
        asset.required_verifications  = args.required_verifications;
        asset.oracle_votes_count      = 0;
        asset.status                  = AssetStatus::PendingVerification;
        asset.war_risk_score          = 0;
        asset.war_risk_zone           = WarRiskZone::Green;
        asset.frontline_km            = 999;
        asset.registered_at           = clock.unix_timestamp;
        asset.bump                    = ctx.bumps.asset;

        registry.total_assets = registry
            .total_assets
            .checked_add(1)
            .ok_or(AssetError::Overflow)?;

        msg!("Asset registered: {}", asset.license_number);
        Ok(())
    }

    pub fn submit_oracle_vote(
        ctx: Context<SubmitOracleVote>,
        approved: bool,
        rationale_ipfs: String,
    ) -> Result<()> {
        require!(rationale_ipfs.len() <= 64, AssetError::StringTooLong);
        require!(
            ctx.accounts.asset.status == AssetStatus::PendingVerification,
            AssetError::InvalidStatus
        );

        let vote  = &mut ctx.accounts.oracle_vote;
        let clock = Clock::get()?;

        vote.asset          = ctx.accounts.asset.key();
        vote.oracle         = ctx.accounts.oracle.key();
        vote.approved       = approved;
        vote.rationale_ipfs = rationale_ipfs;
        vote.voted_at       = clock.unix_timestamp;
        vote.bump           = ctx.bumps.oracle_vote;

        // Інкремент лічильника голосів
        let asset = &mut ctx.accounts.asset;
        if approved {
            asset.oracle_votes_count = asset
                .oracle_votes_count
                .checked_add(1)
                .ok_or(AssetError::Overflow)?;
        }

        msg!("Oracle vote: approved={} votes={}/{}",
            approved, asset.oracle_votes_count, asset.required_verifications);
        Ok(())
    }

    pub fn finalize_verification(ctx: Context<AdminAction>) -> Result<()> {
        let asset = &mut ctx.accounts.asset;
        require!(
            asset.status == AssetStatus::PendingVerification,
            AssetError::InvalidStatus
        );
        require!(
            asset.oracle_votes_count >= asset.required_verifications,
            AssetError::InsufficientVotes
        );
        asset.status = AssetStatus::Verified;
        msg!("Asset verified: {}", asset.license_number);
        Ok(())
    }

    pub fn list_asset(ctx: Context<AdminAction>) -> Result<()> {
        let asset = &mut ctx.accounts.asset;
        require!(asset.status == AssetStatus::Verified, AssetError::InvalidStatus);
        asset.status = AssetStatus::Listed;
        msg!("Asset listed: {}", asset.license_number);
        Ok(())
    }

    pub fn update_war_risk(
        ctx: Context<AdminAction>,
        score: u8,
        zone: WarRiskZone,
        frontline_km: u16,
    ) -> Result<()> {
        require!(score <= 100, AssetError::InvalidWarRiskScore);
        let asset = &mut ctx.accounts.asset;

        if zone == WarRiskZone::Red && asset.status == AssetStatus::Listed {
            asset.status = AssetStatus::Paused;
            msg!("Asset auto-paused: RED zone");
        }
        if zone != WarRiskZone::Red && asset.status == AssetStatus::Paused {
            asset.status = AssetStatus::Listed;
            msg!("Asset resumed: zone improved");
        }

        asset.war_risk_score = score;
        asset.war_risk_zone  = zone;
        asset.frontline_km   = frontline_km;
        msg!("War risk: score={} frontline={}km", score, frontline_km);
        Ok(())
    }

    pub fn pause_asset(ctx: Context<AdminAction>) -> Result<()> {
        let asset = &mut ctx.accounts.asset;
        require!(asset.status == AssetStatus::Listed, AssetError::InvalidStatus);
        asset.status = AssetStatus::Paused;
        msg!("Asset paused: {}", asset.license_number);
        Ok(())
    }

    pub fn resume_asset(ctx: Context<AdminAction>) -> Result<()> {
        let asset = &mut ctx.accounts.asset;
        require!(asset.status == AssetStatus::Paused, AssetError::InvalidStatus);
        asset.status = AssetStatus::Listed;
        msg!("Asset resumed: {}", asset.license_number);
        Ok(())
    }
}

// ─── ACCOUNTS ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer  = admin,
        space  = AssetRegistryState::LEN,
        seeds  = [b"asset_registry"],
        bump
    )]
    pub registry:       Account<'info, AssetRegistryState>,
    #[account(mut)]
    pub admin:          Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(args: RegisterAssetArgs)]
pub struct RegisterAsset<'info> {
    #[account(
        init,
        payer = issuer,
        space = AssetAccount::LEN,
        seeds = [b"asset", args.license_number.as_bytes()],
        bump
    )]
    pub asset:          Account<'info, AssetAccount>,
    #[account(
        mut,
        seeds = [b"asset_registry"],
        bump  = registry.bump
    )]
    pub registry:       Account<'info, AssetRegistryState>,
    #[account(mut)]
    pub issuer:         Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitOracleVote<'info> {
    #[account(
        init,
        payer = oracle,
        space = OracleVote::LEN,
        seeds = [b"oracle_vote", asset.key().as_ref(), oracle.key().as_ref()],
        bump
    )]
    pub oracle_vote:    Account<'info, OracleVote>,
    #[account(
        mut,
        seeds = [b"asset", asset.license_number.as_bytes()],
        bump  = asset.bump
    )]
    pub asset:          Account<'info, AssetAccount>,
    #[account(mut)]
    pub oracle:         Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminAction<'info> {
    #[account(
        mut,
        seeds = [b"asset", asset.license_number.as_bytes()],
        bump  = asset.bump
    )]
    pub asset:    Account<'info, AssetAccount>,
    #[account(
        seeds  = [b"asset_registry"],
        bump   = registry.bump,
        has_one = admin @ AssetError::Unauthorized
    )]
    pub registry: Account<'info, AssetRegistryState>,
    pub admin:    Signer<'info>,
}

// ─── STATE ───────────────────────────────────────────────────────────────────

#[account]
pub struct AssetRegistryState {
    pub admin:        Pubkey,
    pub total_assets: u64,
    pub bump:         u8,
}
impl AssetRegistryState {
    pub const LEN: usize = 8 + 32 + 8 + 1 + 7;
}

#[account]
pub struct AssetAccount {
    pub issuer:                 Pubkey,
    pub license_number:         String,
    pub mineral_type:           MineralType,
    pub location_gps:           String,
    pub estimated_reserves:     u64,
    pub geological_report_ipfs: String,
    pub total_supply:           u64,
    pub tokens_sold:            u64,
    pub price_per_token:        u64,
    pub yield_bps:              u16,
    pub required_verifications: u8,
    pub oracle_votes_count:     u8,
    pub status:                 AssetStatus,
    pub war_risk_score:         u8,
    pub war_risk_zone:          WarRiskZone,
    pub frontline_km:           u16,
    pub registered_at:          i64,
    pub bump:                   u8,
}
impl AssetAccount {
    pub const LEN: usize = 8
        + 32
        + (4 + 32)
        + 1
        + (4 + 64)
        + 8
        + (4 + 64)
        + 8 + 8 + 8
        + 2 + 1 + 1 + 1 + 1 + 1
        + 2 + 8 + 1
        + 16;
}

#[account]
pub struct OracleVote {
    pub asset:          Pubkey,
    pub oracle:         Pubkey,
    pub approved:       bool,
    pub rationale_ipfs: String,
    pub voted_at:       i64,
    pub bump:           u8,
}
impl OracleVote {
    pub const LEN: usize = 8 + 32 + 32 + 1 + (4 + 64) + 8 + 1 + 6;
}

// ─── ARGS ────────────────────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RegisterAssetArgs {
    pub license_number:         String,
    pub mineral_type:           MineralType,
    pub location_gps:           String,
    pub estimated_reserves:     u64,
    pub geological_report_ipfs: String,
    pub total_supply:           u64,
    pub price_per_token:        u64,
    pub yield_bps:              u16,
    pub required_verifications: u8,
}

// ─── ENUMS ───────────────────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum AssetStatus {
    PendingVerification,
    Verified,
    Listed,
    PartialSold,
    InExtraction,
    Settled,
    Paused,
    Revoked,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum WarRiskZone {
    Green,
    Yellow,
    Orange,
    Red,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum MineralType {
    Lithium,
    Titanium,
    Gold,
    Iron,
    Coal,
    NaturalGas,
    Oil,
    Graphite,
    Uranium,
    Other,
}

// ─── ERRORS ──────────────────────────────────────────────────────────────────

#[error_code]
pub enum AssetError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("String too long")]
    StringTooLong,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Invalid supply")]
    InvalidSupply,
    #[msg("Verifications must be 3-5")]
    InvalidVerifications,
    #[msg("Invalid asset status")]
    InvalidStatus,
    #[msg("Insufficient oracle votes")]
    InsufficientVotes,
    #[msg("War risk score must be 0-100")]
    InvalidWarRiskScore,
    #[msg("Arithmetic overflow")]
    Overflow,
}
