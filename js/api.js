const PROXY = '/api/corebridge';

export async function apiFetch(endpoint, action, extra) {
  let url = `${PROXY}?endpoint=${endpoint}`;
  if (action) url += `&action=${action}`;
  if (extra) url += `&${extra}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${endpoint}${action ? '/' + action : ''}: HTTP ${response.status}`);
  const data = await response.json();
  if (data && data.error) throw new Error(data.error);
  return Array.isArray(data) ? data : [];
}
