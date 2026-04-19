# HNA Acadex Web

Next.js frontend for HNA Acadex, designed to run on Vercel and proxy API requests to the Django backend.

## Local development

1. Copy envs:
   ```bash
   cp .env.example .env.local
   ```
2. Start app:
   ```bash
   npm install
   npm run dev
   ```

## Production deployment (Vercel)

Set these environment variables in Vercel Project Settings:

```env
NEXT_PUBLIC_API_URL=https://hna-acadex-backend-production-df16.up.railway.app
NEXT_PUBLIC_SITE_URL=https://<your-vercel-domain>
```

### Notes

- `NEXT_PUBLIC_API_URL` must be the backend origin only (no `/api` suffix).
- API calls go to `/api/*` on the frontend and are rewritten server-side to the backend origin.
- Non-localhost `http://` backend URLs are auto-normalized to `https://` in build config to avoid mixed-content and secure-cookie issues.

## Backend settings required for web auth/cookies

On your backend environment, ensure:

```env
CORS_ALLOW_ALL_ORIGINS=0
CORS_ALLOWED_ORIGINS=https://<your-vercel-domain>
CSRF_TRUSTED_ORIGINS=https://<your-vercel-domain>,https://hna-acadex-backend-production-df16.up.railway.app
FRONTEND_URL=https://<your-vercel-domain>
```

## Build commands

```bash
npm run build
npm run start
```
