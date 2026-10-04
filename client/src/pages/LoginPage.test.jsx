import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage.jsx';

const { mockApiPost } = vi.hoisted(() => ({
  mockApiPost: vi.fn(),
}));

vi.mock('../services/api.js', () => ({
  default: { post: mockApiPost },
}));

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>OVERVIEW PLACEHOLDER</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function goToStep2(telegramId = '987654321') {
  mockApiPost.mockResolvedValueOnce({ data: { message: 'Kode OTP dikirim ke Telegram' } });
  renderLoginPage();
  fireEvent.change(screen.getByLabelText('Telegram ID'), { target: { value: telegramId } });
  fireEvent.click(screen.getByRole('button', { name: 'Kirim Kode OTP' }));
  await screen.findByLabelText('Kode Verifikasi');
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockApiPost.mockReset();
    localStorage.clear();
  });

  it('menampilkan error validasi kalau Telegram ID dikosongkan', async () => {
    renderLoginPage();
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Kode OTP' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Telegram ID wajib diisi.');
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('menampilkan error validasi kalau panjang Telegram ID di luar 5-15 digit', async () => {
    renderLoginPage();
    fireEvent.change(screen.getByLabelText('Telegram ID'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Kode OTP' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Telegram ID harus 5–15 digit angka.');
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('menonaktifkan tombol dan input selama request-otp berjalan', async () => {
    let resolveRequest;
    mockApiPost.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    renderLoginPage();
    fireEvent.change(screen.getByLabelText('Telegram ID'), { target: { value: '987654321' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Kode OTP' }));

    expect(screen.getByRole('button', { name: 'Mengirim kode...' })).toBeDisabled();
    expect(screen.getByLabelText('Telegram ID')).toBeDisabled();

    resolveRequest({ data: { message: 'Kode OTP dikirim ke Telegram' } });
    await waitFor(() => expect(screen.getByLabelText('Kode Verifikasi')).toBeInTheDocument());
  });

  it('menampilkan pesan error dari API saat request-otp gagal', async () => {
    mockApiPost.mockRejectedValueOnce({
      response: { data: { message: 'Telegram ID tidak terdaftar' } },
    });

    renderLoginPage();
    fireEvent.change(screen.getByLabelText('Telegram ID'), { target: { value: '987654321' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Kode OTP' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Telegram ID tidak terdaftar');
    expect(screen.getByRole('button', { name: 'Kirim Kode OTP' })).toBeEnabled();
  });

  it('menampilkan pesan error bawaan kalau error API tidak membawa message', async () => {
    mockApiPost.mockRejectedValueOnce({});

    renderLoginPage();
    fireEvent.change(screen.getByLabelText('Telegram ID'), { target: { value: '987654321' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Kode OTP' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Gagal mengirim kode OTP. Coba lagi.');
  });

  it('request-otp sukses memindahkan ke langkah 2', async () => {
    mockApiPost.mockResolvedValueOnce({ data: { message: 'Kode OTP dikirim ke Telegram' } });

    renderLoginPage();
    fireEvent.change(screen.getByLabelText('Telegram ID'), { target: { value: '987654321' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Kode OTP' }));

    expect(await screen.findByLabelText('Kode Verifikasi')).toBeInTheDocument();
    expect(screen.getByText('Kode OTP dikirim ke Telegram')).toBeInTheDocument();
    expect(mockApiPost).toHaveBeenCalledWith('/api/auth/request-otp', { telegramId: 987654321 });
  });

  it('menampilkan pesan bawaan kalau response request-otp tidak membawa message', async () => {
    mockApiPost.mockResolvedValueOnce({ data: {} });

    renderLoginPage();
    fireEvent.change(screen.getByLabelText('Telegram ID'), { target: { value: '987654321' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Kode OTP' }));

    expect(await screen.findByText('Kode OTP terkirim ke Telegram Anda.')).toBeInTheDocument();
  });

  it('verify-otp sukses menyimpan access_token flat lalu redirect ke /', async () => {
    await goToStep2('987654321');
    mockApiPost.mockResolvedValueOnce({
      data: { access_token: 'jwt-token-123', user: { id: 1, telegramId: 987654321 } },
    });

    fireEvent.change(screen.getByLabelText('Kode Verifikasi'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verifikasi & Masuk' }));

    expect(await screen.findByText('OVERVIEW PLACEHOLDER')).toBeInTheDocument();
    expect(localStorage.getItem('accessToken')).toBe('jwt-token-123');
    expect(mockApiPost).toHaveBeenLastCalledWith('/api/auth/verify-otp', {
      telegramId: 987654321,
      code: '123456',
    });
  });

  it('verify-otp gagal menampilkan pesan error dari API tanpa menyimpan token', async () => {
    await goToStep2('987654321');
    mockApiPost.mockRejectedValueOnce({
      response: { data: { message: 'Kode OTP salah atau kedaluwarsa' } },
    });

    fireEvent.change(screen.getByLabelText('Kode Verifikasi'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verifikasi & Masuk' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Kode OTP salah atau kedaluwarsa');
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('memblokir kode yang bukan 6 digit tanpa memanggil API', async () => {
    await goToStep2('987654321');

    fireEvent.change(screen.getByLabelText('Kode Verifikasi'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verifikasi & Masuk' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Kode verifikasi harus 6 digit angka.');
    expect(mockApiPost).toHaveBeenCalledTimes(1);
  });

  it('tombol Ganti Telegram ID kembali ke langkah 1', async () => {
    await goToStep2('987654321');

    fireEvent.click(screen.getByRole('button', { name: 'Ganti Telegram ID' }));

    expect(screen.getByLabelText('Telegram ID')).toBeInTheDocument();
    expect(screen.queryByLabelText('Kode Verifikasi')).not.toBeInTheDocument();
  });

  it('menonaktifkan tombol dan input selama verify-otp berjalan', async () => {
    await goToStep2('987654321');
    let resolveVerify;
    mockApiPost.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveVerify = resolve;
        }),
    );

    fireEvent.change(screen.getByLabelText('Kode Verifikasi'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verifikasi & Masuk' }));

    expect(screen.getByRole('button', { name: 'Memverifikasi...' })).toBeDisabled();
    expect(screen.getByLabelText('Kode Verifikasi')).toBeDisabled();

    resolveVerify({ data: { access_token: 'jwt-token-123', user: {} } });
    await waitFor(() => expect(screen.getByText('OVERVIEW PLACEHOLDER')).toBeInTheDocument());
  });
});