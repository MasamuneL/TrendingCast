use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};
use crate::constants::*;
use crate::errors::TrendingCastError;
use crate::state::StreamerReputation;

#[derive(Accounts)]
pub struct DistributeRewards<'info> {
    #[account(
        mut,
        seeds = [REPUTATION_SEED, streamer.key().as_ref()],
        bump = reputation.bump,
    )]
    pub reputation: Account<'info, StreamerReputation>,

    #[account(mut)]
    pub trend_mint: Account<'info, Mint>,

    // ATA del streamer para recibir TREND tokens
    #[account(
        mut,
        token::mint = trend_mint,
        token::authority = streamer,
    )]
    pub streamer_ata: Account<'info, TokenAccount>,

    /// CHECK: PDA que actúa como mint authority. Solo se usa como signer en CPI.
    #[account(
        seeds = [MINT_AUTH_SEED],
        bump,
    )]
    pub mint_authority: UncheckedAccount<'info>,

    pub streamer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<DistributeRewards>) -> Result<()> {
    require!(
        ctx.accounts.reputation.streamer == ctx.accounts.streamer.key(),
        TrendingCastError::Unauthorized
    );

    let mint_auth_bump = ctx.bumps.mint_authority;
    let signer_seeds: &[&[u8]] = &[MINT_AUTH_SEED, &[mint_auth_bump]];
    let signer = &[signer_seeds];

    // En anchor 1.0.2, CpiContext::new_with_signer toma Pubkey no AccountInfo
    let cpi_ctx = CpiContext::new_with_signer(
        anchor_spl::token::ID,
        MintTo {
            mint: ctx.accounts.trend_mint.to_account_info(),
            to: ctx.accounts.streamer_ata.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        },
        signer,
    );

    token::mint_to(cpi_ctx, REWARD_PER_SALE)?;

    let rep = &mut ctx.accounts.reputation;
    rep.tokens_earned = rep.tokens_earned.saturating_add(REWARD_PER_SALE);
    rep.last_updated = Clock::get()?.unix_timestamp;

    msg!(
        "Recompensa distribuida: {} TREND tokens (raw) para {}",
        REWARD_PER_SALE,
        rep.streamer
    );

    Ok(())
}
