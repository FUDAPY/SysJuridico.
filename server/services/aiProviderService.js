const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');

/**
 * Cliente para el motor de Inteligencia Artificial de SysJurídico.
 * Motor principal: Gemini 2.5 Pro (@google/genai) con soporte de Grounding oficial y cero alucinaciones.
 * Mantiene compatibilidad de fallback con otros proveedores configurados mediante variables de entorno.
 */
async function generarRespuestaIA({ prompt, contexto, system, activarGrounding = false }) {
  const geminiKey = process.env.GEMINI_API_KEY || (process.env.LEXPY_AI_PROVIDER === 'gemini' ? process.env.LEXPY_AI_API_KEY : null);
  const defaultProvider = process.env.LEXPY_AI_BASE_URL ? 'freellmapi' : (geminiKey ? 'gemini' : 'none');
  const proveedor = (process.env.LEXPY_AI_PROVIDER || defaultProvider).toLowerCase();
  const apiKey = geminiKey || process.env.LEXPY_AI_API_KEY;

  if (!apiKey && proveedor === 'none') {
    return null;
  }

  const contenidoSistema =
    system ||
    'Eres Techapyrã IA, el asistente jurídico profesional y experto legal de SysJuridico, impulsado por el Motor de Sabiduría OtelaxWisdom.\n' +
    'Tu objetivo es resolver dudas, redactar escritos judiciales, proponer estrategias procesales y brindar soluciones en el ámbito jurídico, fiscal y personal, aplicando estrictamente el derecho paraguayo positivo y vigente.\n' +
    'Aplica la regla de CERO ALUCINACIONES: si no encuentras respaldo en tu base local ni en fuentes web oficiales paraguayas, decláralo explícitamente.';

  const promptCompleto = contexto
    ? `Contexto legal disponible:\n${contexto}\n\nConsulta del usuario:\n${prompt}`
    : prompt;

  try {
    // Proveedor: FreeLLMAPI (Instancia Dokploy / OpenAI-compatible)
    if (proveedor === 'freellmapi') {
      const modelo = process.env.LEXPY_AI_MODEL || 'auto';
      const baseUrl = (process.env.LEXPY_AI_BASE_URL || 'http://freellmapi:3001/v1').replace(/\/+$/, '');
      const respuesta = await axios.post(
        `${baseUrl}/chat/completions`,
        {
          model: modelo,
          messages: [
            { role: 'system', content: contenidoSistema },
            { role: 'user', content: promptCompleto },
          ],
          temperature: 0.2,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.LEXPY_AI_API_KEY || ''}`,
            'Content-Type': 'application/json',
          },
          timeout: 90000,
        }
      );
      return respuesta.data?.choices?.[0]?.message?.content || null;
    }

    // Motor Principal: Gemini 2.5 Pro vía @google/genai
    if (proveedor === 'gemini' || (geminiKey && proveedor === 'none')) {
      const keyUsar = geminiKey || apiKey;
      const modelo = process.env.GEMINI_MODEL || process.env.LEXPY_AI_MODEL || 'gemini-2.5-pro';
      const ai = new GoogleGenAI({ apiKey: keyUsar });

      const config = {
        systemInstruction: contenidoSistema,
        temperature: 0.15,
      };

      if (activarGrounding) {
        config.tools = [{ googleSearch: {} }];
      }

      const respuesta = await ai.models.generateContent({
        model: modelo,
        contents: promptCompleto,
        config,
      });

      return respuesta.text || null;
    }

    // Proveedor: DeepSeek
    if (proveedor === 'deepseek') {
      const modelo = process.env.LEXPY_AI_MODEL || 'deepseek-chat';
      const respuesta = await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: modelo,
          messages: [
            { role: 'system', content: contenidoSistema },
            { role: 'user', content: promptCompleto },
          ],
          temperature: 0.2,
          max_tokens: 4096,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 90000,
          proxy: false,
        }
      );
      return respuesta.data?.choices?.[0]?.message?.content || null;
    }

    // Proveedor: OpenAI
    if (proveedor === 'openai') {
      const respuesta = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: process.env.LEXPY_AI_MODEL || 'gpt-4o',
          messages: [
            { role: 'system', content: contenidoSistema },
            { role: 'user', content: promptCompleto },
          ],
        },
        { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 60000 }
      );
      return respuesta.data?.choices?.[0]?.message?.content || null;
    }

    // Proveedor: OpenRouter
    if (proveedor === 'openrouter') {
      const modelo = process.env.LEXPY_AI_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
      const respuesta = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: modelo,
          messages: [
            { role: 'system', content: contenidoSistema },
            { role: 'user', content: promptCompleto },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': process.env.LEXPY_APP_URL || 'https://sysjuridico.local',
            'X-Title': 'SysJuridico - Techapyra IA',
          },
          timeout: 60000,
        }
      );
      return respuesta.data?.choices?.[0]?.message?.content || null;
    }

    // Proveedor: Groq
    if (proveedor === 'groq') {
      const modelo = process.env.LEXPY_AI_MODEL || 'llama-3.3-70b-versatile';
      const respuesta = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: modelo,
          messages: [
            { role: 'system', content: contenidoSistema },
            { role: 'user', content: promptCompleto },
          ],
          temperature: 0.2,
          max_tokens: 4096,
        },
        { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 60000 }
      );
      return respuesta.data?.choices?.[0]?.message?.content || null;
    }

    console.warn(`[SysJuridico AI] Proveedor no reconocido: ${proveedor}`);
    return null;
  } catch (error) {
    const detalle = error.response?.data?.error?.message || error.message;
    console.error(`[SysJuridico AI] Error al invocar modelo (${proveedor}):`, detalle);
    return null;
  }
}

module.exports = { generarRespuestaIA };
