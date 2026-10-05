import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'https://churchportalbackend-production.up.railway.app/v1',
  withCredentials: false,
  timeout: 20000,
});

const isBrowser = () => typeof window !== 'undefined';

function clearSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('auth_user');
  window.location.href = '/login';
}

api.interceptors.request.use((config) => {
  if (isBrowser()) {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// The server rotates refresh tokens, so concurrent refreshes would invalidate each other:
// every 401 that arrives together shares one refresh request.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshSession(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;
  try {
    const res = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken }, { timeout: 15000 });
    localStorage.setItem('accessToken', res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    return res.data.accessToken as string;
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401 || status === 403) return null; // session is really over
    throw err; // network trouble: don't log the user out
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config as any;
    const isAuthCall = typeof config?.url === 'string' && config.url.startsWith('/auth/');

    if (isBrowser() && error.response?.status === 401 && config && !config._retry && !isAuthCall) {
      config._retry = true;
      try {
        refreshInFlight ??= refreshSession().finally(() => { refreshInFlight = null; });
        const token = await refreshInFlight;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          return api(config);
        }
        clearSession();
      } catch {
        // offline while refreshing: surface the original error
      }
    }
    return Promise.reject(error);
  },
);
