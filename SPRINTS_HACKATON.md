# TrendingCast — Sprints del Hackathon

> Entrega: domingo al mediodía.
> Regla general: hoy código, mañana demo. Cero features nuevas el día de entrega.

---

# Día 1 — Sábado (hoy): construir

**Objetivo:** flow end-to-end funcionando antes de dormir.
Streamer conecta wallet → ve su recomendación del día → puede comprar un template.

---

## Primer paso obligatorio — 30 min todos juntos

Acordar el contrato de API antes de separarse. Con esto definido, frontend puede usar mocks y no espera al backend.

```
GET  /health                      → { status: "ok" }
GET  /recommendations/:wallet     → { topics: string[], bestHour: number, templateText: string, timestamp: number }
GET  /templates                   → [{ id, creator, content, category, price, totalSales }]
POST /buy/:templateId             → x402 flow (header X-PAYMENT) → { receipt: string }
```

---

## Carriles paralelos

### Carril A — Backend: capa Anchor + recomendaciones on-chain
**Quién:** la persona que conoce el smart contract (tú)

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

| Prioridad | Tarea | Archivo |
|-----------|-------|---------|
| 🔴 Crítico | Fetch top juegos/categorías de Twitch (`GET /helix/games/top`) | `backend/src/services/trending.ts` |
| 🔴 Crítico | Mapear categoría del perfil a tópicos trending | `backend/src/services/recommender.ts` |
| 🔴 Crítico | Calcular mejor hora según `StreamerProfile.hours` vs peak hours | `backend/src/services/recommender.ts` |
| 🔴 Crítico | Generar `templateText` listo para usar | `backend/src/services/recommender.ts` |
| 🟡 Importante | Endpoint interno `POST /internal/generate` que A llama | `backend/src/routes/internal.ts` |
| 🟢 Si hay tiempo | Cache de 1h para no hammear la API de Twitch | `backend/src/services/trending.ts` |

**Necesita:** `TWITCH_CLIENT_ID` + `TWITCH_CLIENT_SECRET` en `.env`.

**Desbloqueado cuando:** `recommender.ts` devuelve `{ topics, bestHour, templateText }` dado un `category`.

---

### Carril C — Frontend: dashboard + wallet
**Quién:** persona 3

| Prioridad | Tarea | Archivo |
|-----------|-------|---------|
| 🔴 Crítico | Scaffold `web/` — Vite + React + Tailwind | `web/` |
| 🔴 Crítico | Wallet adapter setup (Phantom) | `web/src/main.tsx` |
| 🔴 Crítico | Componente `WalletButton` (connect / disconnect) | `web/src/components/WalletButton.tsx` |
| 🔴 Crítico | Página `Dashboard` — topics del día, mejor hora, template sugerido | `web/src/pages/Dashboard.tsx` |
| 🔴 Crítico | Hook `useRecommendation(wallet)` — fetcha `GET /recommendations/:wallet` | `web/src/hooks/useRecommendation.ts` |
| 🟡 Importante | Estado de loading + error en Dashboard | `web/src/pages/Dashboard.tsx` |
| 🟢 Si hay tiempo | Conectar con backend real cuando Carril A esté listo | — |

**Mock mientras A no está listo:**
```ts
const MOCK = { topics: ["Minecraft", "Speedrun", "Clip reacción"], bestHour: 21, templateText: "Hoy a las 9pm: Top clips ¡reacciona conmigo!" }
```

---

### Carril D — Frontend: marketplace + compra x402
**Quién:** persona 4

| Prioridad | Tarea | Archivo |
|-----------|-------|---------|
| 🔴 Crítico | Setup `@x402/express` middleware en backend | `backend/src/index.ts` ← coordinar con A |
| 🔴 Crítico | Ruta `GET /templates` (sin paywall) | `backend/src/routes/templates.ts` |
| 🔴 Crítico | Handler `record_template_sale` on-chain | `backend/src/handlers/recordSale.ts` ← coordinar con A para PDAs |
| 🟡 Importante | Página `Marketplace` — lista templates con precio | `web/src/pages/Marketplace.tsx` |
| 🟡 Importante | Función `buyTemplate(templateId)` — flow x402 | `web/src/lib/buy.ts` |
| 🟢 Si hay tiempo | Página `Profile` — reputación + historial | `web/src/pages/Profile.tsx` |

**Nota:** usar `bypassPayment: true` si `NODE_ENV === 'development'` — no gastar USDC real en cada prueba.

---

## Dependencias entre carriles

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
Carril A ──expone── GET /templates + PDAs
                              │
                              ▼
Carril D ──construye UI────── Marketplace + buy flow
```

**Punto de integración:** cuando A y B terminen sus críticos, C conecta el hook real. Meta: antes de las 6pm para tener margen de debug.

---

## Variables de entorno

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

| Hora | Meta |
|------|------|
| Mediodía | Backend corre (`/health` ok). Frontend levanta con wallet connect. |
| 4pm | `GET /recommendations/:wallet` devuelve datos reales. Dashboard muestra recomendación. |
| 6pm | Flow completo integrado. Al menos una compra funciona (bypass en dev). |
| Noche | Bug fixes finales. **Código congelado.** No más features. |

---

---

# Día 2 — Domingo (mañana): demo y entrega

**Objetivo:** entregar con tiempo antes del mediodía. Sin prisas.
**Regla:** cero código nuevo. Solo fixes de bugs bloqueantes para la demo.

---

## Mañana temprano — Bug triage (todos, 20 min)

Cada carril reporta en el grupo:
- ¿Qué quedó roto o incompleto?
- ¿Bloquea la demo o es cosmético?

Priorizar solo lo que bloquea la demo. El resto se deja o se oculta en la UI.

---

## Tareas del día

| Prioridad | Tarea | Quién |
|-----------|-------|-------|
| 🔴 Crítico | Fixes de bugs bloqueantes identificados en el triage | quien corresponda |
| 🔴 Crítico | Smoke test completo: wallet → recomendación → compra | todos |
| 🔴 Crítico | Preparar script de demo (qué mostrar, en qué orden, quién habla) | 1 persona |
| 🔴 Crítico | Grabar demo | todos |
| 🟡 Importante | README final — pulir descripción, agregar gif/screenshot si hay | 1 persona |
| 🟡 Importante | Submit en la plataforma del hackathon | tú |
| 🟢 Si hay tiempo | Test de `distribute_rewards` — crear mint TREND en devnet | 1 persona |

---

## Script de demo sugerido

El orden que mejor muestra el valor del producto:

1. Abrir la app, conectar wallet Phantom
2. Mostrar el Dashboard — "estos son los tópicos trending hoy en tu categoría"
3. Mostrar la recomendación on-chain en Solana Explorer (prueba de que es inmutable)
4. Ir al Marketplace, elegir un template
5. Comprar con USDC — mostrar el flow x402 (o bypass en dev explicando que en prod usa el facilitator)
6. Mostrar que la reputación del creator subió on-chain

**Duración objetivo:** 2-3 minutos máximo.

---

## Lo que NO hacer mañana

- No agregar features que no estén ya empezadas hoy
- No tocar el smart contract — un deploy nuevo a esta altura rompe todo
- No instalar dependencias nuevas
- No refactorizar "mientras esperamos"

---

## Checkpoints del día

| Hora | Meta |
|------|------|
| 8am | Bug triage hecho. Lista corta de fixes. |
| 10am | Fixes aplicados. Smoke test pasando. |
| 11am | Demo grabada. README final commiteado. |
| 11:30am | Submit. Buffer de 30 min por si algo falla en la plataforma. |
