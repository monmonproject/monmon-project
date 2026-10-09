// config/constants.js
//
// Semua angka "ajaib" yang dipakai lebih dari satu tempat wajib didefinisikan
// di sini, bukan ditulis langsung di kode (STYLE.md §11).

const TRIAL_DAYS = 5;
const MEMBER_DAYS = 30;
const CONFIDENCE_THRESHOLD = 0.75;
const CONFIRMATION_TTL_SECONDS = 300;
const AI_CALL_TIMEOUT_MS = 20000;
const JWT_EXPIRES_IN = '7d';
const OTP_TTL_SECONDS = 300;
const OTP_MAX_ATTEMPTS = 3;

module.exports = {
    TRIAL_DAYS,
    MEMBER_DAYS,
    CONFIDENCE_THRESHOLD,
    CONFIRMATION_TTL_SECONDS,
    AI_CALL_TIMEOUT_MS,
    JWT_EXPIRES_IN,
    OTP_TTL_SECONDS,
    OTP_MAX_ATTEMPTS
};