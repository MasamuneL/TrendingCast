# GitHub Workflow

- Nunca trabajes directamente en `main`. Crea una branch por feature: `feat/nombre-corto`, `fix/nombre-corto`, `chore/nombre-corto`.
- Antes de empezar una nueva feature: `git checkout main && git pull`.
- Al terminar: abre un Pull Request a `main` con descripción breve (qué cambia, cómo probarlo).
- No mergees tu propio PR sin que al menos otra persona lo revise — excepto en hotfixes durante la demo en vivo.
- Si hay conflictos con `main`, rebase tu branch antes de pedir review: `git rebase main`.