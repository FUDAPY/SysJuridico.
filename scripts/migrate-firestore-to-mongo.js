/**
 * Migración masiva de colecciones Firestore -> MongoDB.
 *
 * Requiere la variable de entorno FIREBASE_SERVICE_ACCOUNT_PATH apuntando al archivo
 * de credenciales de servicio (NUNCA subir ese archivo a git, ya está en .gitignore).
 *
 * Uso: npm run migrate:firestore
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const connectDB = require('../server/config/db');

// Colecciones a migrar: mismo nombre en Firestore y en MongoDB
const COLECCIONES = [
  'aprendizajes_sistema',
  'base_legal',
  'estudio_juridico',
  'lexpy_fuentes_cache',
  'sesiones_chat',
  'users',
];

function inicializarFirebase() {
  const rutaCredenciales = path.resolve(
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './sys-juridico-firebase-adminsdk-fbsvc-436ade3197.json'
  );

  if (!fs.existsSync(rutaCredenciales)) {
    console.error(`[MIGRACIÓN] No se encontró el archivo de credenciales en: ${rutaCredenciales}`);
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(rutaCredenciales, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin.firestore();
}

// Convierte Timestamps/referencias de Firestore a tipos nativos serializables por Mongo
function normalizarDocumento(data) {
  const resultado = {};
  Object.entries(data).forEach(([clave, valor]) => {
    if (valor && typeof valor.toDate === 'function') {
      resultado[clave] = valor.toDate();
    } else if (valor && typeof valor === 'object' && valor.constructor?.name === 'DocumentReference') {
      resultado[clave] = valor.path;
    } else {
      resultado[clave] = valor;
    }
  });
  return resultado;
}

async function migrarColeccion(db, nombreColeccion) {
  const snapshot = await db.collection(nombreColeccion).get();
  if (snapshot.empty) {
    console.log(`[MIGRACIÓN] "${nombreColeccion}": no hay documentos, se omite.`);
    return { total: 0 };
  }

  const coleccionMongo = mongoose.connection.collection(nombreColeccion);
  const operaciones = snapshot.docs.map((doc) => {
    const datos = normalizarDocumento(doc.data());
    return {
      updateOne: {
        filter: { firestoreId: doc.id },
        update: { $set: { ...datos, firestoreId: doc.id } },
        upsert: true,
      },
    };
  });

  const resultado = await coleccionMongo.bulkWrite(operaciones, { ordered: false });
  console.log(
    `[MIGRACIÓN] "${nombreColeccion}": ${snapshot.size} documento(s) procesados ` +
      `(insertados: ${resultado.upsertedCount}, actualizados: ${resultado.modifiedCount}).`
  );
  return { total: snapshot.size };
}

async function migrar() {
  const db = inicializarFirebase();
  await connectDB();

  console.log('[MIGRACIÓN] Iniciando migración Firestore -> MongoDB...');
  for (const coleccion of COLECCIONES) {
    // eslint-disable-next-line no-await-in-loop
    await migrarColeccion(db, coleccion).catch((err) =>
      console.error(`[MIGRACIÓN] Error migrando "${coleccion}":`, err.message)
    );
  }

  console.log('[MIGRACIÓN] Proceso finalizado.');
  await mongoose.disconnect();
  process.exit(0);
}

migrar().catch((err) => {
  console.error('[MIGRACIÓN] Error fatal:', err);
  process.exit(1);
});
