import { daysSince, parseDate, today } from './formatting.js';

function textValue(value, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value.Name || value.DisplayName || value.EmployeeName || value.Text || [value.FirstName, value.LastName].filter(Boolean).join(' ') || fallback;
  return String(value);
}

export const QUEUES = [
  { id: 'all', name: 'All Active', color: 'var(--orange)', f: () => true },
  { id: 'sales', name: 'Sales Review', color: 'var(--pink)', f: j => j.cbS.includes('sales review') || j.cbS.includes('order review') || (j.cbS.includes('estimate') && !j.cbS.includes('awaiting') && !j.cbS.includes('approved') && !j.cbS.includes('revision') && !j.cbS.includes('cancelled') && !j.cbS.includes('design')) },
  { id: 'customer', name: 'Customer Action', color: 'var(--yellow)', f: j => j.cbS.includes('awaiting customer') || j.cbS.includes('customer action') || j.cbS.includes('awaiting proof') || j.cbS.includes('proof approved') },
  { id: 'design', name: 'In Design', color: 'var(--teal)', f: j => (j.cbS.includes('in design') && !j.cbS.includes('revision')) || j.cbS.includes('design review') || j.cbS.includes('quality control') },
  { id: 'revision', name: 'Design Revision', color: 'var(--orange)', f: j => j.cbS.includes('revision') },
  { id: 'production', name: 'In Production', color: 'var(--blue)', f: j => j.cbS === 'wip' || j.cbS.includes('in production') },
  { id: 'vended', name: 'Vended', color: 'var(--purple)', f: j => j.isVended },
  { id: 'built', name: 'Built / Ready', color: 'var(--green)', f: j => j.cbS.includes('built') || j.cbS.includes('awaiting installation') || j.cbS.includes('awaiting pickup') },
  { id: 'overdue', name: 'Overdue', color: 'var(--red)', f: j => j.isOverdue },
];

export function mapRecord(item, type) {
  const status = item.Status || '';
  const cbS = status.toLowerCase().trim();
  const dueDate = parseDate(item.EstimateProjectedOrderDueDate) || parseDate(item.OrderDueDate) || parseDate(item.DueDate);
  const createdDate = parseDate(item.DateCreated) || parseDate(item.DateConverted) || null;
  const isBuilt = cbS.includes('built');
  const isOverdue = dueDate && dueDate < today && !isBuilt;
  const isVended = cbS.includes('vend') || item.IsVended === true;
  const ageDays = createdDate ? daysSince(createdDate) : null;

  return {
    id: String(item.OrderId || item.Id || ''),
    num: type === 'estimate' && item.EstimateNumber ? `EST-${item.EstimateNumber}` : String(item.OrderId || ''),
    customer: item.CompanyName || item.CustomerName || item.OrderContact || '—',
    customerId: String(item.CustomerId || ''),
    contact: item.OrderContact || '', email: item.OrderContactEmail || '', phone: item.CompanyPhone || '',
    description: item.OrderDescription || item.OrderText || '—', status, cbS,
    rep: item.OrderSalesPerson || item.SalespersonName || '—', dueDate, createdDate, ageDays,
    amount: parseFloat(item.OrderSubTotal || item.OrderTotal || item.SubtotalAmount || 0),
    isVended, isBuilt, isOverdue, type, isDead: ageDays !== null && ageDays > 60,
  };
}

export function joinProductionData(products, parts, orders) {
  const ordersById = new Map(orders.map(order => [order.id, order]));
  const partsByProductId = new Map();
  parts.forEach(part => {
    const productId = String(part.OrderProductId || '');
    if (!partsByProductId.has(productId)) partsByProductId.set(productId, []);
    partsByProductId.get(productId).push(part);
  });

  return products.map(product => {
    const productId = String(product.ExOrderProductId || '');
    const order = ordersById.get(String(product.OrderId || ''));
    return {
      id: productId,
      orderId: String(product.OrderId || ''),
      order,
      description: textValue(product.ProductDescription || product.ProductSummary),
      category: textValue(product.ProductCategoryName),
      quantity: Number(product.ProductQuantity || 0),
      status: textValue(product.ProductStatusCBName || product.ProductStatus),
      designer: textValue(product.Designer),
      designDue: parseDate(product.ProductDesignDue),
      productionDue: parseDate(product.ProductProductionDue),
      productionLocation: textValue(product.ProductionLocationName),
      isVended: product.IsVended === true,
      subtotal: Number(product.ProductSubTotal || 0),
      total: Number(product.ProductTotal || 0),
      costTotal: Number(product.ProductCostTotal || 0),
      parts: partsByProductId.get(productId) || [],
    };
  });
}

export function summarizeProduction(products) {
  const summary = { revenue: 0, cost: 0, margin: 0, marginPercent: 0, parts: 0, partQuantity: 0, categories: {} };
  products.forEach(product => {
    summary.revenue += product.total;
    summary.cost += product.costTotal;
    summary.parts += product.parts.length;
    summary.partQuantity += product.parts.reduce((total, part) => total + Number(part.PartQuantity || 0), 0);
    summary.categories[product.category] = (summary.categories[product.category] || 0) + product.total;
  });
  summary.margin = summary.revenue - summary.cost;
  summary.marginPercent = summary.revenue ? Math.round((summary.margin / summary.revenue) * 100) : 0;
  return summary;
}
