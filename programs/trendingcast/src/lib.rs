pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("7us4TNvEtKYiq55ZKfAPztkCei8PpjwLsyCtuCLBAJaR");

#[program]
pub mod trendingcast {
    use super::*;

    pub fn create_profile(
        ctx: Context<CreateProfile>,
        category: String,
        hours: Vec<u8>,
    ) -> Result<()> {
        create_profile::handler(ctx, category, hours)
    }

    pub fn save_recommendation(
        ctx: Context<SaveRecommendation>,
        timestamp: i64,
        topics: Vec<String>,
        best_hour: u8,
        template_text: String,
    ) -> Result<()> {
        save_recommendation::handler(ctx, timestamp, topics, best_hour, template_text)
    }

    pub fn record_template_sale(
        ctx: Context<RecordTemplateSale>,
        template_id: u32,
        amount: u64,
        x402_tx_signature: String,
        content: String,
        category: String,
        price_lamports: u64,
    ) -> Result<()> {
        record_template_sale::handler(
            ctx,
            template_id,
            amount,
            x402_tx_signature,
            content,
            category,
            price_lamports,
        )
    }

    pub fn calculate_reputation(ctx: Context<CalculateReputation>) -> Result<()> {
        calculate_reputation::handler(ctx)
    }

    pub fn distribute_rewards(ctx: Context<DistributeRewards>) -> Result<()> {
        distribute_rewards::handler(ctx)
    }
}
