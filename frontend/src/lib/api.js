import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  // We use Bearer token auth. Cookies are set as fallback but not required.
  // Setting withCredentials=false avoids CORS conflicts when allow_origins=*.
  withCredentials: false,
});

// Requests that do NOT need authentication. 401 on these must not be treated as auth loss.
const PUBLIC_PATHS = ["/setup/status", "/setup/admin", "/auth/login"];

function isPublic(url = "") {
  return PUBLIC_PATHS.some((p) => url.includes(p));
}

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("asys_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const url = err?.config?.url || "";
    if (status === 401 && !isPublic(url)) {
      // Silently clear stored token; downstream code decides what to do.
      if (localStorage.getItem("asys_token")) {
        localStorage.removeItem("asys_token");
        window.dispatchEvent(new CustomEvent("asys-auth-lost"));
      }
    }
    return Promise.reject(err);
  }
);

export function formatApiError(err) {
  const d = err?.response?.data?.detail;
  if (d == null) return err?.message || "Bilinmeyen hata";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e) => (e?.msg ? e.msg : JSON.stringify(e))).join(" ");
  return typeof d === "object" ? d.msg || JSON.stringify(d) : String(d);
}

export function hasToken() {
  return !!localStorage.getItem("asys_token");
}
