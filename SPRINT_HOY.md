# Sprint de hoy — TrendingCast

> Objetivo del día: tener un flow end-to-end funcionando en demo.
> Streamer conecta wallet → ve su recomendación del día → puede comprar un template.

---

## Primer paso obligatorio — 30 min todos juntos

Antes de separarse, acordar el contrato de API para que frontend pueda trabajar con mocks mientras el backend no está listo:

```
GET  /health                          → { status: "ok" }
GET  /recommendations/:wallet         → { topics: string[], bestHour: number, templateText: string, timestamp: number }
GET  /templates                       → [{ id, creator, content, category, price, totalSales }]
POST /buy/:templateId                 → x402 flow (header X-PAYMENT) → { receipt: string }
```

Con esto acordado, frontend puede mockar las respuestas y avanzar sin esperar el backend.

---

## Carriles paralelos

### Carril A — Backend: capa Anchor + recomendaciones on-chain
**Quién:** la persona que conoce el smart contract (tú)

**Por qué este carril:** sos el que sabe los seeds exactos de los PDAs y la API del programa. Nadie más puede hacer esto sin bloqueos.

| Prioridad | Tarea | Archivo |
|-----------|-------|---------|
| 🔴 Crítico | Scaffold `backend/` — Express + TypeScript + tsconfig | `backend/src/index.ts` |
| 🔴 Crítico | Anchor provider + cliente del programa | `backend/src/solana/client.ts` |
| 🔴 Crítico | Derivación de PDAs (espejo exacto de los seeds del contrato) | `backend/src/solana/pdas.ts` |
| 🔴 Crítico | Handler `save_recommendation` on-chain | `backend/src/handlers/saveRecommendation.ts` |
| 🔴 Crítico | Ruta `GET /recommendations/:wallet` | `backend/src/routes/recommendations.ts` |
| 🟡 Importante | Handler `calculate_reputation` on-chain | `backend/src/handlers/updateReputation.ts` |
| 🟢 Si hay tiempo | `.env.example` con todas las vars | `backend/.env.example` |

**Desbloqueado cuando:** `GET /recommendations/:wallet` devuelve datos reales on-chain.

---

### Carril B — Backend: motor de trending
**Quién:** persona 2

**Por qué este carril:** es el cerebro del producto. No toca Solana — solo fetcha datos externos y produce el input que A guarda on-chain.

| Prioridad | Tarea | Archivo |
|-----------|-------|---------|
| 🔴 Crítico | Fetch top juegos/categorías de Twitch (`GET /helix/games/top`) | `backend/src/services/trending.ts` |
| 🔴 Crítico | Mapear categoría del perfil a tópicos trending | `backend/src/services/recommender.ts` |
| 🔴 Crítico | Calcular mejor hora según `StreamerProfile.hours` vs peak hours | `backend/src/services/recommender.ts` |
| 🔴 Crítico | Generar `templateText` listo para usar (puede ser string template simple) | `backend/src/services/recommender.ts` |
| 🟡 Importante | Endpoint interno `POST /internal/generate` que A llama para triggerear todo | `backend/src/routes/internal.ts` |
| 🟢 Si hay tiempo | Cache de 1h para no hammear la API de Twitch | `backend/src/services/trending.ts` |

**API de Twitch necesita:** `TWITCH_CLIENT_ID` + `TWITCH_CLIENT_SECRET` en `.env`. Docs: https://dev.twitch.tv/docs/api/reference/#get-top-games

**Desbloqueado cuando:** `recommender.ts` devuelve `{ topics, bestHour, templateText }` dado un `category`.

---

### Carril C — Frontend: dashboard + wallet
**Quién:** persona 3

**Por qué este carril:** puede arrancar con respuestas mockeadas del contrato de API acordado arriba. No necesita el backend real.

| Prioridad | Tarea | Archivo |
|-----------|-------|---------|
| 🔴 Crítico | Scaffold `web/` — Vite + React + Tailwind | `web/` |
| 🔴 Crítico | Wallet adapter setup (Phantom) | `web/src/main.tsx` |
| 🔴 Crítico | Componente `WalletButton` (connect / disconnect) | `web/src/components/WalletButton.tsx` |
| 🔴 Crítico | Página `Dashboard` — muestra topics del día, mejor hora, template sugerido | `web/src/pages/Dashboard.tsx` |
| 🔴 Crítico | Hook `useRecommendation(wallet)` — fetcha `GET /recommendations/:wallet` | `web/src/hooks/useRecommendation.ts` |
| 🟡 Importante | Estado de loading + error en Dashboard | `web/src/pages/Dashboard.tsx` |
| 🟢 Si hay tiempo | Conectar con backend real cuando Carril A esté listo | — |

**Mock sugerido mientras A no está listo:**
```ts
// web/src/hooks/useRecommendation.ts
const MOCK = { topics: ["Minecraft", "Speedrun", "Clip reacción"], bestHour: 21, templateText: "Hoy a las 9pm: Top clips ¡reacciona conmigo!" }
```

**Desbloqueado cuando:** Dashboard muestra datos (mock o real) con wallet conectada.

---

### Carril D — Frontend: marketplace + compra x402
**Quién:** persona 4

**Por qué este carril:** página secundaria del producto. Puede trabajar en paralelo con C usando el mismo scaffold que C levantó.

| Prioridad | Tarea | Archivo |
|-----------|-------|---------|
| 🔴 Crítico | Setup `@x402/express` middleware en backend | `backend/src/index.ts` ← coordinar con A |
| 🔴 Crítico | Ruta `GET /templates` (sin paywall) | `backend/src/routes/templates.ts` |
| 🔴 Crítico | Handler `record_template_sale` on-chain (post-pago) | `backend/src/handlers/recordSale.ts` ← coordinar con A para PDAs |
| 🟡 Importante | Página `Marketplace` — lista templates con precio | `web/src/pages/Marketplace.tsx` |
| 🟡 Importante | Función `buyTemplate(templateId)` — flow x402 | `web/src/lib/buy.ts` |
| 🟢 Si hay tiempo | Página `Profile` — reputación + historial | `web/src/pages/Profile.tsx` |

**Nota:** para dev local, activar `bypassPayment: true` si `NODE_ENV === 'development'` — así no gastan USDC real en cada prueba.

---

## Dependencias críticas entre carriles

```
Carril B ──produce── { topics, bestHour, templateText }
                              │
                              ▼
Carril A ──guarda on-chain── save_recommendation
                              │
                              ▼
Carril C ──muestra en UI──── Dashboard
```

```
Carril A ──expone── GET /templates, POST /buy
                              │
                              ▼
Carril D ──construye UI────── Marketplace + buy flow
```

**Punto de integración del día:** cuando A y B terminen sus partes críticas, C conecta el hook real. Meta: tenerlo integrado antes de las 6pm para tener margen de debug.

---

## Variables de entorno necesarias hoy

```env
# backend/.env
TRENDINGCAST_PROGRAM_ID=CewXVE956fdWcnTCZYHRtfFDdueG66fGLLoedSUMwffD
RPC_URL=https://api.devnet.solana.com
FACILITATOR_URL=https://x402.org/facilitator
USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
TWITCH_CLIENT_ID=<obtener en dev.twitch.tv>
TWITCH_CLIENT_SECRET=<obtener en dev.twitch.tv>
NODE_ENV=development

# web/.env
VITE_TRENDINGCAST_PROGRAM_ID=CewXVE956fdWcnTCZYHRtfFDdueG66fGLLoedSUMwffD
VITE_BACKEND_URL=http://localhost:3000
```

---

## Checkpoints del día

| Hora | Qué debe estar funcionando |
|------|---------------------------|
| Mediodía | Backend corre (`/health` responde). Frontend levanta con wallet connect. |
| 4pm | `GET /recommendations/:wallet` devuelve datos reales on-chain. Dashboard muestra recomendación. |
| 6pm | Flow completo integrado. Al menos una compra de template funciona (con bypass en dev). |
| Noche | Buffer para bugs. Código congelado. |

> Demo y README final → mañana por la mañana, antes del mediodía del domingo (entrega).
> No grabar con código inestable.
