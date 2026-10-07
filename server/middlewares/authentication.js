const { verifyToken } = require('../helpers/jwt');
const { User } = require('../models');

const authentication = async (req, res, next) => {
    try {
        const bearerToken = req.headers.authorization;

        if (typeof bearerToken !== 'string' || !bearerToken.startsWith('Bearer ')) {
            throw { name: 'Unauthorized', message: 'Token tidak valid' };
        }

        const token = bearerToken.slice('Bearer '.length).trim();
        if (token === '') {
            throw { name: 'Unauthorized', message: 'Token tidak valid' };
        }

        const payload = verifyToken(token);


        const user = await User.findByPk(payload.id);
        if (!user) {
            throw { name: 'Unauthorized', message: 'Token tidak valid' };
        }

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = authentication;