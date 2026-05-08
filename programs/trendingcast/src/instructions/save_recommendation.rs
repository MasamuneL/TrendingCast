use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::Recommendation;

#[derive(Accounts)]
#[instruction(timestamp: i64)]
pub struct SaveRecommendation<'info> {
    #[account(
        init,
        payer = streamer,
        space = 8 + Recommendation::INIT_SPACE,
        seeds = [REC_SEED, streamer.key().as_ref(), &timestamp.to_le_bytes()],
        bump,
    )]
    pub recommendation: Account<'info, Recommendation>,

    #[account(mut)]
    pub streamer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<SaveRecommendation>,
    timestamp: i64,
    topics: Vec<String>,
    best_hour: u8,
    template_text: String,
) -> Result<()> {
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
