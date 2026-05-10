pub mod calculate_reputation;
pub mod create_profile;
pub mod distribute_rewards;
pub mod record_template_sale;
pub mod save_recommendation;

// Glob re-exports necesarios para que #[program] encuentre los tipos internos de Anchor
#[allow(ambiguous_glob_reexports)]
pub use calculate_reputation::*;
#[allow(ambiguous_glob_reexports)]
pub use create_profile::*;
#[allow(ambiguous_glob_reexports)]
pub use distribute_rewards::*;
#[allow(ambiguous_glob_reexports)]
pub use record_template_sale::*;
#[allow(ambiguous_glob_reexports)]
pub use save_recommendation::*;
