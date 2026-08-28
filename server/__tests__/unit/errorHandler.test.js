const errorHandler = require('../../middlewares/errorHandler');

function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe('errorHandler', () => {
    let res;
    let next;

    beforeEach(() => {
        res = mockRes();
        next = jest.fn();
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    it('mengembalikan 400 untuk SequelizeValidationError', () => {
        const error = { name: 'SequelizeValidationError', errors: [{ message: 'Amount tidak valid' }] };

        errorHandler(error, {}, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Amount tidak valid' });
    });

    it('mengembalikan 400 untuk BadRequest', () => {
        const error = { name: 'BadRequest', message: 'Jumlah harus lebih dari nol' };

        errorHandler(error, {}, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Jumlah harus lebih dari nol' });
    });

    it('mengembalikan 401 untuk Unauthorized', () => {
        const error = { name: 'Unauthorized', message: 'Token tidak valid' };

        errorHandler(error, {}, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Token tidak valid' });
    });

    it('mengembalikan 403 dengan requiredTier untuk Forbidden', () => {
        const error = { name: 'Forbidden', message: 'Fitur analisis hanya untuk Member', requiredTier: 'member' };

        errorHandler(error, {}, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            message: 'Fitur analisis hanya untuk Member',
            requiredTier: 'member',
        });
    });

    it('mengembalikan 404 untuk NotFound', () => {
        const error = { name: 'NotFound', message: 'Transaksi tidak ditemukan' };

        errorHandler(error, {}, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Transaksi tidak ditemukan' });
    });

    it('mengembalikan 429 untuk QuotaExceeded', () => {
        const error = { name: 'QuotaExceeded', message: 'Kuota parsing harian habis' };

        errorHandler(error, {}, res, next);

        expect(res.status).toHaveBeenCalledWith(429);
        expect(res.json).toHaveBeenCalledWith({ message: 'Kuota parsing harian habis' });
    });

    it('mengembalikan 500 untuk error yang tidak dikenali', () => {
        const error = { name: 'SomeRandomError', message: 'harusnya tidak muncul ke user' };

        errorHandler(error, {}, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    });

    it('mencatat error ke console untuk debugging', () => {
        const error = { name: 'BadRequest', message: 'test' };

        errorHandler(error, {}, res, next);

        expect(console.error).toHaveBeenCalledWith(error);
    });
});