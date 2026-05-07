use anchor_lang::prelude::*;

declare_id!("BMGvHfz7P9qVkYLexVtX7c1Vp8VWL6PAG5UrASmdw15u");

#[program]
pub mod marketplace {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin          = ctx.accounts.admin.key();
        config.total_listings = 0;
        config.bump           = ctx.bumps.config;
        msg!("Marketplace initialized");
        Ok(())
    }

    pub fn create_listing(
        ctx: Context<CreateListing>,
        price_per_token: u64,
        total_supply: u64,
        sale_end: i64,
    ) -> Result<()> {
        require!(price_per_token > 0, MarketError::InvalidPrice);
        require!(total_supply    > 0, MarketError::InvalidSupply);

        let listing = &mut ctx.accounts.listing;
        let config  = &mut ctx.accounts.config;

        listing.asset_pda       = ctx.accounts.asset_pda.key();
        listing.issuer          = ctx.accounts.issuer.key();
        listing.price_per_token = price_per_token;
        listing.total_supply    = total_supply;
        listing.tokens_sold     = 0;
        listing.total_raised    = 0;
        listing.sale_end        = sale_end;
        listing.active          = true;
        listing.created_at      = Clock::get()?.unix_timestamp;
        listing.bump            = ctx.bumps.listing;

        config.total_listings = config
            .total_listings
            .checked_add(1)
            .ok_or(MarketError::Overflow)?;

        msg!("Listing created: {} tokens @ {} USDC", total_supply, price_per_token);
        Ok(())
    }

    pub fn record_purchase(
        ctx: Context<RecordPurchase>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, MarketError::InvalidAmount);

        let listing = &ctx.accounts.listing;
        require!(listing.active, MarketError::ListingNotActive);
        require!(
            listing.tokens_sold.checked_add(amount).unwrap() <= listing.total_supply,
            MarketError::InsufficientSupply
        );

        let total_cost = listing.price_per_token
            .checked_mul(amount)
            .ok_or(MarketError::Overflow)?;

        let listing = &mut ctx.accounts.listing;
        listing.tokens_sold  = listing.tokens_sold.checked_add(amount).unwrap();
        listing.total_raised = listing.total_raised.checked_add(total_cost).unwrap();

        let purchase    = &mut ctx.accounts.purchase;
        purchase.listing    = ctx.accounts.listing.key();
        purchase.buyer      = ctx.accounts.buyer.key();
        purchase.amount     = amount;
        purchase.total_cost = total_cost;
        purchase.bought_at  = Clock::get()?.unix_timestamp;
        purchase.bump       = ctx.bumps.purchase;

        msg!("Purchase recorded: {} tokens | {} USDC", amount, total_cost);
        Ok(())
    }

    pub fn pause_listing(ctx: Context<AdminListing>) -> Result<()> {
        ctx.accounts.listing.active = false;
        msg!("Listing paused");
        Ok(())
    }

    pub fn resume_listing(ctx: Context<AdminListing>) -> Result<()> {
        ctx.accounts.listing.active = true;
        msg!("Listing resumed");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = admin, space = MarketConfig::LEN,
        seeds = [b"marketplace_config"], bump)]
    pub config:         Account<'info, MarketConfig>,
    #[account(mut)]
    pub admin:          Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateListing<'info> {
    #[account(init, payer = issuer, space = Listing::LEN,
        seeds = [b"listing", asset_pda.key().as_ref()], bump)]
    pub listing:        Account<'info, Listing>,
    #[account(mut, seeds = [b"marketplace_config"], bump = config.bump)]
    pub config:         Account<'info, MarketConfig>,
    /// CHECK: asset PDA from asset_registry
    pub asset_pda:      AccountInfo<'info>,
    #[account(mut)]
    pub issuer:         Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordPurchase<'info> {
    #[account(mut, seeds = [b"listing", listing.asset_pda.as_ref()], bump = listing.bump)]
    pub listing:        Account<'info, Listing>,
    #[account(init, payer = buyer, space = Purchase::LEN,
        seeds = [b"purchase", listing.key().as_ref(), buyer.key().as_ref()], bump)]
    pub purchase:       Account<'info, Purchase>,
    #[account(mut)]
    pub buyer:          Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminListing<'info> {
    #[account(mut, seeds = [b"listing", listing.asset_pda.as_ref()], bump = listing.bump)]
    pub listing:  Account<'info, Listing>,
    #[account(seeds = [b"marketplace_config"], bump = config.bump,
        has_one = admin @ MarketError::Unauthorized)]
    pub config:   Account<'info, MarketConfig>,
    pub admin:    Signer<'info>,
}

#[account]
pub struct MarketConfig {
    pub admin:          Pubkey,
    pub total_listings: u64,
    pub bump:           u8,
}
impl MarketConfig {
    pub const LEN: usize = 8 + 32 + 8 + 1 + 7;
}

#[account]
pub struct Listing {
    pub asset_pda:       Pubkey,
    pub issuer:          Pubkey,
    pub price_per_token: u64,
    pub total_supply:    u64,
    pub tokens_sold:     u64,
    pub total_raised:    u64,
    pub sale_end:        i64,
    pub active:          bool,
    pub created_at:      i64,
    pub bump:            u8,
}
impl Listing {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 8 + 1 + 6;
}

#[account]
pub struct Purchase {
    pub listing:    Pubkey,
    pub buyer:      Pubkey,
    pub amount:     u64,
    pub total_cost: u64,
    pub bought_at:  i64,
    pub bump:       u8,
}
impl Purchase {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 8 + 1 + 7;
}

#[error_code]
pub enum MarketError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Invalid supply")]
    InvalidSupply,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Listing not active")]
    ListingNotActive,
    #[msg("Insufficient supply")]
    InsufficientSupply,
    #[msg("Overflow")]
    Overflow,
}
