const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

function getToken() {
  try {
    const raw = localStorage.getItem("hisabkitab_auth_session") || sessionStorage.getItem("hisabkitab_auth_session");
    return raw ? JSON.parse(raw)?.token : null;
  } catch {
    return null;
  }
}

function normalizeRecord(value) {
  if (Array.isArray(value)) return value.map(normalizeRecord);
  if (!value || typeof value !== "object") return value;
  const out = { ...value };
  if (out._id && !out.id) out.id = String(out._id);
  delete out._id;
  if (out.userId && typeof out.userId === "object" && out.userId._id) out.userId = String(out.userId._id);
  if (out.customerId && typeof out.customerId === "object" && out.customerId._id) out.customerId = String(out.customerId._id);
  if (out.supplierId && typeof out.supplierId === "object" && out.supplierId._id) out.supplierId = String(out.supplierId._id);
  if (out.transactionId && typeof out.transactionId === "object" && out.transactionId._id) out.transactionId = String(out.transactionId._id);
  return out;
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  let data = null;
  try { data = await response.json(); } catch { data = null; }
  if (!response.ok) {
    const error = new Error(data?.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return normalizeRecord(data);
}

export const api = {
  baseUrl: API_BASE,
  request,
  login: (identifier, pin) => request("/auth/login", { method: "POST", body: JSON.stringify({ identifier, pin }) }),
  me: () => request("/auth/me"),
  bootstrap: () => request("/bootstrap"),
  updateProfile: (payload) => request("/auth/profile", { method: "PUT", body: JSON.stringify(payload) }),
  updatePin: (currentPin, newPin) => request("/auth/pin", { method: "PUT", body: JSON.stringify({ currentPin, newPin }) }),
  customers: () => request("/customers"),
  createCustomer: (payload) => request("/customers", { method: "POST", body: JSON.stringify(payload) }),
  updateCustomer: (id, payload) => request(`/customers/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: "DELETE" }),
  customerTransactions: (id) => request(`/customers/${id}/transactions`),
  createCustomerTransaction: (id, payload) => request(`/customers/${id}/transactions`, { method: "POST", body: JSON.stringify(payload) }),
  suppliers: () => request("/suppliers"),
  createSupplier: (payload) => request("/suppliers", { method: "POST", body: JSON.stringify(payload) }),
  updateSupplier: (id, payload) => request(`/suppliers/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  updateSupplierStatus: (id, status) => request(`/suppliers/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deleteSupplier: (id) => request(`/suppliers/${id}`, { method: "DELETE" }),
  supplierTransactions: (id) => request(`/suppliers/${id}/transactions`),
  createPurchase: (id, payload) => request(`/suppliers/${id}/purchases`, { method: "POST", body: JSON.stringify(payload) }),
  createSupplierPayment: (id, payload) => request(`/suppliers/${id}/payments`, { method: "POST", body: JSON.stringify(payload) }),
  inventory: () => request("/inventory"),
  reports: () => request("/reports"),
  settings: () => request("/settings"),
  updateSettings: (payload) => request("/settings", { method: "PUT", body: JSON.stringify(payload) }),
};
