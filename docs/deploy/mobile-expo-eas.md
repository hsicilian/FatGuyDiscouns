# Mobile deployment

## Expo / EAS target

- App config: `apps/mobile/app.config.ts`
- Build profiles: `apps/mobile/eas.json`

## Required environment variables

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Recommended next steps before first mobile build

1. Run `npm install`.
2. Launch with `npm run dev:mobile`.
3. Create an EAS project and replace the placeholder `projectId` in `app.config.ts`.
4. Confirm auth session persistence approach for React Native.
5. Replace mocked mobile auth/data helpers with live Supabase session logic.

