use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::TrendingCastError;
use crate::state::{StreamTemplate, StreamerReputation, X402PaymentReceipt};

#[derive(Accounts)]
#[instruction(template_id: u32)]
pub struct RecordTemplateSale<'info> {
    // El template se crea si no existe (primera compra crea el registro)
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + StreamTemplate::INIT_SPACE,
        seeds = [TEMPLATE_SEED, creator.key().as_ref(), &template_id.to_le_bytes()],
        bump,
    )]
    pub template: Account<'info, StreamTemplate>,

    // Recibo único por (buyer, template) — previene doble compra
    #[account(
        init,
        payer = buyer,
        space = 8 + X402PaymentReceipt::INIT_SPACE,
        seeds = [PAYMENT_SEED, buyer.key().as_ref(), template.key().as_ref()],
        bump,
    )]
    pub payment_receipt: Account<'info, X402PaymentReceipt>,

    // Reputación del creator (se crea si no existe)
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + StreamerReputation::INIT_SPACE,
        seeds = [REPUTATION_SEED, creator.key().as_ref()],
        bump,
    )]
    pub creator_reputation: Account<'info, StreamerReputation>,

    // Reputación del comprador (se crea si no existe)
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + StreamerReputation::INIT_SPACE,
        seeds = [REPUTATION_SEED, buyer.key().as_ref()],
        bump,
    )]
    pub buyer_reputation: Account<'info, StreamerReputation>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: solo necesitamos la pubkey del creator para derivar PDAs. No firman.
    pub creator: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RecordTemplateSale>,
    template_id: u32,
    amount: u64,
    x402_tx_signature: String,
    content: String,
    category: String,
    price_lamports: u64,
) -> Result<()> {
    // El backend NUNCA llama esto sin que x402 haya verificado y settled el pago.
    // Esta instrucción solo registra — el USDC ya fue movido por el facilitator.
    require!(price_lamports >= MIN_TEMPLATE_PRICE, TrendingCastError::PriceTooLow);

    let clock = Clock::get()?;

    // Inicializar template si es la primera vez
    let template = &mut ctx.accounts.template;
    if template.id == 0 && template.created_at == 0 {
        template.id = template_id;
        template.creator = ctx.accounts.creator.key();
        template.content = content;
        template.category = category;
        template.price_lamports = price_lamports;
        template.rating = 0;
        template.created_at = clock.unix_timestamp;
        template.bump = ctx.bumps.template;
        msg!("Template {} creado por {}", template_id, template.creator);
    }
    template.total_sales = template.total_sales.saturating_add(1);

    // Crear recibo de pago — prueba on-chain de que x402 procesó el pago
    let receipt = &mut ctx.accounts.payment_receipt;
    receipt.buyer = ctx.accounts.buyer.key();
    receipt.creator = ctx.accounts.creator.key();
    receipt.template = ctx.accounts.template.key();
    receipt.amount = amount;
    receipt.x402_tx_signature = x402_tx_signature;
    receipt.status = 2; // Settled
    receipt.timestamp = clock.unix_timestamp;
    receipt.bump = ctx.bumps.payment_receipt;

    // Actualizar estadísticas del creator
    let creator_rep = &mut ctx.accounts.creator_reputation;
    if creator_rep.streamer == Pubkey::default() {
        creator_rep.streamer = ctx.accounts.creator.key();
        creator_rep.success_rate = 100;
        creator_rep.bump = ctx.bumps.creator_reputation;
    }
    creator_rep.total_sales = creator_rep.total_sales.saturating_add(1);
    creator_rep.last_updated = clock.unix_timestamp;

    // Actualizar estadísticas del comprador
    let buyer_rep = &mut ctx.accounts.buyer_reputation;
    if buyer_rep.streamer == Pubkey::default() {
        buyer_rep.streamer = ctx.accounts.buyer.key();
        buyer_rep.success_rate = 100;
        buyer_rep.bump = ctx.bumps.buyer_reputation;
    }
    buyer_rep.total_purchases = buyer_rep.total_purchases.saturating_add(1);
    buyer_rep.last_updated = clock.unix_timestamp;

    msg!(
        "Venta registrada: template {} comprado por {}",
        template_id,
        ctx.accounts.buyer.key()
    );
    msg!(
        "Creator: {}, amount: {}, x402_sig: {}",
        ctx.accounts.creator.key(),
        amount,
        receipt.x402_tx_signature
    );

    Ok(())
}
