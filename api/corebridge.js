// Vercel Serverless Function — Corebridge API Proxy
module.exports = async function handler(req, res) {
  if (process.env.DASHBOARD_ORIGIN) res.setHeader('Access-Control-Allow-Origin', process.env.DASHBOARD_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const API_KEY = process.env.COREBRIDGE_API_KEY;
  const BASE_URL = process.env.COREBRIDGE_BASE_URL || 'https://fs2498.v2api.corebridge.net/api/public';

  if (!API_KEY) {
    return res.status(500).json({ error: 'COREBRIDGE_API_KEY is not configured' });
  }

  // endpoint = base (e.g. ExOrder)
  // action = sub-path (e.g. GetOrdersByStatus)
  const endpoint = req.query.endpoint || 'ExOrder';
  const action = req.query.action || '';

  const allowedBases = ['ExOrder', 'ExOrderProduct', 'ExOrderProductPart'];
  const allowedActions = { ExOrder: new Set(['', 'GetOrdersByStatus']), ExOrderProduct: new Set(['']), ExOrderProductPart: new Set(['']) };

  if (!allowedBases.includes(endpoint)) {
    return res.status(400).json({ error: 'Endpoint not allowed: ' + endpoint });
  }
  if (!allowedActions[endpoint].has(action)) {
    return res.status(400).json({ error: 'Action not allowed: ' + action });
  }

  try {
    const params = Object.assign({}, req.query);
    delete params.endpoint;
    delete params.action;
    const qs = new URLSearchParams(params).toString();
    const path = action ? `${endpoint}/${action}` : endpoint;
    const url = `${BASE_URL}/${path}${qs ? '?' + qs : ''}`;

    console.log('Proxying to:', url);

    const fetchOptions = {
      method: 'GET',
      headers: {
        'Authorization': `BASIC ${API_KEY}`,
        'ApiTag': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const response = await fetch(url, fetchOptions);
    const text = await response.text();
    console.log('Status:', response.status, '| Preview:', text.substring(0, 200));

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Corebridge API error',
        status: response.status,
        detail: text,
        url_called: url
      });
    }

    try {
      return res.status(200).json(JSON.parse(text));
    } catch {
      return res.status(200).send(text);
    }

  } catch (err) {
    return res.status(500).json({ error: 'Proxy failed', message: err.message });
  }
};
