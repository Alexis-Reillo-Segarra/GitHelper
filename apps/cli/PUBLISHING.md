# Publicación en npm — PENDIENTE ⏳

El empaquetado de la CLI está **terminado y verificado standalone**, pero **todavía
no se ha publicado en npm**. Trabajo pausado aquí (2026-06-28).

## Qué falta

- [ ] Confirmar el usuario/org de npm y que coincide con el scope `@alexis-reillo`
      (si no, ajustar `name` en `apps/cli/package.json`).
- [ ] `npm login`.
- [ ] Publicar la primera versión:
      ```bash
      cd apps/cli
      pnpm build        # genera dist/ (lo hace también prepublishOnly)
      npm publish       # access public ya está en publishConfig
      ```
- [ ] Verificar: `npx @alexis-reillo/git-helper analyze -o vercel -r next.js -p <n>`.

## Opcional (más adelante)

- [ ] Comando `git-helper config` para guardar las claves en `~/.config/git-helper/.env`.
- [ ] GitHub Action que publique en npm en cada tag `v*`.

## Estado verificado

`npm pack` → instalación en carpeta limpia fuera del monorepo → `git-helper --help`
y `git-helper analyze --help` funcionan. Falta únicamente el `npm publish`.
