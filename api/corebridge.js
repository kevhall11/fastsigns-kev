const RESOURCES = new Set(['ExOrder', 'ExOrderProduct', 'ExOrderProductPart']);
const ACTIONS = new Set(['', 'GetOrdersByStatus']);

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

module.exports = async function corebridge(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (process.env.DASHBOARD_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', process.env.DASHBOARD_ORIGIN);
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.COREBRIDGE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'COREBRIDGE_API_KEY is not configured' });

  const query = req.query || Object.fromEntries(new URL(req.url || '/', 'http://localhost').searchParams);
  const endpoint = first(query.endpoint) || 'ExOrder';
  const action = first(query.action) || '';
  if (!RESOURCES.has(endpoint)) return res.status(400).json({ error: 'Endpoint not allowed' });
  if (!ACTIONS.has(action)) return res.status(400).json({ error: 'Action not allowed' });

  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(query)) {
    const value = first(raw);
    if (key !== 'endpoint' && key !== 'action' && value !== undefined) {
      params.set(key, String(value));
    }
  }

  const baseUrl = process.env.COREBRIDGE_BASE_URL
    || 'https://fs2498.v2api.corebridge.net/api/public';
  const resource = action ? `${endpoint}/${action}` : endpoint;
  const url = `${baseUrl.replace(/\/$/, '')}/${resource}${params.toString() ? `?${params}` : ''}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `BASIC ${apiKey}`,
        ApiTag: apiKey,
      },
    });
    const body = await response.text();
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'CoreBridge API error',
        status: response.status,
        details: body.slice(0, 500),
      });
    }
    try {
      return res.status(200).json(JSON.parse(body));
    } catch {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(body);
    }
  } catch (error) {
    return res.status(502).json({ error: 'Unable to reach CoreBridge', message: error.message });
  }
};
