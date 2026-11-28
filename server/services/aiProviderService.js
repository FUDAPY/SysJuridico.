const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');
const { registrarConsumoTokens } = require('./tokenAccountingService');

/**
 * Cliente para el motor de Inteligencia Artificial de SysJurídico.
 * Inferencia principal: FreeLLMAPI (OpenAI-compatible) y Gemini 2.5 Pro (@google/genai).
 * Contabiliza tokens reales de prompt y completion para respetar el techo mensual (< 10B).
 */
async function generarRespuestaIA({
  prompt,
  contexto,
  system,
  activarGrounding = false,
  retornarDetalle = false,
  usuarioId = null,
  rol = 'abogado',
}) {
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

  let textoResultado = null;
  let usageCapturado = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  let modeloUsado = 'auto';

  try {
    // Proveedor: FreeLLMAPI (Instancia Dokploy / OpenAI-compatible)
    if (proveedor === 'freellmapi') {
      modeloUsado = process.env.LEXPY_AI_MODEL || 'auto';
      const baseUrl = (process.env.LEXPY_AI_BASE_URL || 'http://freellmapi:3001/v1').replace(/\/+$/, '');
      const headers = {
        Authorization: `Bearer ${process.env.LEXPY_AI_API_KEY || ''}`,
        'Content-Type': 'application/json',
      };
      const payload = {
        model: modeloUsado,
        messages: [
          { role: 'system', content: contenidoSistema },
          { role: 'user', content: promptCompleto },
        ],
        temperature: 0.2,
      };

      try {
        const respuesta = await axios.post(`${baseUrl}/chat/completions`, payload, {
          headers,
          timeout: 90000,
        });
        textoResultado = respuesta.data?.choices?.[0]?.message?.content || null;
        const u = respuesta.data?.usage;
        if (u) {
          usageCapturado = {
            promptTokens: u.prompt_tokens || 0,
            completionTokens: u.completion_tokens || 0,
            totalTokens: u.total_tokens || 0,
          };
        }
      } catch (error) {
        const status = error.response?.status;
        const esErrorTransitorio =
          status === 429 ||
          status === 502 ||
          status === 503 ||
          status === 504 ||
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT';

        if (esErrorTransitorio) {
          console.warn(`[Techapyrã IA - FreeLLMAPI] Error transitorio (${status || error.code}). Reintentando tras 1.5s con model auto:fast...`);
          await new Promise((resolve) => setTimeout(resolve, 1500));
          payload.model = 'auto:fast';
          modeloUsado = 'auto:fast';

          try {
            const respuestaReintento = await axios.post(`${baseUrl}/chat/completions`, payload, {
              headers,
              timeout: 90000,
            });
            textoResultado = respuestaReintento.data?.choices?.[0]?.message?.content || null;
            const u = respuestaReintento.data?.usage;
            if (u) {
              usageCapturado = {
                promptTokens: u.prompt_tokens || 0,
                completionTokens: u.completion_tokens || 0,
                totalTokens: u.total_tokens || 0,
              };
            }
          } catch (reintentoError) {
            console.error('[Techapyrã IA - FreeLLMAPI] Falló reintento con auto:fast:', reintentoError.response?.data?.error?.message || reintentoError.message);
            textoResultado = 'En este momento el servicio inteligente de Techapyrã IA se encuentra con alta demanda. Por favor, reintenta tu consulta en unos segundos.';
          }
        } else {
          throw error;
        }
      }
    }

    // Motor: Gemini 2.5 Pro vía @google/genai
    else if (proveedor === 'gemini' || (geminiKey && proveedor === 'none')) {
      const keyUsar = geminiKey || apiKey;
      modeloUsado = process.env.GEMINI_MODEL || process.env.LEXPY_AI_MODEL || 'gemini-2.5-pro';
      const ai = new GoogleGenAI({ apiKey: keyUsar });

      const config = {
        systemInstruction: contenidoSistema,
        temperature: 0.15,
      };

      if (activarGrounding) {
        config.tools = [{ googleSearch: {} }];
      }

      const respuesta = await ai.models.generateContent({
        model: modeloUsado,
        contents: promptCompleto,
        config,
      });

      textoResultado = respuesta.text || null;
      const meta = respuesta.usageMetadata;
      if (meta) {
        usageCapturado = {
          promptTokens: meta.promptTokenCount || 0,
          completionTokens: meta.candidatesTokenCount || 0,
          totalTokens: meta.totalTokenCount || 0,
        };
      }
    }

    // Proveedor: DeepSeek
    else if (proveedor === 'deepseek') {
      modeloUsado = process.env.LEXPY_AI_MODEL || 'deepseek-chat';
      const respuesta = await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: modeloUsado,
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
        }
      );
      textoResultado = respuesta.data?.choices?.[0]?.message?.content || null;
      const u = respuesta.data?.usage;
      if (u) {
        usageCapturado = {
          promptTokens: u.prompt_tokens || 0,
          completionTokens: u.completion_tokens || 0,
          totalTokens: u.total_tokens || 0,
        };
      }
    }

    // Proveedor: OpenAI
    else if (proveedor === 'openai') {
      modeloUsado = process.env.LEXPY_AI_MODEL || 'gpt-4o';
      const respuesta = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: modeloUsado,
          messages: [
            { role: 'system', content: contenidoSistema },
            { role: 'user', content: promptCompleto },
          ],
        },
        { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 60000 }
      );
      textoResultado = respuesta.data?.choices?.[0]?.message?.content || null;
      const u = respuesta.data?.usage;
      if (u) {
        usageCapturado = {
          promptTokens: u.prompt_tokens || 0,
          completionTokens: u.completion_tokens || 0,
          totalTokens: u.total_tokens || 0,
        };
      }
    }

    // Proveedor: OpenRouter
    else if (proveedor === 'openrouter') {
      modeloUsado = process.env.LEXPY_AI_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
      const respuesta = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: modeloUsado,
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
      textoResultado = respuesta.data?.choices?.[0]?.message?.content || null;
      const u = respuesta.data?.usage;
      if (u) {
        usageCapturado = {
          promptTokens: u.prompt_tokens || 0,
          completionTokens: u.completion_tokens || 0,
          totalTokens: u.total_tokens || 0,
        };
      }
    }

    // Proveedor: Groq
    else if (proveedor === 'groq') {
      modeloUsado = process.env.LEXPY_AI_MODEL || 'llama-3.3-70b-versatile';
      const respuesta = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: modeloUsado,
          messages: [
            { role: 'system', content: contenidoSistema },
            { role: 'user', content: promptCompleto },
          ],
          temperature: 0.2,
          max_tokens: 4096,
        },
        { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 60000 }
      );
      textoResultado = respuesta.data?.choices?.[0]?.message?.content || null;
      const u = respuesta.data?.usage;
      if (u) {
        usageCapturado = {
          promptTokens: u.prompt_tokens || 0,
          completionTokens: u.completion_tokens || 0,
          totalTokens: u.total_tokens || 0,
        };
      }
    }

    // Registro automático de consumo de tokens en la doble barrera
    if (textoResultado) {
      registrarConsumoTokens({
        usuarioId,
        promptTokens: usageCapturado.promptTokens,
        completionTokens: usageCapturado.completionTokens,
        totalTokens: usageCapturado.totalTokens,
        textoPrompt: promptCompleto,
        textoRespuesta: textoResultado,
      }).catch((err) => console.warn('[TokenAccounting] Error registrando consumo:', err.message));
    }

    if (retornarDetalle) {
      return {
        texto: textoResultado,
        usage: usageCapturado,
        proveedor,
        modelo: modeloUsado,
      };
    }

    return textoResultado;
  } catch (error) {
    const detalle = error.response?.data?.error?.message || error.message;
    console.error(`[SysJuridico AI] Error al invocar modelo (${proveedor}):`, detalle);
    return null;
  }
}

module.exports = { generarRespuestaIA };
