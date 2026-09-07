/**
 * Migra Firestore -> MongoDB (proyecto sys-juridico).
 * Origen: users, base_legal, aprendizajes_sistema y estudio_juridico/oficina_central/*.
 * Destino: base indicada en DATABASE_URL.
 * Reescribe referencias (emails/nombres/ids de Firestore) a ObjectId de Mongo.
 *
 * Uso: npm run migrate:firestore
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const admin = require('firebase-admin');
const connectDB = require('../server/config/db');

const PASSWORD_DEFECTO =
  process.env.MIGRACION_PASSWORD || process.env.ADMIN_SEED_PASSWORD || null;

if (!PASSWORD_DEFECTO) {
  console.warn('[MIGRACIÓN] MIGRACION_PASSWORD/ADMIN_SEED_PASSWORD no definidos: se genera una contraseña aleatoria.');
}

function inicializarFirebase() {
  const jsonB64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  let sa;
  if (jsonB64) {
    sa = JSON.parse(Buffer.from(jsonB64, 'base64').toString('utf8'));
  } else {
    const ruta = path.resolve(
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './sys-juridico-firebase-adminsdk-fbsvc-436ade3197.json'
    );
    if (!fs.existsSync(ruta)) {
      console.error('[MIGRACIÓN] No se encontró la credencial de Firebase en: ' + ruta);
      process.exit(1);
    }
    sa = JSON.parse(fs.readFileSync(ruta, 'utf8'));
  }
  admin.initializeApp({ credential: admin.credential.cert(sa) });
  return admin.firestore();
}

/* ---------------- Helpers ---------------- */

function normalizar(doc) {
  const out = {};
  for (const [k, v] of Object.entries(doc.data ? doc.data() : doc)) {
    if (v && typeof v.toDate === 'function') out[k] = v.toDate();
    else if (v && typeof v === 'object' && v.constructor?.name === 'DocumentReference') out[k] = v.path;
    else if (Array.isArray(v)) out[k] = v.map((x) => (x && typeof x.toDate === 'function' ? x.toDate() : x));
    else out[k] = v;
  }
  return out;
}

async function leerCol(ref) {
  const snap = await ref.get();
  return snap.docs.map((d) => ({ id: d.id, data: normalizar(d) }));
}

const numero = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/\./g, '').replace(/,/g, '.'));
  return Number.isFinite(n) ? n : 0;
};

const limpiarNombre = (v) => String(v || '').replace(/\s+/g, ' ').trim().toUpperCase();

function normalizarEstado(estado) {
  const e = String(estado || '').toLowerCase();
  if (e.includes('archiv')) return 'archivado';
  if (e.includes('finaliz')) return 'finalizado';
  if (e.includes('suspend')) return 'suspendido';
  if (e.includes('sentencia') || e.includes('proceso')) return 'en_proceso';
  return 'activo';
}

function normalizarTipoAgenda(tipo) {
  const t = String(tipo || '').toLowerCase();
  if (t.includes('audien')) return 'audiencia';
  if (t.includes('reunion') || t.includes('reunión')) return 'reunion';
  if (t.includes('vencim')) return 'vencimiento';
  return 'otro';
}

function combinarFechaHora(fecha, hora) {
  if (!fecha) return new Date();
  try {
    const d = new Date(`${String(fecha).slice(0, 10)}T${hora || '00:00'}:00`);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  } catch {
    return new Date();
  }
}

const upsertCol = async (nombreCol, docs) => {
  if (!docs.length) {
    console.log(`[MIGRACIÓN] "${nombreCol}": sin documentos, se omite.`);
    return;
  }
  const col = mongoose.connection.collection(nombreCol);
  const ids = docs.map((d) => d.firestoreId);
  // Idempotente: reemplaza solo lo ya importado con el mismo firestoreId.
  await col.deleteMany({ firestoreId: { $in: ids } });
  try {
    await col.insertMany(docs, { ordered: false });
  } catch (err) {
    console.warn(`[MIGRACIÓN] "${nombreCol}": algunos documentos no se insertaron (${err.message.split('\n')[0]})`);
  }
  console.log(`[MIGRACIÓN] "${nombreCol}": ${docs.length} documento(s) -> Mongo.`);
};

/* ---------------- Mapas de referencia ---------------- */
const emailUsuario = new Map(); // email -> _id
const idFirestore = new Map(); // firestoreId -> _id (clientes y expedientes)
const nombreCliente = new Map(); // NOMBRE LIMPIO -> _id

async function migrarTodo(db) {
  /* 1) users (raíz) */
  const usersFS = await leerCol(db.collection('users'));
  const hashPwd = bcrypt.hashSync(PASSWORD_DEFECTO || crypto.randomBytes(6).toString('hex'), 10);
  const docsUsers = usersFS.map(({ id, data }) => {
    const email = String(data.email || '').toLowerCase().trim();
    const _id = new mongoose.Types.ObjectId();
    if (email) emailUsuario.set(email, _id);
    return {
      _id,
      firestoreId: id,
      nombre: String(data.displayName || data.nombre || email.split('@')[0] || 'Usuario'),
      email,
      password: hashPwd,
      rol: String(data.role || data.rol || 'abogado').toLowerCase().startsWith('admin') ? 'admin' : 'abogado',
      activo: true,
      createdAt: data.createdAt || data.updatedAt || new Date(),
      updatedAt: data.updatedAt || data.createdAt || new Date(),
    };
  });
  const adminRespaldo = docsUsers.find((u) => u.rol === 'admin')?._id || null;
  await upsertCol('users', docsUsers);
  if (PASSWORD_DEFECTO) console.log(`[MIGRACIÓN] Usuarios con contraseña: "${PASSWORD_DEFECTO}"`);

  /* 2) clientes */
  const clientesFS = await leerCol(
    db.collection('estudio_juridico').doc('oficina_central').collection('clientes')
  );
  const vistosCi = new Set();
  const docsClientes = [];
  clientesFS.forEach(({ id, data }) => {
    const cedula = String(data.ci || '').trim();
    const claveCi = cedula || '(sin-ci)';
    if (vistosCi.has(claveCi)) {
      // Sin CI duplicado: conserva el registro con un identificador alternativo.
      if (!cedula) docsClientes.push({
        _id: new mongoose.Types.ObjectId(),
        firestoreId: id,
        nombreCompleto: data.nombre ? String(data.nombre).trim() : '(Sin nombre)',
        cedula: `S/C-${docsClientes.length + 1}`,
        telefono: String(data.telefono || '').trim() || '-',
        direccion: String(data.ubicacion || ''),
        email: '',
        notas: data.referencias ? JSON.stringify(data.referencias) : '',
        creadoPor: adminRespaldo,
        createdAt: data.creadoEn || new Date(),
        updatedAt: data.creadoEn || new Date(),
      });
      return;
    }
    vistosCi.add(claveCi);
    const _id = new mongoose.Types.ObjectId();
    idFirestore.set(id, _id);
    const nombre = limpiarNombre(data.nombre);
    if (nombre) nombreCliente.set(nombre, _id);
    docsClientes.push({
      _id,
      firestoreId: id,
      nombreCompleto: data.nombre ? String(data.nombre).trim() : '(Sin nombre)',
      cedula,
      telefono: String(data.telefono || '').trim() || '-',
      direccion: String(data.ubicacion || ''),
      email: '',
      notas: data.referencias ? JSON.stringify(data.referencias) : '',
      creadoPor: emailUsuario.get(String(data.creadoPor || '').toLowerCase().trim()) || adminRespaldo,
      createdAt: data.creadoEn || new Date(),
      updatedAt: data.creadoEn || new Date(),
    });
  });
  await upsertCol('clientes', docsClientes);

  /* 3) expedientes */
  const expFS = await leerCol(
    db.collection('estudio_juridico').doc('oficina_central').collection('expedientes')
  );
  const docsExp = expFS.map(({ id, data }) => {
    const _id = new mongoose.Types.ObjectId();
    idFirestore.set(id, _id);
    return {
      _id,
      firestoreId: id,
      caratula: String(data.caratula || '(Sin carátula)').trim(),
      cliente: nombreCliente.get(limpiarNombre(data.cliente)) || null,
      abogadoAsignado: emailUsuario.get(String(data.creadoPor || '').toLowerCase().trim()) || adminRespaldo,
      fuero: '',
      juzgado: '',
      descripcion: String(data.descripcion || ''),
      enlaceDocumento: String(data.docUrl || ''),
      fechaInicio: data.fecha ? combinarFechaHora(data.fecha, '00:00') : new Date(),
      estado: normalizarEstado(data.estado),
      honorariosTotales: numero(data.honorarios),
      creditoAutomatico: false,
      entregaInicial: 0,
      cantidadCuotas: 0,
      frecuenciaCuotas: 'mensual',
      planPagos: [],
      saldoPendiente: numero(data.honorarios),
      creadoPor: emailUsuario.get(String(data.creadoPor || '').toLowerCase().trim()) || adminRespaldo,
      createdAt: data.creadoEn || new Date(),
      updatedAt: data.creadoEn || new Date(),
    };
  });
  await upsertCol('expedientes', docsExp);

  /* 4) creditos */
  const credFS = await leerCol(
    db.collection('estudio_juridico').doc('oficina_central').collection('creditos')
  );
  await upsertCol('creditos', credFS.map(({ id, data }) => ({
    firestoreId: id,
    cliente: nombreCliente.get(limpiarNombre(data.cliente)) || null,
    expediente: idFirestore.get(String(data.origenExpediente || '')) || null,
    clienteNombre: String(data.cliente || ''),
    concepto: String(data.concepto || ''),
    montoTotal: numero(data.montoTotal),
    saldoPendiente: numero(data.saldoPendiente ?? data.montoTotal),
    origenExpediente: String(data.origenExpediente || ''),
    createdAt: data.creadoEn || new Date(),
    updatedAt: data.creadoEn || new Date(),
  })));

  /* 5) ingresos -> movimientos (movimientofinancieros) */
  const ingFS = await leerCol(
    db.collection('estudio_juridico').doc('oficina_central').collection('ingresos')
  );
  await upsertCol('movimientofinancieros', ingFS.map(({ id, data }) => {
    const refId = String(data.referenciaId || '');
    return {
      firestoreId: id,
      tipo: 'ingreso',
      concepto: String(data.concepto || 'Ingreso'),
      monto: numero(data.monto),
      moneda: 'PYG',
      metodoPago: 'efectivo',
      fecha: data.creadoEn || new Date(),
      cliente: nombreCliente.get(limpiarNombre(data.cliente)) || null,
      expediente: refId && idFirestore.get(refId) ? idFirestore.get(refId) : null,
      numeroCuota: null,
      registradoPor: emailUsuario.get(String(data.creadoPor || '').toLowerCase().trim()) || adminRespaldo,
      notas: String(data.detalle || ''),
      createdAt: data.creadoEn || new Date(),
      updatedAt: data.creadoEn || new Date(),
    };
  }));

  /* 6) agenda -> eventoagendas */
  const agendaFS = await leerCol(
    db.collection('estudio_juridico').doc('oficina_central').collection('agenda')
  );
  await upsertCol('eventoagendas', agendaFS.map(({ id, data }) => ({
    firestoreId: id,
    titulo: String(data.titulo || '(Sin título)'),
    tipo: normalizarTipoAgenda(data.tipo),
    descripcion: '',
    fechaInicio: combinarFechaHora(data.fecha, data.hora),
    fechaFin: null,
    todoElDia: false,
    lugar: '',
    cliente: null,
    expediente: null,
    responsable: emailUsuario.get(String(data.creadoPor || '').toLowerCase().trim()) || adminRespaldo,
    estado: 'pendiente',
    creadoPor: emailUsuario.get(String(data.creadoPor || '').toLowerCase().trim()) || adminRespaldo,
    createdAt: data.creadoEn || new Date(),
    updatedAt: data.creadoEn || new Date(),
  })));

  /* 7) requisitos_tramites */
  const reqFS = await leerCol(
    db.collection('estudio_juridico').doc('oficina_central').collection('requisitos_tramites')
  );
  await upsertCol('requisitos_tramites', reqFS.map(({ id, data }) => ({
    firestoreId: id,
    titulo: String(data.titulo || ''),
    categoria: String(data.categoria || ''),
    requisitos: String(data.requisitos || ''),
    costo: numero(data.costo),
    createdAt: data.creadoEn || new Date(),
    updatedAt: data.creadoEn || new Date(),
  })));

  /* 8) ubicacion_archivos */
  const ubiFS = await leerCol(
    db.collection('estudio_juridico').doc('oficina_central').collection('ubicacion_archivos')
  );
  await upsertCol('ubicacion_archivos', ubiFS.map(({ id, data }) => ({
    firestoreId: id,
    nombre: String(data.nombre || ''),
    ubicacion: String(data.ubicacion || ''),
    createdAt: data.creadoEn || new Date(),
    updatedAt: data.creadoEn || new Date(),
  })));

  /* 9) base_legal (raíz) -> conocimiento RAG de LexPY */
  const legalFS = await leerCol(db.collection('base_legal'));
  await upsertCol('base_legal', legalFS.map(({ id, data }) => ({
    firestoreId: id,
    titulo: String(data.nombreArchivo || id),
    categoria: 'otro',
    contenido: String(data.texto || ''),
    fuente: String(data.fuenteInstitucional || data.origen || ''),
    url: String(data.urlFuente || ''),
    tags: [String(data.origen || ''), String(data.categoria || '')].filter(Boolean),
    createdAt: data.updatedAt || new Date(),
    updatedAt: data.updatedAt || new Date(),
  })));

  /* 10) aprendizajes_sistema (raíz) */
  const aprendeFS = await leerCol(db.collection('aprendizajes_sistema'));
  await upsertCol('aprendizajes_sistema', aprendeFS.map(({ id, data }) => ({
    firestoreId: id,
    pregunta: String(data.disparadoPor || data.sessionId || id),
    respuesta: String(data.contenido || data.texto || ''),
    origen: String(data.origen || 'LexPy').toLowerCase().includes('lexpy') ? 'ia_generativa' : 'local',
    validado: false,
    tags: [],
    createdAt: data.createdAt || new Date(),
    updatedAt: data.createdAt || new Date(),
  })));
}

async function migrar() {
  const db = inicializarFirebase();
  await connectDB();
  console.log('[MIGRACIÓN] Firestore -> MongoDB. Iniciando...');
  await migrarTodo(db);
  console.log('[MIGRACIÓN] Proceso completado correctamente.');
  await mongoose.disconnect();
  process.exit(0);
}

migrar().catch((err) => {
  console.error('[MIGRACIÓN] Error fatal:', err);
  process.exit(1);
});

