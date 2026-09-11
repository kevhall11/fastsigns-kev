// Vercel Serverless Function — Corebridge API Proxy
module.exports = async function handler(req, res) {
  if (process.env.DASHBOARD_ORIGIN) res.setHeader('Access-Control-Allow-Origin', process.env.DASHBOARD_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const API_KEY = process.env.COREBRIDGE_API_KEY;
  const BASE_URL = process.env.COREBRIDGE_BASE_URL || 'https://fs2498.v2api.corebridge.net/api/public';

  if (!API_KEY) return res.status(500).json({ error: 'COREBRIDGE_API_KEY is not configured' });

  const queryValue = value => Array.isArray(value) ? value[0] : value;
  const endpoint = queryValue(req.query.endpoint) || 'ExOrder';
  const action = queryValue(req.query.action) || '';
  const allowedBases = new Set(['ExOrder', 'ExOrderProduct', 'ExOrderProductPart']);
  const allowedActions = new Set(['', 'GetOrdersByStatus']);
  if (!allowedBases.has(endpoint)) return res.status(400).json({ error: 'Endpoint not allowed' });
  if (!allowedActions.has(action)) return res.status(400).json({ error: 'Action not allowed' });

  const params = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(req.query)) {
    const value = queryValue(rawValue);
    if (key !== 'endpoint' && key !== 'action' && value !== undefined) params.set(key, String(value));
  }
  const resource = action ? `${endpoint}/${action}` : endpoint;
  const url = `${BASE_URL.replace(/\/$/, '')}/${resource}${params.toString() ? `?${params}` : ''}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `BASIC ${API_KEY}`, ApiTag: API_KEY, Accept: 'application/json' },
    });
    const text = await response.text();
    if (!response.ok) return res.status(response.status).json({ error: 'CoreBridge API error', status: response.status });
    try { return res.status(200).json(JSON.parse(text)); } catch { return res.status(200).send(text); }
  } catch (error) {
    return res.status(502).json({ error: 'Unable to reach CoreBridge', message: error.message });
  }
};
