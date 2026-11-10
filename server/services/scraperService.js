const axios = require('axios');
const cheerio = require('cheerio');
const LexpyFuenteCache = require('../models/LexpyFuenteCache');
const { consultarEcosistemaJuridico } = require('./paraguayConnectorsService');

const CACHE_TTL_HORAS = 24;

/**
 * Consulta fuentes públicas oficiales paraguayas (CSJ, BACN, SILpy, Gaceta Oficial y BaseLegal)
 * como respaldo en tiempo real cuando la base de conocimiento local no tiene respuesta suficiente.
 * Cachea los resultados en MongoDB para alta velocidad y resiliencia.
 */
async function buscarEnFuentesExternas(consulta) {
  // 1. Probar primero el ecosistema oficial conectado (CSJ, BACN, SILpy, Gaceta)
  try {
    const ecoOficial = await consultarEcosistemaJuridico(consulta);
    if (ecoOficial && ecoOficial.resultado) {
      return ecoOficial;
    }
  } catch (err) {
    console.warn('[LexPY] Ecosistema oficial PY advertencia:', err.message);
  }

  // 2. Fallback a portales generales con caché
  const cacheExistente = await LexpyFuenteCache.findOne({
    consulta: consulta.trim().toLowerCase(),
    expiraEn: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (cacheExistente) {
    return {
      resultado: cacheExistente.resultado,
      fuente: cacheExistente.fuente,
      urlConsultada: cacheExistente.urlConsultada,
      desdeCache: true,
    };
  }

  const fuentes = [
    { nombre: 'csj', baseUrl: process.env.LEXPY_CSJ_URL || 'https://www.csj.gov.py' },
    { nombre: 'baselegal', baseUrl: process.env.LEXPY_BASELEGAL_URL || 'https://www.baselegal.com.py' },
  ];

  for (const fuente of fuentes) {
    try {
      const urlBusqueda = `${fuente.baseUrl}/buscar?q=${encodeURIComponent(consulta)}`;
      const { data } = await axios.get(urlBusqueda, { timeout: 6000 });
      const $ = cheerio.load(data);
      const textoResumen = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 1500);

      if (textoResumen) {
        const expiraEn = new Date(Date.now() + CACHE_TTL_HORAS * 60 * 60 * 1000);
        await LexpyFuenteCache.create({
          consulta: consulta.trim().toLowerCase(),
          fuente: fuente.nombre,
          urlConsultada: urlBusqueda,
          resultado: textoResumen,
          expiraEn,
        });

        return {
          resultado: textoResumen,
          fuente: fuente.nombre,
          urlConsultada: urlBusqueda,
          desdeCache: false,
        };
      }
    } catch (error) {
      console.warn(`[LexPY] Fallback externo (${fuente.nombre}) falló:`, error.message);
    }
  }

  return null;
}

module.exports = { buscarEnFuentesExternas };

