# apps/web — React frontend

## Development

```bash
# Root'dan:
pnpm install                 # barcha workspace deps
pnpm --filter @chdpu/web dev # dev server
```

Ochish: http://localhost:5173

## Struktura

```
src/
  main.tsx                 # React entry
  App.tsx                  # Asosiy sahifa (skelet)
  index.css                # Tailwind + CSS variables (light/dark)
  components/
    theme-toggle.tsx       # Sun/Moon/System
  hooks/
    use-theme.ts           # localStorage + matchMedia
  lib/
    utils.ts               # cn() — Tailwind class merger
```

## Design tokens

`src/index.css` da HSL CSS variables:
- `--primary` indigo-600
- `--success` emerald-600
- `--info` sky-600
- `.dark` selektorida alohida qiymatlar

Tailwind `colors.primary`, `colors.success`, `colors.info` ularni `hsl(var(--x))` orqali ishlatadi.

## Scripts

| Command | Nima qiladi |
|---|---|
| `pnpm dev` | Vite dev server (hot reload) |
| `pnpm build` | Production build (tsc + vite build) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript strict check |
