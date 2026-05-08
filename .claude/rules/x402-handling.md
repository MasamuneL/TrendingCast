# Manejo de x402

- Toda ruta protegida con paywall debe loggear: `txSignature`, `payer`, `amount`, y un timestamp. Nivel `info`.
- Si el `verify` del facilitator falla: devuelve 402 con razón clara, NO 500.
- Si el `settle` falla DESPUÉS de un verify exitoso: registra el incidente en logs como `error` y devuelve 200 con un flag `pendingSettlement: true`. El usuario ya pagó, no le digas que falló.
- Nunca llames a una instrucción del smart contract que mueva valor sin un payment verificado por el middleware. El middleware es la única fuente de verdad de que se cobró.
- Para testing local sin gastar USDC: usa el flag `bypassPayment: true` SOLO si `process.env.NODE_ENV === 'development'`.