const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const BaseLegal = require('../server/models/BaseLegal');

const BACN_DIR = path.resolve(__dirname, '../LESGILACION PARAGUAYA/BACN');
const CATALOGO_PATH = path.join(BACN_DIR, 'catalogo.json');
const CODIGOS_INDEX_PATH = path.join(BACN_DIR, 'indices/codigos.md');
const CONSTITUCION_PATH = path.resolve(__dirname, '../LESGILACION PARAGUAYA/constitucion_nacional.md');

// Función de clasificación por Fuero Jurídico Paraguayo
function determinarFuero(titulo, contenido) {
  const t = (titulo + ' ' + (contenido ? contenido.slice(0, 3000) : '')).toLowerCase();

  if (/constituc|amparo|habeas corpus|habeas data|soberan|enmienda constituc/i.test(titulo)) {
    return 'Constitucional';
  }
  if (/c[oó]digo penal|procesal penal|hecho punible|delito|crimen|penitenciari|antisecuestro|estafa|drogas|narcotr|homicid|comiso|armas de fuego/i.test(t)) {
    return 'Penal';
  }
  if (/c[oó]digo del trabajo|procesal laboral|trabajador|laboral|salario|prevision social|ips\b|huelga|sindicat|empleo|patronal|despido/i.test(t)) {
    return 'Laboral';
  }
  if (/ni[ñn]ez|adolescen|menor|alimento|patria potestad|adopci[oó]n|filiaci[oó]n|infantil/i.test(t)) {
    return 'Niñez y Adolescencia';
  }
  if (/tributar|impuesto|dnit\b|irpc|irss|ire\b|irp\b|iva\b|aduan|fiscal|renta|evasion fiscal/i.test(t)) {
    return 'Tributario';
  }
  if (/c[oó]digo de organizaci[oó]n judicial|corte suprema|magistratura|jueces|defensa publica|ministerio publico|fiscalia general/i.test(t)) {
    return 'Organización Judicial';
  }
  if (/c[oó]digo civil|procesal civil|contrato|quiebra|sociedad|usucapi|cheque|locaci|propiedad|derechos reales|sucesion|herencia/i.test(t)) {
    return 'Civil y Comercial';
  }
  if (/administrativ|funcion publica|caminera|licitaci|concesi|expropiac|municipal|transito|dncp/i.test(t)) {
    return 'Contencioso Administrativo';
  }

  return 'General';
}

function determinarCategoria(titulo, esCodigo) {
  if (esCodigo || /c[oó]digo/i.test(titulo)) return 'codigo';
  if (/ley\b/i.test(titulo)) return 'ley';
  if (/decreto/i.test(titulo)) return 'otro';
  if (/resoluci[oó]n|acordada/i.test(titulo)) return 'resolucion';
  return 'ley';
}

function determinarEstado(titulo) {
  if (/\bDEROGA\s+LA\s+LEY\b|\bABROGA\b/i.test(titulo)) {
    return 'Vigente'; // la ley que deroga está vigente
  }
  if (/MODIFICA|AMPL[IÍ]A/i.test(titulo)) {
    return 'Modificada';
  }
  return 'Vigente';
}

function extraerNumeroLey(titulo) {
  const m = titulo.match(/\bley\s*(?:n[º°.]*\s*)?([\d.]+)/i);
  return m ? m[1].replace(/\./g, '') : '';
}

function generarTags(titulo, fuero) {
  const tags = new Set([fuero.toLowerCase()]);
  const palabras = titulo.toLowerCase().replace(/[^a-záéíóúñ0-9\s]/g, ' ').split(/\s+/);
  const stopWords = new Set(['que', 'por', 'la', 'el', 'los', 'las', 'del', 'para', 'con', 'una', 'ley', 'modifica', 'amplia', 'aprueba', 'articulo', 'articulos', 'fecha', 'ano']);

  palabras.forEach((p) => {
    if (p.length > 3 && !stopWords.has(p)) {
      tags.add(p);
    }
  });

  return Array.from(tags).slice(0, 10);
}

async function main() {
  console.log('[OtelaxWisdom] Iniciando sincronización de Legislación Paraguaya en MongoDB...');
  await mongoose.connect(process.env.DATABASE_URL);
  console.log('[DB] Conectado exitosamente a MongoDB.');

  // 1. Cargar conjunto de Códigos identificados
  const setCodigos = new Set();
  if (fs.existsSync(CODIGOS_INDEX_PATH)) {
    const codigosMd = fs.readFileSync(CODIGOS_INDEX_PATH, 'utf8');
    const regexNormas = /\[(.*?)\]\(..\/normas\/(.*?)\)/g;
    let m;
    while ((m = regexNormas.exec(codigosMd)) !== null) {
      setCodigos.add(m[2]);
    }
  }
  console.log(`[Catalogo] Códigos catalogados: ${setCodigos.size}`);

  // 2. Ingesta Constitución Nacional (1992) con articulado completo
  if (fs.existsSync(CONSTITUCION_PATH)) {
    const contenidoCN = fs.readFileSync(CONSTITUCION_PATH, 'utf8');
    await BaseLegal.findOneAndUpdate(
      { numeroLey: 'CN1992' },
      {
        titulo: 'Constitución de la República del Paraguay (1992)',
        categoria: 'codigo',
        contenido: contenidoCN,
        fuente: 'Convención Nacional Constituyente / BACN',
        url: 'https://www.bacn.gov.py/constitucion-nacional-de-la-republica-del-paraguay',
        fuero: 'Constitucional',
        estadoNormativo: 'Vigente',
        numeroLey: 'CN1992',
        tags: ['constitucion', 'supremacia constitucional', 'derechos humanos', 'amparo', 'habeas corpus', 'poder judicial', 'garantias'],
      },
      { upsert: true, new: true }
    );
    console.log('[OtelaxWisdom] ✓ Constitución Nacional 1992 ingestada con articulado completo.');
  }

  // 3. Ingesta de las 7.133 normas del catálogo BACN
  if (!fs.existsSync(CATALOGO_PATH)) {
    console.error('[Error] No se encontró catalogo.json en:', CATALOGO_PATH);
    process.exit(1);
  }

  const catalogoData = JSON.parse(fs.readFileSync(CATALOGO_PATH, 'utf8'));
  const laws = catalogoData.laws || [];
  console.log(`[Catalogo] Total de normas a procesar: ${laws.length}`);

  const BATCH_SIZE = 250;
  let operaciones = [];
  let procesadas = 0;
  let articulosTotales = 0;

  for (let i = 0; i < laws.length; i++) {
    const item = laws[i];
    const filePath = path.join(BACN_DIR, item.file);

    let contenido = '';
    if (fs.existsSync(filePath)) {
      contenido = fs.readFileSync(filePath, 'utf8');
    } else {
      contenido = `# ${item.title}\n\nFicha oficial: ${item.url}\nFecha: ${item.date || ''}\nPDF oficial: ${item.pdfUrl || ''}`;
    }

    const matchesArt = contenido.match(/(?:^|\n)(?:Artículo|Art\.|Art[íi]culo)\s+[0-9A-Za-zº°\/-]+/gi);
    if (matchesArt) {
      articulosTotales += matchesArt.length;
    }

    const fileName = path.basename(item.file);
    const esCodigo = setCodigos.has(fileName);
    const numeroLey = extraerNumeroLey(item.title) || item.id;
    const fuero = determinarFuero(item.title, contenido);
    const categoria = determinarCategoria(item.title, esCodigo);
    const estadoNormativo = determinarEstado(item.title);
    const tags = generarTags(item.title, fuero);

    operaciones.push({
      updateOne: {
        filter: { url: item.url },
        update: {
          $set: {
            titulo: item.title,
            categoria,
            contenido,
            fuente: 'BACN - Biblioteca y Archivo Central del Congreso Nacional',
            url: item.url,
            fuero,
            estadoNormativo,
            numeroLey,
            tags,
          },
        },
        upsert: true,
      },
    });

    if (operaciones.length >= BATCH_SIZE || i === laws.length - 1) {
      await BaseLegal.bulkWrite(operaciones, { ordered: false });
      procesadas += operaciones.length;
      console.log(`[Ingesta] Progreso: ${procesadas} / ${laws.length} normas procesadas...`);
      operaciones = [];
    }
  }

  const totalFinal = await BaseLegal.countDocuments();
  console.log(`\n======================================================`);
  console.log(`[OtelaxWisdom] Ingesta completada con éxito.`);
  console.log(`Total registros en base_legal: ${totalFinal}`);
  console.log(`Artículos indexados contabilizados: ${articulosTotales}`);
  console.log(`======================================================\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error('[Error]', err);
  process.exit(1);
});
