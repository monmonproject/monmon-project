function welcomeMessage(name) {
  const greeting = name ? `Halo ${name}!` : 'Halo!';
  return [
    `${greeting} 👋`,
    '',
    'Selamat datang di Monmon — asisten catat keuangan via Telegram.',
    '',
    '✅ Trial 5 hari aktif — catat lewat teks, voice, atau foto struk.',
    '',
    'Contoh: makan siang 35rb',
    'Ketik /bantuan untuk format lengkap.',
  ].join('\n');
}

module.exports = { welcomeMessage };