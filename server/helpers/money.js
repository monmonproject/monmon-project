// helpers/money.js
//
// Normalisasi teks nominal jadi integer rupiah penuh (SPEC.md §8).
// Fungsi murni, tanpa I/O. Dilarang memakai parseFloat atau angka desimal
// di file ini: uang selalu integer (SPEC.md §5 no. 6).

const MULTIPLIERS = {
    rb: 1000,
    ribu: 1000,
    k: 1000,
    jt: 1000000,
    juta: 1000000,
};

// Angka (boleh berpemisah . atau ,), spasi opsional, lalu suffix opsional.
// Lookahead (?![a-z]) mencegah "2 kopi" terbaca sebagai "2 k".
const AMOUNT_PATTERN = /(\d+(?:[.,]\d+)*)(?:\s*(rb|ribu|k|jt|juta))?(?![a-z])/gi;

// Pemisah ribuan Indonesia selalu diikuti 3 digit. Kalau hanya 1-2 digit
// dan ada suffix ("1,5jt"), itu desimal, bukan pemisah ribuan.
const MAX_DECIMAL_DIGITS = 2;

function normalizeAmount(numberText, suffix) {
    let multiplier = 1;
    if (suffix) {
        multiplier = MULTIPLIERS[suffix.toLowerCase()];
    }

    const groups = numberText.split(/[.,]/);
    const lastGroup = groups[groups.length - 1];
    const isDecimal = Boolean(suffix) && groups.length > 1 && lastGroup.length <= MAX_DECIMAL_DIGITS;

    if (isDecimal) {
        const wholePart = Number.parseInt(groups.slice(0, -1).join(''), 10);
        const fractionPart = Number.parseInt(lastGroup, 10);
        const fractionUnit = multiplier / 10 ** lastGroup.length;
        return wholePart * multiplier + fractionPart * fractionUnit;
    }

    return Number.parseInt(groups.join(''), 10) * multiplier;
}

// Angka ber-suffix atau berpemisah ribuan lebih mungkin nominal uang
// daripada angka polos: "beli 2 kopi 25rb" → 25rb, bukan 2.
function pickAmountMatch(matches) {
    const formattedMatch = matches.find((match) => match[2] || /[.,]/.test(match[1]));
    if (formattedMatch) {
        return formattedMatch;
    }
    return matches[0];
}

function extractAmount(text) {
    const matches = [...text.matchAll(AMOUNT_PATTERN)];
    if (matches.length === 0) {
        return null;
    }

    const chosenMatch = pickAmountMatch(matches);
    const amount = normalizeAmount(chosenMatch[1], chosenMatch[2]);
    if (amount <= 0) {
        return null;
    }

    return { amount, matchedText: chosenMatch[0] };
}

function parseAmount(text) {
    const extracted = extractAmount(text);
    if (!extracted) {
        return null;
    }
    return extracted.amount;
}

module.exports = { parseAmount, extractAmount };
