// frontend/src/api.js
// Cliente HTTP para comunicação com a Azure Functions API.
// Todos os pedidos incluem o Bearer token obtido via MSAL.js.

const API_BASE = window.APP_CONFIG?.apiBaseUrl || '__API_BASE_URL__';

async function apiRequest(method, path, body = null) {
  const token = await getAccessToken(); // de auth.js
  const opts  = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
  };
  if (body !== null) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);

  if (!res.ok) {
    let msg = `Erro ${res.status}`;
    try { const e = await res.json(); msg = e.error || msg; } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── PROCESSOS ────────────────────────────────────────────────────
window.API = {
  processos: {
    list:   (params = {}) => {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([,v]) => v))
      ).toString();
      return apiRequest('GET', `/processos${qs ? '?' + qs : ''}`);
    },
    create: (data)        => apiRequest('POST', '/processos', data),
    update: (id, data)    => apiRequest('PUT',  `/processos/${id}`, data),
    delete: (id)          => apiRequest('DELETE', `/processos/${id}`),
  },

  // ── CANDIDATOS ─────────────────────────────────────────────────
  candidatos: {
    list:   (procId)          => apiRequest('GET',  `/processos/${procId}/candidatos`),
    save:   (procId, arr)     => apiRequest('POST', `/processos/${procId}/candidatos`, arr),
  },

  // ── CONTRATOS ──────────────────────────────────────────────────
  contratos: {
    list:   (params = {}) => {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([,v]) => v))
      ).toString();
      return apiRequest('GET', `/contratos${qs ? '?' + qs : ''}`);
    },
    create: (data)        => apiRequest('POST', '/contratos',      data),
    update: (id, data)    => apiRequest('PUT',  `/contratos/${id}`, data),
    delete: (id)          => apiRequest('DELETE', `/contratos/${id}`),
  },

  // ── CONFIGURAÇÕES ──────────────────────────────────────────────
  configuracoes: {
    get:  ()     => apiRequest('GET', '/configuracoes'),
    save: (data) => apiRequest('PUT', '/configuracoes', data),
  },

  // ── ANALYTICS ──────────────────────────────────────────────────
  analytics: {
    summary: () => apiRequest('GET', '/analytics/summary'),
  },
};
