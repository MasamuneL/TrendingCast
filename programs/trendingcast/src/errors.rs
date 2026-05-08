use anchor_lang::prelude::*;

#[error_code]
pub enum TrendingCastError {
    #[msg("Categoría de streamer inválida (máx 32 chars)")]
    InvalidCategory,

    #[msg("Hora inválida (debe ser 0-23, máx 3 horas por perfil)")]
    InvalidHour,

    #[msg("Contenido del template demasiado largo (máx 256 chars)")]
    TemplateContentTooLong,

    #[msg("Precio demasiado bajo (mínimo 100_000 = $0.10 USDC)")]
    PriceTooLow,

    #[msg("Pago no verificado por x402 — el backend debe validar antes de llamar esta instrucción")]
    PaymentNotVerified,

    #[msg("Overflow en cálculo de reputación")]
    ReputationOverflow,

    #[msg("No autorizado para esta operación")]
    Unauthorized,
}
