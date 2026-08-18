# fastsigns-dashboard

## Local development

1. Copy `.env.example` to `.env` and set `COREBRIDGE_API_KEY`.
2. Run `npm start`.
3. Open `http://127.0.0.1:3000`.

The local Node server serves the static frontend and adapts `/api/corebridge` to the same handler used by Vercel. No dependencies or build step are required. Vercel can continue deploying `api/corebridge.js` automatically.