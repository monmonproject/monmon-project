import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  throw new Error(
    'VITE_API_URL belum diatur. Salin .env.example menjadi .env, lalu isi VITE_API_URL dengan base URL server.',
  );
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export default api;