# Fringe — verify

Run the full take-home gate: typecheck, lint, format, tests, integrity guard.

```bash
npm run verify
```

Requires local Supabase (`supabase start`). Integrity guard fails the build if oversell, expired holds, timezones, or organiser RLS do not hold.
