# TrendSurge — Roadmap

Estado actual: smart contract deployado en devnet (7/8 tests passing). Backend y frontend pendientes.

---

## Completado

- [x] Smart contract — 5 instrucciones implementadas (Anchor 1.0.2, Rust)
- [x] Deploy a devnet — Program ID: `7us4TNvEtKYiq55ZKfAPztkCei8PpjwLsyCtuCLBAJaR`
- [x] Tests on-chain — 7 passing, 1 skip (`distribute_rewards` requiere mint TREND real)
- [x] README con setup guide y deployment addresses

---

## Pendiente

### Backend — `backend/` (Node 20 + Express + TypeScript)

**Core: motor de recomendaciones** (esto es el producto principal)

| Tarea | Archivo objetivo | Notas |
|-------|-----------------|-------|
| Fetch tópicos trending por categoría | `backend/src/services/trending.ts` | Fuente: Twitch Helix API, YouTube Trends, o Google Trends. Filtrar por categoría del streamer |
| Motor de recomendación: determinar mejor hora | `backend/src/services/recommender.ts` | Cruzar trending topics con `StreamerProfile.hours` para sugerir el mejor slot |
| Handler: guardar recomendación on-chain | `backend/src/handlers/saveRecommendation.ts` | Llama `save_recommendation` con topics + best_hour + template_text generado |
| Ruta pública: obtener recomendación del día | `backend/src/routes/recommendations.ts` | GET `/recommendations/:wallet` — devuelve la rec más reciente on-chain |

**Marketplace x402** (el plus)

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
| Variables de entorno | `backend/.env.example` | `TRENDSURGE_PROGRAM_ID`, `FACILITATOR_URL`, `RPC_URL` |

### Frontend — `web/` (React 18 + Vite + Tailwind)

| Tarea | Archivo objetivo | Notas |
|-------|-----------------|-------|
| Setup Vite + Tailwind + wallet adapter | `web/` | `@solana/wallet-adapter-react`, `@solana/wallet-adapter-phantom` |
| Componente: conectar wallet | `web/src/components/WalletButton.tsx` | Botón connect/disconnect |
| **Página: dashboard de recomendaciones** | `web/src/pages/Dashboard.tsx` | Vista principal — muestra topics del día, mejor hora, template sugerido |
| Página: marketplace de templates | `web/src/pages/Marketplace.tsx` | Lista templates con precio y creator |
| Flujo de compra x402 | `web/src/lib/buy.ts` | Llama backend con header `X-PAYMENT`; usa `x402-solana/client` |
| Página: perfil de streamer | `web/src/pages/Profile.tsx` | Muestra reputación, ventas, historial |
| Variables de entorno | `web/.env.example` | `VITE_TRENDSURGE_PROGRAM_ID`, `VITE_BACKEND_URL` |

### Integración y demo

| Tarea | Notas |
|-------|-------|
| Flow de recomendación end-to-end | Backend fetcha trends → guarda on-chain → frontend muestra al streamer |
| Flow de compra end-to-end | Frontend → Backend → x402 facilitator → on-chain |
| Test `distribute_rewards` | Crear mint TREND en devnet, ATA del streamer, llamar instrucción |
| Video demo | Mostrar: crear perfil → ver recomendación del día → comprar template → ver reputación |

---

## Arquitectura de referencia

```
[Frontend React]
      │
      ├── GET /recommendations/:wallet ──> [Backend Express]
      │                                          │
      │                                          ├──> Trending APIs (Twitch, YouTube, etc.)
      │                                          ├──> Recommendation engine (topics + best hour)
      │                                          └──> save_recommendation (on-chain)
      │
      └── POST /buy/:templateId ──────> [Backend + @x402/express]
                                               │
                                               ├──> [x402.org/facilitator] (verify + settle)
                                               └──> record_template_sale (on-chain)
```

El backend **nunca** mueve USDC directamente. El facilitator hace el settlement. El smart contract registra recomendaciones y recibos de pago como datos inmutables en devnet.
