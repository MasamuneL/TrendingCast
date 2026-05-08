# Estilo de Código

Rust (programs/):
- Usa `cargo fmt` antes de commitear.
- Usa `saturating_add`, `saturating_mul`, `checked_*` en cualquier aritmética con valores externos. Nunca `+`, `*` directos en u64/u32 que vengan del usuario.
- Usa `msg!` para logs en cada instrucción importante — ayuda a debuggear en Solana Explorer.
- Errores custom en `errors.rs`, nunca `unwrap()` en producción.

TypeScript (backend/, web/):
- `strict: true` en tsconfig. No uses `any` sin un comentario `// FIXME:` justificándolo.
- Promesas: siempre `await` con try/catch, nunca `.then().catch()` encadenados.
- Nombres en inglés (variables, funciones, archivos). Comentarios pueden estar en español.