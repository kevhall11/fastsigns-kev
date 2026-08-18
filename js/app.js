import { apiFetch } from './api.js';
import { QUEUES, mapRecord } from './data.js';
import { dueLbl, fmtAmt, fmtAmtOrDash, fmtDate, initials } from './formatting.js';

let allOrders = [], allEstimates = [], allCompleted = [];
let activeQueue = 'all', searchQ = '', activeRep = 'all';
let activeOrderTab = 'active', orderSearch = '', estSearch = '', estFilter = 'all';
let currentItem = null;

function showLoader(text) {
  document.getElementById('loader').classList.add('open');
  document.getElementById('load-txt').textContent = text;
}
function hideLoader() { document.getElementById('loader').classList.remove('open'); }
function matches(item, query) {
  const value = query.toLowerCase();
  return item.customer.toLowerCase().includes(value) || item.num.toLowerCase().includes(value) || item.description.toLowerCase().includes(value);
}

async function loadAll() {
  const button = document.getElementById('refresh-btn');
  button.classList.add('spinning'); showLoader('Connecting to Corebridge...');
  allOrders = []; allEstimates = []; allCompleted = [];
  try {
    for (const status of ['WIP', 'BUILT']) {
      try {
        const items = await apiFetch('ExOrder', 'GetOrdersByStatus', `listOfStatus=${status}`);
        allOrders = allOrders.concat(items.map(item => mapRecord(item, 'order')));
      } catch (error) { console.warn(status, error.message); }
    }
    try {
      const items = await apiFetch('ExOrder', 'GetOrdersByStatus', 'listOfStatus=ESTIMATE');
      allEstimates = items.map(item => mapRecord(item, 'estimate'));
    } catch (error) { console.warn('ESTIMATE', error.message); }
    try {
      const items = await apiFetch('ExOrder', 'GetOrdersByStatus', 'listOfStatus=CLOSED');
      allCompleted = items.map(item => mapRecord(item, 'order'));
    } catch (error) { console.warn('CLOSED', error.message); }

    const seen = new Set();
    allOrders = allOrders.filter(item => !seen.has(item.id) && seen.add(item.id));
    renderAll(); buildRepFilters(); buildCustomerList();
    document.getElementById('sync-dot').className = 'sync-dot live';
    document.getElementById('sync-txt').textContent = `Live · ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  } catch (error) {
    console.error(error); document.getElementById('sync-txt').textContent = 'Error: ' + error.message;
  } finally { hideLoader(); button.classList.remove('spinning'); }
}

function renderAll() { renderQStats(); renderQTabs(); renderQGrid(); renderOrdersTable(); renderEstimates(); renderReports(); }
function renderQStats() {
  const all = [...allOrders, ...allEstimates];
  const counts = {
    total: allOrders.length, est: allEstimates.length,
    wip: allOrders.filter(item => item.cbS.includes('wip') || item.cbS.includes('production')).length,
    vended: all.filter(item => item.isVended).length, built: allOrders.filter(item => item.isBuilt).length,
    overdue: all.filter(item => item.isOverdue).length,
  };
  const stats = [['orange', 'Active Orders', counts.total, 'WIP + Built'], ['yellow', 'Estimates', counts.est, 'In pipeline'], ['blue', 'In Production', counts.wip, 'WIP jobs'], ['purple', 'Vended', counts.vended, 'Outsourced'], ['green', 'Built / Ready', counts.built, 'Awaiting pickup/install'], ['red', 'Overdue', counts.overdue, 'Past due date']];
  document.getElementById('q-stats').innerHTML = stats.map(([color, label, value, sub]) => `<div class="stat" style="--sc:var(--${color})"><div class="stat-lbl">${label}</div><div class="stat-val">${value}</div><div class="stat-sub">${sub}</div></div>`).join('');
}
function renderQTabs() {
  const all = [...allOrders, ...allEstimates];
  document.getElementById('q-tabs').innerHTML = QUEUES.map(queue => `<button class="qtab ${queue.id === activeQueue ? 'active' : ''}" style="--qc:${queue.color}" onclick="setQueue('${queue.id}')">${queue.name}<span class="qbadge">${queue.id === 'all' ? all.length : all.filter(queue.f).length}</span></button>`).join('');
}
function jobCard(item, color) {
  const due = dueLbl(item.dueDate, item.isBuilt);
  const tags = `${item.isVended ? '<span class="tag" style="background:rgba(168,85,247,.15);color:#C084FC">Outsourced</span>' : '<span class="tag" style="background:rgba(59,130,246,.15);color:#60A5FA">In-House</span>'}${item.type === 'estimate' ? '<span class="tag" style="background:rgba(255,184,0,.15);color:#FFB800">Estimate</span>' : ''}${item.isOverdue ? '<span class="tag" style="background:rgba(255,68,68,.15);color:#FF6B6B">Overdue</span>' : ''}${item.isDead ? '<span class="tag" style="background:rgba(100,100,100,.2);color:#888">Dead/Lost</span>' : ''}`;
  return `<div class="card" style="--cc:${color}" onclick="openModal('${item.id}','${item.type}')"><div class="card-num">${item.num}</div><div class="card-co">${item.customer}</div><div class="card-desc">${item.description}</div><div class="card-tags">${tags}</div><div class="card-foot"><span class="card-due ${due.cls}">${due.txt}</span>${fmtAmt(item.amount) ? `<span class="card-amt">${fmtAmt(item.amount)}</span>` : ''}</div><div class="card-rep"><div class="av">${initials(item.rep)}</div>${item.rep}</div>${item.createdDate ? `<div class="card-created">Created: ${fmtDate(item.createdDate)}</div>` : ''}</div>`;
}
function renderQGrid() {
  const queue = QUEUES.find(item => item.id === activeQueue);
  let items = [...allOrders, ...allEstimates].filter(queue.f);
  if (searchQ) items = items.filter(item => matches(item, searchQ));
  if (activeRep !== 'all') items = items.filter(item => item.rep === activeRep);
  document.getElementById('q-count').textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;
  document.getElementById('q-grid').innerHTML = items.length ? items.map(item => jobCard(item, queue.color)).join('') : '<div class="empty">No items in this queue</div>';
}
function renderOrdersTable() {
  const items = activeOrderTab === 'active' ? allOrders : allCompleted;
  const filtered = orderSearch ? items.filter(item => matches(item, orderSearch)) : items;
  document.getElementById('o-count').textContent = `${filtered.length} order${filtered.length !== 1 ? 's' : ''}`;
  document.getElementById('orders-body').innerHTML = filtered.length ? filtered.map(item => `<tr onclick="openModal('${item.id}','order')"><td class="mono">${item.num}</td><td><strong>${item.customer}</strong></td><td style="color:var(--muted)">${item.description}</td><td style="font-size:11px">${item.status}</td><td class="mono">${fmtDate(item.dueDate)}</td><td style="color:var(--orange);font-weight:700">${fmtAmt(item.amount)}</td><td style="color:var(--muted)">${item.rep}</td></tr>`).join('') : `<tr><td colspan="7" style="text-align:center;color:var(--dim);padding:30px">${activeOrderTab === 'active' ? 'No active orders' : 'No completed orders found'}</td></tr>`;
}
function renderEstimates() {
  const open = allEstimates.filter(item => !item.isDead), dead = allEstimates.filter(item => item.isDead);
  const totalOpen = open.reduce((sum, item) => sum + item.amount, 0);
  const rate = allEstimates.length ? Math.round((allCompleted.length / (allEstimates.length + allCompleted.length)) * 100) : 0;
  document.getElementById('est-summary').innerHTML = `<div class="est-stat"><div class="est-stat-val">${allEstimates.length}</div><div class="est-stat-lbl">Total Estimates</div><div class="est-stat-sub">All time</div></div><div class="est-stat"><div class="est-stat-val" style="color:var(--orange)">${fmtAmt(totalOpen) || '$0'}</div><div class="est-stat-lbl">Open Value</div><div class="est-stat-sub">Potential revenue</div></div><div class="est-stat"><div class="est-stat-val" style="color:var(--red)">${dead.length}</div><div class="est-stat-lbl">Dead / Lost</div><div class="est-stat-sub">Over 60 days old</div></div><div class="est-stat"><div class="est-stat-val" style="color:var(--green)">${rate}%</div><div class="est-stat-lbl">Conversion Rate</div><div class="est-stat-sub">Est → Job</div></div>`;
  let estimates = estFilter === 'open' ? open : estFilter === 'dead' ? dead : allEstimates;
  if (estSearch) estimates = estimates.filter(item => matches(item, estSearch));
  document.getElementById('est-count').textContent = `${estimates.length} estimate${estimates.length !== 1 ? 's' : ''}`;
  const buckets = [{ label: 'This Week', color: 'var(--green)', f: item => item.ageDays !== null && item.ageDays <= 7 }, { label: 'Last Week', color: 'var(--teal)', f: item => item.ageDays > 7 && item.ageDays <= 14 }, { label: '2–3 Weeks Ago', color: 'var(--yellow)', f: item => item.ageDays > 14 && item.ageDays <= 21 }, { label: '3–4 Weeks Ago', color: 'var(--orange)', f: item => item.ageDays > 21 && item.ageDays <= 30 }, { label: '1–2 Months Ago', color: 'var(--red)', f: item => item.ageDays > 30 && item.ageDays <= 60 }, { label: 'Dead / Lost', color: 'var(--dim)', f: item => item.isDead || item.ageDays === null }];
  document.getElementById('est-buckets').innerHTML = buckets.map(bucket => ({ ...bucket, items: estimates.filter(bucket.f) })).filter(bucket => bucket.items.length).map(bucket => `<div class="bucket-section"><div class="bucket-header"><div style="width:8px;height:8px;border-radius:50%;background:${bucket.color};flex-shrink:0"></div><div class="bucket-title">${bucket.label}</div><div class="bucket-badge">${bucket.items.length}</div><div class="bucket-val">${fmtAmt(bucket.items.reduce((sum, item) => sum + item.amount, 0))}</div></div><div class="tbl-wrap"><table><thead><tr><th>Est #</th><th>Customer</th><th>Description</th><th>Status</th><th>Created</th><th>Due</th><th>Amount</th><th>Rep</th></tr></thead><tbody>${bucket.items.map(item => `<tr onclick="openModal('${item.id}','estimate')"><td class="mono">${item.num}</td><td><strong>${item.customer}</strong></td><td style="color:var(--muted)">${item.description}</td><td style="font-size:11px">${item.status}</td><td class="mono">${fmtDate(item.createdDate)}</td><td class="mono">${fmtDate(item.dueDate)}</td><td style="color:var(--orange);font-weight:700">${fmtAmt(item.amount)}</td><td style="color:var(--muted)">${item.rep}</td></tr>`).join('')}</tbody></table></div></div>`).join('') || '<div class="empty" style="display:block">No estimates found</div>';
}
function buildCustomerList() {
  const customers = {};
  [...allOrders, ...allEstimates, ...allCompleted].forEach(item => {
    const key = item.customer;
    customers[key] ||= { name: key, phone: item.phone, email: item.email, contact: item.contact, orders: [], estimates: [], completed: [], totalRevenue: 0 };
    if (item.type === 'order' && !item.isBuilt && !allCompleted.some(completed => completed.id === item.id)) customers[key].orders.push(item);
    else if (item.type === 'estimate') customers[key].estimates.push(item);
    else customers[key].completed.push(item);
    if (item.type === 'order') customers[key].totalRevenue += item.amount;
  });
  window._custMap = customers;
  renderCustomerList(Object.values(customers).sort((a, b) => a.name.localeCompare(b.name)));
}
function renderCustomerList(customers) { document.getElementById('cust-items').innerHTML = customers.length ? customers.map(customer => `<div class="cust-item" onclick="selectCustomer('${encodeURIComponent(customer.name)}')"><div class="cust-name">${customer.name}</div><div class="cust-meta">${customer.orders.length} active · ${customer.estimates.length} est · ${fmtAmt(customer.totalRevenue) || '$0'}</div></div>`).join('') : '<div style="padding:20px;text-align:center;color:var(--dim);font-size:12px">No customers found</div>'; }
function filterCustomers(query) { renderCustomerList(Object.values(window._custMap || {}).filter(customer => customer.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name))); }
function selectCustomer(encodedName) {
  const customer = (window._custMap || {})[decodeURIComponent(encodedName)];
  if (!customer) return;
  document.querySelectorAll('.cust-item').forEach(element => element.classList.toggle('active', element.querySelector('.cust-name')?.textContent === customer.name));
  const jobs = [...customer.orders, ...customer.completed], total = jobs.reduce((sum, item) => sum + item.amount, 0);
  const section = (title, items, type) => items.length ? `<div class="section-title">${title}</div><div class="cust-jobs-list">${items.map(item => `<div class="cust-job-row" onclick="openModal('${item.id}','${type}')"><div class="cust-job-num">${item.num}</div><div><div class="cust-job-desc">${item.description}</div><div class="cust-job-status">${item.status}${item.createdDate ? ` · Created ${fmtDate(item.createdDate)}` : ''}</div></div><div class="cust-job-amt">${fmtAmt(item.amount)}</div></div>`).join('')}</div>` : '';
  document.getElementById('cust-detail').innerHTML = `<div class="cust-detail-header"><div class="cust-detail-name">${customer.name}</div><div class="cust-detail-meta">${customer.contact ? `<div class="cust-meta-item">👤 ${customer.contact}</div>` : ''}${customer.email ? `<div class="cust-meta-item">✉️ <a href="mailto:${customer.email}" style="color:var(--orange)">${customer.email}</a></div>` : ''}${customer.phone ? `<div class="cust-meta-item">📞 ${customer.phone}</div>` : ''}</div></div><div class="cust-stats"><div class="cust-stat"><div class="cust-stat-val">${jobs.length}</div><div class="cust-stat-lbl">Total Jobs</div></div><div class="cust-stat"><div class="cust-stat-val">${customer.estimates.length}</div><div class="cust-stat-lbl">Estimates</div></div><div class="cust-stat"><div class="cust-stat-val" style="color:var(--orange)">${fmtAmt(total) || '$0'}</div><div class="cust-stat-lbl">Total Revenue</div></div></div>${section('Active Orders', customer.orders, 'order')}${section('Estimates', customer.estimates, 'estimate')}${section('Past Jobs', customer.completed, 'order')}${!jobs.length && !customer.estimates.length ? '<div style="color:var(--dim);font-size:13px">No job history found</div>' : ''}`;
}
function renderReports() {
  const active = [...allOrders, ...allEstimates], byRep = {};
  allOrders.forEach(item => { byRep[item.rep] ||= { count: 0, amount: 0 }; byRep[item.rep].count++; byRep[item.rep].amount += item.amount; });
  const rows = QUEUES.filter(queue => queue.id !== 'all' && queue.id !== 'overdue').map(queue => { const count = allOrders.filter(queue.f).length; return count ? `<div class="rc-row"><span style="color:var(--muted)">${queue.name}</span><span style="font-weight:700">${count}</span></div>` : ''; }).join('');
  document.getElementById('report-grid').innerHTML = `<div class="rc"><div class="rc-title">Production Summary</div><div class="rc-big">${fmtAmt(allOrders.reduce((sum, item) => sum + item.amount, 0)) || '$0'}</div><div class="rc-sub">Active WIP value</div>${rows}</div><div class="rc"><div class="rc-title">By Sales Rep</div>${Object.entries(byRep).sort((a, b) => b[1].amount - a[1].amount).map(([rep, data]) => `<div class="rc-row"><span style="font-weight:600">${rep.split(' ')[0]}</span><div style="text-align:right"><div style="color:var(--orange);font-weight:700">${fmtAmt(data.amount)}</div><div style="font-size:10px;color:var(--dim)">${data.count} order${data.count !== 1 ? 's' : ''}</div></div></div>`).join('')}</div><div class="rc"><div class="rc-title">Estimate Pipeline</div><div class="rc-big" style="color:var(--yellow)">${fmtAmt(allEstimates.filter(item => !item.isDead).reduce((sum, item) => sum + item.amount, 0)) || '$0'}</div><div class="rc-sub">Open estimate value</div><div class="rc-row"><span style="color:var(--muted)">Total estimates</span><span style="font-weight:700">${allEstimates.length}</span></div><div class="rc-row"><span style="color:var(--muted)">Dead / Lost</span><span style="font-weight:700;color:var(--red)">${allEstimates.filter(item => item.isDead).length}</span></div><div class="rc-row"><span style="color:var(--muted)">Overdue items</span><span style="font-weight:700;color:var(--red)">${active.filter(item => item.isOverdue).length}</span></div></div>`;
}

function openModal(id, type) {
  currentItem = [...allOrders, ...allEstimates, ...allCompleted].find(item => item.id === id && item.type === type) || [...allOrders, ...allEstimates, ...allCompleted].find(item => item.id === id);
  if (!currentItem) return;
  const values = { 'm-num': currentItem.num, 'm-co': currentItem.customer, 'm-desc': currentItem.description, 'm-amt': fmtAmtOrDash(currentItem.amount), 'm-status': currentItem.status || '—', 'm-rep': currentItem.rep || '—', 'm-due': fmtDate(currentItem.dueDate), 'm-created': fmtDate(currentItem.createdDate), 'm-contact': currentItem.contact || '—', 'm-email': currentItem.email || '—', 'm-type': currentItem.isVended ? '🏭 Outsourced' : '🏠 In-House', 'm-phone': currentItem.phone || '—' };
  Object.entries(values).forEach(([id, value]) => { document.getElementById(id).textContent = value; });
  document.getElementById('modal').classList.add('open');
}
function closeModal() { document.getElementById('modal').classList.remove('open'); currentItem = null; }
function copyNum() { if (currentItem) navigator.clipboard.writeText(currentItem.num).then(() => alert('Copied: ' + currentItem.num)); }
function findInstaller() { window.open('https://www.google.com/search?q=sign+installer+near+Eatontown+NJ', '_blank'); }
function findVendor() { if (currentItem) window.open(`https://www.google.com/search?q=${encodeURIComponent(currentItem.description + ' sign wholesale vendor')}`, '_blank'); }
function setQueue(id) { activeQueue = id; renderQTabs(); renderQGrid(); }
function setSearch(query) { searchQ = query; renderQGrid(); }
function setOrderTab(tab, button) { activeOrderTab = tab; document.querySelectorAll('.stab').forEach(item => item.classList.remove('active')); button.classList.add('active'); renderOrdersTable(); }
function filterOrders(query) { orderSearch = query; renderOrdersTable(); }
function filterEstimates(query) { estSearch = query; renderEstimates(); }
function setEstFilter(filter, button) { estFilter = filter; document.querySelectorAll('#page-estimates .pill').forEach(item => item.classList.remove('on')); button.classList.add('on'); renderEstimates(); }
function buildRepFilters() {
  const reps = [...new Set(allOrders.map(item => item.rep).filter(Boolean))].sort();
  if (reps.length < 2) return;
  document.getElementById('rep-btns').innerHTML = `<button class="pill on" onclick="setRep('all',this)">All</button>${reps.map(rep => `<button class="pill" onclick="setRep('${rep}',this)">${rep.split(' ')[0]}</button>`).join('')}`;
}
function setRep(rep, button) { activeRep = rep; document.querySelectorAll('#rep-btns .pill').forEach(item => item.classList.remove('on')); button.classList.add('on'); renderQGrid(); }
function showPage(name, button) { document.querySelectorAll('.page').forEach(page => page.classList.remove('active')); document.querySelectorAll('.nav-tab').forEach(item => item.classList.remove('active')); document.getElementById('page-' + name).classList.add('active'); button.classList.add('active'); }

Object.assign(window, { loadAll, showPage, setQueue, setSearch, setOrderTab, filterOrders, filterEstimates, setEstFilter, setRep, filterCustomers, selectCustomer, openModal, closeModal, copyNum, findInstaller, findVendor });
window.addEventListener('DOMContentLoaded', loadAll);
