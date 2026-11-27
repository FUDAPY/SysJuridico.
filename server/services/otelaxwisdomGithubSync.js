const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  OTELAX_DATA_DIR,
  recargarIndice,
  normalizarTipo,
  normalizarFuero,
  calcularContentHash,
} = require('./otelaxWisdomService');

const DEFAULT_REPO_URL =
  process.env.REPO_LEGISLACION_URL || 'https://github.com/FUDAPY/LESGILACION_PARAGUAYA_ZETTI.git';

/**
 * Parsea frontmatter YAML simple
 */
function parseFrontmatterSimple(textoCompleto) {
  if (!textoCompleto || !textoCompleto.startsWith('---')) {
    return { metadata: {}, content: textoCompleto || '' };
  }

  const match = textoCompleto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { metadata: {}, content: textoCompleto };
  }

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

/**
 * Genera el archivo con frontmatter YAML estandarizado
 */
function stringifyFrontmatterCompleto(metadata, content) {
  const metaLines = ['---'];
  const ordenKeys = [
    'titulo',
    'tipo',
    'fuero',
    'numero_norma',
    'fuente',
    'url_fuente',
    'vigencia',
    'actualizado',
    'repo_path',
    'content_hash',
    'visibilidad',
    'subtipo',
    'origen',
    'estado_revision',
  ];

  ordenKeys.forEach((key) => {
    if (metadata[key] !== undefined && metadata[key] !== null) {
      metaLines.push(`${key}: "${String(metadata[key]).replace(/"/g, '\\"')}"`);
    }
  });

  // Agregar cualquier clave adicional
  Object.keys(metadata).forEach((k) => {
    if (!ordenKeys.includes(k) && metadata[k] !== undefined && metadata[k] !== null) {
      metaLines.push(`${k}: "${String(metadata[k]).replace(/"/g, '\\"')}"`);
    }
  });

  metaLines.push('---', '');
  return metaLines.join('\n') + content.trimStart();
}

/**
 * Escanea recursivamente archivos .md en un directorio ignorando carpetas ocultas y archivos especiales
 */
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

/**
 * Clona o actualiza el repositorio Git oficial de legislación paraguaya
 */
function asegurarRepositorioLocal(cacheDir, repoUrl, branch = 'main') {
  fs.mkdirSync(path.dirname(cacheDir), { recursive: true });

  const tempPreclonado = '/tmp/test-repo-audit';

  if (!fs.existsSync(cacheDir)) {
    // Si ya fue clonado temporalmente en /tmp/test-repo-audit, usarlo para máxima velocidad
    if (fs.existsSync(path.join(tempPreclonado, '.git'))) {
      console.log(`[OtelaxWisdom Sync] Copiando repositorio cacheado desde ${tempPreclonado}...`);
      execSync(`cp -r "${tempPreclonado}" "${cacheDir}"`, { stdio: 'pipe' });
    } else {
      console.log(`[OtelaxWisdom Sync] Clonando repositorio ${repoUrl} en ${cacheDir}...`);
      execSync(`git clone --depth 1 "${repoUrl}" "${cacheDir}"`, {
        stdio: 'pipe',
        timeout: 120000,
      });
    }
  } else if (fs.existsSync(path.join(cacheDir, '.git'))) {
    console.log(`[OtelaxWisdom Sync] Actualizando repositorio local vía git pull...`);
    try {
      execSync(`git pull origin ${branch}`, {
        cwd: cacheDir,
        stdio: 'pipe',
        timeout: 60000,
      });
    } catch (pullErr) {
      console.warn(`[OtelaxWisdom Sync] Advertencia en git pull: ${pullErr.message}. Continuando con caché local.`);
    }
  }
}

/**
 * Ejecuta la sincronización completa e idempotente del repositorio ZETTI
 */
async function sincronizarRepoZetti({
  repoUrl = DEFAULT_REPO_URL,
  branch = 'main',
  forzar = false,
} = {}) {
  const inicio = Date.now();
  const cacheDir = path.join(OTELAX_DATA_DIR, '.cache_repo_zetti');
  const acervoDir = path.join(OTELAX_DATA_DIR, 'acervo');

  fs.mkdirSync(acervoDir, { recursive: true });

  asegurarRepositorioLocal(cacheDir, repoUrl, branch);

  const archivosRepo = escanearMd(cacheDir);
  console.log(`[OtelaxWisdom Sync] Encontrados ${archivosRepo.length} archivos .md en el repositorio.`);

  let insertados = 0;
  let actualizados = 0;
  let omitidos = 0;
  const errores = [];
  const porFuero = {};
  const porTipo = {};

  for (const item of archivosRepo) {
    try {
      const raw = fs.readFileSync(item.rutaCompleta, 'utf8');
      const { metadata, content } = parseFrontmatterSimple(raw);

      // Determinar Fuero según carpeta padre o metadata
      let fueroInferido = metadata.fuero;
      if (!fueroInferido || fueroInferido === 'GENERAL') {
        const partesRuta = item.relPath.split('/');
        if (partesRuta.length > 1) {
          fueroInferido = partesRuta[0]; // e.g. "CIVIL Y COMERCIAL", "LABORAL", etc.
        }
      }
      const fueroFinal = normalizarFuero(fueroInferido);

      // Determinar Tipo según metadata o nombre de archivo
      let tipoInferido = metadata.tipo;
      if (!tipoInferido) {
        if (/codigo/i.test(item.relPath)) tipoInferido = 'CODIGO';
        else if (/constitucion/i.test(item.relPath)) tipoInferido = 'CONSTITUCION NACIONAL';
        else if (/acordada/i.test(item.relPath)) tipoInferido = 'ACORDADA';
        else if (/ley/i.test(item.relPath)) tipoInferido = 'LEY';
        else if (/tratado/i.test(item.relPath)) tipoInferido = 'TRATADO INTERNACIONAL';
        else tipoInferido = 'LEY';
      }
      const tipoFinal = normalizarTipo(tipoInferido);

      // Determinar Título
      let tituloFinal = metadata.titulo;
      if (!tituloFinal) {
        const primerEncabezado = content.match(/^#+\s+(.+)$/m);
        if (primerEncabezado) {
          tituloFinal = primerEncabezado[1].trim();
        } else {
          tituloFinal = path.basename(item.relPath, '.md').replace(/[-_]/g, ' ');
        }
      }

      // Hash SHA-256 del contenido puro
      const contentHash = calcularContentHash(content);

      // Destino en acervo
      const destinoArchivo = path.join(acervoDir, item.relPath);
      const destinoDir = path.dirname(destinoArchivo);

      let existePreviamente = fs.existsSync(destinoArchivo);
      let hashExistente = null;

      if (existePreviamente && !forzar) {
        const rawExistente = fs.readFileSync(destinoArchivo, 'utf8');
        const parsedExistente = parseFrontmatterSimple(rawExistente);
        hashExistente = parsedExistente.metadata.content_hash || calcularContentHash(parsedExistente.content);

        if (hashExistente === contentHash) {
          omitidos++;
          porFuero[fueroFinal] = (porFuero[fueroFinal] || 0) + 1;
          porTipo[tipoFinal] = (porTipo[tipoFinal] || 0) + 1;
          continue; // Idempotente: no hay cambios
        }
      }

      // Preparar metadata estandarizada
      const metaEstandarizada = {
        titulo: tituloFinal,
        tipo: tipoFinal,
        fuero: fueroFinal,
        numero_norma: metadata.numero_norma || metadata.numeroLey || '',
        fuente: metadata.fuente || 'Repositorio Oficial FUDAPY ZETTI',
        url_fuente:
          metadata.url_fuente ||
          `https://github.com/FUDAPY/LESGILACION_PARAGUAYA_ZETTI/blob/main/${encodeURIComponent(item.relPath)}`,
        vigencia: metadata.vigencia || 'Vigente',
        actualizado: new Date().toISOString(),
        repo_path: item.relPath,
        content_hash: contentHash,
        visibilidad: 'PUBLICO_ACERVO',
        subtipo: 'GENERAL',
        origen: 'REPO_GITHUB_ZETTI',
        estado_revision: 'APROBADO',
      };

      const contenidoFinal = stringifyFrontmatterCompleto(metaEstandarizada, content);

      fs.mkdirSync(destinoDir, { recursive: true });
      fs.writeFileSync(destinoArchivo, contenidoFinal, 'utf8');

      if (existePreviamente) {
        actualizados++;
      } else {
        insertados++;
      }

      porFuero[fueroFinal] = (porFuero[fueroFinal] || 0) + 1;
      porTipo[tipoFinal] = (porTipo[tipoFinal] || 0) + 1;
    } catch (docErr) {
      errores.push({ archivo: item.relPath, error: docErr.message });
      console.error(`[OtelaxWisdom Sync] Error procesando ${item.relPath}:`, docErr.message);
    }
  }

  // Recargar índice en memoria de OtelaxWisdom
  recargarIndice();

  const duracionMs = Date.now() - inicio;

  const resultado = {
    ok: errores.length === 0,
    totalEscaneados: archivosRepo.length,
    insertados,
    actualizados,
    omitidos,
    errores,
    porFuero,
    porTipo,
    duracionMs,
  };

  console.log(
    `[OtelaxWisdom Sync] Sincronización completada en ${duracionMs}ms. Escaneados: ${resultado.totalEscaneados}, Insertados: ${insertados}, Actualizados: ${actualizados}, Omitidos: ${omitidos}, Errores: ${errores.length}`
  );

  return resultado;
}

module.exports = {
  sincronizarRepoZetti,
  DEFAULT_REPO_URL,
};
