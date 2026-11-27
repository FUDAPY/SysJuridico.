const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OTELAX_DATA_DIR =
  process.env.OTELAXWISDOM_DATA_DIR || path.resolve(__dirname, '../../data/otelaxwisdom');

const TIPOS_VALIDOS = [
  'CONSTITUCION NACIONAL',
  'CODIGO',
  'LEY',
  'ACORDADA',
  'JURISPRUDENCIA',
  'DOCTRINA',
  'TRATADO INTERNACIONAL',
  'RESOLUCION',
  'PROTOCOLO',
  'OTRO',
];

const FUEROS_VALIDOS = [
  'CIVIL Y COMERCIAL',
  'CONTENCIOSO ADMINISTRATIVO',
  'JUSTICIA DE PAZ',
  'LABORAL',
  'NIÑEZ Y ADOLESCENCIA',
  'PENAL',
  'SALA CONSTITUCIONAL',
  'TRIBUNAL DE CUENTAS',
  'LEYES ESPECIALES Y TRANSVERSALES',
  'GENERAL',
];

// Estructura de carpetas base
const CARPETAS_BASE = [
  OTELAX_DATA_DIR,
  path.join(OTELAX_DATA_DIR, 'acervo'),
  path.join(OTELAX_DATA_DIR, 'memoria-estudio'),
  path.join(OTELAX_DATA_DIR, 'memoria-estudio', 'escritos-modelo'),
  path.join(OTELAX_DATA_DIR, 'memoria-estudio', 'expedientes'),
  path.join(OTELAX_DATA_DIR, 'auto-aprendido'),
];

CARPETAS_BASE.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Índice en memoria de documentos curados
let indiceMemoria = [];
let ultimaCarga = 0;

function calcularContentHash(contenido) {
  return crypto.createHash('sha256').update(String(contenido || '').trim()).digest('hex');
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

function normalizarTipo(rawTipo) {
  if (!rawTipo) return 'OTRO';
  const t = String(rawTipo).trim().toUpperCase();
  if (TIPOS_VALIDOS.includes(t)) return t;

  const low = String(rawTipo).toLowerCase();
  if (low.includes('constitu')) return 'CONSTITUCION NACIONAL';
  if (low.includes('código') || low.includes('codigo')) return 'CODIGO';
  if (low.includes('ley')) return 'LEY';
  if (low.includes('acordada')) return 'ACORDADA';
  if (low.includes('jurisprudencia') || low.includes('fallo') || low.includes('auto interlocutorio') || low.includes('acuerdo y sentencia')) return 'JURISPRUDENCIA';
  if (low.includes('doctrina') || low.includes('guía') || low.includes('guia') || low.includes('perfil')) return 'DOCTRINA';
  if (low.includes('tratado') || low.includes('convenio') || low.includes('internacional')) return 'TRATADO INTERNACIONAL';
  if (low.includes('resoluci') || low.includes('decreto')) return 'RESOLUCION';
  if (low.includes('protocolo')) return 'PROTOCOLO';
  return 'OTRO';
}

function normalizarFuero(rawFuero) {
  if (!rawFuero) return 'GENERAL';
  const f = String(rawFuero).trim().toUpperCase();
  if (FUEROS_VALIDOS.includes(f)) return f;

  const low = String(rawFuero).toLowerCase();
  if (low.includes('civil') || low.includes('comercial')) return 'CIVIL Y COMERCIAL';
  if (low.includes('contencioso') || low.includes('administrativo')) return 'CONTENCIOSO ADMINISTRATIVO';
  if (low.includes('paz')) return 'JUSTICIA DE PAZ';
  if (low.includes('laboral') || low.includes('trabajo')) return 'LABORAL';
  if (low.includes('niñ') || low.includes('nin') || low.includes('adolescen') || low.includes('familia')) return 'NIÑEZ Y ADOLESCENCIA';
  if (low.includes('penal')) return 'PENAL';
  if (low.includes('constitucional')) return 'SALA CONSTITUCIONAL';
  if (low.includes('cuenta')) return 'TRIBUNAL DE CUENTAS';
  if (low.includes('especial') || low.includes('transversal')) return 'LEYES ESPECIALES Y TRANSVERSALES';
  return 'GENERAL';
}

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
    if (v !== undefined && v !== null && v !== '') {
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
    .slice(0, 85);
  return (limpio || 'documento') + '.md';
}

/**
 * Divide el texto respetando artículos o encabezados principales
 */
function extraerChunks(contenido, maxChunkChars = 1800) {
  if (!contenido) return [];
  const regexDivisor = /(?=(?:^|\n)\s*(?:#{1,4}\s+|(?:\*\*)?(?:Art(?:[íi]culo|\.)\s*\d+)))/i;
  const rawSections = contenido.split(regexDivisor).map((s) => s.trim()).filter(Boolean);

  const chunks = [];
  for (const sec of rawSections) {
    if (sec.length <= maxChunkChars) {
      chunks.push(sec);
    } else {
      const parrafos = sec.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
      let acumulado = '';
      for (const p of parrafos) {
        if ((acumulado + '\n\n' + p).length <= maxChunkChars) {
          acumulado = acumulado ? `${acumulado}\n\n${p}` : p;
        } else {
          if (acumulado) chunks.push(acumulado);
          if (p.length <= maxChunkChars) {
            acumulado = p;
          } else {
            for (let i = 0; i < p.length; i += maxChunkChars) {
              chunks.push(p.slice(i, i + maxChunkChars));
            }
            acumulado = '';
          }
        }
      }
      if (acumulado) chunks.push(acumulado);
    }
  }
  return chunks.length > 0 ? chunks : [contenido.slice(0, maxChunkChars)];
}

/**
 * Escaneo recursivo de archivos .md dentro de un directorio
 */
function escanearArchivosMdRecursivo(directorio) {
  let archivos = [];
  if (!fs.existsSync(directorio)) return archivos;

  const entradas = fs.readdirSync(directorio, { withFileTypes: true });
  for (const entrada of entradas) {
    const nombre = entrada.name;
    if (nombre.startsWith('.') || nombre === 'node_modules' || nombre.endsWith('.git')) continue;
    if (nombre.toLowerCase() === 'readme.md') continue;

    const rutaCompleta = path.join(directorio, nombre);
    if (entrada.isDirectory()) {
      if (nombre === '.cache_repo_zetti') continue;
      archivos = archivos.concat(escanearArchivosMdRecursivo(rutaCompleta));
    } else if (entrada.isFile() && (nombre.endsWith('.md') || nombre.endsWith('.markdown'))) {
      archivos.push(rutaCompleta);
    }
  }
  return archivos;
}

/**
 * Localiza la ruta absoluta del acervo preempaquetado fuera del volumen persistente de Dokploy (/app/data)
 */
function obtenerDirectorioBundledAcervo() {
  const candidatos = [
    process.env.OTELAX_BUNDLED_DIR,
    '/app/bundled/acervo',
    path.resolve(__dirname, '../../bundled/acervo'),
    path.resolve(__dirname, '../../data/otelaxwisdom/acervo'),
  ].filter(Boolean);

  for (const dir of candidatos) {
    if (fs.existsSync(dir)) {
      const archivos = escanearArchivosMdRecursivo(dir);
      if (archivos.length > 0) {
        return { dir, archivos };
      }
    }
  }
  return null;
}

/**
 * Asegura que los 215+ archivos del acervo preempaquetado estén presentes en OTELAX_DATA_DIR/acervo,
 * copiando archivo por archivo recursivamente si falta o difiere su tamaño.
 * No aborta aunque ya existan archivos previos (ej. constitucion-nacional.md).
 */
function asegurarAcervoBundled() {
  const targetDir = path.join(OTELAX_DATA_DIR, 'acervo');
  fs.mkdirSync(targetDir, { recursive: true });

  const bundledInfo = obtenerDirectorioBundledAcervo();
  if (!bundledInfo) {
    const targetArchivos = escanearArchivosMdRecursivo(targetDir);
    console.warn(`[OtelaxWisdom] Advertencia: No se encontró directorio bundled. Destino: ${targetDir} (${targetArchivos.length} archivos .md activos).`);
    return;
  }

  const { dir: bundledDir, archivos: bundledArchivos } = bundledInfo;

  // Si físicamente son el mismo directorio (ej. en desarrollo local si apunta a data/otelaxwisdom/acervo)
  if (path.resolve(bundledDir) === path.resolve(targetDir)) {
    const targetArchivos = escanearArchivosMdRecursivo(targetDir);
    console.log(`[OtelaxWisdom] Bundled path: ${bundledDir} (${bundledArchivos.length} archivos .md encontrados) -> Destino: ${targetDir} (${targetArchivos.length} archivos .md activos)`);
    return;
  }

  let copiados = 0;
  let omitidos = 0;

  try {
    for (const src of bundledArchivos) {
      const rel = path.relative(bundledDir, src);
      const dest = path.join(targetDir, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });

      let necesitaCopia = true;
      if (fs.existsSync(dest)) {
        const statSrc = fs.statSync(src);
        const statDest = fs.statSync(dest);
        if (statSrc.size === statDest.size) {
          necesitaCopia = false;
        }
      }

      if (necesitaCopia) {
        fs.copyFileSync(src, dest);
        copiados++;
      } else {
        omitidos++;
      }
    }
  } catch (err) {
    console.error('[OtelaxWisdom] Error asegurando acervo preempaquetado:', err.message);
  }

  const targetArchivos = escanearArchivosMdRecursivo(targetDir);
  console.log(`[OtelaxWisdom] Bundled path: ${bundledDir} (${bundledArchivos.length} archivos .md encontrados) -> Destino: ${targetDir} (${targetArchivos.length} archivos .md activos)`);
  if (copiados > 0) {
    console.log(`[OtelaxWisdom] ${copiados} archivos .md copiados desde bundled hacia ${targetDir}.`);
  }
}

/**
 * Carga o refresca el índice en memoria de todos los documentos .md en OtelaxWisdom
 */
function recargarIndice() {
  if (!fs.existsSync(OTELAX_DATA_DIR)) {
    fs.mkdirSync(OTELAX_DATA_DIR, { recursive: true });
  }

  // Asegurar acervo preempaquetado y plantilla por defecto
  asegurarAcervoBundled();
  asegurarEstiloForenseDefault();

  const archivos = escanearArchivosMdRecursivo(OTELAX_DATA_DIR);
  const docs = [];

  for (const rutaCompleta of archivos) {
    try {
      const stats = fs.statSync(rutaCompleta);
      const raw = fs.readFileSync(rutaCompleta, 'utf8');
      const { metadata, content } = parseFrontmatter(raw);

      const relPath = path.relative(OTELAX_DATA_DIR, rutaCompleta).replace(/\\/g, '/');
      const nombreBase = path.basename(rutaCompleta);

      const titulo = metadata.titulo || nombreBase.replace(/\.md$/, '').replace(/-/g, ' ');
      const tipo = normalizarTipo(metadata.tipo);
      const fuero = normalizarFuero(metadata.fuero);
      const numero_norma = metadata.numero_norma || metadata.numeroLey || '';
      const fuente = metadata.fuente || 'OtelaxWisdom';
      const url_fuente = metadata.url_fuente || metadata.url || '';
      const vigencia = metadata.vigencia || 'Vigente';
      const actualizado = metadata.actualizado || stats.mtime.toISOString();
      const content_hash = metadata.content_hash || calcularContentHash(content);

      // Metadatos de visibilidad y origen
      const visibilidad = metadata.visibilidad || (relPath.startsWith('memoria-estudio') ? 'PRIVADO_ESTUDIO' : 'PUBLICO_ACERVO');
      const subtipo = metadata.subtipo || (relPath.includes('escritos-modelo') ? 'ESCRITO_MODELO' : relPath.includes('expedientes') ? 'FICHA_EXPEDIENTE' : relPath.includes('estilo-forense') ? 'ESTILO_FORENSE' : 'GENERAL');
      const origen = metadata.origen || (relPath.startsWith('auto-aprendido') ? 'WEB_INSTITUCIONAL_AUTO' : relPath.startsWith('acervo') ? 'REPO_GITHUB' : 'MANUAL');
      const estado_revision = metadata.estado_revision || (origen === 'WEB_INSTITUCIONAL_AUTO' ? 'PENDIENTE_REVISION' : 'APROBADO');

      // Chunks para búsqueda semántica/léxica
      const chunks = extraerChunks(content);

      docs.push({
        relPath,
        filename: relPath, // compatibilidad con clientes existentes
        nombreArchivo: nombreBase,
        titulo,
        tipo,
        fuero,
        numero_norma,
        fuente,
        url_fuente,
        vigencia,
        actualizado,
        repo_path: metadata.repo_path || relPath,
        content_hash,
        visibilidad,
        subtipo,
        origen,
        estado_revision,
        tamanoBytes: stats.size,
        tamanoLegible: formatearTamano(stats.size),
        contenido: content,
        chunks,
        textoNormalizado: normalizarTexto(`${titulo} ${tipo} ${fuero} ${numero_norma} ${content}`),
      });
    } catch (e) {
      console.warn(`[OtelaxWisdom] Error indexando ${rutaCompleta}:`, e.message);
    }
  }

  // Ordenar por fecha de actualización descendente
  docs.sort((a, b) => new Date(b.actualizado) - new Date(a.actualizado));
  indiceMemoria = docs;
  ultimaCarga = Date.now();
  console.log(`[OtelaxWisdom] ${docs.length} documentos cargados en ${path.join(OTELAX_DATA_DIR, 'acervo')}`);
  return indiceMemoria;
}

/**
 * Plantilla por defecto del Estilo Forense del Estudio si no existe
 */
function asegurarEstiloForenseDefault() {
  const rutaEstilo = path.join(OTELAX_DATA_DIR, 'memoria-estudio', 'estilo-forense-estudio.md');
  if (fs.existsSync(rutaEstilo)) return;

  const defaultContent = `---
titulo: "Estilo Forense Institucional del Estudio"
tipo: "DOCTRINA"
fuero: "GENERAL"
visibilidad: "PRIVADO_ESTUDIO"
subtipo: "ESTILO_FORENSE"
origen: "MANUAL"
estado_revision: "APROBADO"
actualizado: "2026-11-27"
---

# Manual de Estilo Forense Institucional — LIN GROUP & Asociados

## 1. Encabezamiento y Comparecencia Formal
- Iniciar siempre con el objeto procesal en mayúsculas:
  **OBJETO:** [NOMBRE CLARO DE LA PRETENSIÓN O ACCIÓN PROCESAL]
  **SEÑOR JUEZ:** (o **EXCELENTÍSIMO TRIBUNAL:** según la instancia).
- Individualización completa: Letrado patrocinante o apoderado (conforme a poder), fijando domicilio procesal físico y electrónico obligatorio.

## 2. Exposición de los Hechos (Capítulo II)
- Redacción cronológica, clara, contundente y numerada.
- Respaldo instrumental de cada afirmación con referencia explícita a la prueba adjunta.

## 3. Fundamentos de Derecho y Jurisprudencia (Capítulo III)
- Invocación de la Constitución Nacional de 1992 y leyes paraguayas positivas vigentes.
- Citación de normas de fondo y procesales pertinentes (Código Civil, CPC, Código Penal, CPP, Ley 213/93, etc.).
- Precedentes CSJ: Citar Acuerdo y Sentencia (A. y S. Nº ...) con Sala y fecha de expedición.

## 4. Petitorio Judicial y Cierre (Capítulo IV)
- Peticiones ordenadas numéricamente y con pretensiones precisas.
- Fórmula forense sacramental obligatoria:
  **PROVEER DE CONFORMIDAD,**
  **SERÁ JUSTICIA.**
`;

  try {
    fs.mkdirSync(path.dirname(rutaEstilo), { recursive: true });
    fs.writeFileSync(rutaEstilo, defaultContent, 'utf8');
  } catch (err) {
    console.warn('[OtelaxWisdom] Error creando estilo forense default:', err.message);
  }
}

// Carga inicial
recargarIndice();

/**
 * Lista documentos según filtros
 */
function listarDocumentos({ fuero, tipo, visibilidad, subtipo, origen, busqueda } = {}) {
  if (!indiceMemoria.length || Date.now() - ultimaCarga > 60000) {
    recargarIndice();
  }

  let lista = indiceMemoria;

  if (visibilidad) {
    lista = lista.filter((d) => d.visibilidad === visibilidad);
  }

  if (fuero && fuero !== 'TODOS') {
    lista = lista.filter((d) => d.fuero === fuero);
  }

  if (tipo && tipo !== 'TODOS') {
    lista = lista.filter((d) => d.tipo === tipo);
  }

  if (subtipo && subtipo !== 'TODOS') {
    lista = lista.filter((d) => d.subtipo === subtipo);
  }

  if (origen && origen !== 'TODOS') {
    lista = lista.filter((d) => d.origen === origen);
  }

  if (busqueda) {
    const q = normalizarTexto(busqueda);
    if (q) {
      lista = lista.filter((d) =>
        normalizarTexto(`${d.titulo} ${d.tipo} ${d.fuero} ${d.numero_norma} ${d.relPath}`).includes(q)
      );
    }
  }

  return lista.map((d) => ({
    relPath: d.relPath,
    filename: d.relPath,
    nombreArchivo: d.nombreArchivo,
    titulo: d.titulo,
    tipo: d.tipo,
    fuero: d.fuero,
    numero_norma: d.numero_norma,
    fuente: d.fuente,
    url_fuente: d.url_fuente,
    vigencia: d.vigencia,
    actualizado: d.actualizado,
    repo_path: d.repo_path,
    visibilidad: d.visibilidad,
    subtipo: d.subtipo,
    origen: d.origen,
    estado_revision: d.estado_revision,
    tamanoBytes: d.tamanoBytes,
    tamanoLegible: d.tamanoLegible,
  }));
}

/**
 * Resuelve la ruta completa a partir de un nombre de archivo o ruta relativa
 */
function resolverRutaDocumento(relPathOrFilename) {
  if (!relPathOrFilename) return null;
  const normalizado = String(relPathOrFilename).replace(/\\/g, '/').replace(/^\/+/, '');
  
  // 1. Probar ruta directa relativa a OTELAX_DATA_DIR
  const rutaDirecta = path.resolve(OTELAX_DATA_DIR, normalizado);
  if (rutaDirecta.startsWith(OTELAX_DATA_DIR) && fs.existsSync(rutaDirecta) && fs.statSync(rutaDirecta).isFile()) {
    return rutaDirecta;
  }

  // 2. Buscar en el índice en memoria
  const enIndice = indiceMemoria.find(
    (d) =>
      d.relPath === normalizado ||
      d.filename === normalizado ||
      d.repo_path === normalizado ||
      d.nombreArchivo === normalizado ||
      path.basename(d.relPath) === normalizado
  );

  if (enIndice) {
    const rutaIndice = path.resolve(OTELAX_DATA_DIR, enIndice.relPath);
    if (rutaIndice.startsWith(OTELAX_DATA_DIR) && fs.existsSync(rutaIndice)) {
      return rutaIndice;
    }
  }

  return null;
}

/**
 * Obtiene un documento específico completo
 */
function obtenerDocumento(relPathOrFilename) {
  const ruta = resolverRutaDocumento(relPathOrFilename);
  if (!ruta) return null;

  const stats = fs.statSync(ruta);
  const raw = fs.readFileSync(ruta, 'utf8');
  const { metadata, content } = parseFrontmatter(raw);
  const relPath = path.relative(OTELAX_DATA_DIR, ruta).replace(/\\/g, '/');

  return {
    relPath,
    filename: relPath,
    nombreArchivo: path.basename(ruta),
    titulo: metadata.titulo || path.basename(ruta).replace(/\.md$/, ''),
    tipo: normalizarTipo(metadata.tipo),
    fuero: normalizarFuero(metadata.fuero),
    numero_norma: metadata.numero_norma || metadata.numeroLey || '',
    fuente: metadata.fuente || 'OtelaxWisdom',
    url_fuente: metadata.url_fuente || metadata.url || '',
    vigencia: metadata.vigencia || 'Vigente',
    actualizado: metadata.actualizado || stats.mtime.toISOString(),
    repo_path: metadata.repo_path || relPath,
    content_hash: metadata.content_hash || calcularContentHash(content),
    visibilidad: metadata.visibilidad || (relPath.startsWith('memoria-estudio') ? 'PRIVADO_ESTUDIO' : 'PUBLICO_ACERVO'),
    subtipo: metadata.subtipo || 'GENERAL',
    origen: metadata.origen || 'MANUAL',
    estado_revision: metadata.estado_revision || 'APROBADO',
    tamanoBytes: stats.size,
    tamanoLegible: formatearTamano(stats.size),
    contenido: content,
    raw,
  };
}

/**
 * Crea o actualiza un documento .md en OtelaxWisdom
 */
function guardarDocumento({
  titulo,
  tipo,
  fuero,
  numero_norma = '',
  fuente = 'OtelaxWisdom',
  url_fuente = '',
  vigencia = 'Vigente',
  contenido,
  filename = null,
  repo_path = null,
  visibilidad = 'PUBLICO_ACERVO',
  subtipo = 'GENERAL',
  origen = 'MANUAL',
  estado_revision = 'APROBADO',
}) {
  if (!titulo || !titulo.trim()) {
    throw new Error('El título del documento es obligatorio.');
  }
  if (!contenido || !contenido.trim()) {
    throw new Error('El contenido del documento no puede estar vacío.');
  }

  const tipoNormalizado = normalizarTipo(tipo);
  const fueroNormalizado = normalizarFuero(fuero);
  const contentHash = calcularContentHash(contenido);

  let destinoRelativo = '';

  if (filename) {
    const rutaExistente = resolverRutaDocumento(filename);
    if (rutaExistente) {
      destinoRelativo = path.relative(OTELAX_DATA_DIR, rutaExistente).replace(/\\/g, '/');
    } else {
      destinoRelativo = String(filename).replace(/\\/g, '/').replace(/^\/+/, '');
      if (!destinoRelativo.endsWith('.md')) destinoRelativo += '.md';
    }
  } else if (repo_path) {
    destinoRelativo = path.join('acervo', repo_path).replace(/\\/g, '/');
  } else if (visibilidad === 'PRIVADO_ESTUDIO') {
    const subcarpeta = subtipo === 'ESCRITO_MODELO' ? 'escritos-modelo' : subtipo === 'FICHA_EXPEDIENTE' ? 'expedientes' : '';
    destinoRelativo = path.join('memoria-estudio', subcarpeta, sanitizarNombreArchivo(titulo)).replace(/\\/g, '/');
  } else if (origen === 'WEB_INSTITUCIONAL_AUTO') {
    destinoRelativo = path.join('auto-aprendido', sanitizarNombreArchivo(titulo)).replace(/\\/g, '/');
  } else {
    destinoRelativo = sanitizarNombreArchivo(titulo);
  }

  const rutaFinal = path.resolve(OTELAX_DATA_DIR, destinoRelativo);
  if (!rutaFinal.startsWith(OTELAX_DATA_DIR)) {
    throw new Error('Acceso a ruta de archivo inválida.');
  }

  fs.mkdirSync(path.dirname(rutaFinal), { recursive: true });

  const metadata = {
    titulo: titulo.trim(),
    tipo: tipoNormalizado,
    fuero: fueroNormalizado,
    numero_norma: String(numero_norma || '').trim(),
    fuente: String(fuente || 'OtelaxWisdom').trim(),
    url_fuente: String(url_fuente || '').trim(),
    vigencia: String(vigencia || 'Vigente').trim(),
    actualizado: new Date().toISOString(),
    repo_path: repo_path || destinoRelativo,
    content_hash: contentHash,
    visibilidad,
    subtipo,
    origen,
    estado_revision,
  };

  const contenidoFinal = stringifyFrontmatter(metadata, contenido);
  fs.writeFileSync(rutaFinal, contenidoFinal, 'utf8');

  // Actualizar índice en memoria
  recargarIndice();

  return {
    relPath: destinoRelativo,
    filename: destinoRelativo,
    titulo: metadata.titulo,
    tipo: metadata.tipo,
    fuero: metadata.fuero,
    actualizado: metadata.actualizado,
    content_hash: metadata.content_hash,
  };
}

/**
 * Elimina un documento .md de OtelaxWisdom
 */
function eliminarDocumento(relPathOrFilename) {
  const ruta = resolverRutaDocumento(relPathOrFilename);
  if (!ruta) return false;

  if (fs.existsSync(ruta)) {
    fs.unlinkSync(ruta);
    recargarIndice();
    return true;
  }
  return false;
}

/**
 * Aprueba un documento auto-aprendido
 */
function aprobarDocumento(relPathOrFilename) {
  const doc = obtenerDocumento(relPathOrFilename);
  if (!doc) return false;

  return guardarDocumento({
    ...doc,
    filename: doc.relPath,
    estado_revision: 'APROBADO',
  });
}

/**
 * Obtiene el contenido del archivo maestro de Estilo Forense del Estudio
 */
function obtenerEstiloForense() {
  asegurarEstiloForenseDefault();
  const rutaEstilo = path.join(OTELAX_DATA_DIR, 'memoria-estudio', 'estilo-forense-estudio.md');
  if (!fs.existsSync(rutaEstilo)) return '';
  const raw = fs.readFileSync(rutaEstilo, 'utf8');
  const { content } = parseFrontmatter(raw);
  return content;
}

/**
 * Guarda o actualiza el archivo maestro de Estilo Forense del Estudio
 */
function guardarEstiloForense(nuevoContenido) {
  const rutaEstilo = path.join(OTELAX_DATA_DIR, 'memoria-estudio', 'estilo-forense-estudio.md');
  const metadata = {
    titulo: 'Estilo Forense Institucional del Estudio',
    tipo: 'DOCTRINA',
    fuero: 'GENERAL',
    visibilidad: 'PRIVADO_ESTUDIO',
    subtipo: 'ESTILO_FORENSE',
    origen: 'MANUAL',
    estado_revision: 'APROBADO',
    actualizado: new Date().toISOString(),
    content_hash: calcularContentHash(nuevoContenido),
  };
  fs.mkdirSync(path.dirname(rutaEstilo), { recursive: true });
  fs.writeFileSync(rutaEstilo, stringifyFrontmatter(metadata, nuevoContenido), 'utf8');
  recargarIndice();
  return { ok: true, mensaje: 'Estilo forense actualizado exitosamente.' };
}

/**
 * RAG Inteligente sobre el acervo curado de OtelaxWisdom
 */
function buscarEnOtelaxWisdom(consulta, { maxDocs = 3, minScore = 2, fuero = null, tipo = null, visibilidad = null } = {}) {
  if (!indiceMemoria.length) {
    recargarIndice();
  }

  const consultaLimpia = normalizarTexto(consulta);
  if (!consultaLimpia) {
    return { resultados: [], totalEncontrados: 0 };
  }

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

  let poolDocs = indiceMemoria;
  if (visibilidad) poolDocs = poolDocs.filter((d) => d.visibilidad === visibilidad);
  if (fuero && fuero !== 'TODOS') poolDocs = poolDocs.filter((d) => d.fuero === fuero);
  if (tipo && tipo !== 'TODOS') poolDocs = poolDocs.filter((d) => d.tipo === tipo);

  const candidatos = [];

  for (const doc of poolDocs) {
    let score = 0;
    const tituloNorm = normalizarTexto(doc.titulo);
    const tipoNorm = normalizarTexto(doc.tipo);
    const fueroNorm = normalizarTexto(doc.fuero);
    const normaNorm = normalizarTexto(doc.numero_norma);
    const textoDoc = doc.textoNormalizado;

    // Coincidencia exacta de frase
    if (normaNorm && consultaLimpia.includes(normaNorm)) {
      score += 35;
    }
    if (tituloNorm.includes(consultaLimpia)) {
      score += 25;
    } else if (textoDoc.includes(consultaLimpia)) {
      score += 15;
    }

    // Coincidencia de palabras clave
    palabras.forEach((p) => {
      if (normaNorm.includes(p)) score += 10;
      if (tituloNorm.includes(p)) score += 6;
      if (fueroNorm.includes(p)) score += 5;
      if (tipoNorm.includes(p)) score += 4;
    });

    // Búsqueda en chunks preservados
    let mejorChunk = '';
    let mejorScoreChunk = 0;

    for (const chunk of doc.chunks) {
      const chunkNorm = normalizarTexto(chunk);
      let cScore = 0;

      if (chunkNorm.includes(consultaLimpia)) {
        cScore += 12;
      }

      palabras.forEach((p) => {
        if (chunkNorm.includes(p)) {
          cScore += 3;
        }
      });

      if (cScore > mejorScoreChunk) {
        mejorScoreChunk = cScore;
        mejorChunk = chunk.trim();
      }
    }

    score += mejorScoreChunk;

    if (score >= minScore) {
      let fragmento = mejorChunk || doc.contenido.slice(0, 1800);
      if (fragmento.length > 2200) {
        fragmento = fragmento.slice(0, 2200) + '...';
      }

      candidatos.push({
        relPath: doc.relPath,
        filename: doc.relPath,
        titulo: doc.titulo,
        tipo: doc.tipo,
        fuero: doc.fuero,
        numero_norma: doc.numero_norma,
        fuente: doc.fuente,
        url_fuente: doc.url_fuente,
        vigencia: doc.vigencia,
        visibilidad: doc.visibilidad,
        subtipo: doc.subtipo,
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
  FUEROS_VALIDOS,
  OTELAX_DATA_DIR,
  recargarIndice,
  listarDocumentos,
  obtenerDocumento,
  guardarDocumento,
  eliminarDocumento,
  aprobarDocumento,
  obtenerEstiloForense,
  guardarEstiloForense,
  buscarEnOtelaxWisdom,
  calcularContentHash,
  normalizarTipo,
  normalizarFuero,
};
