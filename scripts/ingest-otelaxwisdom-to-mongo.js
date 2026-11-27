/**
 * Ingesta Masiva e Idempotente del Acervo OtelaxWisdom a MongoDB (base_legal y jurisprudencia)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const BaseLegal = require('../server/models/BaseLegal');
const Jurisprudencia = require('../server/models/Jurisprudencia');

function escanearMd(dir, baseDir = dir) {
  let resultados = [];
  if (!fs.existsSync(dir)) return resultados;
  const entradas = fs.readdirSync(dir, { withFileTypes: true });
  for (const entrada of entradas) {
    if (entrada.name.startsWith('.') && entrada.name !== '.git') continue;
    if (entrada.name === '.git' || entrada.name === 'node_modules') continue;

    const rutaCompleta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      resultados = resultados.concat(escanearMd(rutaCompleta, baseDir));
    } else if (
      entrada.isFile() &&
      entrada.name.endsWith('.md') &&
      !/^readme\.md$/i.test(entrada.name) &&
      !entrada.name.startsWith('.gitkeep')
    ) {
      const relPath = path.relative(baseDir, rutaCompleta).replace(/\\/g, '/');
      resultados.push({ rutaCompleta, relPath });
    }
  }
  return resultados;
}

const FUERO_MAP = {
  'CIVIL Y COMERCIAL': 'CIVIL',
  'PENAL': 'PENAL',
  'LABORAL': 'LABORAL',
  'NIÑEZ Y ADOLESCENCIA': 'NINEZ',
  'CONTENCIOSO ADMINISTRATIVO': 'CONTENCIOSO',
  'TRIBUNAL DE CUENTAS': 'CONTENCIOSO',
  'SALA CONSTITUCIONAL': 'CONSTITUCIONAL',
  'JUSTICIA DE PAZ': 'CIVIL',
  'LEYES ESPECIALES Y TRANSVERSALES': 'ORG_JUDICIAL',
};

const CATEGORIA_MAP = {
  'CONSTITUCION NACIONAL': 'codigo',
  'CODIGO': 'codigo',
  'LEY': 'ley',
  'ACORDADA': 'resolucion',
  'JURISPRUDENCIA': 'jurisprudencia',
  'DOCTRINA': 'doctrina',
  'TRATADO INTERNACIONAL': 'tratado',
  'RESOLUCION': 'resolucion',
  'PROTOCOLO': 'tratado',
  'OTRO': 'otro',
};

function parseFrontmatterSimple(texto) {
  if (!texto || !texto.startsWith('---')) {
    return { metadata: {}, content: texto || '' };
  }
  const match = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { metadata: {}, content: texto };

  const yamlBlock = match[1];
  const content = match[2];
  const metadata = {};

  yamlBlock.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim();
      let value = trimmed.slice(colonIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      metadata[key] = value;
    }
  });

  return { metadata, content };
}

function extraerArticulos(texto) {
  const articulos = [];
  const regex = /(?:^|\n)(?:\*{1,3})?(?:Art(?:[íi]culo|\.)?\s*(\d+)[°ºª\.\-–—]*)(?:\*{1,3})?[\s:–—]+([\s\S]*?)(?=(?:\n(?:\*{1,3})?Art(?:[íi]culo|\.)?\s*\d+|$))/gi;
  let match;
  while ((match = regex.exec(texto)) !== null) {
    const num = match[1].trim();
    const txt = match[2].trim().slice(0, 3000);
    if (num && txt) {
      articulos.push({ numero: num, texto: txt });
    }
    if (articulos.length >= 150) break; // Límite razonable por documento
  }
  return articulos;
}

async function main() {
  console.log('='.repeat(70));
  console.log('🏛️  INGESTA DE ACERVO OTELAXWISDOM A MONGODB (base_legal & jurisprudencia)');
  console.log('='.repeat(70));

  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.error('❌ Falta DATABASE_URL en el entorno.');
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log(`[DB] Conectado exitosamente a MongoDB -> "${mongoose.connection.name}"`);

  const acervoDir = path.resolve(__dirname, '../data/otelaxwisdom/acervo');
  if (!fs.existsSync(acervoDir)) {
    console.error('❌ No se encontró la carpeta del acervo:', acervoDir);
    process.exit(1);
  }

  const archivos = escanearMd(acervoDir);
  console.log(`[Acervo] Encontrados ${archivos.length} archivos .md para migrar a MongoDB.\n`);

  let baseLegalInsertados = 0;
  let baseLegalActualizados = 0;
  let jurisInsertados = 0;
  let jurisActualizados = 0;

  for (const item of archivos) {
    try {
      const raw = fs.readFileSync(item.rutaCompleta, 'utf8');
      const { metadata, content } = parseFrontmatterSimple(raw);

      const titulo = metadata.titulo || path.basename(item.relPath, '.md');
      const fueroRaw = metadata.fuero || 'CIVIL Y COMERCIAL';
      const fueroMongo = FUERO_MAP[fueroRaw] || 'CIVIL';
      const tipoRaw = metadata.tipo || 'LEY';
      const categoriaMongo = CATEGORIA_MAP[tipoRaw] || 'ley';
      const numeroNorma = metadata.numero_norma || '';
      const fuente = metadata.fuente || 'OtelaxWisdom / FUDAPY ZETTI';
      const urlFuente = metadata.url_fuente || '';
      const tags = [
        fueroRaw.toLowerCase(),
        tipoRaw.toLowerCase(),
        'otelaxwisdom',
        'paraguay',
      ].filter(Boolean);

      const articulos = extraerArticulos(content);

      // 1. Inserción / Actualización en BaseLegal
      const baseExistente = await BaseLegal.findOne({
        $or: [
          { titulo },
          ...(urlFuente ? [{ fuenteOficialUrl: urlFuente }] : []),
        ],
      });

      const datosBaseLegal = {
        titulo,
        categoria: categoriaMongo,
        fuero: fueroMongo,
        estado: 'VIGENTE',
        numeroLey: numeroNorma,
        contenido: content,
        articulos,
        fuenteOficialUrl: urlFuente,
        fuente,
        tags,
      };

      if (baseExistente) {
        await BaseLegal.updateOne({ _id: baseExistente._id }, { $set: datosBaseLegal });
        baseLegalActualizados++;
      } else {
        await BaseLegal.create(datosBaseLegal);
        baseLegalInsertados++;
      }

      // 2. Si es jurisprudencia o acordada con contenido resolutivo, registrar en Jurisprudencia
      if (tipoRaw === 'JURISPRUDENCIA' || /acuerdo|sentencia|resoluci[oó]n|fallo/i.test(titulo)) {
        let tipoResolucion = 'Acuerdo y Sentencia';
        if (/auto interlocutorio/i.test(titulo)) tipoResolucion = 'Auto Interlocutorio';
        else if (/resoluci[oó]n/i.test(titulo)) tipoResolucion = 'Resolucion';

        const matchAno = titulo.match(/\b(19\d\d|20\d\d)\b/) || content.match(/\b(19\d\d|20\d\d)\b/);
        const ano = matchAno ? Number(matchAno[1]) : 2024;

        const jurisExistente = await Jurisprudencia.findOne({ caratula: titulo });

        const datosJuris = {
          caratula: titulo,
          tipoResolucion,
          numeroResolucion: numeroNorma,
          ano,
          fuero: fueroMongo,
          tribunal: 'Corte Suprema de Justicia del Paraguay',
          sala: fueroRaw,
          contenido: content,
          doctrinaSumario: content.slice(0, 1500),
          fuenteOficialUrl: urlFuente,
          tags,
        };

        if (jurisExistente) {
          await Jurisprudencia.updateOne({ _id: jurisExistente._id }, { $set: datosJuris });
          jurisActualizados++;
        } else {
          await Jurisprudencia.create(datosJuris);
          jurisInsertados++;
        }
      }
    } catch (errDoc) {
      console.warn(`[Error] en ${item.relPath}:`, errDoc.message);
    }
  }

  const [totalBase, totalJuris] = await Promise.all([
    BaseLegal.countDocuments(),
    Jurisprudencia.countDocuments(),
  ]);

  console.log('\n' + '='.repeat(70));
  console.log('📊 RESUMEN DE INGESTA EN MONGODB:');
  console.log('='.repeat(70));
  console.log(`📚 BaseLegal:     +${baseLegalInsertados} nuevos, ${baseLegalActualizados} actualizados -> Total en DB: ${totalBase}`);
  console.log(`⚖️ Jurisprudencia: +${jurisInsertados} nuevos, ${jurisActualizados} actualizados -> Total en DB: ${totalJuris}`);
  console.log('='.repeat(70));
  console.log('✅ Base de datos MongoDB actualizada exitosamente con todo el conocimiento.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error crítico en migración:', err);
  process.exit(1);
});
