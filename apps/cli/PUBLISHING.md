# Publicación en npm

✅ **Publicado.** La CLI está disponible en npm como
[`@alexis-reillo/git-helper`](https://www.npmjs.com/package/@alexis-reillo/git-helper).

```bash
npx @alexis-reillo/git-helper review -o vercel -r next.js -p 123
# o instalación global
npm i -g @alexis-reillo/git-helper
```

## Publicar una nueva versión

1. Sube la versión en `apps/cli/package.json` (`version`) y en el `.version()`
   de `src/index.ts`.
2. Publica (el `prepublishOnly` hace el build con tsup):
   ```bash
   pnpm --filter @alexis-reillo/git-helper publish --no-git-checks
   ```
   La cuenta tiene 2FA: añade `--otp=<código>` (de la app de autenticación o,
   en emergencia, un código de recuperación de un solo uso).

## Pendiente / opcional

- [ ] Tag `v0.1.0` + GitHub Release de la primera versión publicada.
- [ ] GitHub Action que publique en npm automáticamente en cada tag `v*`
      (requiere un **Granular Access Token** con permiso de publish y
      "bypass 2FA", guardado como secret `NPM_TOKEN`).
