import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { joinProductionData, mapRecord, summarizeProduction } from '../js/data.js';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const api = await readFile(new URL('../js/api.js', import.meta.url), 'utf8');
const data = await readFile(new URL('../js/data.js', import.meta.url), 'utf8');
const formatting = await readFile(new URL('../js/formatting.js', import.meta.url), 'utf8');
const requiredHandlers = ['loadAll', 'showPage', 'setQueue', 'setSearch', 'setOrderTab', 'filterOrders', 'filterProduction', 'setProductionQueue', 'filterEstimates', 'setEstFilter', 'setRep', 'filterCustomers', 'selectCustomer', 'openModal', 'closeModal', 'copyNum', 'findInstaller', 'findVendor'];

assert.match(html, /<link rel="stylesheet" href="\/css\/styles\.css">/);
assert.match(html, /<script type="module" src="\/js\/app\.js"><\/script>/);
assert.doesNotMatch(html, /<style\b|<script>(?! type)/);
assert.equal((html.match(/<!DOCTYPE html>/gi) || []).length, 1);
assert.equal((html.match(/<head>/gi) || []).length, 1);
assert.equal((html.match(/<body>/gi) || []).length, 1);
assert.equal((html.match(/<script type="module"/gi) || []).length, 1);
assert.match(formatting, /export function escapeHtml/);
assert.match(api, /export async function fetchProductionData/);
assert.match(data, /export function joinProductionData/);
assert.match(app, /joinProductionData\(production\.products, production\.parts/);
assert.match(html, /id="page-production"/);
assert.match(app, /function renderProduction/);
assert.match(html, /value="design-due"/);
assert.match(html, /value="production-due"/);
assert.match(html, /value="missing-dates"/);
const order = mapRecord({ OrderId: 42, CompanyName: 'Test Customer', Status: 'WIP' }, 'order');
const [production] = joinProductionData(
	[{ ExOrderProductId: 7, OrderId: 42, ProductDescription: 'Window graphic', ProductQuantity: '2', ProductStatus: 'In Production', Designer: { Name: 'Test Designer' } }],
	[{ ExOrderProductPartId: 8, OrderProductId: 7, PartName: 'Vinyl' }],
	[order],
);
assert.equal(production.order.customer, 'Test Customer');
assert.equal(production.quantity, 2);
assert.equal(production.designer, 'Test Designer');
assert.match(app, /daysUntil\(date\) >= 0 && daysUntil\(date\) <= 3/);
assert.match(app, /productionQueue === 'overdue'/);
assert.equal(production.parts[0].PartName, 'Vinyl');
const summary = summarizeProduction([{ ...production, category: 'Graphics', total: 100, costTotal: 40, parts: [{ PartQuantity: 2 }] }]);
assert.equal(summary.margin, 60);
assert.equal(summary.marginPercent, 60);
assert.equal(summary.parts, 1);
assert.equal(summary.partQuantity, 2);
assert.equal(summary.categories.Graphics, 100);
assert.match(app, /Product Margin/);
assert.match(app, /Parts Workload/);
for (const handler of requiredHandlers) assert.match(app, new RegExp(`\\b${handler}\\b`));
console.log('Frontend extraction smoke check passed');
