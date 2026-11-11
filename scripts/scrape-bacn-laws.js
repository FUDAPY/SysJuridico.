const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://www.bacn.gov.py';
const CATALOG_URL = `${BASE_URL}/paginacion/leyes-paraguayas.php`;
const OUTPUT_DIR = path.resolve(
  process.env.BACN_OUTPUT_DIR || 'LESGILACION PARAGUAYA/BACN'
);
const CONCURRENCY = Math.max(1, Number(process.env.BACN_CONCURRENCY) || 3);
const DELAY_MS = Math.max(0, Number(process.env.BACN_DELAY_MS) || 350);
const MAX_PAGES = Number(process.env.BACN_MAX_PAGES) || Infinity;
const MAX_LAWS = Number(process.env.BACN_MAX_LAWS) || Infinity;
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'catalogo.json');
const CATALOG_CACHE_PATH = path.join(OUTPUT_DIR, 'catalogo-bacn.json');

const client = axios.create({
  timeout: 45000,
  headers: {
    'User-Agent': 'SysJuridico BACN legal-text indexer (contact: repository maintainers)',
    Accept: 'text/html,application/xhtml+xml'
  },
  maxContentLength: 20 * 1024 * 1024
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchHtml(url, params) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const { data } = await client.get(url, { params });
      return String(data);
    } catch (error) {
      lastError = error;
      if (attempt < 4) await sleep(1000 * (2 ** attempt));
    }
  }
  throw lastError;
}

function cleanText(value) {
  return String(value || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

function relationType(value) {
  const text = cleanText(value).toLocaleLowerCase('es');
  if (/derog|abrog|sin efecto/.test(text)) return 'derogación mencionada';
  if (/modific|modifi|modificado/.test(text)) return 'modificación mencionada';
  if (/ampl[ií]|ampliad/.test(text)) return 'ampliación mencionada';
  if (/sustituy|reemplaz/.test(text)) return 'sustitución mencionada';
  return 'referencia relacionada';
}

function extractMentions(text, title) {
  const mentions = [];
  const pattern = /\bley\s*(?:n[.º°o]*\s*)?([\d.]+)\s*(?:\/\s*(\d{4}))?/gi;
  const ownNumber = cleanText(title)
    .match(/\bley\s*(?:n[.º°o]*\s*)?([\d.]+)/i)?.[1]
    ?.replace(/\./g, '');
  for (const match of text.matchAll(pattern)) {
    const number = match[1].replace(/\./g, '');
    if (!/^\d+$/.test(number) || number === ownNumber) continue;
    const start = Math.max(0, match.index - 220);
    const end = Math.min(text.length, match.index + match[0].length + 220);
    const context = cleanText(text.slice(start, end));
    const kind = relationType(context);
    if (kind === 'referencia relacionada') continue;
    mentions.push({
      number,
      year: match[2] || '',
      context,
      type: kind
    });
  }
  return [...new Map(mentions.map((mention) => [
    `${mention.number}/${mention.year}/${mention.type}/${mention.context}`,
    mention
  ])).values()];
}

function safeSlug(value) {
  return cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100) || 'norma';
}

function htmlNodeToMarkdown($, node) {
  if (node.type === 'text') {
    return String(node.data || '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ');
  }
  if (node.type !== 'tag') return '';

  const tag = node.name.toLowerCase();
  if (['script', 'style', 'iframe', 'audio', 'video'].includes(tag)) return '';
  const children = () => {
    const nodes = $(node).contents().toArray();
    return nodes.reduce((result, child, index) => {
      const current = htmlNodeToMarkdown($, child);
      if (!current) return result;
      const previous = nodes[index - 1];
      const emphasized = (candidate) =>
        candidate?.type === 'tag' && ['strong', 'b'].includes(candidate.name.toLowerCase());
      const previousText = previous?.type === 'text'
        ? previous.data
        : previous?.type === 'tag' ? $(previous).text() : '';
      const currentText = child.type === 'text'
        ? child.data
        : child.type === 'tag' ? $(child).text() : '';
      const left = result.slice(-1);
      const right = currentText.slice(0, 1);
      const needsSpace = (emphasized(previous) || emphasized(child)) &&
        left && right && !/\s/.test(left) && !/^\s/.test(currentText) &&
        /[\p{L}\d°º,;:.]/u.test(left) && /[\p{L}\d]/u.test(right) &&
        !/\s$/.test(previousText);
      return `${result}${needsSpace ? ' ' : ''}${current}`;
    }, '');
  };
  const content = children().trim();

  if (!content && !['br', 'hr'].includes(tag)) return '';
  if (tag === 'br') return '\n';
  if (tag === 'hr') return '\n---\n\n';
  if (/^h[1-6]$/.test(tag)) return `${'#'.repeat(Number(tag[1]) + 1)} ${content}\n\n`;
  if (tag === 'p' || tag === 'blockquote') return `${content}\n\n`;
  if (tag === 'li') return `- ${content}\n`;
  if (tag === 'ul' || tag === 'ol') return `\n${content}\n`;
  if (tag === 'strong' || tag === 'b') return content;
  if (tag === 'em' || tag === 'i') return `*${content}*`;
  if (tag === 'a') {
    const href = $(node).attr('href');
    if (!href) return content;
    try {
      return `[${content || href}](${new URL(href, BASE_URL).href})`;
    } catch (error) {
      return `${content || href} (_enlace original malformado: ${href}_)`;
    }
  }
  if (tag === 'sup') return `<sup>${content}</sup>`;
  if (tag === 'sub') return `<sub>${content}</sub>`;
  if (tag === 'table') return `\n${content}\n`;
  if (tag === 'tr') return `| ${$(node).children().map((_, cell) => cleanText($(cell).text())).get().join(' | ')} |\n`;
  if (tag === 'td' || tag === 'th') return cleanText($(node).text());
  if (['div', 'section', 'article'].includes(tag)) return `${content}\n\n`;
  return content;
}

function extractLaw(html, url, id) {
  const $ = cheerio.load(html);
  const title = cleanText($('.entry-title').first().text()) ||
    cleanText($('title').first().text()) || `Norma BACN ${id}`;
  const content = $('.entry-content').first();
  const allText = cleanText(content.text());
  const promulgation = allText.match(/Fecha de Promulgaci[oó]n:\s*([0-9-]+)/i)?.[1] || '';
  const publication = allText.match(/Fecha de Publicaci[oó]n:\s*([0-9-]+)/i)?.[1] || '';
  const pdfLink = content.find('a[href]').filter((_, anchor) => /\.pdf(?:$|[?#])/i.test($(anchor).attr('href') || '')).first();
  const pdfUrl = pdfLink.length ? new URL(pdfLink.attr('href'), BASE_URL).href : '';

  let bodyStarted = false;
  const bodyParts = [];
  content.children().each((_, child) => {
    const tag = (child.name || '').toLowerCase();
    const childText = cleanText($(child).text());
    if (!bodyStarted && tag === 'p' && childText.length > 0) bodyStarted = true;
    if (!bodyStarted || ['hr', 'iframe'].includes(tag)) return;
    if (tag === 'h4' && /^descargar archivo/i.test(childText)) return;
    bodyParts.push(htmlNodeToMarkdown($, child));
  });
  let body = bodyParts.join('')
    .replace(/(Art[ií]culo)(?=\d)/gi, '$1 ')
    .replace(/(Art[ií]culo\s+\d+(?:\.\s*)?[°º]?(?:\s*[-–—]\s*)?)(?=[A-ZÁÉÍÓÚÑ])/g, '$1 ')
    .replace(/(\d)(?=de\b)/gi, '$1 ')
    .replace(/\ba los(?=[a-záéíóúñ])/gi, 'a los ')
    .replace(/([,;:])(?=[A-Za-zÁÉÍÓÚÑáéíóúñ])/g, '$1 ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!body) {
    body = content.find('p').map((_, paragraph) => cleanText($(paragraph).text())).get().join('\n\n');
  }

  const related = [];
  const seenRelated = new Set();
  content.find('a[href*="/leyes-paraguayas/"]').each((_, anchor) => {
    let href;
    try {
      href = new URL($(anchor).attr('href'), BASE_URL).href;
    } catch (error) {
      console.error(`Referencia BACN inválida en ficha ${id}: ${$(anchor).attr('href')}`);
      return;
    }
    const relatedId = href.match(/\/leyes-paraguayas\/(\d+)\//)?.[1];
    if (!relatedId || relatedId === String(id) || seenRelated.has(relatedId)) return;
    seenRelated.add(relatedId);
    const label = cleanText($(anchor).text()) || href;
    const context = cleanText($(anchor).parent().text()).slice(0, 500);
    related.push({ id: relatedId, label, url: href, context, type: relationType(context) });
  });
  const mentions = extractMentions(body, title);

  const doc = {
    id: String(id),
    title,
    url,
    promulgation,
    publication,
    pdfUrl,
    text: body,
    related,
    mentions
  };
  return doc;
}

function filenameFor(doc) {
  const lawNumber = doc.title.match(/(?:Ley|Ley\u00a0|C[oó]digo)\s*(?:N[°ºo.]*)?\s*([\d.]+(?:\/\d{4})?)/i)?.[1];
  return `${doc.id}-${safeSlug(lawNumber || doc.title)}-${safeSlug(doc.title).slice(0, 60)}.md`;
}

function renderMarkdown(doc, filename) {
  const refs = doc.related.length
    ? doc.related.map((item) => `- **${item.type}:** [${item.label}](${item.url}) — ${item.context || 'Referencia relacionada indicada en BACN.'}`).join('\n')
    : 'BACN no presenta vínculos a otras leyes en esta ficha.';
  const mentions = doc.mentions.length
    ? doc.mentions.map((item) => `- **${item.type}** a Ley Nº ${item.number}${item.year ? `/${item.year}` : ''}: ${item.context}`).join('\n')
    : 'No se detectaron en el texto referencias explícitas de modificación o derogación a otras leyes.';
  const metadata = [
    `- **Identificador BACN:** ${doc.id}`,
    `- **Promulgación:** ${doc.promulgation || 'No informada en la ficha'}`,
    `- **Publicación:** ${doc.publication || 'No informada en la ficha'}`,
    `- **Ficha oficial:** ${doc.url}`,
    `- **Archivo enlazado por BACN:** ${doc.pdfUrl ? `[Abrir](${doc.pdfUrl})` : 'No enlazado en la ficha'}`
  ].join('\n');

  return `# ${doc.title}\n\n## Datos de la fuente\n\n${metadata}\n\n> **Vigencia:** esta copia se transcribe de la ficha BACN. La ficha y las referencias disponibles no constituyen una certificación jurídica de vigencia ni un texto consolidado. Las modificaciones y derogaciones identificadas deben verificarse en las normas vinculadas y en la publicación oficial.\n\n## Modificaciones y derogaciones mencionadas en el texto\n\n${mentions}\n\n## Texto publicado por BACN\n\n${doc.text || '_La ficha BACN no expuso texto legible en HTML. Se conserva el enlace de archivo proporcionado por BACN, si existe; su descarga no se verificó._'}\n\n## Normas relacionadas indicadas por BACN\n\n${refs}\n`;
}

async function readManifest() {
  try {
    return JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { source: `${BASE_URL}/leyes-paraguayas`, fetchedAt: null, laws: [], failures: [] };
  }
}

async function writeManifest(manifest) {
  manifest.fetchedAt = new Date().toISOString();
  const tempPath = `${MANIFEST_PATH}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await fs.rename(tempPath, MANIFEST_PATH);
}

async function getCatalog() {
  if (!Number.isFinite(MAX_PAGES)) {
    try {
      const cached = JSON.parse(await fs.readFile(CATALOG_CACHE_PATH, 'utf8'));
      if (Array.isArray(cached.laws) && cached.totalPages) {
        return { totalPages: cached.totalPages, laws: cached.laws.slice(0, MAX_LAWS) };
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  const initialHtml = await fetchHtml(CATALOG_URL, { action: 'ajax', page: 1 });
  const $initial = cheerio.load(initialHtml);
  const totalPages = Math.max(
    1,
    ...$initial('.table-pagination [onclick]').map((_, el) => {
      const match = ($initial(el).attr('onclick') || '').match(/load\((\d+)\)/);
      return match ? Number(match[1]) : 0;
    }).get()
  );
  const pageCount = Math.min(totalPages, MAX_PAGES);
  const catalog = [];

  for (let page = 1; page <= pageCount; page += 1) {
    if (page > 1) await sleep(DELAY_MS);
    const html = page === 1 ? initialHtml : await fetchHtml(CATALOG_URL, { action: 'ajax', page });
    const $ = cheerio.load(html);
    $('.blog-entry-title-link').each((_, anchor) => {
      const url = new URL($(anchor).attr('href'), BASE_URL).href;
      const id = url.match(/\/leyes-paraguayas\/(\d+)\//)?.[1];
      if (!id) return;
      catalog.push({
        id,
        title: cleanText($(anchor).text()),
        url,
        date: cleanText($(anchor).closest('.blog-entry').find('.blog-entry-date').first().text())
      });
    });
    if (page % 25 === 0 || page === pageCount) {
      console.log(`Catálogo: ${page}/${pageCount} páginas, ${catalog.length} fichas`);
    }
  }

  const unique = [...new Map(catalog.map((law) => [law.id, law])).values()];
  if (!Number.isFinite(MAX_PAGES)) {
    await fs.writeFile(
      CATALOG_CACHE_PATH,
      `${JSON.stringify({ source: `${BASE_URL}/leyes-paraguayas`, fetchedAt: new Date().toISOString(), totalPages, laws: unique }, null, 2)}\n`,
      'utf8'
    );
  }
  return { totalPages, laws: unique.slice(0, MAX_LAWS) };
}

async function mapConcurrent(items, concurrency, callback) {
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await callback(items[index], index);
    }
  });
  await Promise.all(workers);
}

function categorizeLaw(doc) {
  const title = doc.title.toLocaleLowerCase('es');
  const categories = [];
  if (/\bc[oó]digo\b/.test(title)) categories.push('codigos');
  if (!categories.includes('codigos')) categories.push('leyes');
  const institutions = [
    ['policia', /polic[ií]a|polic[ií]a caminera|polic[ií]a nacional|tr[aá]nsito/],
    ['ministerio-publico-fiscalia', /ministerio p[uú]blico|fiscal[ií]a|fiscal general/],
    ['salud', /ministerio de salud|bienestar social/],
    ['justicia', /ministerio de justicia/],
    ['interior', /ministerio del interior/],
    ['economia-finanzas', /ministerio de econom[ií]a|ministerio de hacienda|finanzas p[uú]blicas/],
    ['otras-instituciones-publicas', /ministerio|secretar[ií]a nacional|municipalidad|gobernaci[oó]n|corte suprema|contralor[ií]a|defensor[ií]a|banco central/]
  ];
  for (const [category, pattern] of institutions) {
    if (pattern.test(title)) categories.push(`instituciones/${category}`);
  }
  return categories;
}

async function writeIndexes(manifest, allDocs) {
  const indexRows = allDocs
    .sort((a, b) => a.title.localeCompare(b.title, 'es'))
    .map((doc) => {
      const name = filenameFor(doc);
      return { doc, name, categories: categorizeLaw(doc) };
    });

  const mainLines = [
    '# Legislación paraguaya — catálogo BACN',
    '',
    `Recopilación automática de la sección [Leyes Paraguayas de BACN](${BASE_URL}/leyes-paraguayas). Última ejecución: ${manifest.fetchedAt || new Date().toISOString()}.`,
    '',
    `Fichas en el catálogo procesadas: **${indexRows.length}**. La paginación reportó **${manifest.totalPages || 'desconocido'}** páginas.`,
    '',
    '> Los documentos reproducen el texto expuesto por las fichas BACN y enlazan el PDF fuente cuando está disponible. Este catálogo no certifica vigencia ni sustituye la revisión jurídica de modificaciones, derogaciones, fe de erratas o normas posteriores.',
    '',
    `Errores de descarga pendientes: **${manifest.failures.length}**.`,
    '',
    'Los documentos con texto no disponible en la ficha HTML conservan los metadatos y el enlace de archivo ofrecido por BACN; la descarga de esos enlaces no se validó.',
    '',
    '## Códigos',
    '',
    'Ver [índice de códigos](indices/codigos.md).',
    '',
    '## Leyes',
    '',
    'Ver [índice de leyes](indices/leyes.md).',
    '',
    '## Leyes relacionadas con instituciones públicas',
    '',
    'Ver [índice institucional](indices/instituciones.md). Las coincidencias se basan en el título de la norma; no equivalen a una clasificación oficial por competencia.',
    '',
    '## Normas',
    ''
  ];
  mainLines.push(...indexRows.map(({ doc, name }) => `- [${doc.title}](normas/${name})`));

  const indexDir = path.join(OUTPUT_DIR, 'indices');
  await fs.mkdir(indexDir, { recursive: true });
  const categories = new Map([
    ['codigos', []],
    ['leyes', []],
    ['instituciones', []]
  ]);
  for (const row of indexRows) {
    if (row.categories.includes('codigos')) categories.get('codigos').push(row);
    if (row.categories.includes('leyes')) categories.get('leyes').push(row);
    if (row.categories.some((category) => category.startsWith('instituciones/'))) {
      categories.get('instituciones').push(row);
    }
  }

  const byLawNumber = new Map();
  const rowsById = new Map(indexRows.map((row) => [row.doc.id, row]));
  for (const row of indexRows) {
    const number = row.doc.title.match(/\bley\s*(?:n[.º°o]*\s*)?([\d.]+)/i)?.[1]?.replace(/\./g, '');
    if (number) byLawNumber.set(number, row);
  }
  const incoming = new Map(indexRows.map(({ doc }) => [doc.id, []]));
  const relationsByPair = new Map();
  let recordsWithText = 0;
  let recordsWithoutText = 0;
  let recordsWithFileLink = 0;
  for (const row of indexRows) {
    const references = [
      ...row.doc.related.map((item) => ({
        targetId: item.id,
        type: item.type || relationType(item.context),
        context: item.context || 'Vínculo de norma relacionada publicado por BACN.',
        label: item.label
      })),
      ...(row.doc.mentions || [])
        .filter((item) =>
          /^\d+$/.test(item.number) &&
          item.number !== row.doc.title.match(/\bley\s*(?:n[.º°o]*\s*)?([\d.]+)/i)?.[1]?.replace(/\./g, '')
        )
        .map((item) => ({
        targetId: byLawNumber.get(item.number)?.doc.id,
        type: item.type,
        context: item.context,
        label: `Ley Nº ${item.number}${item.year ? `/${item.year}` : ''}`
        }))
    ];
    const seen = new Set();
    for (const reference of references) {
      if (!reference.targetId || reference.targetId === row.doc.id) continue;
      const key = `${reference.targetId}/${reference.type}/${reference.context}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const target = rowsById.get(reference.targetId);
      if (!target) continue;
      const relation = {
        sourceId: row.doc.id,
        sourceTitle: row.doc.title,
        sourceFile: row.name,
        targetId: target.doc.id,
        targetTitle: target.doc.title,
        targetFile: target.name,
        type: reference.type,
        context: reference.context
      };
      const pairKey = `${row.doc.id}/${target.doc.id}/${reference.type}`;
      const existing = relationsByPair.get(pairKey);
      if (!existing || relation.context.length > existing.context.length) {
        relationsByPair.set(pairKey, relation);
      }
    }
  }

  const relationRows = [...relationsByPair.values()];
  for (const relation of relationRows) incoming.get(relation.targetId).push(relation);

  for (const row of indexRows) {
    const related = incoming.get(row.doc.id) || [];
    const bullets = related.length
      ? related.map((relation) => `- **${relation.type}:** [${relation.sourceTitle}](${relation.sourceFile}) — ${relation.context}`).join('\n')
      : 'No se detectaron vínculos entrantes entre las fichas descargadas.';
    const targetPath = path.join(OUTPUT_DIR, 'normas', row.name);
    let content = await fs.readFile(targetPath, 'utf8');
    const ownNumber = row.doc.title
      .match(/\bley\s*(?:n[.º°o]*\s*)?([\d.]+)/i)?.[1]
      ?.replace(/\./g, '');
    const explicitChanges = (row.doc.mentions || [])
      .filter((item) => /^\d+$/.test(item.number) && item.number !== ownNumber);
    const changeBullets = explicitChanges.length
      ? explicitChanges.map((item) =>
        `- **${item.type}** a Ley Nº ${item.number}${item.year ? `/${item.year}` : ''}: ${item.context}`
      ).join('\n')
      : 'No se detectaron en el texto referencias explícitas de modificación o derogación a otras leyes.';
    const changesHeading = '## Modificaciones y derogaciones mencionadas en el texto\n\n';
    const changesMarker = '## Texto publicado por BACN\n';
    const changesStart = content.indexOf(changesHeading);
    if (changesStart >= 0) {
      const changesEnd = content.indexOf(changesMarker, changesStart);
      if (changesEnd >= 0) {
        content = `${content.slice(0, changesStart)}${changesHeading}${changeBullets}\n\n${content.slice(changesEnd)}`;
      }
    }
    if (content.includes('_La ficha no expuso texto legible en HTML; consultar el PDF oficial enlazado arriba._')) {
      content = content.replace(
        '_La ficha no expuso texto legible en HTML; consultar el PDF oficial enlazado arriba._',
        '_La ficha BACN no expuso texto legible en HTML. Se conserva el enlace de archivo proporcionado por BACN, si existe; su descarga no se verificó._'
      );
    }
    content = content.replace('- **PDF oficial:**', '- **Archivo enlazado por BACN:**');
    if (content.includes('_La ficha BACN no expuso texto legible en HTML.')) recordsWithoutText += 1;
    else recordsWithText += 1;
    if (row.doc.pdfUrl) recordsWithFileLink += 1;
    const heading = '## Referencias entrantes detectadas en BACN';
    const section = `${heading}\n\n${bullets}\n\n`;
    const marker = '## Texto publicado por BACN\n';
    const oldHeadings = [
      heading,
      '## Otras normas que mencionan esta ley como modificada o derogada'
    ];
    const oldHeading = oldHeadings.find((value) => content.includes(value));
    let updated = content;
    if (oldHeading) {
      const start = content.indexOf(oldHeading);
      const end = content.indexOf(marker, start);
      updated = end >= 0
        ? `${content.slice(0, start)}${section}${content.slice(end)}`
        : `${content.slice(0, start)}${section}`;
    } else if (content.includes(marker)) {
      updated = content.replace(marker, `${section}${marker}`);
    } else {
      updated = `${content}\n${section}`;
    }
    await fs.writeFile(targetPath, updated, 'utf8');
  }

  for (const [category, rows] of categories) {
    const heading = category === 'codigos' ? 'Códigos' : category === 'leyes' ? 'Leyes' : 'Instituciones públicas';
    const lines = [`# ${heading}`, '', `Normas catalogadas: **${rows.length}**.`, ''];
    for (const row of rows) {
      lines.push(`- [${row.doc.title}](../normas/${row.name})`);
      for (const institution of row.categories.filter((value) => value.startsWith('instituciones/'))) {
        if (category === 'instituciones') lines.push(`  - Clasificación por título: ${institution.split('/')[1]}`);
      }
    }
    await fs.writeFile(path.join(indexDir, `${category}.md`), `${lines.join('\n')}\n`, 'utf8');
  }
  mainLines.splice(
    8,
    0,
    `- **Texto íntegro visible en HTML:** ${recordsWithText} fichas.`,
    `- **Texto no expuesto en HTML:** ${recordsWithoutText} fichas; se conserva el enlace de archivo BACN en ${recordsWithFileLink} fichas.`,
    ''
  );
  await fs.writeFile(path.join(OUTPUT_DIR, 'README.md'), `${mainLines.join('\n')}\n`, 'utf8');
  const relationLines = [
    '# Modificaciones y derogaciones detectadas',
    '',
    `Relaciones detectadas entre **${relationRows.length}** pares de normas. Se extraen de los vínculos y menciones textuales presentes en las fichas BACN; no certifican el alcance ni la vigencia actual.`,
    ''
  ];
  relationLines.push(...relationRows.map((relation) =>
    `- **${relation.type}:** [${relation.sourceTitle}](../normas/${relation.sourceFile}) → [${relation.targetTitle}](../normas/${relation.targetFile}) — ${relation.context}`
  ));
  await fs.writeFile(
    path.join(indexDir, 'modificaciones-derogaciones.md'),
    `${relationLines.join('\n')}\n`,
    'utf8'
  );
}

async function main() {
  await fs.mkdir(path.join(OUTPUT_DIR, 'normas'), { recursive: true });
  const manifest = await readManifest();
  console.log('Consultando catálogo BACN…');
  const catalog = await getCatalog();
  manifest.totalPages = catalog.totalPages;
  manifest.catalogSize = catalog.laws.length;
  const existing = new Map((manifest.laws || []).map((law) => [String(law.id), law]));
  const failedIds = new Set((manifest.failures || []).map((failure) => String(failure.id)));
  const todo = catalog.laws.filter((law) => {
    const saved = existing.get(law.id);
    return failedIds.has(law.id) || !saved?.file ||
      !Array.isArray(saved.related) || !Array.isArray(saved.mentions);
  });
  let completed = 0;

  console.log(`Fichas detectadas: ${catalog.laws.length}; pendientes: ${todo.length}.`);
  await mapConcurrent(todo, CONCURRENCY, async (law) => {
    await sleep(DELAY_MS);
    try {
      const html = await fetchHtml(law.url);
      const doc = extractLaw(html, law.url, law.id);
      if (!doc.text) {
        doc.text = '';
      }
      const file = filenameFor(doc);
      const relativePath = `normas/${file}`;
      await fs.writeFile(path.join(OUTPUT_DIR, relativePath), renderMarkdown(doc, file), 'utf8');
      existing.set(law.id, {
        ...law,
        title: doc.title,
        file: relativePath,
        promulgation: doc.promulgation,
        publication: doc.publication,
        pdfUrl: doc.pdfUrl,
        related: doc.related,
        mentions: doc.mentions
      });
      manifest.failures = manifest.failures.filter((failure) => failure.id !== law.id);
    } catch (error) {
      manifest.failures = [
        ...manifest.failures.filter((failure) => failure.id !== law.id),
        { id: law.id, url: law.url, error: error.message }
      ];
      console.error(`Error en ficha BACN ${law.id}: ${error.message}`);
    } finally {
      completed += 1;
      if (completed % 25 === 0 || completed === todo.length) {
        manifest.laws = [...existing.values()];
        await writeManifest(manifest);
        console.log(`Fichas: ${completed}/${todo.length} procesadas`);
      }
    }
  });

  manifest.laws = [...existing.values()];
  await writeManifest(manifest);
  const docs = manifest.laws
    .filter((law) => law.file && !law.error)
    .map((law) => ({
      ...law,
      related: law.related || [],
      mentions: law.mentions || [],
      text: ''
    }));
  await writeIndexes(manifest, docs);
  console.log(`Finalizado. Markdown generados: ${docs.length}. Errores: ${manifest.failures.length}.`);
  if (manifest.failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Error fatal en scraping BACN: ${error.message}`);
  process.exitCode = 1;
});
