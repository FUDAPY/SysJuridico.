/**
 * Migración Firestore -> MongoDB.
 * Migra datos de negocio (clientes, expedientes, movimientos, agenda, liquidaciones),
 * usuarios y colecciones de IA, reescribiendo referencias Firestore -> ObjectId de Mongo.
 *
 * Configuración (variables de entorno):
 *  - FIREBASE_SERVICE_ACCOUNT_PATH  -> ruta al JSON de credenciales (uso local).
 *  - FIREBASE_SERVICE_ACCOUNT_JSON  -> contenido del JSON en base64 (uso en Dokploy/jobs).
 *  - DATABASE_URL                   -> cadena de conexión a MongoDB (destino).
 *
 * Uso: npm run migrate:firestore
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const connectDB = require('../server/config/db');

// Colecciones en orden de dependencia. Las que tienen 'refs' reescriben referencias.
const GRUPOS = [
  // 1º: entidades base (usuarios/clientes) para construir el mapa de ids.
  { refs: true, nombres: ['users', 'clientes'] },
  // 2º: entidades que referencian a las anteriores.
  { refs: true, nombres: ['expedientes', 'movimientos_financieros', 'movimientos', 'agenda', 'eventos_agenda', 'liquidaciones_laborales', 'liquidaciones'] },
  // 3º: colecciones auxiliares/IA.
  { refs: true, nombres: ['aprendizajes_sistema', 'base_legal', 'estudio_juridico', 'lexpy_fuentes_cache', 'sesiones_chat'] },
];

// Campos documento que guardan un id de Firestore (se reescriben a ObjectId de Mongo).
const CAMPOS_REFERENCIA = [
  'cliente', 'expediente', 'abogadoAsignado', 'responsable', 'creadoPor',
  'registradoPor', 'calculadoPor', 'usuario', 'usuarioId', 'sesionId',
];

// Mapa firestoreId -> ObjectId de Mongo (se completa durante la migración).
const mapaIds = {};

function inicializarFirebase() {
  const jsonBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  let serviceAccount;

  if (jsonBase64) {
    serviceAccount = JSON.parse(Buffer.from(jsonBase64, 'base64').toString('utf8'));
  } else {
    const ruta = path.resolve(
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './sys-juridico-firebase-adminsdk-fbsvc-436ade3197.json'
    );
    if (!fs.existsSync(ruta)) {
      console.error(`[MIGRACIÓN] No se encontró el archivo de credenciales en: ${ruta}`);
      process.exit(1);
    }
    serviceAccount = JSON.parse(fs.readFileSync(ruta, 'utf8'));
  }

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin.firestore();
}

// Convierte Timestamps / DocumentReference / arreglos de Firestore a tipos de Mongo.
function normalizarDocumento(data) {
  const resultado = {};
  Object.entries(data).forEach(([clave, valor]) => {
    if (valor && typeof valor.toDate === 'function') {
      resultado[clave] = valor.toDate();
    } else if (valor && typeof valor === 'object' && valor.constructor?.name === 'DocumentReference') {
      resultado[clave] = valor.path;
    } else if (Array.isArray(valor)) {
      resultado[clave] = valor.map((v) => (v && typeof v.toDate === 'function') ? v.toDate() : v);
    } else {
      resultado[clave] = valor;
    }
  });
  return resultado;
}

// Reescribe referencias Firestore -> ObjectId de Mongo con el mapa construido.
function reescribirReferencias(datos) {
  Object.entries(datos).forEach(([clave, valor]) => {
    if (!valor || typeof valor !== 'string') return;
    if (CAMPOS_REFERENCIA.includes(clave) && mapaIds[valor]) {
      datos[clave] = mapaIds[valor];
      return;
    }
    // Referencias con formato { id: '...' } (patrón común en Firestore)
    if (typeof valor === 'object' && typeof valor.id === 'string' && mapaIds[valor.id]) {
      valor.id = mapaIds[valor.id];
    }
  });
  return datos;
}

async function existeColeccion(db, nombre) {
  const ref = db.collection(nombre);
  const snapshot = await ref.limit(1).get();
  return !snapshot.empty;
}

async function migrarColeccion(db, nombreColeccion, conReferencias) {
  const snapshot = await db.collection(nombreColeccion).get();
  if (snapshot.empty) {
    console.log(`[MIGRACIÓN] "${nombreColeccion}": vacía, se omite.`);
    return 0;
  }

  const coleccionMongo = mongoose.connection.collection(nombreColeccion);
  const operaciones = [];

  snapshot.docs.forEach((doc) => {
    const firestoreId = doc.id;
    const datos = normalizarDocumento(doc.data());

    // Crea/unifica un ObjectId de Mongo por documento de Firestore.
    const mongoId = mapaIds[firestoreId] || new mongoose.Types.ObjectId();
    mapaIds[firestoreId] = mongoId;

    reescribirReferencias(datos);

    operaciones.push({
      replaceOne: {
        filter: { firestoreId },
        replacement: { ...datos, firestoreId, _id: mongoId },
        upsert: true,
      },
    });
  });

  const resultado = await coleccionMongo.bulkWrite(operaciones, { ordered: false });
  console.log(
    `[MIGRACIÓN] "${nombreColeccion}": ${snapshot.size} documento(s) ` +
      `(insertados: ${resultado.upsertedCount + resultado.modifiedCount}).`
  );
  return snapshot.size;
}

async function migrar() {
  const db = inicializarFirebase();
  await connectDB();
  console.log('[MIGRACIÓN] Iniciando Firestore -> MongoDB...');

  let total = 0;
  for (const grupo of GRUPOS) {
    for (const nombre of grupo.nombres) {
      try {
        if (!(await existeColeccion(db, nombre))) continue;
        total += await migrarColeccion(db, nombre, grupo.refs);
      } catch (err) {
        console.error(`[MIGRACIÓN] Error en "${nombre}":`, err.message);
      }
    }
  }

  console.log(`[MIGRACIÓN] Finalizado. Total documentos migrados: ${total}`);
  await mongoose.disconnect();
  process.exit(0);
}

migrar().catch((err) => {
  console.error('[MIGRACIÓN] Error fatal:', err);
  process.exit(1);
});
