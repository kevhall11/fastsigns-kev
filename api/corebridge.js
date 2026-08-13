// Vercel Serverless Function — Corebridge API Proxy
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const API_KEY = '3e6ed1d8-a81a-4fbb-9fbe-f33dff30ad6d';
  const BASE_URL = 'https://fs2498.v2api.corebridge.net/api/public';

  // endpoint = base (e.g. ExOrder)
  // action = sub-path (e.g. GetOrdersByStatus)
  const endpoint = req.query.endpoint || 'ExOrder';
  const action = req.query.action || '';

  const allowedBases = [
    'ExOrder', 'ExOrderDetail', 'ExOrderProduct', 'ExOrderProductPart',
    'ExEstimate', 'ExCustomer', 'ExEmployee', 'ExSalesperson',
    'ExVendorPurchaseOrder', 'ExContact'
  ];

  if (!allowedBases.includes(endpoint)) {
    return res.status(400).json({ error: 'Endpoint not allowed: ' + endpoint });
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
      method: req.method === 'POST' ? 'POST' : 'GET',
      headers: {
        'Authorization': `BASIC ${API_KEY}`,
        'ApiTag': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    // Forward POST body if present
    if (req.method === 'POST' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

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
