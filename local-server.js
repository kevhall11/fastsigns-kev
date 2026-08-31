const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

loadEnvFile(path.join(__dirname, '.env'));

const corebridgeHandler = require('./api/corebridge');
const publicRoot = __dirname;
const port = Number(process.env.PORT || 3000);
const host = '0.0.0.0';
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

function createResponse(response) {
  return {
    setHeader(name, value) { response.setHeader(name, value); },
    status(code) { response.statusCode = code; return this; },
    json(value) {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify(value));
    },
    send(value) { response.end(value); },
    end() { response.end(); },
  };
}

async function handleApi(request, response, url) {
  await corebridgeHandler(
    { method: request.method, query: Object.fromEntries(url.searchParams) },
    createResponse(response),
  );
}

function serveStatic(response, urlPath) {
  const requestedPath = urlPath === '/' ? '/index.html' : urlPath;
  const filePath = path.resolve(publicRoot, `.${requestedPath}`);
  if (!filePath.startsWith(`${publicRoot}${path.sep}`)) {
    response.writeHead(403); response.end('Forbidden'); return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) { response.writeHead(404); response.end('Not found'); return; }
    response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  try {
    if (url.pathname === '/api/corebridge') return await handleApi(request, response, url);
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
    }
    serveStatic(response, url.pathname);
  } catch (error) {
    if (!response.headersSent) response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(port, host, () => console.log(`FastSigns dashboard running at http://${host}:${port}`));