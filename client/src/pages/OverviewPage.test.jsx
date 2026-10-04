import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import OverviewPage from './OverviewPage.jsx';

describe('OverviewPage', () => {
  it('menampilkan judul Overview dan teks placeholder', () => {
    render(
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText('Ringkasan keuangan Anda akan tampil di sini.')).toBeInTheDocument();
  });

  it('menyediakan link Masuk ke halaman /login', () => {
    render(
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Masuk' })).toHaveAttribute('href', '/login');
  });
});