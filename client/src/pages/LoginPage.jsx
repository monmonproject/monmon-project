import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';

const STORAGE_KEY = 'accessToken';

function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('telegram-id');
  const [telegramId, setTelegramId] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');

  async function handleRequestOtp(event) {
    event.preventDefault();
    if (!telegramId.trim()) {
      setErrorMessage('Telegram ID wajib diisi.');
      return;
    }
    if (!/^\d{5,15}$/.test(telegramId.trim())) {
      setErrorMessage('Telegram ID harus 5–15 digit angka.');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    setNoticeMessage('');
    try {
      const response = await api.post('/api/auth/request-otp', {
        telegramId: Number(telegramId.trim()),
      });
      setNoticeMessage(response.data.message || 'Kode OTP terkirim ke Telegram Anda.');
      setStep('otp');
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Gagal mengirim kode OTP. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setErrorMessage('Kode verifikasi harus 6 digit angka.');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await api.post('/api/auth/verify-otp', {
        telegramId: Number(telegramId.trim()),
        code: otp,
      });
      localStorage.setItem(STORAGE_KEY, response.data.access_token);
      navigate('/', { replace: true });
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Kode verifikasi salah atau sudah kedaluwarsa.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleBackToTelegramId() {
    setStep('telegram-id');
    setOtp('');
    setErrorMessage('');
    setNoticeMessage('');
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-gray-100';
  const buttonClass =
    'w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300';

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Masuk Monmon</h1>
        <p className="mt-1 text-sm text-gray-500">Pantau pengeluaranmu langsung dari Telegram.</p>

        {errorMessage && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {errorMessage}
          </p>
        )}

        {step === 'telegram-id' && (
          <form className="mt-6 space-y-4" onSubmit={handleRequestOtp}>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Telegram ID</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={telegramId}
                onChange={(event) => {
                  setTelegramId(event.target.value);
                  setErrorMessage('');
                }}
                placeholder="contoh: 123456789"
                className={inputClass}
                disabled={isLoading}
              />
            </label>
            <button type="submit" className={buttonClass} disabled={isLoading}>
              {isLoading ? 'Mengirim kode...' : 'Kirim Kode OTP'}
            </button>
            <p className="text-xs text-gray-400">Kode 6 digit akan dikirim ke akun Telegram Anda.</p>
          </form>
        )}

        {step === 'otp' && (
          <form className="mt-6 space-y-4" onSubmit={handleVerifyOtp}>
            {noticeMessage && (
              <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {noticeMessage}
              </p>
            )}
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Kode Verifikasi</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                value={otp}
                onChange={(event) => {
                  setOtp(event.target.value.replace(/\D/g, ''));
                  setErrorMessage('');
                }}
                placeholder="123456"
                className={inputClass}
                disabled={isLoading}
              />
            </label>
            <button type="submit" className={buttonClass} disabled={isLoading}>
              {isLoading ? 'Memverifikasi...' : 'Verifikasi & Masuk'}
            </button>
            <button
              type="button"
              onClick={handleBackToTelegramId}
              disabled={isLoading}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700 disabled:text-gray-300"
            >
              Ganti Telegram ID
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default LoginPage;