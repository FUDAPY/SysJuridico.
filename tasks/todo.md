# Control de Tareas: Modernización SysJuridico

- [x] **Fase 1: Backend & Motor DeepSeek AI**
  - [x] 1.1 Configurar variables de entorno en `.env` para DeepSeek (`LEXPY_AI_PROVIDER=deepseek`, `LEXPY_AI_MODEL=deepseek-chat`)
  - [x] 1.2 Implementar soporte nativo de DeepSeek en `server/services/aiProviderService.js`
  - [x] 1.3 Optimizar `server/services/lexpyService.js` para redacción jurídica (demandas, contratos, contestaciones) con RAG y web scraping (CSJ / BaseLegal)
  - [x] 1.4 Ejecutar test automatizado de integración DeepSeek y verificar respuestas

- [x] **Fase 2: Sistema de Diseño Visual (expedientes.click Inspired)**
  - [x] 2.1 Construir paleta cromática, tipografías (Poppins/Inter) y tokens de diseño en `public/css/styles.css`
  - [x] 2.2 Implementar soporte Dark Mode / Light Mode con alternador interactivo
  - [x] 2.3 Rediseñar componentes globales (Sidebar, Top Header, Bento Cards, Badges, Botones y Tablas)
  - [x] 2.4 Actualizar `public/js/api.js` para soportar navegación global mejorada y widget flotante de LexPY

- [x] **Fase 3: Modernización de Vistas Operativas**
  - [x] 3.1 Rediseñar Dashboard (`public/index.html` + `public/js/dashboard.js`)
  - [x] 3.2 Rediseñar Expedientes (`public/expedientes.html` + `public/js/expedientes.js`)
  - [x] 3.3 Rediseñar Clientes (`public/clientes.html` + `public/js/clientes.js`)
  - [x] 3.4 Rediseñar Créditos y Cobranzas (`public/creditos.html` + `public/js/creditos.js`)
  - [x] 3.5 Rediseñar Agenda (`public/agenda.html` + `public/js/agenda.js`)
  - [x] 3.6 Rediseñar Liquidación Laboral (`public/liquidacion.html` + `public/js/liquidacion.js`)
  - [x] 3.7 Rediseñar Requisitos, Archivos y Usuarios (`requisitos.html`, `archivos.html`, `usuarios.html`, `login.html`)

- [x] **Fase 4: Asistente Jurídico LexPY & Redactor de Escritos**
  - [x] 4.1 Modernizar interfaz de LexPY (`public/lexpy.html` + `public/js/lexpy.js`) con soporte de redacción de contratos y escritos
  - [x] 4.2 Incorporar widget flotante de IA accesible desde cualquier módulo del sistema

- [x] **Fase 5: Verificación, Calidad de 5 Ejes y Lanzamiento (Completada previamente)**
  - [x] 5.1 Ejecutar suite completa de verificación de rutas, base de datos y assets
  - [x] 5.2 Auditoría de seguridad (Zero Secrets Policy)
  - [x] 5.3 Validación final del sistema

- [x] **Fase 6: Memoria Agéntica de Largo Plazo (Agentic Memory)**
  - [x] 6.1 Crear modelo `server/models/MemoriaAgente.js` con soporte de resúmenes, entidades jurídicas y backlinks
  - [x] 6.2 Crear servicio `server/services/agentMemoryService.js` para compresión semántica y recuperación contextual
  - [x] 6.3 Integrar memoria agéntica en `server/services/lexpyService.js` y `server/controllers/lexpyController.js`

- [x] **Fase 7: Conectores Jurídicos Ampliados (CSJ, BACN, Digesto, Gaceta, SILpy)**
  - [x] 7.1 Implementar `server/services/paraguayConnectorsService.js` adaptando conectores oficiales
  - [x] 7.2 Conectar fallback inteligente y caché de normas en `server/services/scraperService.js`
  - [x] 7.3 Integrar conectores ampliados en el RAG de `server/services/lexpyService.js`

- [x] **Fase 8: Interfaz Visual Tipo Obsidian (Graph View) & API de Plugins**
  - [x] 8.1 Implementar endpoints compatibles con OpenAI (`/api/v1/chat/completions`, `/api/v1/models`) y grafo (`/api/lexpy/grafo`)
  - [x] 8.2 Crear interfaz interactiva `public/grafo.html` y script `public/js/grafo.js` con visualización tipo Obsidian
  - [x] 8.3 Incorporar acceso a la Red de Conocimiento en la navegación global y modal de guía para Obsidian

- [x] **Fase 9: Verificación Integral, Pruebas Automatizadas y Auditoría de Seguridad**
  - [x] 9.1 Ejecutar test suite automatizado de memoria, conectores, API OpenAI y grafo
  - [x] 9.2 Auditoría de seguridad de 5 ejes y entrega de resumen ejecutivo

- [x] **Fase 10: Vinculación & Sincronización con Portal CSJ (Expedientes y Actuaciones)**
  - [x] 10.1 Actualizar modelos `Usuario.js` y `Expediente.js` con soporte para credenciales CSJ cifradas y actuaciones
  - [x] 10.2 Implementar servicio `server/services/csjSyncService.js` y rutas `/api/expedientes/csj/*`
  - [x] 10.3 Integrar modal de vinculación y botón de sincronización en `public/expedientes.html` y `public/js/expedientes.js`

- [x] **Fase 11: Editor Jurídico Integrado (Google Docs Style con IA)**
  - [x] 11.1 Diseñar e implementar `public/editor.html` con lienzo A4 judicial y barra de herramientas forense
  - [x] 11.2 Construir `public/js/editor.js` con soporte de atajos, exportación a DOCX/PDF e inserción desde LexPY
  - [x] 11.3 Agregar enlace directo al Editor en la barra lateral global y modal de expedientes

- [x] **Fase 12: Ingesta & Lectura Multimodal de Documentos con RAG de Expediente**
  - [x] 12.1 Implementar `server/services/documentProcessorService.js` con extracción de texto y OCR de PDFs y escaneados
  - [x] 12.2 Actualizar `DocumentoExpediente.js` y endpoints de subida para indexar texto y resúmenes IA
  - [x] 12.3 Conectar RAG documental de causa en `server/services/lexpyService.js` para responder preguntas sobre expedientes
  - [x] 12.4 Verificación integral final y pruebas de aceptación


