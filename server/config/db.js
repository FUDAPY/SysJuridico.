const mongoose = require('mongoose');

const INTENTOS_MAXIMOS = 5;
const ESPERA_MS = 3000;

/**
 * Host sin credenciales (para logs seguros).
 */
function hostSinCredenciales(uri) {
  try {
    const u = new URL(uri);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return uri;
  }
}

/**
 * Conecta a MongoDB vía DATABASE_URL. Reintenta por arranque lento del servicio.
 */
async function connectDB() {
  const uri = process.env.DATABASE_URL;

  if (!uri) {
    console.error('[DB] FALTA la variable de entorno DATABASE_URL.');
    console.error('[DB] Defínala en el panel de Dokploy en: Aplicación -> Variables de entorno.');
    console.error('[DB] Ej.: mongodb://usuario:password@<host-mongodb>:27017/sysjuridico?authSource=admin');
    process.exit(1);
  }

  mongoose.set('strictQuery', true);

  for (let intento = 1; intento <= INTENTOS_MAXIMOS; intento++) {
    try {
      await mongoose.connect(uri, {
        autoIndex: true,
        serverSelectionTimeoutMS: 8000,
      });
      console.log(`[DB] Conectado a MongoDB -> "${mongoose.connection.name}" (${hostSinCredenciales(uri)})`);
      break;
    } catch (error) {
      console.warn(
        `[DB] Intento ${intento}/${INTENTOS_MAXIMOS}: no se pudo conectar a MongoDB. ${error.message}`
      );
      if (intento === INTENTOS_MAXIMOS) {
        console.error('[DB] MongoDB inaccesible. Verifique la cadena DATABASE_URL (el host debe ser');
        console.error('[DB] alcanzable desde el contenedor: un servicio MongoDB de Dokploy, un host de');
        console.error('[DB] Atlas o una IP pública; nunca localhost/127.0.0.1 salvo uso local).');
        process.exit(1);
      }
      await new Promise((resolver) => setTimeout(resolver, ESPERA_MS));
    }
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] Conexión a MongoDB perdida.');
  });
}

module.exports = connectDB;
