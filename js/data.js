import { daysSince, parseDate, today } from './formatting.js';

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
