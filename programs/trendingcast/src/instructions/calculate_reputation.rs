use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::StreamerReputation;

#[event]
pub struct ReputationUpdated {
    pub streamer: Pubkey,
    pub new_score: u64,
    pub timestamp: i64,
}

#[derive(Accounts)]
pub struct CalculateReputation<'info> {
    #[account(
        mut,
        seeds = [REPUTATION_SEED, streamer.key().as_ref()],
        bump = reputation.bump,
    )]
    pub reputation: Account<'info, StreamerReputation>,

    /// CHECK: el seed REPUTATION_SEED + streamer.key() ya vincula esta cuenta al streamer correcto
    pub streamer: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<CalculateReputation>) -> Result<()> {
    let rep = &mut ctx.accounts.reputation;

    // score = success_rate * total_sales + tokens_earned/1e9 + total_purchases * 2
    let score = (rep.success_rate as u64)
        .saturating_mul(rep.total_sales as u64)
        .saturating_add(rep.tokens_earned / 1_000_000_000)
        .saturating_add((rep.total_purchases as u64).saturating_mul(2));

    rep.reputation_score = score;
    rep.last_updated = Clock::get()?.unix_timestamp;

    msg!(
        "Reputación recalculada para {}: score = {}",
        rep.streamer,
        score
    );
    msg!(
        "  success_rate={} * total_sales={} + tokens={} + purchases*2={}",
        rep.success_rate,
        rep.total_sales,
        rep.tokens_earned / 1_000_000_000,
        (rep.total_purchases as u64).saturating_mul(2)
    );

    emit!(ReputationUpdated {
        streamer: rep.streamer,
        new_score: score,
        timestamp: rep.last_updated,
    });

    Ok(())
}
