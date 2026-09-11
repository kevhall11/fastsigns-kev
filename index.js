const fs = require('node:fs');
const path = require('node:path');

module.exports = function dashboard(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const document = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(req.method === 'HEAD' ? '' : document);
};
