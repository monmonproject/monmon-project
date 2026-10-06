const jwt = require('jsonwebtoken')
const { JWT_EXPIRES_IN } = require('../config/constants')

function RahasiaIllahi() {
    const secret = process.env.JWT_SECRET
    if (typeof secret !== 'string' || secret.trim() === '') {
        throw { name: 'Unauthorized', message: 'Token tidak valid' }
    }
    return secret
}
function signToken(payload) {
    const secret = RahasiaIllahi()
    const claims = { id: payload.id, telegramId: payload.telegramId }
    return jwt.sign(claims, secret, { expiresIn: JWT_EXPIRES_IN })
}
function verifyToken(token) {
    const secret2 = RahasiaIllahi()
    try {
        return jwt.verify(token, secret2)
    } catch (error) {
        throw { name: 'Unauthorized', message: 'Token tidak valid' }


    }

}
module.exports = { signToken, verifyToken }


// cd server
// node - e "
// process.env.JWT_SECRET = 'rahasia-test';
// const { signToken, verifyToken } = require('./helpers/jwt');
// const token = signToken({ id: 1, telegramId: 123456789, tier: 'member' });
// console.log('token:', token);
// console.log('payload:', verifyToken(token));
// "