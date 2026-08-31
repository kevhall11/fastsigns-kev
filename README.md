# fastsigns-dashboard

## Local development

1. Copy `.env.example` to `.env` and set `COREBRIDGE_API_KEY`.
2. Run `npm start`.
3. Open `http://127.0.0.1:3000`.

The local Node server serves the static frontend and adapts `/api/corebridge` to the same handler used by Vercel. No dependencies or build step are required. Vercel can continue deploying `api/corebridge.js` automatically.

## CoreBridge pagination

CoreBridge returns 10 records by default. The API accepts `page` and `pageSize`; this dashboard requests `pageSize=100` and loads successive one-based pages until a response contains fewer than 100 records. This is the supported way to retrieve the complete result set; a server-side maximum cannot be bypassed from the client.

The current account was observed returning 112 `ExOrder` records, 58 `ExOrderProduct` records, and 200 `ExOrderProductPart` records across these pages. Counts can change as CoreBridge data changes.

## Vercel deployment

This repository is configured for Vercel with `vercel.json`. Vercel serves `index.html`, `css/`, and `js/` as static assets and deploys `api/corebridge.js` as a Node.js 20 serverless function. `server.js` is only used for local development.

Before deploying, add these project environment variables in Vercel under **Settings > Environment Variables** for the environments you use:

- `COREBRIDGE_API_KEY`: the private CoreBridge API key
- `COREBRIDGE_BASE_URL`: `https://fs2498.v2api.corebridge.net/api/public` (or your approved CoreBridge base URL)

Do not add the API key to `index.html`, files under `js/`, or any `NEXT_PUBLIC_`/client-exposed variable. The browser calls the same-origin `/api/corebridge` function, which adds the credential on the server. After deployment, verify the site loads and that `/api/corebridge?endpoint=ExOrder&page=1&pageSize=100` returns data.