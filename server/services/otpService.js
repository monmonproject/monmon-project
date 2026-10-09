const crypto = require('crypto');
const stateStore = require('./stateStore');
const { OTP_TTL_SECONDS, OTP_MAX_ATTEMPTS } = require('../config/constants');


const kunci = (telegramId) => `otp:${telegramId}`;

function generateOtp(telegramId, now) {

    const angka = crypto.randomInt(0, 1000000);
    const code = String(angka).padStart(6, '0');

    const expiresAt = now.getTime() + OTP_TTL_SECONDS * 1000;


    stateStore.set(kunci(telegramId), { code, attempts: 0, expiresAt }, OTP_TTL_SECONDS, now);

    return code;
}

function verifyOtp(telegramId, code, now) {
    const key = kunci(telegramId);
    const entry = stateStore.get(key, now);


    if (!entry) {
        throw { name: 'Unauthorized', message: 'Kode tidak valid' };
    }

    if (entry.code !== code) {
        const attempts = entry.attempts + 1;


        if (attempts >= OTP_MAX_ATTEMPTS) {
            stateStore.del(key);
            throw { name: 'QuotaExceeded', message: 'Terlalu banyak percobaan' };
        }


        const sisaDetik = (entry.expiresAt - now.getTime()) / 1000;
        stateStore.set(key, { ...entry, attempts }, sisaDetik, now);

        throw { name: 'Unauthorized', message: 'Kode tidak valid' };
    }


    stateStore.del(key);
    return true;
}

module.exports = { generateOtp, verifyOtp };