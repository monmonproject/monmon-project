
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

module.exports = errorHandler;