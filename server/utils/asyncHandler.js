// Envuelve controladores async para propagar errores al middleware central sin try/catch repetido.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
