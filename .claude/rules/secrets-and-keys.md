# Secretos y Llaves

- NUNCA commitees archivos `.env`, `id.json`, ni ningún archivo con private keys o seed phrases.
- Antes de cualquier `git add .`, verifica con `git status` que no se cuele un secreto.
- El `.gitignore` debe incluir: `.env`, `.env.local`, `*.json` dentro de `target/deploy/*-keypair.json`, `node_modules/`, `target/`.
- Si accidentalmente se commitea una llave: avisa al equipo INMEDIATAMENTE, rota la wallet, y purga el commit con `git filter-repo` o BFG.
- Las wallets que toquen este repo son devnet-only y descartables. Nunca uses tu wallet personal con fondos reales.