module.exports = errorHandler

function errorHandler (err, req, res, next) {
    switch (true) {
        case typeof err === 'string':
            const is404 = err.toLowerCase().endWith('not found')
            const statuscode = is404 ? 404 : 400;
            return res.status(statuscode).json({message: err.message})
        case err.name === 'ValidationError':
            return res.status(400).json({message: err.message})
        case err.name === 'UnauthorizedError':
            return res.status(400).json({ message:'Unauthorized' });
        default:
            return res.status(500).json({ message: err.message });
    }
}