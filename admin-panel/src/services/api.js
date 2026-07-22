import axios from "axios";
import { API_BASE_URL } from "../config/runtime-env";

const API = axios.create({
  baseURL: API_BASE_URL,
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

    if (error.response?.status === 403 &&
        error.response?.data?.code === "PASSWORD_CHANGE_REQUIRED" &&
        window.location.pathname !== "/profile") {
      window.location.assign("/profile");
    }

    return Promise.reject(error);
  },
);

export default API;
