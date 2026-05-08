use anchor_lang::prelude::*;

pub const PROFILE_SEED: &[u8] = b"profile";
pub const REPUTATION_SEED: &[u8] = b"reputation";
pub const TEMPLATE_SEED: &[u8] = b"template";
pub const PAYMENT_SEED: &[u8] = b"payment";
pub const REC_SEED: &[u8] = b"recommendation";
pub const MINT_AUTH_SEED: &[u8] = b"mint_authority";

// $0.10 USDC con 6 decimales
pub const MIN_TEMPLATE_PRICE: u64 = 100_000;

pub const MAX_HOURS_PER_PROFILE: usize = 3;

// 10 TREND tokens con 9 decimales
pub const REWARD_PER_SALE: u64 = 10_000_000_000;
