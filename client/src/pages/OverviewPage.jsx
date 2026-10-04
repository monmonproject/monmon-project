import { Link } from 'react-router-dom';

function OverviewPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <h1 className="text-3xl font-semibold text-gray-900">Overview</h1>
      <p className="mt-2 text-gray-500">Ringkasan keuangan Anda akan tampil di sini.</p>
      <Link
        to="/login"
        className="mt-6 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
      >
        Masuk
      </Link>
    </main>
  );
}

export default OverviewPage;