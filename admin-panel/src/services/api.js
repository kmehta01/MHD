import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api",
  timeout: 10000,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      localStorage.getItem("admin_token")
    ) {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");

      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  },
);

export default API;
