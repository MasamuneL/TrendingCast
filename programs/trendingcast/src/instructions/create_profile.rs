use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::TrendingCastError;
use crate::state::StreamerProfile;

#[derive(Accounts)]
pub struct CreateProfile<'info> {
    #[account(
        init,
        payer = wallet,
        space = 8 + StreamerProfile::INIT_SPACE,
        seeds = [PROFILE_SEED, wallet.key().as_ref()],
        bump,
    )]
    pub profile: Account<'info, StreamerProfile>,

    #[account(mut)]
    pub wallet: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateProfile>, category: String, hours: Vec<u8>) -> Result<()> {
    require!(
        category.len() > 0 && category.len() <= 32 && category.bytes().any(|b| b != b' '),
        TrendingCastError::InvalidCategory
    );
    require!(
        hours.len() <= MAX_HOURS_PER_PROFILE,
        TrendingCastError::InvalidHour
    );
    for &h in &hours {
        require!(h < 24, TrendingCastError::InvalidHour);
    }

    let profile = &mut ctx.accounts.profile;
    profile.wallet = ctx.accounts.wallet.key();
    profile.category = category;
    profile.hours = hours;
    profile.created_at = Clock::get()?.unix_timestamp;
    profile.bump = ctx.bumps.profile;

    msg!("Perfil creado para wallet: {}", profile.wallet);
    msg!("Categoría: {}, horarios: {:?}", profile.category, profile.hours);

    Ok(())
}
