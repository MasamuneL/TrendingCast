use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::TrendingCastError;
use crate::state::Recommendation;

#[derive(Accounts)]
#[instruction(timestamp: i64)]
pub struct SaveRecommendation<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Recommendation::INIT_SPACE,
        seeds = [REC_SEED, streamer.key().as_ref(), &timestamp.to_le_bytes()],
        bump,
    )]
    pub recommendation: Account<'info, Recommendation>,

    /// CHECK: solo necesitamos la pubkey del streamer para derivar el PDA; el seed lo valida
    pub streamer: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<SaveRecommendation>,
    timestamp: i64,
    topics: Vec<String>,
    best_hour: u8,
    template_text: String,
) -> Result<()> {
    require!(timestamp > 0, TrendingCastError::InvalidTimestamp);
    require!(best_hour < 24, TrendingCastError::InvalidHour);
    require!(topics.len() <= 3, TrendingCastError::InvalidTopics);
    for t in &topics {
        require!(t.len() <= 64, TrendingCastError::InvalidTopics);
    }
    require!(template_text.len() <= 256, TrendingCastError::TemplateContentTooLong);

    let rec = &mut ctx.accounts.recommendation;
    rec.streamer = ctx.accounts.streamer.key();
    rec.topics = topics;
    rec.best_hour = best_hour;
    rec.template_text = template_text;
    rec.timestamp = timestamp;
    rec.bump = ctx.bumps.recommendation;

    msg!(
        "Recomendación guardada para {} — mejor hora: {}h",
        rec.streamer,
        rec.best_hour
    );
    msg!("Topics: {} items, timestamp: {}", rec.topics.len(), timestamp);

    Ok(())
}
