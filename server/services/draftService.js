const Cliente = require('../models/Cliente');
const Expediente = require('../models/Expediente');
const { generarRespuestaIA } = require('./aiProviderService');

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
async function redactarBorrador({ tipoDocumento, clienteId, expedienteId, instrucciones }) {
  const base = PLANTILLAS[tipoDocumento] || `Redacta un documento jurídico formal de tipo "${tipoDocumento}"`;

  const [cliente, expediente] = await Promise.all([
    clienteId ? Cliente.findById(clienteId) : null,
    expedienteId ? Expediente.findById(expedienteId).populate('cliente abogadoAsignado') : null,
  ]);

  const datosContexto = [
    cliente && `CLIENTE: ${cliente.nombreCompleto}, Documento/CI: ${cliente.cedula || 'N/D'}, RUC: ${cliente.ruc || 'N/D'}, Domicilio: ${cliente.direccion || 'N/D'}, Teléfono: ${cliente.telefono || 'N/D'}`,
    expediente && `EXPEDIENTE: "${expediente.caratula}", Fuero: ${expediente.fuero || 'Civil y Comercial'}, Juzgado/Secretaría: ${expediente.juzgado || 'N/D'}, Abogado Patrocinante/Procurador: ${expediente.abogadoAsignado?.nombre || 'N/D'}`,
    instrucciones && `INSTRUCCIONES Y HECHOS ESPECÍFICOS DEL CASO: ${instrucciones}`,
  ]
    .filter(Boolean)
    .join('\n');

  const system =
    'Eres un redactor jurídico senior experto en legislación y práctica procesal de la República del Paraguay. ' +
    'Redacta escritos judiciales, demandas, contratos y dictámenes con formato formal, elegante, preciso y profesional. ' +
    'Usa encabezados judiciales clásicos de Paraguay (OBJETO: ..., SEÑOR JUEZ:, HECHOS, DERECHO, PETITORIO) cuando corresponda. ' +
    'Mantén el lenguaje técnico adecuado y las fórmulas procesales vigentes.';

  const prompt = `${base}.\n\nContexto e información disponible para el documento:\n${datosContexto}\n\nPor favor genera el texto completo del documento listo para revisión y presentación, en formato Markdown limpio.`;

  const borrador = await generarRespuestaIA({ prompt, contexto: '', system });

  return {
    borrador:
      borrador ||
      `No se pudo generar con IA. Detalle recopilado para redacción manual:\n\n${prompt}`,
    tipoDocumento,
  };
}

module.exports = { redactarBorrador };
