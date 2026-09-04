const mongoose = require('mongoose');

/**
 * Conecta a MongoDB usando process.env.DATABASE_URL (obligatorio en Dokploy/VPS).
 */
async function connectDB() {
  const uri = process.env.DATABASE_URL;

  if (!uri) {
    console.error('[DB] Falta la variable de entorno DATABASE_URL.');
    process.exit(1);
  }

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, {
      autoIndex: true,
    });
    console.log(`[DB] Conectado a MongoDB -> ${mongoose.connection.name}`);
  } catch (error) {
    console.error('[DB] Error al conectar a MongoDB:', error.message);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] Conexión a MongoDB perdida.');
  });
}

module.exports = connectDB;
