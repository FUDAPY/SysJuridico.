/**
 * Módulo de Asistencia por Voz para SysJurídico (Speech-to-Text y Text-to-Speech)
 * Soporta acento y dialecto regional es-PY con fallback a es-ES / es-419
 */

class AsistenteVozJuridico {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    this.reconocimiento = SpeechRecognition ? new SpeechRecognition() : null;
    this.sintesis = window.speechSynthesis || null;
    this.escuchando = false;
    this.hablando = false;

    if (this.reconocimiento) {
      this.reconocimiento.lang = 'es-PY';
      this.reconocimiento.continuous = false;
      this.reconocimiento.interimResults = false;
    }
  }

  estaSoportadoDictado() {
    return !!this.reconocimiento;
  }

  estaSoportadaLectura() {
    return !!this.sintesis;
  }

  iniciarDictado({ onResultado, onInicio, onFin, onError }) {
    if (!this.reconocimiento) {
      if (onError) onError('El navegador no soporta reconocimiento de voz (SpeechRecognition).');
      return;
    }

    if (this.escuchando) {
      this.detenerDictado();
      return;
    }

    this.reconocimiento.onstart = () => {
      this.escuchando = true;
      if (onInicio) onInicio();
    };

    this.reconocimiento.onresult = (evento) => {
      const texto = evento.results?.[0]?.[0]?.transcript || '';
      if (onResultado) onResultado(texto);
    };

    this.reconocimiento.onerror = (err) => {
      this.escuchando = false;
      if (onError) onError(err.error || 'Error al capturar audio del micrófono');
    };

    this.reconocimiento.onend = () => {
      this.escuchando = false;
      if (onFin) onFin();
    };

    try {
      this.reconocimiento.start();
    } catch {
      this.escuchando = false;
      if (onFin) onFin();
    }
  }

  detenerDictado() {
    if (this.reconocimiento && this.escuchando) {
      this.reconocimiento.stop();
      this.escuchando = false;
    }
  }

  leerTexto(texto, { onFin, onInicio } = {}) {
    if (!this.sintesis) return;

    if (this.sintesis.speaking) {
      this.sintesis.cancel();
      this.hablando = false;
      if (onFin) onFin();
      return;
    }

    const textoLimpio = String(texto || '')
      .replace(/[#*`_~>[\]()]/g, ' ')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!textoLimpio) return;

    const locucion = new SpeechSynthesisUtterance(textoLimpio);
    locucion.lang = 'es-PY';
    locucion.rate = 1.0;
    locucion.pitch = 1.0;

    locucion.onstart = () => {
      this.hablando = true;
      if (onInicio) onInicio();
    };

    locucion.onend = () => {
      this.hablando = false;
      if (onFin) onFin();
    };

    locucion.onerror = () => {
      this.hablando = false;
      if (onFin) onFin();
    };

    this.sintesis.speak(locucion);
  }

  detenerLectura() {
    if (this.sintesis) {
      this.sintesis.cancel();
      this.hablando = false;
    }
  }
}

// Instancia global disponible en todas las vistas
window.voiceAssistant = new AsistenteVozJuridico();
