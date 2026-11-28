const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');
const {
  OTELAX_DATA_DIR,
  recargarIndice,
  guardarDocumento,
  calcularContentHash,
  normalizarTipo,
  normalizarFuero,
} = require('./otelaxWisdomService');

// Dominios oficiales de la República del Paraguay autorizados para ingesta automática
const DOMINIOS_OFICIALES_PERMITIDOS = [
  'bacn.gov.py',
  'csj.gov.py',
  'pj.gov.py',
  'gacetaoficial.gov.py',
  'mtess.gov.py',
  'dnit.gov.py',
  'dncp.gov.py',
  'contraloria.gov.py',
  'mic.gov.py',
  'mre.gov.py',
  'mspbs.gov.py',
  'mec.gov.py',
  'policianacional.gov.py',
  'mopc.gov.py',
];

/**
 * Verifica si una URL pertenece a un dominio gubernamental oficial paraguayo
 */
function esUrlInstitucionalValida(urlStr) {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase();

    // Debe terminar en .gov.py
    if (hostname.endsWith('.gov.py')) {
      return true;
    }

    return DOMINIOS_OFICIALES_PERMITIDOS.some(
      (dom) => hostname === dom || hostname.endsWith('.' + dom)
    );
  } catch (e) {
    return false;
  }
}

/**
 * Extrae texto relevante y limpio de un HTML institucional usando Cheerio
 */
function extraerTextoLimpio(html, url) {
  const $ = cheerio.load(html);

  // Eliminar elementos no textuales y de navegación
  $(
    'script, style, noscript, nav, header, footer, iframe, .menu, .navbar, .sidebar, .ad, .publicidad, #cookies, .cookie-banner'
  ).remove();

  // Buscar título representativo
  let titulo =
    $('meta[property="og:title"]').attr('content') ||
    $('h1').first().text().trim() ||
    $('title').text().trim() ||
    'Documento Institucional Oficial';

  titulo = titulo.replace(/\s+/g, ' ').slice(0, 150);

  // Intentar localizar el contenedor de contenido principal
  let contenido = '';
  const selectoresPrincipales = [
    'article',
    '.content',
    '#content',
    '.documento',
    '#documento',
    '.texto-norma',
    '.entry-content',
    'main',
    '.main',
    'body',
  ];

  for (const sel of selectoresPrincipales) {
    const el = $(sel);
    if (el.length > 0) {
      const txt = el.text().trim();
      if (txt.length > 200) {
        contenido = txt;
        break;
      }
    }
  }

  if (!contenido) {
    contenido = $('body').text().trim();
  }

  // Normalizar saltos de línea y espacios
  contenido = contenido
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n\n');

  return { titulo, contenido };
}

/**
 * Ejecuta búsqueda web con restricción site:gov.py
 */
async function buscarEnlacesOficiales(termino) {
  // Limpiar caracteres especiales e interrogativos comunes para optimizar la búsqueda
  const terminoLimpio = String(termino || '')
    .replace(/[¿?¡!"']/g, '')
    .replace(/\b(?:que es|que son|cuales son|cual es|definicion de|como funciona|donde se regula|que regula)\b/gi, '')
    .trim();

  const query = `site:gov.py ${terminoLimpio}`;
  const urlsEncontradas = [];

  // 1. Consulta prioritaria al motor DuckDuckGo HTML con filtro .gov.py
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 7000,
    });

    const $ = cheerio.load(response.data);
    $('.result__url, .result__snippet, .result__title a').each((_, el) => {
      let href = $(el).attr('href');
      if (href) {
        if (href.includes('uddg=')) {
          const match = href.match(/uddg=([^&]+)/);
          if (match) href = decodeURIComponent(match[1]);
        }
        if (esUrlInstitucionalValida(href)) {
          urlsEncontradas.push(href);
        }
      }
    });
  } catch (err) {
    console.warn('[InstitutionalFallback] Búsqueda gov.py externa no disponible:', err.message);
  }

  // 2. Si no hubo resultados con site:gov.py, buscar fuentes oficiales/jurídicas paraguayas más amplias
  if (!urlsEncontradas.length) {
    try {
      const fallbackQuery = `Paraguay ${terminoLimpio} ley decreto resolucion`;
      const searchUrl2 = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(fallbackQuery)}`;
      const response2 = await axios.get(searchUrl2, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 7000,
      });

      const $2 = cheerio.load(response2.data);
      $2('.result__url, .result__snippet, .result__title a').each((_, el) => {
        let href = $2(el).attr('href');
        if (href) {
          if (href.includes('uddg=')) {
            const match = href.match(/uddg=([^&]+)/);
            if (match) href = decodeURIComponent(match[1]);
          }
          if (esUrlInstitucionalValida(href)) {
            urlsEncontradas.push(href);
          }
        }
      });
    } catch (err2) {
      console.warn('[InstitutionalFallback] Búsqueda secundaria externa falló:', err2.message);
    }
  }

  return [...new Set(urlsEncontradas)].slice(0, 3);
}

/**
 * Ejecuta el Fallback Web Institucional si el RAG local no tiene respuestas
 */
async function ejecutarFallbackInstitucional(consulta) {
  if (!consulta || typeof consulta !== 'string' || consulta.trim().length < 4) {
    return { encontrado: false, razon: 'Consulta demasiado corta' };
  }

  console.log(`[InstitutionalFallback] Ejecutando búsqueda oficial .gov.py para: "${consulta}"`);
  const enlaces = await buscarEnlacesOficiales(consulta);

  if (!enlaces.length) {
    return { encontrado: false, razon: 'No se encontraron portales oficiales .gov.py con la norma' };
  }

  for (const url of enlaces) {
    try {
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'SysJuridicoBot/2.0 (+https://sysjuridico.com.py)',
          Accept: 'text/html,application/xhtml+xml',
        },
        timeout: 9000,
      });

      if (res.status === 200 && typeof res.data === 'string') {
        const { titulo, contenido } = extraerTextoLimpio(res.data, url);

        if (contenido.length >= 250) {
          // Determinar tipo y fuero según texto y URL
          let tipo = 'LEY';
          if (/acordada/i.test(titulo) || /acordada/i.test(url)) tipo = 'ACORDADA';
          else if (/decreto/i.test(titulo) || /decreto/i.test(url)) tipo = 'RESOLUCION';
          else if (/resoluci[oó]n/i.test(titulo) || /resoluci[oó]n/i.test(url)) tipo = 'RESOLUCION';
          else if (/c[oó]digo/i.test(titulo)) tipo = 'CODIGO';
          else if (/tratado|convenio/i.test(titulo)) tipo = 'TRATADO INTERNACIONAL';

          let fuero = 'CIVIL Y COMERCIAL';
          if (/laboral|trabajo|empleo/i.test(titulo) || /mtess/i.test(url)) fuero = 'LABORAL';
          else if (/penal|crimen|delito/i.test(titulo)) fuero = 'PENAL';
          else if (/tributari|impuesto|dnit/i.test(titulo)) fuero = 'CONTENCIOSO ADMINISTRATIVO';
          else if (/niñez|adolescencia/i.test(titulo)) fuero = 'NIÑEZ Y ADOLESCENCIA';
          else if (/constitucional|garant/i.test(titulo)) fuero = 'SALA CONSTITUCIONAL';

          const host = new URL(url).hostname;
          const fuenteOficial = `Portal Oficial ${host}`;

          // Guardar documento auto-aprendido
          const guardado = guardarDocumento({
            titulo: `[OFICIAL] ${titulo}`,
            tipo,
            fuero,
            fuente: fuenteOficial,
            url_fuente: url,
            vigencia: 'Vigente',
            contenido,
            origen: 'WEB_INSTITUCIONAL_AUTO',
            estado_revision: 'PENDIENTE_REVISION',
          });

          return {
            encontrado: true,
            titulo: guardado.titulo,
            url_fuente: url,
            fuente: fuenteOficial,
            fragmento: contenido.slice(0, 1800),
            relPath: guardado.relPath,
            tipo,
            fuero,
          };
        }
      }
    } catch (fetchErr) {
      console.warn(`[InstitutionalFallback] Error descargando ${url}:`, fetchErr.message);
    }
  }

  return { encontrado: false, razon: 'No se pudo extraer contenido sustantivo de las fuentes encontradas' };
}

module.exports = {
  DOMINIOS_OFICIALES_PERMITIDOS,
  esUrlInstitucionalValida,
  ejecutarFallbackInstitucional,
};
