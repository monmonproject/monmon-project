const { Transaction, Wallet, Category } = require('../../models');

function validAttributes(overrides = {}) {
  return {
    WalletId: 1,
    UserId: 1,
    CategoryId: 3,
    type: 'expense',
    amount: 35000,
    note: 'makan siang',
    source: 'text',
    parseMode: 'ai',
    rawMessage: 'makan siang 35rb',
    aiConfidence: 0.93,
    correctsId: null,
    occurredAt: new Date('2026-08-26T05:00:00Z'),
    ...overrides,
  };
}

async function validationErrorOf(attributes) {
  try {
    await Transaction.build(attributes).validate();
  } catch (error) {
    return error;
  }
  throw new Error('Validasi seharusnya gagal, tapi lolos');
}

function failedPaths(error) {
  return error.errors.map((item) => item.path);
}

describe('Transaction model — validasi bentuk data', () => {
  it('meloloskan transaksi yang valid (kontrol)', async () => {
    await expect(Transaction.build(validAttributes()).validate()).resolves.toBeDefined();
  });

  it('menolak amount 0, karena amount harus lebih dari nol', async () => {
    const error = await validationErrorOf(validAttributes({ amount: 0 }));

    expect(error.name).toBe('SequelizeValidationError');
    expect(failedPaths(error)).toContain('amount');
  });

  it('menolak amount desimal 35000.50, karena uang selalu integer rupiah penuh', async () => {
    const error = await validationErrorOf(validAttributes({ amount: 35000.5 }));

    expect(error.name).toBe('SequelizeValidationError');
    expect(failedPaths(error)).toContain('amount');
  });

  it('menolak amount negatif', async () => {
    const error = await validationErrorOf(validAttributes({ amount: -35000 }));

    expect(error.name).toBe('SequelizeValidationError');
    expect(failedPaths(error)).toContain('amount');
  });

  it("menolak type 'correction' tanpa correctsId", async () => {
    const error = await validationErrorOf(validAttributes({ type: 'correction', correctsId: null }));

    expect(error.name).toBe('SequelizeValidationError');
  });

  it("meloloskan type 'correction' yang punya correctsId (kontrol)", async () => {
    const transaction = Transaction.build(validAttributes({ type: 'correction', correctsId: 12 }));

    await expect(transaction.validate()).resolves.toBeDefined();
  });

  it('menolak type di luar income/expense/correction', async () => {
    const error = await validationErrorOf(validAttributes({ type: 'transfer' }));

    expect(error.name).toBe('SequelizeValidationError');
    expect(failedPaths(error)).toContain('type');
  });

  it('menolak parseMode di luar ai/rule/manual', async () => {
    const error = await validationErrorOf(validAttributes({ parseMode: 'magic' }));

    expect(error.name).toBe('SequelizeValidationError');
    expect(failedPaths(error)).toContain('parseMode');
  });

  it('menolak aiConfidence 1.5, karena confidence di rentang 0–1', async () => {
    const error = await validationErrorOf(validAttributes({ aiConfidence: 1.5 }));

    expect(error.name).toBe('SequelizeValidationError');
    expect(failedPaths(error)).toContain('aiConfidence');
  });

  it('menolak aiConfidence -0.1, karena confidence di rentang 0–1', async () => {
    const error = await validationErrorOf(validAttributes({ aiConfidence: -0.1 }));

    expect(error.name).toBe('SequelizeValidationError');
    expect(failedPaths(error)).toContain('aiConfidence');
  });
});

describe('Asosiasi Transaction', () => {
  it('Wallet.hasMany(Transaction) dan Transaction.belongsTo(Wallet) terpasang', () => {
    expect(Wallet.associations.Transactions).toBeDefined();
    expect(Wallet.associations.Transactions.associationType).toBe('HasMany');
    expect(Transaction.associations.Wallet).toBeDefined();
    expect(Transaction.associations.Wallet.associationType).toBe('BelongsTo');
  });

  it('Category.hasMany(Transaction) dan Transaction.belongsTo(Category) terpasang', () => {
    expect(Category.associations.Transactions).toBeDefined();
    expect(Category.associations.Transactions.associationType).toBe('HasMany');
    expect(Transaction.associations.Category).toBeDefined();
    expect(Transaction.associations.Category.associationType).toBe('BelongsTo');
  });
});
