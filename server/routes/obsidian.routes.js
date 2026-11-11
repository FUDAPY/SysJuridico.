const express = require('express');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { procesarConsultaLexPY } = require('../services/lexpyService');
const { destilarYGuardarMemoria, obtenerRedDeConocimiento, obtenerNormaPorId, buscarNormas } = require('../services/agentMemoryService');

const router = express.Router();

/**
 * Middleware opcional de autenticación para Obsidian:
 * Si viene Bearer token válido, extrae el usuario; si no, usa el primer admin activo.
 */
async function authObsidianOpcional(req, res, next) {
  let usuario = null;
  const authHeader = req.headers.authorization || '';

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      usuario = await Usuario.findById(decoded.id).select('-password');
    } catch {
      // Token inválido o de prueba: continuamos con usuario por defecto
    }
  }

  if (!usuario) {
    usuario = await Usuario.findOne({ rol: 'admin' }).select('-password') || {
      _id: '000000000000000000000001',
      nombre: 'Usuario Obsidian',
      rol: 'admin',
    };
  }

  req.usuario = usuario;
  next();
}

/**
 * GET /api/v1/models (Compatible con OpenAI)
 * Usado por Smart Connections y Text Generator para descubrir modelos disponibles.
 */
router.get('/models', (req, res) => {
  res.json({
    object: 'list',
    data: [
      { id: 'deepseek-chat', object: 'model', created: 1731190000, owned_by: 'sysjuridico-lexpy' },
      { id: 'deepseek-reasoner', object: 'model', created: 1731190000, owned_by: 'sysjuridico-lexpy' },
      { id: 'lexpy-paraguay', object: 'model', created: 1731190000, owned_by: 'sysjuridico-lexpy' },
    ],
  });
});

/**
 * POST /api/v1/chat/completions (Compatible con OpenAI)
 * Procesa la solicitud a través del motor LexPY inyectando legislación paraguaya y memoria agéntica.
 */
router.post('/chat/completions', authObsidianOpcional, async (req, res) => {
  try {
    const { messages, model = 'deepseek-chat' } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: { message: 'El array de messages es requerido.' } });
    }

    // Extraer el último mensaje del usuario
    const ultimoMensaje = [...messages].reverse().find((m) => m.role === 'user');
    const pregunta = ultimoMensaje ? ultimoMensaje.content : messages[messages.length - 1].content;

    // Ejecutar pipeline LexPY con memoria agéntica y conectores
    const { respuesta, fuente } = await procesarConsultaLexPY({
      pregunta,
      usuarioId: req.usuario._id,
    });

    // Guardar memoria atómica asíncrona
    destilarYGuardarMemoria({
      usuarioId: req.usuario._id,
      pregunta,
      respuesta,
    }).catch((e) => console.warn('[ObsidianAPI] Error memoria:', e.message));

    const promptTokens = Math.round(pregunta.length / 4);
    const completionTokens = Math.round((respuesta || '').length / 4);

    res.json({
      id: `chatcmpl-lexpy-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: respuesta || 'Sin respuesta generada.',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
      lexpy_meta: {
        fuente,
        pais: 'Paraguay',
        estudio: 'LIN GROUP & Asociados',
      },
    });
  } catch (error) {
    console.error('[ObsidianAPI] Error en chat/completions:', error);
    res.status(500).json({
      error: {
        message: error.message || 'Error procesando la consulta en SysJuridico.',
        type: 'api_error',
      },
    });
  }
});

/**
 * GET /api/v1/grafo
 * Retorna la estructura de la red de conocimiento (Obsidian Graph JSON)
 */
router.get('/grafo', authObsidianOpcional, async (req, res) => {
  try {
    const red = await obtenerRedDeConocimiento({ usuarioId: req.usuario._id });
    res.json({ success: true, data: red });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/v1/norma/:id
 * Retorna el articulado completo de una ley específica
 */
router.get('/norma/:id', authObsidianOpcional, async (req, res) => {
  try {
    const norma = await obtenerNormaPorId(req.params.id);
    if (!norma) return res.status(404).json({ success: false, message: 'Norma no encontrada' });
    res.json({ success: true, data: norma });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/v1/buscar-norma
 * Búsqueda de leyes en el catálogo BACN
 */
router.get('/buscar-norma', authObsidianOpcional, async (req, res) => {
  try {
    const resultados = await buscarNormas(req.query.q);
    res.json({ success: true, data: resultados });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
