# TrendingCast — Roadmap

Estado actual: smart contract deployado en devnet (7/8 tests passing). Backend y frontend pendientes.

---

## Completado

- [x] Smart contract — 5 instrucciones implementadas (Anchor 1.0.2, Rust)
- [x] Deploy a devnet — Program ID: `CewXVE956fdWcnTCZYHRtfFDdueG66fGLLoedSUMwffD`
- [x] Tests on-chain — 7 passing, 1 skip (`distribute_rewards` requiere mint TREND real)
- [x] README con setup guide y deployment addresses

---

## Pendiente

### Backend — `backend/` (Node 20 + Express + TypeScript)

| Tarea | Archivo objetivo | Notas |
|-------|-----------------|-------|
| Setup Express + `@x402/express` middleware | `backend/src/index.ts` | Configura `paymentMiddleware` con USDC mint devnet y facilitator URL |
| Anchor provider + cliente del programa | `backend/src/solana/client.ts` | Lee IDL del target, usa `new Program(idl, provider)` |
| Derivación de PDAs | `backend/src/solana/pdas.ts` | Espejo de los seeds del programa (profile, reputation, template, payment, rec) |
| Handler: registrar venta on-chain | `backend/src/handlers/recordSale.ts` | Llama `record_template_sale` post-pago verificado |
| Handler: actualizar reputación | `backend/src/handlers/updateReputation.ts` | Llama `calculate_reputation` tras cada venta |
| Ruta pública: listar templates | `backend/src/routes/templates.ts` | GET `/templates` — sin paywall |
| Ruta paywalled: comprar template | `backend/src/routes/buy.ts` | POST `/buy/:templateId` — con middleware x402 |
| Endpoint de health | `backend/src/routes/health.ts` | GET `/health` — responde 200, útil para demo |
| Variables de entorno | `backend/.env.example` | `TRENDINGCAST_PROGRAM_ID`, `FACILITATOR_URL`, `RPC_URL` |

### Frontend — `web/` (React 18 + Vite + Tailwind)

| Tarea | Archivo objetivo | Notas |
|-------|-----------------|-------|
| Setup Vite + Tailwind + wallet adapter | `web/` | `@solana/wallet-adapter-react`, `@solana/wallet-adapter-phantom` |
| Componente: conectar wallet | `web/src/components/WalletButton.tsx` | Botón connect/disconnect |
| Página: marketplace de templates | `web/src/pages/Marketplace.tsx` | Lista templates con precio y creator |
| Flujo de compra x402 | `web/src/lib/buy.ts` | Llama backend con header `X-PAYMENT`; usa `x402-solana/client` |
| Página: perfil de streamer | `web/src/pages/Profile.tsx` | Muestra reputación, ventas, historial |
| Variables de entorno | `web/.env.example` | `VITE_TRENDINGCAST_PROGRAM_ID`, `VITE_BACKEND_URL` |

### Integración y demo

| Tarea | Responsable | Notas |
|-------|------------|-------|
| Flow de compra end-to-end probado | — | Frontend → Backend → x402 facilitator → on-chain |
| Test `distribute_rewards` | — | Crear mint TREND en devnet, ATA del streamer, luego llamar la instrucción |
| Video demo grabado | — | Mostrar: crear perfil → listar template → comprar → ver reputación actualizada |

---

## Arquitectura de referencia

```
[Frontend React] ──fetch con X-PAYMENT──> [Backend Express + @x402/express]
                                                      │
                                                      ├──> [x402.org/facilitator] (verify + settle)
                                                      │
                                                      └──> [Programa Anchor en devnet]
                                                            record_template_sale
                                                            calculate_reputation
```

El backend **nunca** mueve USDC directamente. El facilitator hace el settlement. El smart contract solo registra recibos una vez que el middleware confirmó el pago.
