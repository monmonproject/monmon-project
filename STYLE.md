# STYLE.md — Gaya Coding Project Ini

> Tiru contoh ✅ persis. Hindari pola ❌.
> Tujuannya bukan "kode paling keren", tapi **kode yang pemiliknya bisa baca dan
> debug sendiri**.

---

## Prinsip Umum

1. Kode ditulis untuk dibaca manusia, bukan untuk pamer.
2. Satu fungsi = satu tanggung jawab, maksimal ~30 baris.
3. Eksplisit lebih baik daripada pintar. Tidak ada "magic".
4. Nama variabel dalam bahasa Inggris, camelCase, deskriptif.
   Pesan ke user dalam bahasa Indonesia.
5. Komentar hanya untuk menjelaskan **kenapa**, bukan **apa**.
6. Dilarang abstraksi prematur: tidak ada factory, decorator, atau generic helper
   sampai pola yang sama muncul minimal 3 kali.

---

## 1. Controller

✅ **BEGINI** — class dengan static method, try/catch, lempar ke `next()`:
```js
class TransactionController {
  static async findAll(req, res, next) {
    try {
      const { type, CategoryId, page = 1, limit = 10 } = req.query;

      const options = { where: { WalletId: req.wallet.id }, limit: Number(limit) };
      options.offset = (Number(page) - 1) * Number(limit);
      options.order = [['occurredAt', 'DESC']];

      if (type) {
        options.where.type = type;
      }
      if (CategoryId) {
        options.where.CategoryId = Number(CategoryId);
      }

      const result = await Transaction.findAndCountAll(options);

      res.status(200).json({
        data: result.rows,
        meta: {
          page: Number(page),
          limit: Number(limit),
          totalItems: result.count,
          totalPages: Math.ceil(result.count / Number(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
```

❌ **JANGAN BEGINI** — arrow function anonim, chaining padat, error ditelan:
```js
router.get('/transactions', (req, res) =>
  Transaction.findAll({ where: req.query.type ? { type: req.query.type } : {} })
    .then(t => res.json(t))
    .catch(() => res.status(500).send('error')));
```

---

## 2. Error Handling

✅ **BEGINI** — lempar object bernama, ditangani terpusat:
```js
// di controller / service
if (!transaction) {
  throw { name: 'NotFound', message: 'Transaksi tidak ditemukan' };
}
if (amount <= 0) {
  throw { name: 'BadRequest', message: 'Jumlah harus lebih dari nol' };
}
if (!capabilities.includes('ai.analysis')) {
  throw { name: 'Forbidden', message: 'Fitur analisis hanya untuk Member', requiredTier: 'member' };
}

// middlewares/errorHandler.js
function errorHandler(error, req, res, next) {
  console.error(error);

  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({ message: error.errors[0].message });
  }
  if (error.name === 'BadRequest') {
    return res.status(400).json({ message: error.message });
  }
  if (error.name === 'Unauthorized') {
    return res.status(401).json({ message: error.message });
  }
  if (error.name === 'Forbidden') {
    return res.status(403).json({ message: error.message, requiredTier: error.requiredTier });
  }
  if (error.name === 'NotFound') {
    return res.status(404).json({ message: error.message });
  }
  if (error.name === 'QuotaExceeded') {
    return res.status(429).json({ message: error.message });
  }

  res.status(500).json({ message: 'Internal server error' });
}
```

❌ **JANGAN BEGINI** — `res.status()` berserakan di controller, atau
`catch (e) { console.log(e) }` tanpa response.

---

## 3. Async/Await

✅ `await` dengan try/catch.
❌ `.then().catch()` berantai, callback bersarang, `Promise.all` tanpa penjelasan.

---

## 4. Pengecekan Tier

✅ **BEGINI** — satu sumber, dipanggil dari middleware:
```js
// services/entitlementService.js
const CAPABILITIES = {
  trial:  ['record.text', 'record.voice', 'record.photo', 'ai.parse', 'ai.analysis', 'dashboard.read'],
  member: ['record.text', 'record.voice', 'record.photo', 'ai.parse', 'ai.analysis', 'dashboard.read'],
  free:   ['record.text'],
};

class EntitlementService {
  static resolve(user, activeSubscription, now) {
    if (activeSubscription && activeSubscription.expiresAt > now) {
      return 'member';
    }
    if (user.trialEndsAt && now < user.trialEndsAt) {
      return 'trial';
    }
    return 'free';
  }

  static can(tier, capability) {
    return CAPABILITIES[tier].includes(capability);
  }
}
```

```js
// middlewares/entitlement.js
function entitlement(capability) {
  return function (req, res, next) {
    try {
      if (!EntitlementService.can(req.user.tier, capability)) {
        throw { name: 'Forbidden', message: 'Fitur ini hanya untuk Member', requiredTier: 'member' };
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

// dipakai di route:
router.get('/analysis', authentication, entitlement('ai.analysis'), AnalysisController.get);
```

❌ **JANGAN BEGINI** — pengecekan tier tersebar, tiap tempat beda logika:
```js
if (user.plan === 'member' || user.trialEndsAt > new Date()) { ... }   // ❌
if (req.user.isPremium) { ... }                                         // ❌
if (dayjs().isBefore(user.trialEndsAt)) { ... }                         // ❌
```

---

## 5. Uang dan Waktu

✅ **BEGINI**:
```js
// helpers/money.js — fungsi murni, tanpa I/O
function parseAmount(text) {
  // "35rb" → 35000, "8jt" → 8000000, "35.000" → 35000
}

function formatRupiah(amount) {
  return `Rp ${amount.toLocaleString('id-ID')}`;   // Rp 35.000
}
```

```js
// helpers/dateHelper.js — supaya bisa di-freeze saat test
function now() {
  return new Date();
}
```

❌ **JANGAN BEGINI**:
```js
const amount = parseFloat(input);              // ❌ uang jangan float
const total = 35000.50;                        // ❌ tidak ada sen di project ini
if (new Date() > user.trialEndsAt) { ... }     // ❌ di dalam service, tidak bisa di-test
const rupiah = 'Rp ' + amount;                 // ❌ Rp 35000, tanpa pemisah ribuan
```

Waktu di service selalu diterima sebagai parameter atau lewat `dateHelper.now()`.
Test trial 5 hari dan expiry 30 hari mustahil ditulis kalau `new Date()` dipanggil
langsung di dalam logika.

---

## 6. Memanggil AI

✅ **BEGINI** — satu pintu, timeout eksplisit, gagal tidak menghancurkan alur:
```js
// ai/aiClient.js — SATU-SATUNYA file yang memanggil API AI
async function callAI(prompt, { timeoutMs = 20000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.AI_PROVIDER_API_KEY },
      body: JSON.stringify({ model: process.env.AI_MODEL_PARSE, messages: [{ role: 'user', content: prompt }] }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw { name: 'AIError', message: 'AI provider error' };
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
```

```js
// pemakaian: transaksi tetap selamat walaupun AI mati
let insight = null;
try {
  insight = await analysisService.get(walletId, metrics);
} catch (error) {
  console.error({ event: 'ai.failed', walletId, message: error.message });
}
await telegramClient.sendMessage(chatId, formatter.reply(transaction, insight));
```

❌ **JANGAN BEGINI**:
```js
const total = await callAI(`hitung total dari transaksi ini: ${JSON.stringify(rows)}`);  // ❌ AI tidak menghitung
await fetch(AI_URL, ...)                       // ❌ langsung dari service, bukan lewat aiClient
if (tier === 'free') await callAI(...)         // ❌ free tier tidak pernah menyentuh AI
```

---

## 7. Middleware

✅ Satu file satu middleware, nama file = nama fungsi:
`middlewares/authentication.js`, `middlewares/entitlement.js`,
`middlewares/telegramAuth.js`, `middlewares/errorHandler.js`

```js
async function telegramAuth(req, res, next) {
  try {
    const secret = req.headers['x-telegram-bot-api-secret-token'];
    if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      throw { name: 'Unauthorized', message: 'Invalid webhook secret' };
    }
    next();
  } catch (error) {
    next(error);
  }
}
```

---

## 8. Balasan Bot

✅ **BEGINI** — penyusunan teks di `telegram/formatter.js`, bukan di service:
```js
function replyTransaction(transaction, category, insight) {
  const lines = [`✓ Tercatat: ${transaction.note} ${formatRupiah(transaction.amount)}`];

  if (category) {
    lines[0] += ` → ${category.name}`;
  }
  if (insight) {
    lines.push('', `📊 ${insight}`);
  } else {
    lines.push('', '🔒 Analisis AI & dashboard tersedia untuk Member.', 'Ketik /upgrade untuk buka akses 30 hari.');
  }

  return lines.join('\n');
}
```

❌ **JANGAN BEGINI** — template string raksasa dengan ternary bersarang di dalam
service, atau `sendMessage` dipanggil dari controller/service langsung.

---

## 9. React Component

✅ **BEGINI** — function component, satu komponen satu file, state eksplisit:
```jsx
function TransactionList() {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function fetchTransactions() {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await api.get('/transactions');
      setTransactions(response.data.data);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Gagal memuat transaksi');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchTransactions();
  }, []);

  if (isLoading) return <p>Loading...</p>;
  if (errorMessage) return <p className="error">{errorMessage}</p>;
  if (transactions.length === 0) return <EmptyState message="Belum ada transaksi" />;

  return (
    <div className="transaction-list">
      {transactions.map((transaction) => (
        <TransactionRow key={transaction.id} transaction={transaction} />
      ))}
    </div>
  );
}
```

**Khusus project ini:** setiap halaman wajib menangani **403 dengan
`requiredTier`** sebagai halaman upsell, bukan pesan error merah:
```jsx
if (error.response?.status === 403 && error.response.data.requiredTier) {
  return <UpgradePrompt requiredTier={error.response.data.requiredTier} />;
}
```

❌ **JANGAN BEGINI** — custom hook untuk hal sepele, komponen 300 baris, ternary
bersarang di JSX, satu file berisi 5 komponen.

---

## 10. Penamaan

| Jenis | Aturan | Contoh |
|---|---|---|
| Variabel & fungsi | camelCase | `totalAmount`, `fetchTransactions` |
| Boolean | awali `is`/`has`/`can` | `isLoading`, `hasActiveSubscription` |
| Class & Component | PascalCase | `TransactionController`, `BudgetCard` |
| File model/controller | PascalCase | `TransactionController.js` |
| File lain | camelCase | `errorHandler.js`, `entitlementService.js` |
| Konstanta | UPPER_SNAKE | `TRIAL_DAYS`, `CONFIDENCE_THRESHOLD` |
| Konstanta env | UPPER_SNAKE | `TELEGRAM_BOT_TOKEN` |
| Kolom FK | PascalCase + Id | `WalletId`, `CategoryId` |

Dilarang singkatan tidak jelas: `p`, `d`, `tmp`, `data2`, `handleThing`, `trx`.

---

## 11. Yang Dilarang Keras

- Chaining lebih dari 2 level dalam satu baris
- Ternary bersarang
- `var`
- `==` (pakai `===`)
- **Menyimpan angka uang sebagai float**
- **Angka ajaib.** `5` → `TRIAL_DAYS`, `30` → `MEMBER_DAYS`, `0.75` →
  `CONFIDENCE_THRESHOLD`. Semua di `config/constants.js`
- **Pengecekan tier di luar `entitlementService`**
- **Memanggil API AI di luar `ai/aiClient.js`**
- **Memanggil Telegram Bot API di luar `telegram/client.js`**
- **Menyuruh AI menghitung angka**
- Logic bisnis di dalam file route
- Query database langsung di dalam React component
- `console.log` sisa debugging (pakai `console.error` untuk error sungguhan)
- Menyimpan `rawMessage` atau isi pesan user ke log
- Menghapus atau mengomentari kode orang lain tanpa penjelasan di PR
