# Testing

- Antes de pushear cambios al smart contract: corre `anchor test --skip-local-validator --provider.cluster devnet` y confirma que todo pasa.
- Antes de pushear cambios al backend: corre el endpoint `/health` localmente y al menos un flow de compra completo.
- Si agregas una instrucción nueva al programa, agrega su test correspondiente en el mismo PR.
- Tests skip-eados (`it.skip`) están permitidos pero deben tener un comentario `// TODO:` con razón.