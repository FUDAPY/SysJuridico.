const fs = require('fs');
const path = require('path');

const OTELAX_DATA_DIR =
  process.env.OTELAXWISDOM_DATA_DIR || path.resolve(__dirname, '../../data/otelaxwisdom');

const TIPOS_VALIDOS = [
  'CONSTITUCION NACIONAL',
  'TRATADO INTERNACIONAL',
  'CODIGO',
  'LEY',
  'JURISPRUDENCIA',
  'ACORDADA',
  'DOCTRINA',
  'OTRO',
];

// Asegurar existencia de carpeta al inicio
if (!fs.existsSync(OTELAX_DATA_DIR)) {
  fs.mkdirSync(OTELAX_DATA_DIR, { recursive: true });
}

// Índice en memoria de documentos curados
let indiceMemoria = [];
let ultimaCarga = 0;

function parseFrontmatter(rawContent) {
  const match = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return {
      metadata: {},
      content: rawContent.trim(),
    };
  }

  const header = match[1];
  const body = match[2];
  const metadata = {};

  header.split(/\r?\n/).forEach((line) => {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      let val = line.slice(colonIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      metadata[key] = val;
    }
  });

  return { metadata, content: body.trim() };
}

function stringifyFrontmatter(metadata, body) {
  let header = '---\n';
  for (const [k, v] of Object.entries(metadata)) {
    if (v !== undefined && v !== null) {
      header += `${k}: "${String(v).replace(/"/g, '\\"')}"\n`;
    }
  }
  header += '---\n\n';
  return header + body.trim() + '\n';
}

function formatearTamano(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizarNombreArchivo(titulo) {
  const limpio = String(titulo || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 75);
  return (limpio || 'documento') + '.md';
}

function normalizarTexto(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Carga o refresca el índice en memoria de todos los documentos .md
 */
function recargarIndice() {
  if (!fs.existsSync(OTELAX_DATA_DIR)) {
    indiceMemoria = [];
    return indiceMemoria;
  }

  const archivos = fs.readdirSync(OTELAX_DATA_DIR);
  const docs = [];

  for (const archivo of archivos) {
    if (!archivo.endsWith('.md')) continue;

    const rutaCompleta = path.join(OTELAX_DATA_DIR, archivo);
    try {
      const stats = fs.statSync(rutaCompleta);
      const raw = fs.readFileSync(rutaCompleta, 'utf8');
      const { metadata, content } = parseFrontmatter(raw);

      const titulo = metadata.titulo || archivo.replace(/\.md$/, '').replace(/-/g, ' ');
      const tipo = TIPOS_VALIDOS.includes(metadata.tipo) ? metadata.tipo : 'OTRO';
      const actualizado = metadata.actualizado || stats.mtime.toISOString();

      docs.push({
        filename: archivo,
        titulo,
        tipo,
        actualizado,
        tamanoBytes: stats.size,
        tamanoLegible: formatearTamano(stats.size),
        contenido: content,
        textoNormalizado: normalizarTexto(`${titulo} ${tipo} ${content}`),
      });
    } catch (e) {
      console.warn(`[OtelaxWisdom] Error indexando ${archivo}:`, e.message);
    }
  }

  // Ordenar por fecha de actualización descendente
  docs.sort((a, b) => new Date(b.actualizado) - new Date(a.actualizado));
  indiceMemoria = docs;
  ultimaCarga = Date.now();
  return indiceMemoria;
}

// Carga inicial
recargarIndice();

/**
 * Lista todos los documentos .md registrados
 */
function listarDocumentos({ tipo, busqueda } = {}) {
  // Refrescar si el índice está vacío o hace más de 60s que no se toca
  if (!indiceMemoria.length || Date.now() - ultimaCarga > 60000) {
    recargarIndice();
  }

  let lista = indiceMemoria.map((d) => ({
    filename: d.filename,
    titulo: d.titulo,
    tipo: d.tipo,
    actualizado: d.actualizado,
    tamanoBytes: d.tamanoBytes,
    tamanoLegible: d.tamanoLegible,
  }));

  if (tipo && tipo !== 'TODOS') {
    lista = lista.filter((d) => d.tipo === tipo);
  }

  if (busqueda) {
    const q = normalizarTexto(busqueda);
    if (q) {
      lista = lista.filter((d) => normalizarTexto(`${d.titulo} ${d.tipo} ${d.filename}`).includes(q));
    }
  }

  return lista;
}

/**
 * Obtiene un documento específico por su nombre de archivo
 */
function obtenerDocumento(filename) {
  const nombreLimpio = path.basename(filename);
  if (!nombreLimpio.endsWith('.md')) {
    throw new Error('El archivo debe tener extensión .md');
  }

  const ruta = path.join(OTELAX_DATA_DIR, nombreLimpio);
  if (!fs.existsSync(ruta)) {
    return null;
  }

  const stats = fs.statSync(ruta);
  const raw = fs.readFileSync(ruta, 'utf8');
  const { metadata, content } = parseFrontmatter(raw);

  return {
    filename: nombreLimpio,
    titulo: metadata.titulo || nombreLimpio.replace(/\.md$/, ''),
    tipo: metadata.tipo || 'OTRO',
    actualizado: metadata.actualizado || stats.mtime.toISOString(),
    tamanoBytes: stats.size,
    tamanoLegible: formatearTamano(stats.size),
    contenido: content,
    raw,
  };
}

/**
 * Crea o actualiza un documento .md en OtelaxWisdom
 */
function guardarDocumento({ titulo, tipo, contenido, filename = null }) {
  if (!titulo || !titulo.trim()) {
    throw new Error('El título del documento es obligatorio.');
  }
  if (!contenido || !contenido.trim()) {
    throw new Error('El contenido del documento no puede estar vacío.');
  }

  const tipoNormalizado = TIPOS_VALIDOS.includes(tipo) ? tipo : 'OTRO';
  const metadata = {
    titulo: titulo.trim(),
    tipo: tipoNormalizado,
    actualizado: new Date().toISOString(),
  };

  let archivoDestino;
  if (filename) {
    archivoDestino = path.basename(filename);
    if (!archivoDestino.endsWith('.md')) archivoDestino += '.md';
  } else {
    archivoDestino = sanitizarNombreArchivo(titulo);
  }

  const rutaArchivo = path.join(OTELAX_DATA_DIR, archivoDestino);
  const contenidoFinal = stringifyFrontmatter(metadata, contenido);

  fs.writeFileSync(rutaArchivo, contenidoFinal, 'utf8');

  // Actualizar índice en memoria de forma inmediata
  recargarIndice();

  return {
    filename: archivoDestino,
    titulo: metadata.titulo,
    tipo: metadata.tipo,
    actualizado: metadata.actualizado,
  };
}

/**
 * Elimina un documento .md de OtelaxWisdom
 */
function eliminarDocumento(filename) {
  const nombreLimpio = path.basename(filename);
  if (!nombreLimpio.endsWith('.md')) {
    throw new Error('Archivo no válido');
  }

  const ruta = path.join(OTELAX_DATA_DIR, nombreLimpio);
  if (fs.existsSync(ruta)) {
    fs.unlinkSync(ruta);
    recargarIndice();
    return true;
  }
  return false;
}

/**
 * RAG Inteligente sobre el acervo curado de OtelaxWisdom
 * Aplica umbral de relevancia mínimo para no inyectar documentos sin relación.
 */
function buscarEnOtelaxWisdom(consulta, { maxDocs = 3, minScore = 2 } = {}) {
  if (!indiceMemoria.length) {
    recargarIndice();
  }

  const consultaLimpia = normalizarTexto(consulta);
  if (!consultaLimpia) {
    return { resultados: [], totalEncontrados: 0 };
  }

  // Extraer palabras clave de 3 o más caracteres (excluyendo stop words básicas)
  const stopWords = new Set([
    'para', 'como', 'sobre', 'este', 'esta', 'estos', 'estas', 'entre',
    'desde', 'hasta', 'hacia', 'segun', 'donde', 'cuando', 'quien', 'cual',
    'cuales', 'tiene', 'tienen', 'haber', 'hacer', 'puede', 'pueden',
  ]);

  const palabras = consultaLimpia
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  if (!palabras.length) {
    return { resultados: [], totalEncontrados: 0 };
  }

  const candidatos = [];

  for (const doc of indiceMemoria) {
    let score = 0;
    const tituloNorm = normalizarTexto(doc.titulo);
    const tipoNorm = normalizarTexto(doc.tipo);
    const textoDoc = doc.textoNormalizado;

    // Coincidencia exacta de frase en título o contenido
    if (tituloNorm.includes(consultaLimpia)) {
      score += 25;
    } else if (textoDoc.includes(consultaLimpia)) {
      score += 15;
    }

    // Coincidencia de palabras individuales en título (+6) o tipo (+4)
    palabras.forEach((p) => {
      if (tituloNorm.includes(p)) score += 6;
      if (tipoNorm.includes(p)) score += 4;
    });

    // Búsqueda del fragmento más relevante en el contenido del documento
    const parrafos = doc.contenido.split(/\n\s*\n/);
    let mejorParrafo = '';
    let mejorScoreParrafo = 0;

    for (const parrafo of parrafos) {
      const parrafoNorm = normalizarTexto(parrafo);
      let pScore = 0;

      palabras.forEach((p) => {
        if (parrafoNorm.includes(p)) {
          pScore += 2;
        }
      });

      if (pScore > mejorScoreParrafo) {
        mejorScoreParrafo = pScore;
        mejorParrafo = parrafo.trim();
      }
    }

    score += mejorScoreParrafo;

    // Solo considerar si supera el umbral mínimo de relevancia
    if (score >= minScore) {
      // Limitar el fragmento a un máximo de 2000 caracteres representativos
      let fragmento = mejorParrafo || doc.contenido.slice(0, 1800);
      if (fragmento.length > 2000) {
        fragmento = fragmento.slice(0, 2000) + '...';
      }

      candidatos.push({
        filename: doc.filename,
        titulo: doc.titulo,
        tipo: doc.tipo,
        fragmento,
        score,
        actualizado: doc.actualizado,
      });
    }
  }

  candidatos.sort((a, b) => b.score - a.score);
  const seleccionados = candidatos.slice(0, maxDocs);

  return {
    resultados: seleccionados,
    totalEncontrados: candidatos.length,
  };
}

module.exports = {
  TIPOS_VALIDOS,
  OTELAX_DATA_DIR,
  recargarIndice,
  listarDocumentos,
  obtenerDocumento,
  guardarDocumento,
  eliminarDocumento,
  buscarEnOtelaxWisdom,
};
