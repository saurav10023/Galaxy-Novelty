import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true 
});

// Merged Request Interceptor
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken"); 
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Shared refresh state (fixes concurrent-401 race condition) ---
let isRefreshing = false;
let refreshPromise = null;

const performRefresh = async () => {
  const res = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/v1/admin/refresh-token`,
    {},
    { withCredentials: true }
  );

  const newAccessToken = res.data.data?.accessToken;
  if (newAccessToken) {
    localStorage.setItem("accessToken", newAccessToken);
  }
  return newAccessToken;
};

// Response Interceptor for handling 401s and Token Refresh
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // If a refresh is already in flight, piggyback on it instead of
        // firing a second /refresh-token call (avoids rotation races).
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = performRefresh().finally(() => {
            isRefreshing = false;
          });
        }

        await refreshPromise;

        return API(originalRequest);

      } catch (refreshError) {
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");

        // Dispatch instead of hard-reloading, so the app can navigate
        // via the router (no full page reload / lost SPA state).
        // Listen for this in App.jsx / a top-level component with useNavigate.
        window.dispatchEvent(new CustomEvent("auth:session-expired"));

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default API;