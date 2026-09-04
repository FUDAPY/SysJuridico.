const axios = require('axios');
const cheerio = require('cheerio');
const LexpyFuenteCache = require('../models/LexpyFuenteCache');

const CACHE_TTL_HORAS = 24;

/**
 * Consulta fuentes públicas externas (CSJ Paraguay / BaseLegal) como respaldo cuando
 * la base de conocimiento local no tiene respuesta suficiente. Cachea el resultado en Mongo.
 */
async function buscarEnFuentesExternas(consulta) {
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
      const { data } = await axios.get(urlBusqueda, { timeout: 8000 });
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
