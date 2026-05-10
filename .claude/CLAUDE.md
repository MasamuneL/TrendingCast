## Proyecto: TrendSurge
 
Sistema de recomendaciones de tópicos trending para streamers emergentes, construido en Solana. El backend analiza qué está en tendencia por categoría y guarda recomendaciones personalizadas on-chain (topics, mejor hora para streamear, template de contenido listo para usar). Como plus, los streamers pueden comprar y vender templates de contenido usando micropagos USDC vía el protocolo x402, con reputación calculada on-chain. Construido para el hackathon Dev3Pack.
 
**Estado actual:** Smart contract deployado en devnet. Backend funcionando con middleware x402 y handlers on-chain. Frontend con marketplace, perfil y wallet integration implementados. Rama activa: `fix/mvp-demo-critical-fixes`.
 
## Stack
 
- **Smart contract:** Rust + Anchor 1.0.2 en Solana devnet
- **Backend:** Node 20+ + Express + TypeScript + `@x402/express`
- **Frontend:** React 18 + Vite + Tailwind + `@solana/wallet-adapter-react` + `x402-solana/client`
- **Solana CLI:** 3.1.x (Agave)
- **Red:** Solana devnet exclusivamente. Nunca mainnet.
## Arquitectura
 
```
[Frontend React] ──fetch con x402──> [Backend Express + middleware @x402/express]
                                                │
                                                ├──> [x402.org facilitator] (verify + settle)
                                                │
                                                └──> [Programa Anchor en devnet]
                                                      - record_template_sale
                                                      - calculate_reputation
                                                      - distribute_rewards
```
 
El backend nunca mueve USDC directamente — el facilitator hace el settlement. El smart contract solo registra recibos y actualiza reputación después de que el middleware confirmó el pago.
 
## Layout del Repo
 
```
/
├── programs/trendsurge/   Programa Anchor (Rust)
│   └── src/
│       ├── lib.rs           Entry, declare_id, mod declarations
│       ├── state.rs         Account structs (StreamerProfile, Reputation, etc.)
│       ├── errors.rs        Errores custom
│       ├── constants.rs     Seeds y límites
│       └── instructions/    Un archivo por instrucción
├── backend/                 Express + x402 middleware
│   └── src/
│       ├── index.ts         App entry, config del middleware x402
│       ├── solana/          Anchor provider, PDAs, cliente del programa
│       ├── routes/          Endpoints públicos + paywalled
│       └── handlers/        Llamadas on-chain (registrar venta, actualizar reputación)
├── web/                     Frontend React
├── tests/                   Tests TypeScript de Anchor
└── .claude/rules/           Reglas de comportamiento (ver esos archivos)
```
 
## Conceptos del Dominio
 
- **Template:** Texto corto (≤256 chars) que un streamer compra. Tiene un tier (cheap=$0.10, premium=$0.50) y un creator. Almacenado on-chain como `StreamTemplate`.
- **Reputación:** Score calculado on-chain con la fórmula `success_rate * total_sales + tokens_earned/1e9 + total_purchases*2`. Aritmética saturating. Se recalcula después de cada venta.
- **Pago x402:** HTTP 402 + header `X-PAYMENT` con prueba de pago en base64. El middleware hace todo el handshake. Tu handler solo corre cuando el pago ya está verificado y settled.
- **PaymentReceipt:** Cuenta on-chain creada tras un pago x402 exitoso. Contiene buyer, creator, template, monto, signature de la tx x402.
## Comandos Clave
 
```bash
# Build + deploy del contrato a devnet
anchor build
anchor deploy --provider.cluster devnet
 
# Tests on-chain
anchor test --skip-local-validator --provider.cluster devnet
 
# Backend en dev
cd backend && npm run dev
 
# Frontend en dev
cd web && npm run dev
```
 
## Dependencias Externas Fijas
 
- **x402 facilitator:** `https://x402.org/facilitator` (público, gratis, soporta Solana devnet)
- **USDC devnet mint:** `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (Circle oficial)
- **Devnet RPC:** `https://api.devnet.solana.com`
- **Faucets:** SOL → faucet.solana.com, USDC → faucet.circle.com
## Program ID
 
Devnet: `7us4TNvEtKYiq55ZKfAPztkCei8PpjwLsyCtuCLBAJaR`
 
Si cambia este Program ID, actualizar en:
- `programs/trendsurge/src/lib.rs` (`declare_id!`)
- `Anchor.toml` (`[programs.devnet]`)
- `backend/.env` (`TRENDSURGE_PROGRAM_ID`)
- `web/.env` (`VITE_TRENDSURGE_PROGRAM_ID`)
## Convenciones
 
- Nombres de variables/funciones en inglés. Comentarios pueden ir en español.
- Commits en inglés, formato conventional commits. Ver `.claude/rules/commit-style.md`.
- Nunca commitear `.env`, `id.json`, ni nada en `target/deploy/*-keypair.json`.
- Trabajar siempre en feature branch, PR a main. Ver `.claude/rules/git-workflow.md`.
- Aritmética on-chain con `saturating_*` o `checked_*`. Nunca operadores raw en valores externos.
## Estado / TODO

Ver `ROADMAP.md` para el desglose completo por área y responsable.

- [x] Smart contract con 5 instrucciones implementadas
- [x] Deploy del contrato a devnet
- [x] README con setup guide y deployment addresses
- [x] Backend con middleware x402 funcionando
- [x] Handlers backend → Anchor (record_sale, update_reputation, save_recommendation)
- [x] API reference para el frontend (`backend/API.md`)
- [x] Frontend con marketplace, perfil y wallet integration (Anchor signer flow)
- [x] Trending endpoint + program ID mismatch corregidos
- [x] Security hardening (input validation, CORS, error leaking, payment bypass)
- [ ] Flow de compra end-to-end probado en devnet
- [ ] Video demo grabado
## Gotchas
 
- **`anchor build` genera un Program ID nuevo si no existe el keypair en `target/deploy/`.** Si cambia, sincronizar con `anchor keys sync` y actualizar todos los lugares listados arriba.
- **USDC tiene 6 decimales, no 9.** $0.10 = `100_000`, no `100_000_000`. Confundir esto rompe los pagos.
- **PDAs con `id` numérico usan little-endian:** `Buffer.alloc(4); buf.writeUInt32LE(id, 0)`. Si lo escribes en big-endian, los PDAs del frontend no matchean los del programa.
- **El facilitator espera direcciones Solana base58 en `payTo`.** Si pasas una address EVM (0x...), falla con un error confuso.
- **Anchor 1.0.2 cambió la firma del constructor `Program`:** ahora es `new Program(idl, provider)` — el program ID se lee del IDL. Si encuentras docs con `new Program(idl, programId, provider)`, son viejas.
- **El cluster de Solana se setea por comando, no por sesión.** Siempre incluir `--provider.cluster devnet` en deploys y tests para evitar accidentes.
- **`anchor deploy` falla si se pierde el keypair de upgrade authority.** Fix: `solana-keygen new --force` → nuevo Program ID → actualizar los 4 lugares. Para redeploys usar `solana program deploy target/deploy/trendsurge.so`, no `anchor program deploy` (falla al inicializar IDL en devnet).
- **`AccountInfo<'info>` está deprecado en Anchor 1.0.2.** Usar `UncheckedAccount<'info>` con `/// CHECK:` comment.
- **El backend no puede firmar como usuario.** Las instrucciones que antes requerían `buyer: Signer` o `streamer: Signer` usan `UncheckedAccount` para esos wallets y un `authority: Signer` (backend wallet) como pagador. La seguridad la da la derivación del PDA.
- **`HTTPFacilitatorClient` NO está en `@x402/express`.** Importar de `@x402/core/server`.
- **`@x402/express` requiere `"module": "Node16"` y `"moduleResolution": "node16"` en tsconfig.** Sus types son ESM-only.
- **Queries sin discriminador devuelven cuentas de otro tipo.** Usar `program.account.<nombre>.all([memcmp])` — nunca `connection.getProgramAccounts(...)` raw sin el filtro de discriminador de 8 bytes.
- **Twitch OAuth:** el token request va con `Content-Type: application/x-www-form-urlencoded` y params en el body, no en query string.
## Dónde Mirar Primero
 
- Lógica de verificación de pago: `backend/src/index.ts` (config del middleware)
- Llamadas on-chain: `backend/src/handlers/`
- Derivación de PDAs: `backend/src/solana/pdas.ts` (espejo en `web/lib/pdas.ts`)
- Lógica de instrucciones: `programs/trendsurge/src/instructions/<nombre>.rs`
- Reglas del proyecto: `.claude/rules/`
- Checklist de demo y plan completo: `IMPLEMENTACION_TRENDSURGE.md`
