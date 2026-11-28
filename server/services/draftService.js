const Cliente = require('../models/Cliente');
const Expediente = require('../models/Expediente');
const { generarRespuestaIA } = require('./aiProviderService');
const { obtenerEstiloForense } = require('./otelaxWisdomService');

const PLANTILLAS = {
  contrato: 'Redacta un contrato de prestación de servicios profesionales jurídicos según las normas del Código Civil Paraguayo',
  demanda: 'Redacta un escrito judicial formal de DEMANDA conforme a los requisitos del Código Procesal Civil Paraguayo (Objeto, Hechos, Derecho, Medidas Cautelares si aplican, Petitorio)',
  contestacion: 'Redacta un escrito judicial formal de CONTESTACIÓN DE DEMANDA (Negativa general y particular de hechos, Excepciones, Fundamentos jurídicos, Petitorio)',
  telegrama_laboral: 'Redacta un telegrama colacionado laboral formal según la Ley 213/93 del Código del Trabajo Paraguayo',
  intimacion: 'Redacta una notificación / intimación formal extrajudicial previa con plazo perentorio de cumplimiento',
  oficio: 'Redacta un oficio judicial formal dirigido a una institución pública, bancaria o privada solicitando informes',
  escrito_judicial: 'Redacta un escrito judicial formal de trámite procesal ante el juzgado interviniente (Manifiesta, Urge pronto despacho, Adjunta constancia)',
};

/**
 * Redacta borradores legales profesionales (contratos, demandas, contestaciones, telegramas, oficios)
 * usando datos reales del cliente, expediente y contexto de la legislación paraguaya con DeepSeek.
 */
async function redactarBorrador({ tipoDocumento, clienteId, expedienteId, instrucciones, textoExistente, accion, usuarioId }) {
  const esMejora =
    accion === 'mejorar' ||
    accion === 'mejorar_todo' ||
    accion === 'pulir' ||
    accion === 'polir' ||
    accion === 'corregir' ||
    Boolean(textoExistente) ||
    /mejora|mejorar|pulir|polir|corregir/i.test(instrucciones || '');

  const base = PLANTILLAS[tipoDocumento] || `Redacta un documento jurídico formal de tipo "${tipoDocumento}"`;

  const [cliente, expediente] = await Promise.all([
    clienteId ? Cliente.findById(clienteId) : null,
    expedienteId && expedienteId !== 'sin_vincular' ? Expediente.findById(expedienteId).populate('cliente abogadoAsignado') : null,
  ]);

  const datosContexto = [
    cliente && `CLIENTE: ${cliente.nombreCompleto}, Documento/CI: ${cliente.cedula || 'N/D'}, RUC: ${cliente.ruc || 'N/D'}, Domicilio: ${cliente.direccion || 'N/D'}, Teléfono: ${cliente.telefono || 'N/D'}`,
    expediente && `EXPEDIENTE: "${expediente.caratula}", Fuero: ${expediente.fuero || 'Civil y Comercial'}, Juzgado/Secretaría: ${expediente.juzgado || 'N/D'}, Abogado Patrocinante/Procurador: ${expediente.abogadoAsignado?.nombre || 'N/D'}`,
    instrucciones && !esMejora && `INSTRUCCIONES Y HECHOS ESPECÍFICOS DEL CASO: ${instrucciones}`,
  ]
    .filter(Boolean)
    .join('\n');

  const { buildTechapyraPrompt } = require('../config/techapyraSystemPrompt');
  const estiloForense = typeof obtenerEstiloForense === 'function' ? obtenerEstiloForense() : '';
  const system = buildTechapyraPrompt({
    modo: 'MODO_EDITOR',
    estiloForense,
    contextoExpedientes: datosContexto,
  });

  let prompt = '';
  if (esMejora) {
    const textoBase = textoExistente || instrucciones;
    prompt = `Mejora la redacción jurídica, ortografía, cohesión y técnica procesal paraguaya del escrito entregado. Respeta íntegros los nombres, cédulas, RUC, números de expediente, juzgado y hechos reales del texto. Devuelve ÚNICAMENTE el escrito mejorado listo para usar, sin repetir la instrucción del usuario ni agregar plantillas genéricas.

Escrito original entregado:
"""
${textoBase}
"""${instrucciones && textoExistente ? `\n\nInstrucciones específicas adicionales: ${instrucciones}` : ''}${datosContexto ? `\n\nContexto procesal verificado:\n${datosContexto}` : ''}`;
  } else {
    prompt = `${base}.\n\nContexto e información disponible para el documento:\n${datosContexto}\n\nInstrucciones: ${instrucciones || 'Redacta conforme a derecho.'}\n\nPor favor genera el texto completo del documento listo para revisión y presentación, en formato Markdown o texto limpio sin preámbulos ni saludos.`;
  }

  const borrador = await generarRespuestaIA({ prompt, contexto: '', system, usuarioId });

  if (!borrador || !borrador.trim()) {
    throw new Error('El motor de IA no pudo generar la redacción solicitada.');
  }

  return {
    ok: true,
    borrador: borrador.trim(),
    tipoDocumento,
  };
}

module.exports = { redactarBorrador };
