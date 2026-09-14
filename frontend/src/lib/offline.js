// Offline sync queue (localStorage-based)
const QUEUE_KEY = "asys_sync_queue";
const CACHE_KEY = "asys_read_cache";

export function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); }
  catch { return []; }
}

export function setQueue(q) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  window.dispatchEvent(new CustomEvent("asys-queue-change"));
}

export function enqueue(op) {
  const q = getQueue();
  const item = { ...op, client_id: crypto.randomUUID(), enqueued_at: new Date().toISOString(), status: "pending" };
  q.push(item);
  setQueue(q);
  return item;
}

export function removeFromQueue(clientId) {
  setQueue(getQueue().filter((o) => o.client_id !== clientId));
}

export function markConflict(clientId, error) {
  const q = getQueue().map((o) => o.client_id === clientId ? { ...o, status: "conflict", error } : o);
  setQueue(q);
}

export function cacheRead(key, data) {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    c[key] = { data, ts: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {}
}

export function getCachedRead(key) {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    return c[key]?.data;
  } catch { return null; }
}
