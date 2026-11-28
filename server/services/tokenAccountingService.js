const ConsumoGlobalIA = require('../models/ConsumoGlobalIA');
const Usuario = require('../models/Usuario');

function obtenerPeriodoActual() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

function formatoTokens(numero) {
  const n = Number(numero) || 0;
  if (n >= 1000000000) return (n / 1000000000).toFixed(2) + 'B';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return String(n);
}

/**
 * Obtiene o crea el registro del techo global mensual de tokens.
 */
async function obtenerRegistroGlobal(periodo = obtenerPeriodoActual()) {
  let global = await ConsumoGlobalIA.findOne({ periodo });
  if (!global) {
    const envVal = Number(process.env.GLOBAL_MONTHLY_TOKEN_LIMIT);
    const limite = Number.isFinite(envVal) && envVal > 0 ? envVal : 9500000000;
    try {
      global = await ConsumoGlobalIA.create({
        periodo,
        tokensUsadosGlobal: 0,
        limiteGlobalTokens: limite,
        totalPeticiones: 0,
        peticionesDesdeCache: 0,
      });
    } catch (err) {
      global = await ConsumoGlobalIA.findOne({ periodo });
    }
  }
  return global;
}

/**
 * Verifica disponibilidad con doble barrera (Global < 10B y Cuota Individual del Abogado)
 */
async function verificarDisponibilidadTokens({ usuarioId, rol, tokensEstimados = 1000 }) {
  const periodo = obtenerPeriodoActual();
  const global = await obtenerRegistroGlobal(periodo);

  const porcentajeGlobal = (global.tokensUsadosGlobal / Math.max(global.limiteGlobalTokens, 1)) * 100;

  // 1. Techo Global: Al 98% bloquea todo salvo administradores
  if (porcentajeGlobal >= 98 && rol !== 'admin') {
    return {
      permitido: false,
      codigo: 'TECHO_GLOBAL_ALCANZADO',
      status: 429,
      mensaje: `Se ha alcanzado el 98% del techo mensual global de FreeLLMAPI (${formatoTokens(global.tokensUsadosGlobal)} / ${formatoTokens(global.limiteGlobalTokens)} tokens). Las llamadas están temporalmente pausadas para proteger el cupo del estudio.`,
      porcentajeGlobal,
    };
  }

  // 2. Cuota Individual del Abogado
  let cuotaUsuario = null;
  if (usuarioId) {
    const usuario = await Usuario.findById(usuarioId);
    if (usuario) {
      if (!usuario.cuotaUso) {
        usuario.cuotaUso = {
          limiteTokensMensual: 500000000,
          tokensUsadosMes: 0,
          limiteArchivosMensual: 100,
          archivosUsadosMes: 0,
          periodoActual: periodo,
        };
      } else if (usuario.cuotaUso.periodoActual !== periodo) {
        // Reinicio automático de nuevo mes
        usuario.cuotaUso.tokensUsadosMes = 0;
        usuario.cuotaUso.archivosUsadosMes = 0;
        usuario.cuotaUso.periodoActual = periodo;
        await usuario.save();
      }

      cuotaUsuario = usuario.cuotaUso;

      // Si no es admin y tiene límite configurado (> 0)
      if (rol !== 'admin' && cuotaUsuario.limiteTokensMensual > 0) {
        if (cuotaUsuario.tokensUsadosMes + tokensEstimados > cuotaUsuario.limiteTokensMensual) {
          return {
            permitido: false,
            codigo: 'CUOTA_INDIVIDUAL_EXCEDIDA',
            status: 429,
            mensaje: `Has alcanzado tu cuota mensual de tokens asignada (${formatoTokens(cuotaUsuario.tokensUsadosMes)} / ${formatoTokens(cuotaUsuario.limiteTokensMensual)}). Contacta al administrador para ampliar tu cupo.`,
            porcentajeIndividual: (cuotaUsuario.tokensUsadosMes / cuotaUsuario.limiteTokensMensual) * 100,
          };
        }
      }
    }
  }

  return {
    permitido: true,
    porcentajeGlobal,
    cuotaUsuario,
  };
}

/**
 * Contabiliza el consumo real de tokens (Prompt + Completion).
 */
async function registrarConsumoTokens({
  usuarioId,
  promptTokens = 0,
  completionTokens = 0,
  totalTokens = 0,
  textoPrompt = '',
  textoRespuesta = '',
  desdeCache = false,
}) {
  const periodo = obtenerPeriodoActual();

  if (desdeCache) {
    await ConsumoGlobalIA.updateOne(
      { periodo },
      {
        $inc: {
          totalPeticiones: 1,
          peticionesDesdeCache: 1,
        },
        $set: { ultimaActualizacion: new Date() },
      },
      { upsert: true }
    );
    return { tokensRegistrados: 0, desdeCache: true };
  }

  // Si el proveedor no devuelve usage, estimación segura: Math.ceil(caracteres / 4)
  let tokens = Number(totalTokens);
  if (!tokens || tokens <= 0) {
    tokens = Number(promptTokens) + Number(completionTokens);
  }
  if (!tokens || tokens <= 0) {
    const totalCaracteres = String(textoPrompt || '').length + String(textoRespuesta || '').length;
    tokens = Math.max(1, Math.ceil(totalCaracteres / 4));
  }

  // 1. Incrementar Techo Global
  const global = await ConsumoGlobalIA.findOneAndUpdate(
    { periodo },
    {
      $inc: {
        tokensUsadosGlobal: tokens,
        totalPeticiones: 1,
      },
      $set: { ultimaActualizacion: new Date() },
    },
    { upsert: true, new: true }
  );

  // 2. Incrementar Cuota Individual
  if (usuarioId) {
    await Usuario.updateOne(
      { _id: usuarioId },
      {
        $inc: { 'cuotaUso.tokensUsadosMes': tokens },
        $set: { 'cuotaUso.periodoActual': periodo },
      }
    );
  }

  return {
    tokensRegistrados: tokens,
    tokensUsadosGlobal: global.tokensUsadosGlobal,
    limiteGlobalTokens: global.limiteGlobalTokens,
    porcentajeGlobal: (global.tokensUsadosGlobal / Math.max(global.limiteGlobalTokens, 1)) * 100,
  };
}

/**
 * Registra subida o procesamiento de un archivo en la cuota del usuario
 */
async function registrarConsumoArchivo(usuarioId) {
  if (!usuarioId) return;
  const periodo = obtenerPeriodoActual();
  await Usuario.updateOne(
    { _id: usuarioId },
    {
      $inc: { 'cuotaUso.archivosUsadosMes': 1 },
      $set: { 'cuotaUso.periodoActual': periodo },
    }
  );
}

/**
 * Obtiene el estado actual de tokens para el usuario y global
 */
async function obtenerEstadoConsumo({ usuarioId, rol }) {
  const periodo = obtenerPeriodoActual();
  const global = await obtenerRegistroGlobal(periodo);

  const porcentajeGlobal = (global.tokensUsadosGlobal / Math.max(global.limiteGlobalTokens, 1)) * 100;

  let usuarioInfo = null;
  if (usuarioId) {
    const user = await Usuario.findById(usuarioId).select('nombre email rol cuotaUso').lean();
    if (user) {
      const cuota = user.cuotaUso || {
        limiteTokensMensual: 500000000,
        tokensUsadosMes: 0,
        limiteArchivosMensual: 100,
        archivosUsadosMes: 0,
        periodoActual: periodo,
      };

      const porcentajeIndividual = cuota.limiteTokensMensual > 0
        ? (cuota.tokensUsadosMes / cuota.limiteTokensMensual) * 100
        : 0;

      usuarioInfo = {
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        limiteTokensMensual: cuota.limiteTokensMensual,
        tokensUsadosMes: cuota.tokensUsadosMes,
        porcentajeIndividual: Math.min(100, Math.round(porcentajeIndividual * 10) / 10),
        tokensRestantes: cuota.limiteTokensMensual > 0
          ? Math.max(0, cuota.limiteTokensMensual - cuota.tokensUsadosMes)
          : null,
        limiteArchivosMensual: cuota.limiteArchivosMensual || 100,
        archivosUsadosMes: cuota.archivosUsadosMes || 0,
        formato: {
          usados: formatoTokens(cuota.tokensUsadosMes),
          limite: cuota.limiteTokensMensual > 0 ? formatoTokens(cuota.limiteTokensMensual) : 'Ilimitado',
        },
      };
    }
  }

  return {
    periodo,
    global: {
      tokensUsadosGlobal: global.tokensUsadosGlobal,
      limiteGlobalTokens: global.limiteGlobalTokens,
      porcentajeGlobal: Math.min(100, Math.round(porcentajeGlobal * 10) / 10),
      alerta80: porcentajeGlobal >= 80,
      alerta98: porcentajeGlobal >= 98,
      totalPeticiones: global.totalPeticiones || 0,
      peticionesDesdeCache: global.peticionesDesdeCache || 0,
      formato: {
        usados: formatoTokens(global.tokensUsadosGlobal),
        limite: formatoTokens(global.limiteGlobalTokens),
      },
    },
    usuario: usuarioInfo,
  };
}

/**
 * Modifica la cuota mensual de un abogado (exclusivo para administradores).
 * Valida estrictamente que el nuevo límite sea menor al techo global.
 */
async function actualizarCuotaAbogado({ adminRol, abogadoId, nuevoLimiteTokens, nuevoLimiteArchivos }) {
  if (adminRol !== 'admin') {
    throw new Error('Solo los administradores pueden modificar los límites de cuota.');
  }

  const periodo = obtenerPeriodoActual();
  const global = await obtenerRegistroGlobal(periodo);

  const limiteTokensNum = Number(nuevoLimiteTokens);
  if (Number.isFinite(limiteTokensNum) && limiteTokensNum >= global.limiteGlobalTokens) {
    throw new Error(
      `El límite individual (${formatoTokens(limiteTokensNum)}) no puede ser igual o mayor al techo global del sistema (${formatoTokens(global.limiteGlobalTokens)}).`
    );
  }

  const update = {};
  if (Number.isFinite(limiteTokensNum) && limiteTokensNum >= 0) {
    update['cuotaUso.limiteTokensMensual'] = limiteTokensNum;
  }
  const limiteArchNum = Number(nuevoLimiteArchivos);
  if (Number.isFinite(limiteArchNum) && limiteArchNum >= 0) {
    update['cuotaUso.limiteArchivosMensual'] = limiteArchNum;
  }

  const user = await Usuario.findByIdAndUpdate(abogadoId, { $set: update }, { new: true })
    .select('nombre email rol cuotaUso')
    .lean();

  return user;
}

/**
 * Genera el ranking de consumo mensual de abogados para el Dashboard Admin
 */
async function obtenerRankingConsumo(periodo = obtenerPeriodoActual()) {
  const usuarios = await Usuario.find({ activo: true })
    .select('nombre nombreCompleto email rol cuotaUso')
    .sort({ 'cuotaUso.tokensUsadosMes': -1 })
    .lean();

  return usuarios.map((u) => {
    const cuota = u.cuotaUso || {
      tokensUsadosMes: 0,
      limiteTokensMensual: 500000000,
      archivosUsadosMes: 0,
    };
    return {
      id: u._id,
      nombre: u.nombreCompleto || u.nombre,
      email: u.email,
      rol: u.rol,
      tokensUsadosMes: cuota.tokensUsadosMes || 0,
      limiteTokensMensual: cuota.limiteTokensMensual || 0,
      porcentaje: cuota.limiteTokensMensual > 0
        ? Math.min(100, Math.round(((cuota.tokensUsadosMes || 0) / cuota.limiteTokensMensual) * 100))
        : 0,
      archivosUsadosMes: cuota.archivosUsadosMes || 0,
      tokensUsadosFormato: formatoTokens(cuota.tokensUsadosMes || 0),
      limiteFormato: cuota.limiteTokensMensual > 0 ? formatoTokens(cuota.limiteTokensMensual) : 'Ilimitado',
    };
  });
}

module.exports = {
  obtenerPeriodoActual,
  formatoTokens,
  obtenerRegistroGlobal,
  verificarDisponibilidadTokens,
  registrarConsumoTokens,
  registrarConsumoArchivo,
  obtenerEstadoConsumo,
  actualizarCuotaAbogado,
  obtenerRankingConsumo,
};
