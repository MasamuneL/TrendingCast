use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct StreamerProfile {
    pub wallet: Pubkey,
    #[max_len(32)]
    pub category: String,
    #[max_len(3)]
    pub hours: Vec<u8>,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct StreamerReputation {
    pub streamer: Pubkey,
    pub total_sales: u32,
    pub total_purchases: u32,
    // 0-100 representando el porcentaje de éxito
    pub success_rate: u8,
    pub tokens_earned: u64,
    pub reputation_score: u64,
    pub last_updated: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct StreamTemplate {
    pub id: u32,
    pub creator: Pubkey,
    #[max_len(256)]
    pub content: String,
    #[max_len(32)]
    pub category: String,
    // precio en lamports de USDC (6 decimales)
    pub price_lamports: u64,
    pub total_sales: u32,
    // 0-100
    pub rating: u8,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct X402PaymentReceipt {
    pub buyer: Pubkey,
    pub creator: Pubkey,
    pub template: Pubkey,
    pub amount: u64,
    // firma de la transacción x402 del facilitator
    #[max_len(128)]
    pub x402_tx_signature: String,
    // 0=Pending, 1=Verified, 2=Settled, 3=Failed
    pub status: u8,
    pub timestamp: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Recommendation {
    pub streamer: Pubkey,
    // máx 3 topics, cada uno máx 64 chars
    #[max_len(3, 64)]
    pub topics: Vec<String>,
    pub best_hour: u8,
    #[max_len(256)]
    pub template_text: String,
    pub timestamp: i64,
    pub bump: u8,
}
