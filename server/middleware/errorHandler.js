const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details || undefined,
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: err.message });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return res.status(409).json({
      success: false,
      message: `Ya existe un registro con ese ${field || 'valor único'}.`,
    });
  }

  console.error('[ERROR]', err);
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor.',
  });
}

function notFound(req, res) {
  res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.originalUrl}` });
}

module.exports = { errorHandler, notFound };
