import assert from 'node:assert/strict';

process.env.COREBRIDGE_API_KEY = 'test-key';
process.env.COREBRIDGE_BASE_URL = 'https://corebridge.test/api/public';
delete process.env.DASHBOARD_ORIGIN;

const calls = [];
globalThis.fetch = async url => {
  calls.push(String(url));
  return { ok: true, status: 200, text: async () => '[]' };
};

const module = await import('../api/corebridge.js');
const handler = module.default || module;

function responseMock() {
  const result = { headers: {}, statusCode: 200, body: undefined };
  return { result, setHeader(name, value) { result.headers[name] = value; }, status(code) { result.statusCode = code; return this; }, json(value) { result.body = value; }, send(value) { result.body = value; }, end() {} };
}

let response = responseMock();
await handler({ method: 'OPTIONS', query: {} }, response);
assert.equal(response.result.statusCode, 200);
assert.equal(response.result.headers['Access-Control-Allow-Methods'], 'GET, OPTIONS');

response = responseMock();
await handler({ method: 'GET', query: { endpoint: 'ExOrderProduct' } }, response);
assert.equal(response.result.statusCode, 200);
assert.equal(calls.length, 1);
assert.match(calls[0], /ExOrderProduct$/);

response = responseMock();
await handler({ method: 'GET', query: { endpoint: 'ExOrder', action: 'DeleteOrder' } }, response);
assert.equal(response.result.statusCode, 400);
assert.equal(calls.length, 1);

response = responseMock();
await handler({ method: 'POST', query: { endpoint: 'ExOrder' } }, response);
assert.equal(response.result.statusCode, 405);
assert.equal(calls.length, 1);

response = responseMock();
await handler({ method: 'GET', query: { endpoint: 'ExCustomer' } }, response);
assert.equal(response.result.statusCode, 400);
assert.equal(calls.length, 1);

console.log('Proxy security checks passed');