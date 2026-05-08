# Entorno Solana

- Este proyecto es DEVNET ONLY. Antes de cualquier `anchor deploy` o `solana` command, verifica con `solana config get` que el RPC URL termina en `devnet`.
- Si vas a cambiar el cluster, hazlo explícito en el comando con `--provider.cluster devnet`, nunca confíes en el default global.
- El Program ID se declara una sola vez. Si se rompe el contrato y necesitas redesplegar, usa `anchor keys sync` y avisa al equipo — es un cambio breaking que rompe el frontend y backend.
- Nunca hardcodees el Program ID en código de cliente; léelo del IDL o de variables de entorno.