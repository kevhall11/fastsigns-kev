import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const formatting = await readFile(new URL('../js/formatting.js', import.meta.url), 'utf8');
const requiredHandlers = ['loadAll', 'showPage', 'setQueue', 'setSearch', 'setOrderTab', 'filterOrders', 'filterEstimates', 'setEstFilter', 'setRep', 'filterCustomers', 'selectCustomer', 'openModal', 'closeModal', 'copyNum', 'findInstaller', 'findVendor'];

assert.match(html, /<link rel="stylesheet" href="\/css\/styles\.css">/);
assert.match(html, /<script type="module" src="\/js\/app\.js"><\/script>/);
assert.doesNotMatch(html, /<style\b|<script>(?! type)/);
assert.equal((html.match(/<!DOCTYPE html>/gi) || []).length, 1);
assert.equal((html.match(/<head>/gi) || []).length, 1);
assert.equal((html.match(/<body>/gi) || []).length, 1);
assert.equal((html.match(/<script type="module"/gi) || []).length, 1);
assert.match(formatting, /export function escapeHtml/);
for (const handler of requiredHandlers) assert.match(app, new RegExp(`\\b${handler}\\b`));
console.log('Frontend extraction smoke check passed');
