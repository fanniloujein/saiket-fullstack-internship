// Small fetch wrapper: JSON in, JSON out, errors as ApiError.
// The session cookie is sent automatically (same origin).

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message || "Erreur réseau, vérifiez votre connexion.");
    this.status = status;
    this.code = body?.error?.code;
    this.details = body?.error?.details || [];
  }

  // { email: "Cette adresse…", age: "…" } — handy to show errors under each field
  fieldErrors() {
    return Object.fromEntries(this.details.map((d) => [d.field, d.message]));
  }
}

export async function api(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, null);
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, data);
  // Responses look like { data: … }; "data" can be null (e.g. /auth/me when logged out)
  return data && typeof data === "object" && "data" in data ? data.data : data;
}

// All the endpoints used by the app, in one place
export const Api = {
  me: () => api("/auth/me"),
  login: (email, password) => api("/auth/login", { method: "POST", body: { email, password } }),
  register: (fields) => api("/auth/register", { method: "POST", body: fields }),
  logout: () => api("/auth/logout", { method: "POST" }),

  updateProfile: (fields) => api("/me", { method: "PATCH", body: fields }),
  changePassword: (currentPassword, newPassword) => api("/me/password", { method: "PUT", body: { currentPassword, newPassword } }),
  deleteAccount: (password) => api("/me", { method: "DELETE", body: { password } }),
  myActivity: () => api("/me/activity"),

  listUsers: (params) => fetchList(`/users?${new URLSearchParams(params)}`),
  createUser: (fields) => api("/users", { method: "POST", body: fields }),
  updateUser: (id, fields) => api(`/users/${id}`, { method: "PATCH", body: fields }),
  deleteUser: (id) => api(`/users/${id}`, { method: "DELETE" }),
  stats: () => api("/users/stats"),
  activity: (limit = 12) => api(`/activity?limit=${limit}`),
};

// Lists also need the "meta" part (total, pages)
async function fetchList(path) {
  const res = await fetch(`/api${path}`, { credentials: "same-origin" });
  const data = await res.json();
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}
