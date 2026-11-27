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
 * Descarga y descomprime el tarball oficial de GitHub directamente vía HTTPS sin requerir git CLI
 */
async function descargarTarballGithub(destinoDir) {
  const tarballUrl =
    process.env.REPO_LEGISLACION_TARBALL_URL ||
    'https://codeload.github.com/FUDAPY/LESGILACION_PARAGUAYA_ZETTI/tar.gz/refs/heads/main';

  console.log(`[OtelaxWisdom Sync] Descargando tarball oficial de GitHub desde ${tarballUrl}...`);
  const tmpTarball = '/tmp/legislacion-py-zetti.tar.gz';

  const res = await fetch(tarballUrl, {
    headers: { 'User-Agent': 'SysJuridico-SyncEngine/1.0' },
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    throw new Error(`Error HTTP al descargar tarball desde GitHub: ${res.status} ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(tmpTarball, Buffer.from(arrayBuffer));

  fs.mkdirSync(destinoDir, { recursive: true });
  execSync(`tar -xzf "${tmpTarball}" -C "${destinoDir}" --strip-components=1`, {
    stdio: 'pipe',
    timeout: 30000,
  });

  try {
    fs.unlinkSync(tmpTarball);
  } catch (_) {}

  const archivos = escanearMd(destinoDir);
  console.log(`[OtelaxWisdom Sync] Tarball descomprimido en ${destinoDir}: ${archivos.length} archivos .md.`);
  return archivos.length;
}

/**
 * Obtiene el contenido del repositorio mediante Git, Tarball oficial o Acervo preempaquetado
 */
async function asegurarRepositorioLocal(cacheDir, repoUrl, branch = 'main') {
  fs.mkdirSync(cacheDir, { recursive: true });
  const errores = [];
  let metodoExitoso = null;

  // 1. Intentar clonar o actualizar vía Git si está disponible
  try {
    if (!fs.existsSync(path.join(cacheDir, '.git'))) {
      console.log(`[OtelaxWisdom Sync] Intentando clonar ${repoUrl} en ${cacheDir}...`);
      execSync(`git clone --depth 1 "${repoUrl}" "${cacheDir}"`, {
        stdio: 'pipe',
        timeout: 90000,
      });
    } else {
      console.log(`[OtelaxWisdom Sync] Actualizando repositorio local vía git pull...`);
      execSync(`git pull origin ${branch}`, {
        cwd: cacheDir,
        stdio: 'pipe',
        timeout: 45000,
      });
    }

    const archivosGit = escanearMd(cacheDir);
    if (archivosGit.length > 0) {
      metodoExitoso = 'GIT';
      return { ok: true, metodo: metodoExitoso, errores };
    }
  } catch (gitErr) {
    const detalleGit = gitErr.stderr ? gitErr.stderr.toString().trim() : gitErr.message;
    console.error(`[OtelaxWisdom Sync] Falló sincronización vía Git (${repoUrl}):`, detalleGit);
    errores.push({ etapa: 'GIT_CLONE_PULL', error: gitErr.message, detalle: detalleGit });
  }

  // 2. Fallback primario: Descarga directa de Tarball oficial de GitHub (sin requerir Git)
  try {
    console.log('[OtelaxWisdom Sync] Iniciando fallback: descarga directa de tarball oficial GitHub...');
    const totalTarball = await descargarTarballGithub(cacheDir);
    if (totalTarball > 0) {
      metodoExitoso = 'TARBALL_GITHUB';
      return { ok: true, metodo: metodoExitoso, errores };
    }
  } catch (tarballErr) {
    console.error('[OtelaxWisdom Sync] Falló descarga de tarball GitHub:', tarballErr.message);
    errores.push({ etapa: 'TARBALL_GITHUB', error: tarballErr.message });
  }

  // 3. Fallback secundario: Copiar desde el acervo preempaquetado local (/app/bundled/acervo)
  try {
    const bundledCandidates = [
      process.env.OTELAX_BUNDLED_DIR,
      '/app/bundled/acervo',
      path.resolve(__dirname, '../../bundled/acervo'),
      path.resolve(__dirname, '../../data/otelaxwisdom/acervo'),
    ].filter(Boolean);

    for (const bDir of bundledCandidates) {
      if (fs.existsSync(bDir)) {
        const archivosBundled = escanearMd(bDir);
        if (archivosBundled.length > 0) {
          console.log(`[OtelaxWisdom Sync] Copiando acervo preempaquetado desde ${bDir} a ${cacheDir} (${archivosBundled.length} archivos)...`);
          for (const item of archivosBundled) {
            const dest = path.join(cacheDir, item.relPath);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.copyFileSync(item.rutaCompleta, dest);
          }
          metodoExitoso = 'BUNDLED_LOCAL';
          return { ok: true, metodo: metodoExitoso, errores };
        }
      }
    }
  } catch (bundledErr) {
    console.error('[OtelaxWisdom Sync] Falló copia desde acervo preempaquetado:', bundledErr.message);
    errores.push({ etapa: 'BUNDLED_LOCAL', error: bundledErr.message });
  }

  return { ok: false, metodo: 'FALLO_TOTAL', errores };
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
  const cacheDir = '/tmp/legislacion-py-zetti';
  const acervoDir = path.join(OTELAX_DATA_DIR, 'acervo');

  fs.mkdirSync(acervoDir, { recursive: true });

  const descResult = await asegurarRepositorioLocal(cacheDir, repoUrl, branch);
  const errores = [...(descResult.errores || [])];

  const archivosRepo = escanearMd(cacheDir);
  console.log(`[OtelaxWisdom Sync] Encontrados ${archivosRepo.length} archivos .md en el repositorio (${descResult.metodo}).`);

  if (archivosRepo.length === 0) {
    const errorCero = 'No se encontraron archivos .md en el repositorio tras intentar Git, Tarball y Acervo Local.';
    errores.push({ etapa: 'VALIDACION_ARCHIVOS', error: errorCero });
    console.error('[OtelaxWisdom Sync] Error crítico:', errorCero);
    return {
      ok: false,
      totalEscaneados: 0,
      insertados: 0,
      actualizados: 0,
      omitidos: 0,
      errores,
      porFuero: {},
      porTipo: {},
      duracionMs: Date.now() - inicio,
      metodo: descResult.metodo,
    };
  }

  let insertados = 0;
  let actualizados = 0;
  let omitidos = 0;
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
    ok: errores.length === 0 && (insertados > 0 || actualizados > 0 || omitidos > 0),
    totalEscaneados: archivosRepo.length,
    insertados,
    actualizados,
    omitidos,
    errores,
    porFuero,
    porTipo,
    duracionMs,
    metodo: descResult.metodo,
  };

  console.log(
    `[OtelaxWisdom Sync] Sincronización finalizada en ${duracionMs}ms (${descResult.metodo}). Escaneados: ${resultado.totalEscaneados}, Insertados: ${insertados}, Actualizados: ${actualizados}, Omitidos: ${omitidos}, Errores: ${errores.length}`
  );

  return resultado;
}

module.exports = {
  sincronizarRepoZetti,
  descargarTarballGithub,
  DEFAULT_REPO_URL,
};
