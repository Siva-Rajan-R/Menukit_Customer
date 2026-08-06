import axios from 'axios';
import { APP_CONFIG } from '../config';

const BASE_URL = APP_CONFIG.API_URL;

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Access Token
api.interceptors.request.use(
  (config) => {
    const customerToken = localStorage.getItem('customer_token') || localStorage.getItem('access_token');
    if (customerToken && customerToken !== 'undefined' && customerToken !== 'null') {
      config.headers.set('Authorization', `Bearer ${customerToken}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 & Automatic Refresh Token flow
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Retry once if 401 Unauthorized
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('customer_refresh_token') || localStorage.getItem('refresh_token');
        if (!refreshToken || refreshToken === 'undefined' || refreshToken === 'null') {
          throw new Error('No refresh token available');
        }

        // Call backend refresh endpoint
        const refreshRes = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
          refresh_token: refreshToken
        });

        const newAccessToken = refreshRes.data.access_token;
        const newRefreshToken = refreshRes.data.refresh_token;

        if (newAccessToken) {
          localStorage.setItem('customer_token', newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('customer_refresh_token', newRefreshToken);
          }
          originalRequest.headers.set('Authorization', `Bearer ${newAccessToken}`);
          api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshErr) {
        // Clear customer auth storage if refresh fails
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customer_refresh_token');
        localStorage.removeItem('customer_phone');
        localStorage.removeItem('customer_name');
        window.location.reload();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);
