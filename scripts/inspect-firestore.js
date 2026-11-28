/**
 * Inspección rápida de Firestore: lista colecciones y conteo de documentos.
 * Uso: node scripts/inspect-firestore.js   (solo lectura, no modifica nada)
 */
require('dotenv').config();
const fs = require('fs');
const admin = require('firebase-admin');

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
    const jsonStr = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    serviceAccount = JSON.parse(jsonStr);
  } catch (err) {
    console.error('Error parseando FIREBASE_SERVICE_ACCOUNT_JSON:', err.message);
    process.exit(1);
  }
} else {
  const ruta = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-key.json';
  if (!fs.existsSync(ruta)) {
    console.error(`No se encontró la credencial de Firebase en: ${ruta}. Configure FIREBASE_SERVICE_ACCOUNT_JSON o FIREBASE_SERVICE_ACCOUNT_PATH.`);
    process.exit(1);
  }
  serviceAccount = JSON.parse(fs.readFileSync(ruta, 'utf8'));
}
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const CANDIDATAS = [
  'users', 'clientes', 'expedientes', 'movimientos', 'movimientos_financieros',
  'agenda', 'eventos_agenda', 'liquidaciones', 'liquidaciones_laborales',
  'aprendizajes_sistema', 'base_legal', 'estudio_juridico',
  'lexpy_fuentes_cache', 'sesiones_chat',
];

(async () => {
  console.log('Proyecto Firebase:', serviceAccount.project_id);
  for (const nombre of CANDIDATAS) {
    try {
      const snap = await db.collection(nombre).limit(1).get();
      if (snap.empty) continue;
      const total = await db.collection(nombre).count().get();
      console.log(`✔ ${nombre}: ${total.data().count} documento(s)`);
    } catch {
      /* colección inexistente o sin permisos */
    }
  }
  process.exit(0);
})().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});