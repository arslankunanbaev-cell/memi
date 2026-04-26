# Memi — Claude Code Guidelines

## Critical design values — DO NOT change without explicit user instruction

### Home.jsx typography
- `memi` logo title: `fontSize: 28, fontWeight: 600` (NOT 20/300/letterSpacing)
- Day group labels: `fontSize: 12, font-semibold` (NOT 10, NOT without font-semibold)

### Global padding conventions
- All page horizontal padding: `px-4` (NOT px-5, NOT px-8)
- All page top padding: `pt-topbar` class (NOT inline `paddingTop: max(1.25rem, ...)`, NOT `pt-safe`)
- `pt-topbar` is defined in globals.css as `padding-top: max(1.5rem, env(safe-area-inset-top))`

### Fonts
- `--font-sans`: Inter
- `--font-serif`: Cormorant Garamond (used for person names in People tab, memi logo)

### Color tokens (globals.css :root)
- `--base`: #F7F4F0
- `--surface`: #EDE6DC
- `--accent`: #D98B52
- `--deep`: #A05E2C
- `--text`: #17140E
- `--mid`: #8A7A6A
- `--soft`: #B8A898

## Architecture
- React + Vite + Tailwind v4
- State: Zustand (`src/store/useAppStore.js`)
- Backend: Supabase
- Target: Telegram WebApp (mobile-first, touch-friendly)

## Supabase Edge Functions deployment

### telegram-webhook — MUST use --no-verify-jwt
```
npx supabase functions deploy telegram-webhook --project-ref emzrhwfjovjlxncwbptl --no-verify-jwt
```
Telegram does not send a Supabase Authorization header. Without `--no-verify-jwt`
the Supabase gateway returns 401 before our code runs — payments completely break.

### All other functions (normal deploy)
```
npx supabase functions deploy <name> --project-ref emzrhwfjovjlxncwbptl
```

## Rules
- Always commit changes before ending a session — uncommitted changes get lost across sessions
- When changing fonts or colors, do NOT rewrite surrounding layout/spacing
- Safe area insets: use `pt-topbar` utility class, never inline `max(...)` expressions
