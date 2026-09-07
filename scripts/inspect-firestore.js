/**
 * Inspección rápida de Firestore: lista colecciones y conteo de documentos.
 * Uso: node scripts/inspect-firestore.js   (solo lectura, no modifica nada)
 */
require('dotenv').config();
const fs = require('fs');
const admin = require('firebase-admin');

const ruta = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './sys-juridico-firebase-adminsdk-fbsvc-436ade3197.json';
if (!fs.existsSync(ruta)) {
  console.error(`No se encontró la key en: ${ruta}`);
  process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(ruta, 'utf8'));
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