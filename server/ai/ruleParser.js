// ai/ruleParser.js
//
// Parser berbasis regex untuk tier free. TIDAK PERNAH memanggil AI dan
// dilarang meng-import klien AI apa pun (SPEC.md §5 no. 3). Sengaja dibuat sederhana:
// satu transaksi per pesan, tidak mengkategorikan, tidak mengenali "kemarin".
//
// Output wajib sama dengan kontrak parser di ARCHITECTURE.md §4.
// `now` SELALU diterima sebagai parameter (AGENTS.md §1b no. 5).

const { extractAmount } = require('../helpers/money');

const INCOME_KEYWORDS = ['gaji', 'masuk', 'bonus', 'terima'];

// Sama dengan default kolom Users.timezone (ARCHITECTURE.md §2).
const DEFAULT_TIMEZONE = 'Asia/Jakarta';

class RuleParser {
    static parse(text, now, timezone = DEFAULT_TIMEZONE) {
        const extracted = extractAmount(text);
        if (!extracted) {
            return { transactions: [], confidence: null };
        }

        const transaction = {
            type: RuleParser.detectType(text),
            amount: extracted.amount,
            categoryName: null,
            note: RuleParser.buildNote(text, extracted.matchedText),
            occurredAt: RuleParser.formatDate(now, timezone),
        };

        return { transactions: [transaction], confidence: null };
    }

    // Dicek per kata utuh supaya "pemasukan" atau "gajian" tidak terbaca income.
    static detectType(text) {
        const words = text.toLowerCase().split(/[^a-z]+/);
        const hasIncomeKeyword = words.some((word) => INCOME_KEYWORDS.includes(word));

        if (hasIncomeKeyword) {
            return 'income';
        }
        return 'expense';
    }

    static buildNote(text, matchedText) {
        return text.replace(matchedText, ' ').replace(/\s+/g, ' ').trim();
    }

    // Tanggal dihitung di zona waktu user, bukan zona server: mencatat jam
    // 02:00 WIB di server UTC tidak boleh jatuh ke tanggal kemarin.
    // Locale en-CA dipakai karena formatnya sudah YYYY-MM-DD.
    static formatDate(now, timezone) {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        return formatter.format(now);
    }
}

module.exports = RuleParser;
