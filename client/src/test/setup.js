import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// api.js gagal keras kalau VITE_API_URL tidak diatur. Nilai default disiapkan
// supaya test bisa mengimpor modul tanpa bergantung pada file .env.
vi.stubEnv('VITE_API_URL', 'http://localhost:3000');