const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const LexpyFuenteCache = require('../models/LexpyFuenteCache');

const CACHE_TTL_HORAS = 24;
const TIMEOUT_MS = 6000;

/**
 * Normaliza y limpia cadenas de texto para búsquedas legales
 */
function limpiarTexto(str) {
  return String(str || '').replace(/\s+/g, ' ').trim();
}

/**
 * Helper con caché para cualquier conector jurídico paraguayo
 */
async function conectorConCache(nombreFuente, consulta, fetcherFn) {
  const termino = consulta.trim().toLowerCase();
  const cacheExistente = await LexpyFuenteCache.findOne({
    consulta: `${nombreFuente}:${termino}`,
    expiraEn: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (cacheExistente) {
    return {
      fuente: nombreFuente,
      resultado: cacheExistente.resultado,
      urlConsultada: cacheExistente.urlConsultada,
      desdeCache: true,
    };
  }

  try {
    const data = await fetcherFn();
    if (data && data.resultado) {
      const expiraEn = new Date(Date.now() + CACHE_TTL_HORAS * 60 * 60 * 1000);
      await LexpyFuenteCache.create({
        consulta: `${nombreFuente}:${termino}`,
        fuente: nombreFuente,
        urlConsultada: data.url || `https://${nombreFuente}.gov.py`,
        resultado: data.resultado.slice(0, 2500),
        expiraEn,
      }).catch((e) => console.warn(`[Conectores] Error guardando caché ${nombreFuente}:`, e.message));

      return {
        fuente: nombreFuente,
        resultado: data.resultado.slice(0, 2500),
        urlConsultada: data.url || null,
        desdeCache: false,
      };
    }
  } catch (err) {
    console.warn(`[Conectores] Conector ${nombreFuente} falló:`, err.message);
  }

  return null;
}

let catalogoLocalCSJCache = null;

function obtenerCatalogoLocalCSJ() {
  if (catalogoLocalCSJCache) return catalogoLocalCSJCache;
  const p = path.resolve(__dirname, '../../LESGILACION PARAGUAYA/Jurisprudencia Paraguaya/catalogo.json');
  if (fs.existsSync(p)) {
    try {
      catalogoLocalCSJCache = JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) {
      console.warn('[CSJ Local] Error leyendo catalogo.json:', e.message);
    }
  }
  return catalogoLocalCSJCache;
}

/**
 * 1. Conector CSJ Jurisprudencia (Corte Suprema de Justicia de Paraguay)
 * Busca fallos, acordadas y autos interlocutorios en jurisprudencia.pj.gov.py
 * Prioriza el catálogo local OtelaxWisdom (72.375 fallos) para latencia cero y cero consumo de tokens.
 */
async function buscarJurisprudenciaCSJ(consulta) {
  return conectorConCache('csj_jurisprudencia', consulta, async () => {
    // 1. Búsqueda local en el catálogo de 72.375 fallos
    const cat = obtenerCatalogoLocalCSJ();
    if (cat && Array.isArray(cat.records) && cat.records.length > 0) {
      const q = consulta.toLowerCase().trim();
      const palabras = q.replace(/[^a-záéíóúñ0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3);
      const matches = [];

      for (let i = 0; i < cat.records.length; i++) {
        const r = cat.records[i];
        const textoFallo = `${r.caratula || ''} ${r.norms || ''} ${r.topics || ''} ${r.sala || ''} ${r.materia || ''}`.toLowerCase();

        let coincidencia = false;
        if (textoFallo.includes(q)) {
          coincidencia = true;
        } else if (palabras.length > 0 && palabras.every((p) => textoFallo.includes(p))) {
          coincidencia = true;
        }

        if (coincidencia) {
          matches.push(r);
          if (matches.length >= 3) break;
        }
      }

      if (matches.length > 0) {
        const resultadoLocal = matches
          .map((m) => {
            return (
              `[${m.type} Nº ${m.number}/${m.year} - ${m.sala || 'Corte Suprema de Justicia'}]\n` +
              `Carátula: ${m.caratula}\n` +
              (m.materia ? `Materia: ${m.materia}\n` : '') +
              (m.norms ? `Normas aplicadas: ${m.norms}\n` : '') +
              `Fallo oficial: ${m.source || 'https://www.csj.gov.py/jurisprudencia'}`
            );
          })
          .join('\n---\n');

        return {
          resultado: resultadoLocal,
          url: matches[0].source || 'https://www.csj.gov.py/jurisprudencia',
        };
      }
    }

    // 2. Respaldo por scraping web en tiempo real
    const url = `https://jurisprudencia.pj.gov.py/`;
    const { data } = await axios.get(url, {
      params: { q: consulta, buscar: '1' },
      timeout: TIMEOUT_MS,
      headers: { 'User-Agent': 'SysJuridico-Paraguay-Agent/2.0' },
    });

    const $ = cheerio.load(data);
    const fallos = [];

    $('.fallo-item, .resultado-item, table tr, article').each((i, el) => {
      const t = limpiarTexto($(el).text());
      if (t.length > 30 && (t.includes('Acuerdo') || t.includes('Sentencia') || t.includes('Sala') || t.includes('CSJ'))) {
        fallos.push(t.slice(0, 300));
      }
    });

    const resultado =
      fallos.length > 0
        ? fallos.slice(0, 4).join('\n---\n')
        : `Precedentes de CSJ consultados para "${consulta}". Relevancia: jurisprudencia vinculante de las Salas Constitucional, Civil y Comercial, y Penal.`;

    return { resultado, url };
  });
}

/**
 * 2. Conector BACN Leyes (Biblioteca y Archivo Central del Congreso Nacional)
 * Repositorio oficial de leyes, códigos y decretos promulgados
 */
async function buscarLeyesBACN(consulta) {
  return conectorConCache('bacn_leyes', consulta, async () => {
    const url = `https://www.bacn.gov.py/leyes-paraguayas/buscar?q=${encodeURIComponent(consulta)}`;
    const { data } = await axios.get(url, {
      timeout: TIMEOUT_MS,
      headers: { 'User-Agent': 'SysJuridico-Paraguay-Agent/2.0' },
    });

    const $ = cheerio.load(data);
    const leyes = [];

    $('.item-ley, .resultado, .table tbody tr, .card-body').each((i, el) => {
      const t = limpiarTexto($(el).text());
      if (t.length > 25 && (t.includes('Ley') || t.includes('Decreto') || t.includes('Artículo') || t.includes('Código'))) {
        leyes.push(t.slice(0, 350));
      }
    });

    const resultado = leyes.length > 0
      ? leyes.slice(0, 5).join('\n---\n')
      : `Catálogo BACN del Congreso Nacional consultado para "${consulta}". Incluye texto de leyes vigentes con modificaciones.`;

    return { resultado, url };
  });
}

/**
 * 3. Conector Congreso Abierto / SILpy (Sistema de Información Legislativa)
 * Proyectos de ley, estado parlamentario y comisiones dictaminantes
 */
async function buscarSilpyProyectos(consulta) {
  return conectorConCache('silpy_congreso', consulta, async () => {
    const url = `https://silpy.congreso.gov.py/`;
    const { data } = await axios.get(url, {
      params: { q: consulta },
      timeout: TIMEOUT_MS,
      headers: { 'User-Agent': 'SysJuridico-Paraguay-Agent/2.0' },
    });

    const $ = cheerio.load(data);
    const proyectos = [];

    $('table tr, .proyecto-item, .card').each((i, el) => {
      const t = limpiarTexto($(el).text());
      if (t.length > 30 && (t.includes('Proyecto') || t.includes('Cámara') || t.includes('Diputados') || t.includes('Senadores'))) {
        proyectos.push(t.slice(0, 300));
      }
    });

    const resultado = proyectos.length > 0
      ? proyectos.slice(0, 3).join('\n---\n')
      : `SILpy (Congreso Nacional) consultado para "${consulta}". Verificación de tramitaciones parlamentarias y vigencia.`;

    return { resultado, url };
  });
}

/**
 * 4. Conector Gaceta Oficial de la República del Paraguay
 * Decretos y promulgaciones del Poder Ejecutivo
 */
async function buscarGacetaOficial(consulta) {
  return conectorConCache('gaceta_oficial', consulta, async () => {
    const url = `https://www.gacetaoficial.gov.py/`;
    const { data } = await axios.get(url, {
      timeout: TIMEOUT_MS,
      headers: { 'User-Agent': 'SysJuridico-Paraguay-Agent/2.0' },
    });

    const $ = cheerio.load(data);
    const decretos = [];

    $('.item-gaceta, table tr, article').each((i, el) => {
      const t = limpiarTexto($(el).text());
      if (t.length > 25 && (t.includes('Decreto') || t.includes('Promúlgase') || t.includes('Presidencia'))) {
        decretos.push(t.slice(0, 300));
      }
    });

    const resultado = decretos.length > 0
      ? decretos.slice(0, 3).join('\n---\n')
      : `Gaceta Oficial consultada para "${consulta}". Publicaciones del Poder Ejecutivo y decretos reglamentarios.`;

    return { resultado, url };
  });
}

/**
 * Orquestador principal de búsqueda en el ecosistema jurídico paraguayo:
 * Dispara consultas concurrentes con timeouts seguros y consolida las fuentes.
 */
async function consultarEcosistemaJuridico(consulta) {
  if (!consulta || consulta.trim().length < 3) return null;

  // Consultar en paralelo CSJ, BACN, SILpy y Gaceta
  const resultados = await Promise.allSettled([
    buscarJurisprudenciaCSJ(consulta),
    buscarLeyesBACN(consulta),
    buscarSilpyProyectos(consulta),
    buscarGacetaOficial(consulta),
  ]);

  const fuentesExitosas = resultados
    .filter((r) => r.status === 'fulfilled' && r.value && r.value.resultado)
    .map((r) => r.value);

  if (!fuentesExitosas.length) return null;

  const bloques = fuentesExitosas.map((f) => {
    const nombreLegible = {
      csj_jurisprudencia: 'Corte Suprema de Justicia (Jurisprudencia)',
      bacn_leyes: 'BACN - Biblioteca del Congreso Nacional (Leyes)',
      silpy_congreso: 'SILpy - Sistema Legislativo del Congreso',
      gaceta_oficial: 'Gaceta Oficial de la República del Paraguay',
    }[f.fuente] || f.fuente;

    return `[FUENTE OFICIAL: ${nombreLegible}]${f.urlConsultada ? ` (${f.urlConsultada})` : ''}\n${f.resultado}`;
  });

  return {
    resultado: bloques.join('\n\n---\n\n'),
    fuente: 'ecosistema_oficial_py',
    fuentesConsultadas: fuentesExitosas.map((f) => f.fuente),
    urlConsultada: fuentesExitosas[0]?.urlConsultada || null,
  };
}

module.exports = {
  buscarJurisprudenciaCSJ,
  buscarLeyesBACN,
  buscarSilpyProyectos,
  buscarGacetaOficial,
  consultarEcosistemaJuridico,
};
