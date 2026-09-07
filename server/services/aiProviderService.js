const axios = require('axios');

/**
 * Cliente genérico para el proveedor de IA generativa configurado mediante variables de entorno.
 * Soporta 'openai', 'gemini', 'openrouter' y 'groq'. Si LEXPY_AI_PROVIDER=none, no se realiza ninguna llamada externa.
 */
async function generarRespuestaIA({ prompt, contexto, system }) {
  const proveedor = (process.env.LEXPY_AI_PROVIDER || 'none').toLowerCase();
  const apiKey = process.env.LEXPY_AI_API_KEY;

  if (proveedor === 'none' || !apiKey) {
    return null;
  }

  const contenidoSistema =
    system ||
    'Eres LexPY, un asistente jurídico especializado en legislación paraguaya. Responde con precisión y cita fuentes cuando sea posible.';

  const promptCompleto = contexto
    ? `Contexto legal disponible:\n${contexto}\n\nConsulta del usuario:\n${prompt}`
    : prompt;

  try {
    if (proveedor === 'openai') {
      const respuesta = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: process.env.LEXPY_AI_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: contenidoSistema,
            },
            { role: 'user', content: promptCompleto },
          ],
        },
        { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 20000 }
      );
      return respuesta.data?.choices?.[0]?.message?.content || null;
    }

    // OpenRouter expone una API compatible con OpenAI; se restringe a modelos con sufijo ":free"
    if (proveedor === 'openrouter') {
      const modelo = process.env.LEXPY_AI_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
      const respuesta = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: modelo,
          messages: [
            {
              role: 'system',
              content: contenidoSistema,
            },
            { role: 'user', content: promptCompleto },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': process.env.LEXPY_APP_URL || 'https://sysjuridico.local',
            'X-Title': 'SysJuridico - LexPY',
          },
          timeout: 20000,
        }
      );
      return respuesta.data?.choices?.[0]?.message?.content || null;
    }

    // Groq: API compatible con OpenAI (chat completions)
    if (proveedor === 'groq') {
      const modelo = process.env.LEXPY_AI_MODEL || 'openai/gpt-oss-120b';
      const respuesta = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: modelo,
          messages: [
            {
              role: 'system',
              content: contenidoSistema,
            },
            { role: 'user', content: promptCompleto },
          ],
          temperature: 0.3,
          max_tokens: 2048,
        },
        { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 30000 }
      );
      return respuesta.data?.choices?.[0]?.message?.content || null;
    }

    if (proveedor === 'gemini') {
      const modelo = process.env.LEXPY_AI_MODEL || 'gemini-1.5-flash';
      const respuesta = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`,
        { contents: [{ role: 'user', parts: [{ text: `${contenidoSistema}\n\n${promptCompleto}` }] }] },
        { timeout: 20000 }
      );
      return respuesta.data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    }

    console.warn(`[LexPY] Proveedor de IA desconocido: ${proveedor}`);
    return null;
  } catch (error) {
    console.error('[LexPY] Error al consultar el proveedor de IA:', error.message);
    return null;
  }
}

module.exports = { generarRespuestaIA };
