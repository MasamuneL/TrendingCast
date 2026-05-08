# Dependencias

- No agregues paquetes nuevos sin avisar al equipo en el chat.
- Antes de agregar uno: revisa si alguno ya instalado lo resuelve.
- Para Solana/Anchor usa SOLO estas versiones:
  - `@coral-xyz/anchor` (no `@project-serum/anchor`, está deprecado)
  - `@solana/web3.js` v1.x (no v2 todavía, rompe muchas cosas)
  - `@solana/spl-token` última estable
- Para x402: `@x402/express`, `@x402/core`, `@x402/svm`. No mezcles con `x402-solana` (PayAI) en el mismo proyecto.