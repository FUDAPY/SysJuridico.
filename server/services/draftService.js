const Cliente = require('../models/Cliente');
const Expediente = require('../models/Expediente');
const { generarRespuestaIA } = require('./aiProviderService');

const PLANTILLAS = {
  contrato: 'Redacta un contrato de prestación de servicios jurídicos',
  escrito_judicial: 'Redacta un escrito judicial formal (presentación ante el juzgado)',
  oficio: 'Redacta un oficio formal dirigido a una institución',
};

/**
 * Redacta borradores legales (contratos, escritos judiciales, oficios) usando los datos
 * reales del cliente y del expediente como contexto para la IA.
 */
async function redactarBorrador({ tipoDocumento, clienteId, expedienteId, instrucciones }) {
  const base = PLANTILLAS[tipoDocumento] || 'Redacta un documento legal';

  const [cliente, expediente] = await Promise.all([
    clienteId ? Cliente.findById(clienteId) : null,
    expedienteId ? Expediente.findById(expedienteId).populate('cliente abogadoAsignado') : null,
  ]);

  const datosContexto = [
    cliente && `Cliente: ${cliente.nombreCompleto}, C.I. ${cliente.cedula}, domicilio: ${cliente.direccion || 'N/D'}, teléfono: ${cliente.telefono}`,
    expediente && `Expediente: "${expediente.caratula}", fuero: ${expediente.fuero || 'N/D'}, juzgado: ${expediente.juzgado || 'N/D'}, abogado: ${expediente.abogadoAsignado?.nombre || 'N/D'}`,
    instrucciones && `Instrucciones adicionales: ${instrucciones}`,
  ]
    .filter(Boolean)
    .join('\n');

  const prompt = `${base} en Paraguay, en formato profesional y con lenguaje jurídico apropiado.\n\nDatos disponibles:\n${datosContexto}`;

  const borrador = await generarRespuestaIA({ prompt, contexto: '' });

  return {
    borrador:
      borrador ||
      `No hay un proveedor de IA generativa configurado (LEXPY_AI_PROVIDER). A continuación el detalle recopilado para redactar manualmente:\n\n${prompt}`,
    tipoDocumento,
  };
}

module.exports = { redactarBorrador };
