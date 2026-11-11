const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { pathToFileURL } = require('node:url');
const { PDFParse } = require('pdf-parse');
const cheerio = require('cheerio');

const BASE_URL = 'https://www.csj.gov.py/jurisprudencia';
const CRITERIA_URL = `${BASE_URL}/Home/Criterios`;
const SEARCH_URL = `${BASE_URL}/Home/Busqueda`;
const DATA_URL = `${BASE_URL}/Jurisprudencias/GetData`;
const OUTPUT_DIR = path.resolve(
  process.env.CSJ_OUTPUT_DIR || 'LESGILACION PARAGUAYA/Jurisprudencia Paraguaya'
);
function numericSetting(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

const CONCURRENCY = Math.max(1, numericSetting('CSJ_CONCURRENCY', 4));
const DELAY_MS = Math.max(0, numericSetting('CSJ_DELAY_MS', 200));
const PAGE_SIZE = Math.floor(Math.max(1, numericSetting('CSJ_PAGE_SIZE', 1000)));
const MAX_RECORDS = Math.max(0, numericSetting('CSJ_MAX_RECORDS', Infinity));
const CATALOG_PATH = path.join(OUTPUT_DIR, 'catalogo.json');
const FAILURES_PATH = path.join(OUTPUT_DIR, 'fallidas.json');
const execFileAsync = promisify(execFile);
const cp1252Decoder = new TextDecoder('windows-1252');
const rtfDestinations = new Set([
  'colortbl',
  'filetbl',
  'fonttbl',
  'generator',
  'info',
  'listtable',
  'listoverridetable',
  'object',
  'pict',
  'revtbl',
  'stylesheet',
  'xmlnstbl'
]);

const cookies = new Map();
const headers = {
  'User-Agent': 'SysJuridico CSJ jurisprudence indexer',
  Accept: 'text/html,application/json,application/octet-stream,*/*'
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function updateCookies(response) {
  const setCookies = response.headers.getSetCookie?.() || [];
  for (const value of setCookies) {
    const [cookie] = value.split(';', 1);
    const separator = cookie.indexOf('=');
    if (separator > 0) {
      cookies.set(cookie.slice(0, separator), cookie.slice(separator + 1));
    }
  }
}

function cookieHeader() {
  return [...cookies.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
}

async function request(url, options = {}, expectedType = 'text') {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const requestHeaders = { ...headers, ...options.headers };
      const cookie = cookieHeader();
      if (cookie) requestHeaders.Cookie = cookie;

      const response = await fetch(url, {
        ...options,
        headers: requestHeaders,
        signal: AbortSignal.timeout(90000)
      });
      updateCookies(response);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} en ${url}`);
      }

      if (expectedType === 'json') return await response.json();
      if (expectedType === 'buffer') return Buffer.from(await response.arrayBuffer());
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < 4) await sleep(1000 * (2 ** attempt));
    }
  }
  throw lastError;
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .trim();
}

function describe(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') {
    return normalizeText(value);
  }
  if (Array.isArray(value)) {
    return value.map(describe).filter(Boolean).join('; ');
  }
  const preferred = [
    'DescripcionTipoResolucionJudicial',
    'DescripcionSala',
    'Descripcion',
    'Nombre',
    'NombreFuncionario',
    'ApellidoFuncionario',
    'DescripcionMateria',
    'DescripcionAccion',
    'DescripcionTema'
  ];
  const parts = preferred
    .map((key) => value[key])
    .filter((part) => typeof part === 'string' && part.trim());
  if (parts.length) return normalizeText([...new Set(parts)].join(' '));
  return normalizeText(Object.values(value).filter(
    (part) => (typeof part === 'string' && part.trim()) ||
      (typeof part === 'number' && part !== 0)
  ).join('; '));
}

function safeSlug(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90) || 'sin-caratula';
}

function getYear(dateValue) {
  const timestamp = String(dateValue ?? '').match(/\/Date\((-?\d+)\)\//)?.[1];
  if (!timestamp) return 'sin-fecha';
  const date = new Date(Number(timestamp));
  return Number.isNaN(date.getTime()) ? 'sin-fecha' : String(date.getUTCFullYear());
}

function dateToIso(dateValue) {
  const timestamp = String(dateValue ?? '').match(/\/Date\((-?\d+)\)\//)?.[1];
  if (!timestamp) return normalizeText(dateValue);
  const date = new Date(Number(timestamp));
  return Number.isNaN(date.getTime()) ? normalizeText(dateValue) : date.toISOString().slice(0, 10);
}

function normalizeRecord(row) {
  const type = describe(row.TipoResolucionJudicial) || 'Tipo no especificado';
  const date = dateToIso(row.FechaResolucionJudicial);
  const preopinante = row.MinistroPreopinante
    ? [
      row.MinistroPreopinante.NombreFuncionario,
      row.MinistroPreopinante.ApellidoFuncionario
    ].filter(Boolean).join(' ')
    : '';
  const textResolution = typeof row.TextoResolucion === 'string'
    ? normalizeText(row.TextoResolucion)
    : '';

  return {
    id: String(row.CodigoJurisprudencia),
    number: normalizeText(row.NoResolucionJudicial),
    bis: normalizeText(row.Bis),
    year: getYear(row.FechaResolucionJudicial),
    date,
    type,
    caratula: normalizeText(row.CaratulaPublicacion || row.CaratulaBaseDatos),
    sala: describe(row.Sala),
    preopinante: normalizeText(preopinante),
    materia: describe(row.Materia),
    action: describe(row.AccionResuleta),
    result: describe(row.InstanciaPrevia) || describe(row.Observaciones),
    tribunal: describe(row.Tribunal),
    norms: describe(row.NormasReferencia),
    topics: describe(row.Temas),
    hasDocument: Boolean(row.TieneDocumento),
    textResolution,
    source: `${BASE_URL}/home/detalle?codigo=${encodeURIComponent(row.CodigoJurisprudencia)}`,
    document: `${BASE_URL}/home/DocumentoJurisprudencia?codigo=${encodeURIComponent(row.CodigoJurisprudencia)}`
  };
}

async function fetchCatalog() {
  const criteriaHtml = await request(CRITERIA_URL);
  const $ = cheerio.load(criteriaHtml);
  const token = $('input[name="__RequestVerificationToken"]').attr('value');
  if (!token) throw new Error('No se encontró el token de seguridad del buscador de la CSJ.');

  const form = new URLSearchParams({ __RequestVerificationToken: token });
  await request(SEARCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: form.toString()
  });

  const columns = [
    'CodigoJurisprudencia',
    'TipoResolucionJudicial.DescripcionTipoResolucionJudicial',
    'NoResolucionJudicial',
    'FechaResolucionJudicial',
    'CaratulaPublicacion',
    'Sala.DescripcionSala',
    null
  ];
  const records = [];
  let total = null;
  let draw = 1;
  const limit = Math.min(MAX_RECORDS, Infinity);

  for (let start = 0; total === null || start < Math.min(total, limit); start += PAGE_SIZE) {
    const data = new URLSearchParams({
      draw: String(draw),
      start: String(start),
      length: String(PAGE_SIZE),
      'order[0][column]': '0',
      'order[0][dir]': 'asc',
      'search[value]': '',
      'search[regex]': 'false'
    });
    columns.forEach((column, index) => {
      data.set(`columns[${index}][data]`, column || '');
      data.set(`columns[${index}][name]`, '');
      data.set(`columns[${index}][searchable]`, 'true');
      data.set(`columns[${index}][orderable]`, index === 6 ? 'false' : 'true');
      data.set(`columns[${index}][search][value]`, '');
      data.set(`columns[${index}][search][regex]`, 'false');
    });

    const result = await request(DATA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: data.toString()
    }, 'json');
    if (!Array.isArray(result.data)) {
      throw new Error(`Respuesta de catálogo inesperada al comenzar en ${start}.`);
    }
    if (total === null) {
      total = Number(result.recordsFiltered);
      if (!Number.isFinite(total) || total < 0) {
        throw new Error('El portal no informó un total válido de jurisprudencias.');
      }
      if (total === 0) {
        throw new Error('El portal devolvió un catálogo vacío; no se guardó una extracción incompleta.');
      }
    }
    if (result.data.length === 0 && start < Math.min(total, limit)) {
      throw new Error(`El catálogo quedó incompleto al comenzar en ${start} de ${total}.`);
    }

    records.push(...result.data.map(normalizeRecord));
    console.log(`Catálogo: ${Math.min(records.length, total)} / ${total}`);
    draw += 1;
    await sleep(DELAY_MS);
  }

  return records.slice(0, limit);
}

function folderForType(type) {
  const normalized = type.toLocaleLowerCase('es');
  if (normalized.includes('acuerdo y sentencia')) return 'Acuerdos y Sentencias';
  if (normalized.includes('auto interlocutorio')) return 'Autos Interlocutorios';
  return safeSlug(type);
}

function filePathFor(record) {
  const typeFolder = folderForType(record.type);
  const number = safeSlug(record.number || 'sin-numero');
  const bis = record.bis ? `-${safeSlug(record.bis)}` : '';
  const filename = `${record.year}-${number}${bis}-${record.id}-${safeSlug(record.caratula)}.md`;
  return path.join(OUTPUT_DIR, typeFolder, record.year, filename);
}

function renderMarkdown(record, body, textStatus, pageCount = null) {
  const titleNumber = record.number
    ? `${record.number}${record.bis ? ` ${record.bis}` : ''}/${record.year}`
    : `Código ${record.id}`;
  const title = `${record.type} N.º ${titleNumber}`;
  const metadata = [
    ['Código CSJ', record.id],
    ['Tipo', record.type],
    ['Número', titleNumber],
    ['Fecha', record.date],
    ['Sala', record.sala],
    ['Ministro preopinante', record.preopinante],
    ['Materia', record.materia],
    ['Acción', record.action],
    ['Resultado', record.result],
    ['Tribunal o juzgado de origen', record.tribunal],
    ['Normas de referencia', record.norms],
    ['Temas', record.topics],
    ['Estado de extracción', textStatus],
    ['Páginas PDF', pageCount == null ? '' : String(pageCount)]
  ].filter(([, value]) => value);

  const lines = [
    `# ${title}`,
    '',
    `**Carátula:** ${record.caratula || 'No informada por la CSJ.'}`,
    '',
    ...metadata.map(([label, value]) => `- **${label}:** ${value}`),
    `- **Fuente oficial:** [Ficha en la CSJ](${record.source})`,
    `- **Documento oficial:** [Descargar archivo original](${record.document})`,
    '',
    '## Texto de la resolución',
    '',
    body || '_La ficha de la CSJ no ofrece texto extraíble para esta resolución._',
    '',
    '---',
    '',
    `Fuente: [Sistema de Información de Jurisprudencia del Poder Judicial](${BASE_URL}/).`
  ];
  return `${lines.join('\n')}\n`;
}

async function extractOfficeText(buffer, extension) {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'csj-jurisprudencia-'));
  const outputDirectory = path.join(temporaryDirectory, 'output');
  const profileDirectory = path.join(temporaryDirectory, 'profile');
  const temporaryDocument = path.join(temporaryDirectory, `resolucion.${extension}`);
  try {
    await fs.mkdir(outputDirectory);
    await fs.writeFile(temporaryDocument, buffer);
    await execFileAsync(
      'libreoffice',
      [
        '--headless',
        `-env:UserInstallation=${pathToFileURL(profileDirectory).href}`,
        '--convert-to',
        'txt:Text',
        '--outdir',
        outputDirectory,
        temporaryDocument
      ],
      { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024, timeout: 60000 }
    );
    const text = await fs.readFile(path.join(outputDirectory, 'resolucion.txt'), 'utf8');
    return { text: normalizeText(text), pages: null };
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function extractPdfText(buffer) {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'csj-jurisprudencia-'));
  const temporaryDocument = path.join(temporaryDirectory, 'resolucion.pdf');
  try {
    await fs.writeFile(temporaryDocument, buffer);
    try {
      const { stdout } = await execFileAsync(
        'pdftotext',
        ['-layout', temporaryDocument, '-'],
        { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024, timeout: 60000 }
      );
      return {
        text: normalizeText(stdout.replace(/\f/g, '\n\n')),
        pages: null
      };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      try {
        const result = await parser.getText();
        return {
          text: normalizeText(result.text),
          pages: result.pages?.length || null
        };
      } finally {
        await parser.destroy();
      }
    }
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

function extractRtfText(buffer) {
  const input = cp1252Decoder.decode(buffer);
  const output = [];
  const groups = [];
  let skipGroup = false;
  let unicodeFallback = 1;
  let fallbackRemaining = 0;

  for (let index = 0; index < input.length;) {
    const character = input[index];
    if (character === '{') {
      groups.push({ skipGroup, unicodeFallback });
      const next = input.slice(index + 1);
      const destination = next.match(/^\s*\\([a-z]+)/i)?.[1]?.toLowerCase();
      if (/^\s*\\\*/.test(next) || rtfDestinations.has(destination)) skipGroup = true;
      index += 1;
      continue;
    }
    if (character === '}') {
      const state = groups.pop();
      if (state) ({ skipGroup, unicodeFallback } = state);
      index += 1;
      continue;
    }
    if (character === '\\') {
      const next = input[index + 1];
      if (next === '\\' || next === '{' || next === '}') {
        if (!skipGroup) {
          if (fallbackRemaining) fallbackRemaining -= 1;
          else output.push(next);
        }
        index += 2;
        continue;
      }
      if (next === "'") {
        const hex = input.slice(index + 2, index + 4);
        if (/^[\da-f]{2}$/i.test(hex) && !skipGroup) {
          if (fallbackRemaining) fallbackRemaining -= 1;
          else output.push(cp1252Decoder.decode(Uint8Array.of(Number.parseInt(hex, 16))));
        }
        index += 4;
        continue;
      }
      if (next === '*') {
        skipGroup = true;
        index += 2;
        continue;
      }
      if (!/[a-z]/i.test(next || '')) {
        if (!skipGroup && next) {
          if (fallbackRemaining) fallbackRemaining -= 1;
          else if (next === '~') output.push('\u00a0');
          else if (next === '_') output.push('\u2011');
          else if (next === '-') output.push('');
        }
        index += next ? 2 : 1;
        continue;
      }

      let end = index + 1;
      while (/[a-z]/i.test(input[end] || '')) end += 1;
      const word = input.slice(index + 1, end).toLowerCase();
      const numberMatch = input.slice(end).match(/^-?\d+/);
      const number = numberMatch ? Number(numberMatch[0]) : null;
      if (numberMatch) end += numberMatch[0].length;
      if (input[end] === ' ') end += 1;

      if (!skipGroup) {
        if (word === 'uc' && number != null) unicodeFallback = number;
        else if (word === 'u' && number != null) {
          const code = number < 0 ? number + 65536 : number;
          output.push(String.fromCharCode(code));
          fallbackRemaining = unicodeFallback;
        } else if (word === 'par' || word === 'line' || word === 'row' || word === 'page') {
          output.push('\n');
        } else if (word === 'tab' || word === 'cell') {
          output.push('\t');
        } else if (word === 'emdash') output.push('\u2014');
        else if (word === 'endash') output.push('\u2013');
        else if (word === 'bullet') output.push('\u2022');
        else if (word === 'lquote') output.push('\u2018');
        else if (word === 'rquote') output.push('\u2019');
        else if (word === 'ldblquote') output.push('\u201c');
        else if (word === 'rdblquote') output.push('\u201d');
        else if (word === 'bin' && number > 0) end += number;
      } else if (word === 'bin' && number > 0) {
        end += number;
      }
      index = end;
      continue;
    }

    if (character !== '\r' && character !== '\n' && !skipGroup) {
      if (fallbackRemaining) fallbackRemaining -= 1;
      else output.push(character);
    }
    index += 1;
  }

  return normalizeText(output.join(''));
}

async function extractDocxText(buffer) {
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'csj-jurisprudencia-'));
  const temporaryDocument = path.join(temporaryDirectory, 'resolucion.docx');
  try {
    await fs.writeFile(temporaryDocument, buffer);
    const { stdout } = await execFileAsync(
      'unzip',
      ['-p', temporaryDocument, 'word/document.xml'],
      { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024, timeout: 60000 }
    );
    const xml = stdout
      .replace(/<\/w:p>/g, '\n\n')
      .replace(/<w:tab\b[^>]*\/>/g, '\t')
      .replace(/<w:br\b[^>]*\/>/g, '\n');
    return { text: normalizeText(cheerio.load(xml, { xmlMode: true }).text()), pages: null };
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

function extractHtmlText(buffer) {
  const html = cp1252Decoder.decode(buffer);
  const $ = cheerio.load(html);
  $('head,script,style,noscript').remove();
  const body = $('body').length ? $('body') : $.root();
  const paragraphs = body.find('p').map((_, paragraph) => normalizeText($(paragraph).text()))
    .get()
    .filter(Boolean);
  const text = paragraphs.length ? paragraphs.join('\n\n') : body.text();
  return normalizeText(text);
}

function extractPlainText(buffer) {
  const text = new TextDecoder('windows-1252').decode(buffer);
  const controls = text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || [];
  if (text.includes('\0') || controls.length / text.length >= 0.02) return null;
  return normalizeText(text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' '));
}

async function extractDocumentText(record) {
  const buffer = await request(record.document, {}, 'buffer');
  if (buffer.length < 8) {
    return {
      text: '',
      pages: null,
      warning: 'sin texto extraíble: archivo oficial vacío o incompleto; se conservó el enlace'
    };
  }

  if (buffer.subarray(0, 4).toString() === '%PDF') {
    return extractPdfText(buffer);
  }

  if (buffer.subarray(0, 8).equals(Buffer.from('D0CF11E0A1B11AE1', 'hex'))) {
    const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'csj-jurisprudencia-'));
    const temporaryDocument = path.join(temporaryDirectory, 'resolucion.doc');
    try {
      await fs.writeFile(temporaryDocument, buffer);
      const { stdout } = await execFileAsync(
        'antiword',
        ['-m', 'UTF-8.txt', temporaryDocument],
        { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024, timeout: 60000 }
      );
      return { text: normalizeText(stdout), pages: null };
    } finally {
      await fs.rm(temporaryDirectory, { recursive: true, force: true });
    }
  }

  if (buffer.subarray(0, 5).toString('ascii') === '{\\rtf') {
    return { text: extractRtfText(buffer), pages: null };
  }

  if (buffer[0] === 0xff && buffer.subarray(1, 4).toString('ascii') === 'WPC') {
    return extractOfficeText(buffer, 'wpd');
  }

  if (buffer.subarray(0, 4).equals(Buffer.from('504B0304', 'hex'))) {
    return extractDocxText(buffer);
  }

  const htmlStart = buffer.subarray(0, 64).toString('ascii').trimStart().toLowerCase();
  if (htmlStart.startsWith('<html') || htmlStart.startsWith('<!doctype html')) {
    return { text: extractHtmlText(buffer), pages: null };
  }

  const plainText = extractPlainText(buffer);
  if (plainText) return { text: plainText, pages: null };

  return {
    text: '',
    pages: null,
    warning: 'sin texto extraíble: formato incompatible o archivo oficial dañado; se conservó el enlace'
  };
}

async function processRecord(record) {
  const filename = filePathFor(record);
  try {
    await fs.access(filename);
    return { status: 'existente', filename };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  let body = record.textResolution;
  let textStatus = body ? 'texto publicado en los datos de la CSJ' : 'texto no disponible';
  let pageCount = null;

  if (record.hasDocument) {
    const extracted = await extractDocumentText(record);
    body = extracted.text || body;
    pageCount = extracted.pages;
    textStatus = extracted.warning || (
      extracted.text
        ? 'texto extraído del documento oficial'
        : 'documento oficial disponible, pero sin texto extraíble (posible escaneo)'
    );
  } else if (body) {
    textStatus = 'texto publicado en los datos de la CSJ; no se informó PDF';
  } else {
    textStatus = 'sin texto ni PDF informado por la CSJ';
  }

  await fs.mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${process.pid}.tmp`;
  await fs.writeFile(temporary, renderMarkdown(record, body, textStatus, pageCount), 'utf8');
  await fs.rename(temporary, filename);
  return { status: textStatus, filename };
}

async function countExisting(records) {
  const counts = new Map();
  for (const record of records) {
    const type = folderForType(record.type);
    const key = `${type}/${record.year}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

async function countExtractionStatuses(records) {
  const statuses = new Map();
  for (const record of records) {
    let handle;
    try {
      handle = await fs.open(filePathFor(record), 'r');
      const buffer = Buffer.alloc(8192);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
      const status = buffer.toString('utf8', 0, bytesRead)
        .match(/^- \*\*Estado de extracción:\*\* (.+)$/m)?.[1];
      if (status) statuses.set(status, (statuses.get(status) || 0) + 1);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    } finally {
      await handle?.close();
    }
  }
  return statuses;
}

async function writeReadme(records, failures) {
  const groups = await countExisting(records);
  const extractionStatuses = await countExtractionStatuses(records);
  const types = [...new Set(records.map((record) => folderForType(record.type)))].sort();
  const total = records.length;
  const failedIds = new Set(failures.map((failure) => failure.id));
  const completed = total - failedIds.size;
  const withText = [...extractionStatuses.entries()]
    .filter(([status]) => status.includes('texto extraído'))
    .reduce((sum, [, count]) => sum + count, 0);
  const withoutText = total - withText;
  const typeRows = types.map((type) => {
    const years = [...groups.entries()]
      .filter(([key]) => key.startsWith(`${type}/`))
      .map(([key, count]) => [key.slice(type.length + 1), count])
      .sort(([a], [b]) => b.localeCompare(a));
    return [
      `## ${type}`,
      '',
      `Total en el catálogo: ${years.reduce((sum, [, count]) => sum + count, 0)}.`,
      '',
      '| Año | Resoluciones | Carpeta |',
      '|---:|---:|---|',
      ...years.map(([year, count]) => `| ${year} | ${count} | [${year}](<./${type}/${year}/>) |`),
      ''
    ].join('\n');
  });

  const content = [
    '# Jurisprudencia Paraguaya — Corte Suprema de Justicia',
    '',
    `Catálogo consultado en [el portal oficial de jurisprudencia de la CSJ](${BASE_URL}/).`,
    '',
    `- **Registros recuperados:** ${total}`,
    `- **Archivos Markdown generados:** ${completed}`,
    `- **Pendientes por error de descarga/extracción:** ${failedIds.size}`,
    `- **Resoluciones con texto extraído:** ${withText.toLocaleString('es-PY')}`,
    `- **Resoluciones sin texto extraíble:** ${withoutText.toLocaleString('es-PY')}`,
    '- **Tipos de resolución:** Acuerdos y Sentencias, y Autos Interlocutorios (además de cualquier tipo que el portal incorpore).',
    '- Los documentos originales no se duplican en disco; cada Markdown conserva el enlace oficial al archivo.',
    '- Se extrae texto de PDF, Word antiguo (`.doc`), DOCX, RTF, WordPerfect y HTML de Word; los formatos heredados usan `antiword`, `unzip` o LibreOffice. Los documentos escaneados pueden no tener texto utilizable.',
    '',
    ...typeRows
  ].join('\n');

  await fs.writeFile(path.join(OUTPUT_DIR, 'README.md'), `${content}\n`, 'utf8');
}

async function loadOrFetchCatalog() {
  const refresh = process.env.CSJ_REFRESH_CATALOG === '1';
  if (!refresh) {
    try {
      const cached = JSON.parse(await fs.readFile(CATALOG_PATH, 'utf8'));
      if (Array.isArray(cached.records) && cached.records.length) {
        console.log(`Reutilizando catálogo guardado (${cached.records.length} registros).`);
        const records = cached.records.map((record) => ({
          ...record,
          type: !record.type || /^0\s*;?$/.test(record.type.trim())
            ? 'Tipo no especificado'
            : record.type
        }));
        if (records.some((record, index) => record.type !== cached.records[index].type)) {
          await fs.writeFile(CATALOG_PATH, `${JSON.stringify({ ...cached, records })}\n`, 'utf8');
        }
        return records.slice(0, MAX_RECORDS);
      }
    } catch (error) {
      if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
    }
  }

  const records = await fetchCatalog();
  const catalog = {
    source: `${BASE_URL}/`,
    retrievedAt: new Date().toISOString(),
    total: records.length,
    records
  };
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(CATALOG_PATH, `${JSON.stringify(catalog)}\n`, 'utf8');
  return records;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const records = await loadOrFetchCatalog();
  const failures = [];
  let nextRecord = 0;
  let completed = 0;
  let alreadyPresent = 0;
  let extractedText = 0;
  let withoutExtractableText = 0;

  async function worker() {
    while (true) {
      const index = nextRecord;
      nextRecord += 1;
      if (index >= records.length) return;

      const record = records[index];
      let existingFile = false;
      try {
        const result = await processRecord(record);
        completed += 1;
        if (result.status === 'existente') {
          alreadyPresent += 1;
          existingFile = true;
        } else if (result.status.includes('sin texto')) {
          withoutExtractableText += 1;
        } else {
          extractedText += 1;
        }
        if (completed % 100 === 0 || completed === records.length) {
          console.log(`Resoluciones procesadas: ${completed} / ${records.length}`);
        }
      } catch (error) {
        failures.push({ id: record.id, error: error.message });
        if (failures.length <= 20) {
          console.error(`Falló ${record.id}: ${error.message}`);
        }
      }
      if (DELAY_MS && !existingFile) await sleep(DELAY_MS);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  await fs.writeFile(FAILURES_PATH, `${JSON.stringify(failures, null, 2)}\n`, 'utf8');
  await writeReadme(records, failures);

  console.log(`Total del catálogo: ${records.length}`);
  console.log(`Completadas o ya existentes: ${completed}`);
  console.log(`Archivos ya existentes: ${alreadyPresent}`);
  console.log(`Documentos con texto extraído: ${extractedText}`);
  console.log(`Documentos sin texto extraíble: ${withoutExtractableText}`);
  console.log(`Fallidas: ${failures.length}`);
  if (failures.length > 20) {
    console.error(`Se omitieron ${failures.length - 20} errores individuales; consulte ${FAILURES_PATH}.`);
  }
  if (failures.length) {
    throw new Error(`Quedaron ${failures.length} resoluciones pendientes; revise ${FAILURES_PATH} y vuelva a ejecutar el scraper.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
