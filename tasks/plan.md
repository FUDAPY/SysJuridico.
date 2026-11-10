# PLAN DE EJECUCIÓN: Modernización SysJuridico + DeepSeek + UX expedientes.click

## FASE 1: Integración del Motor DeepSeek AI (Backend)
1. **Configuración de Variables de Entorno (`.env`):**
   - Configurar `LEXPY_AI_PROVIDER=deepseek`, `LEXPY_AI_MODEL=deepseek-chat` y `LEXPY_AI_API_KEY`.
2. **Ampliación de `server/services/aiProviderService.js`:**
   - Incorporar soporte nativo para el endpoint `https://api.deepseek.com/v1/chat/completions`.
   - Soporte para parámetros de temperatura, max_tokens y encabezados de autorización.
3. **Optimización del Servicio LexPY (`server/services/lexpyService.js`):**
   - Refinar el prompt del sistema para derecho paraguayo (Constitución, Código Civil, Código Procesal Civil, Código Laboral Ley 213/93, Código Penal).
   - Mejorar la formulación de consultas para redacción de escritos, contratos e informes procesales.
   - Fortalecer el scraper de CSJ y BaseLegal con timeouts defensivos y caché.
4. **Verificación Automatizada de DeepSeek:**
   - Ejecutar pruebas automatizadas validando respuestas de chat, generación de escritos y citación de fuentes.

## FASE 2: Sistema de Diseño Visual Unificado (Frontend CSS & Core)
1. **Creación del Design System en `public/css/styles.css`:**
   - Tokens CSS: Variables de color (Navy `#061735`, Blue `#2474FF`, Slate `#405a93`, Backgrounds `#f4f7fb`, Dark mode `#0b1120`, `#1e293b`).
   - Tipografía: Importación de Poppins + Inter con pesos 400, 500, 600, 700.
   - Componentes estándar: Tarjetas elevadas, tablas estilizadas, badges de estado tipo píldora, inputs modernos con iconos y botones con micro-interacciones.
   - Soporte Dark / Light mode con toggle persistente en `localStorage`.
2. **Navegación Global y Header Común (`public/js/api.js` y componentes):**
   - Menú lateral (Sidebar) elegante con íconos vectoriales modernos y badges de conteo.
   - Header superior con buscador rápido, perfil de usuario activo y selector de tema.

## FASE 3: Modernización de Vistas Operativas
1. **Centro Operativo / Dashboard (`public/index.html` + `public/js/dashboard.js`):**
   - Métricas principales en tarjetas estilo Bento Grid (Ingresos diarios, mensuales, saldo a cobrar, casos activos).
   - Bandeja de atención rápida y actividades recientes con formato visual renovado.
2. **Expedientes (`public/expedientes.html` + `public/js/expedientes.js`):**
   - Vista de tabla mejorada con filtros por juzgado, estado, abogado asignado.
   - Modal de detalle de causa con pestañas (Carátula, Actuaciones, Cuotas/Pagos, Ticket 80mm).
3. **Clientes (`public/clientes.html` + `public/js/clientes.js`):**
   - Directorio de clientes con avatar generado, datos de contacto rápidos y acceso directo a sus causas.
4. **Créditos y Cobranzas (`public/creditos.html` + `public/js/creditos.js`):**
   - Monitoreo de cuotas, saldos pendientes y cobranzas con alertas visuales de vencimiento.
5. **Agenda Procesal (`public/agenda.html` + `public/js/agenda.js`):**
   - Calendario procesal con vista mensual y de lista, distinguiendo audiencias, plazos perentorios y reuniones.
6. **Liquidación Laboral (`public/liquidacion.html` + `public/js/liquidacion.js`):**
   - Asistente de 4 pasos con diseño renovado y reporte de liquidación A4 optimizado para impresión.
7. **Requisitos, Archivos y Usuarios:**
   - Actualización visual coherente de `requisitos.html`, `archivos.html` y `usuarios.html`.

## FASE 4: Módulo Asistente Jurídico LexPY (Chat & Redactor de Escritos)
1. **Renovación de `public/lexpy.html` y `public/js/lexpy.js`:**
   - Interfaz de chat moderna similar a ChatGPT/Claude, con soporte Markdown completo, resaltado de artículos de ley y citas a fuentes.
   - Pestaña / Modo "Generador de Escritos": formulario para seleccionar causa/cliente y redactar demandas, contestaciones, contratos y telegramas laborales asistidos por DeepSeek.
2. **Widget flotante de LexPY:**
   - Botón flotante accesible desde cualquier pantalla del sistema para consultas rápidas sin cambiar de vista.

## FASE 5: Pruebas, Control de Calidad y Entrega (Completada previamente)
1. **Auditoría de 5 Ejes:** Corrección funcional, rendimiento, mantenibilidad, seguridad de secretos y cobertura de pruebas.
2. **Pruebas E2E de ciclo de vida HTTP y frontend:** Verificación de flujo completo en todas las páginas.

## FASE 6: Memoria Agéntica de Largo Plazo (Agentic Memory) y Resúmenes Contextuales
1. **Modelo de Memoria en MongoDB (`server/models/MemoriaAgente.js`):**
   - Estructura: `usuarioId`, `expedienteId`, `tema`, `resumen`, `entidades` (partes, pretensión, montos, plazos), `hechosRelevantes`, `backlinks` (nodos vinculados).
2. **Servicio de Memoria del Agente (`server/services/agentMemoryService.js`):**
   - Recuperación de contexto semántico: busca resúmenes previos relevantes para la consulta actual sin saturar tokens.
   - Destilación asíncrona: sintetiza la interacción tras cada respuesta del chat en viñetas atómicas y actualiza entidades clave.
3. **Integración en el Pipeline de LexPY (`server/services/lexpyService.js`):**
   - Inyectar la memoria compactada en el prompt del sistema DeepSeek antes de procesar la consulta.

## FASE 7: Conectores Jurídicos Ampliados (CSJ, BACN, Digesto, Gaceta, SILpy)
1. **Servicio Unificado de Conectores (`server/services/paraguayConnectorsService.js`):**
   - Conector CSJ Jurisprudencia: búsqueda de acuerdos y sentencias, autos interlocutorios y acordadas.
   - Conector BACN / Leyes: consulta de leyes y decretos con referencias cruzadas.
   - Conector Congreso Abierto / SILpy: consulta de proyectos de ley y estado legislativo.
   - Conector Digesto y Gaceta Oficial.
2. **Estrategia de Caché y Resiliencia en MongoDB:**
   - Caché con TTL de 24h para no sobrecargar los servidores del Estado paraguayo y garantizar respuestas en < 1s.
3. **Integración con el Buscador de LexPY:**
   - Ampliar `buscarEnFuentesExternas` para consultar coordinadamente los nuevos conectores.

## FASE 8: Interfaz Visual Tipo Obsidian (Graph View) & Endpoint de Integración para Plugins
1. **API de Compatibilidad Obsidian (`server/routes/obsidian.routes.js` + controlador):**
   - `POST /api/v1/chat/completions`: Formato estándar OpenAI para plugins como *Smart Connections* y *Text Generator*.
   - `GET /api/v1/models`: Especificación de modelos disponibles.
   - `GET /api/lexpy/grafo`: Retorna el grafo completo de nodos (Leyes, Causas, Clientes, Precedentes) y enlaces.
2. **Vista de Grafo de Conocimiento Interactivo (`public/grafo.html` + `public/js/grafo.js`):**
   - Visualización por fuerza (Force-Directed Graph) estilo Obsidian con canvas/SVG fluido, zoom y arrastre.
   - Filtros dinámicos por tipo de nodo (Leyes, Expedientes, Clientes, Acordadas).
   - Panel lateral de inspección de nodo para ver detalles, artículos vinculados y saltar al expediente.
   - Guía modal para conectar Obsidian desktop con SysJuridico.
3. **Incorporación en la Navegación Global:**
   - Enlace `🕸️ Red de Conocimiento` en la barra lateral de todas las páginas del sistema.

## FASE 9: Verificación Integral, Pruebas Automatizadas y Auditoría de Seguridad (Completada)
1. **Script de Verificación Automatizado:** Comprobar endpoints de memoria, conectores jurídicos, endpoint OpenAI de Obsidian y visualizador del grafo.
2. **Validación de Cero Secretos:** Asegurar que ninguna clave quede registrada fuera de `.env`.

## FASE 10: Vinculación & Sincronización con Portal CSJ (Expedientes y Actuaciones)
1. **Modelo de Credencial y Estado CSJ (`server/models/Usuario.js` y `server/models/Expediente.js`):**
   - Incorporar `csjConfig` con cifrado AES-256 para credenciales del Portal de Gestión Jurisdiccional.
   - Campos de expediente: `numeroCSJ`, `anoCSJ`, `secretaria`, `actuacionesCSJ`, `ultimaSincronizacionCSJ`.
2. **Servicio de Sincronización CSJ (`server/services/csjSyncService.js`):**
   - Conexión e importación de expedientes del profesional (carátulas, estado, notificaciones y actuaciones).
   - Endpoints: `POST /api/expedientes/csj/vincular`, `POST /api/expedientes/csj/sincronizar`.
3. **Interfaz en `public/expedientes.html`:**
   - Modal de vinculación de credencial CSJ y botón "Sincronizar CSJ" con badge de estado.

## FASE 11: Editor Jurídico Integrado (Google Docs Style con IA)
1. **Vista del Editor (`public/editor.html` + `public/js/editor.js`):**
   - Procesador de texto interactivo en formato hoja A4 judicial con márgenes legales paraguayos.
   - Barra de herramientas: formatos de fuente, títulos, listas, alineaciones, sangrías, membretes y tablas.
   - Exportación limpia a DOCX / PDF / Impresión directa.
2. **Panel Asistente LexPY en el Editor:**
   - Barra lateral desplegable para generar demandas, contestaciones, cláusulas y recursos.
   - Botón "Insertar en cursor" y "Mejorar redacción forense".
   - Botón "Guardar escrito en Expediente".

## FASE 12: Ingesta & Lectura Multimodal de Documentos con RAG de Expediente
1. **Procesador de Documentos (`server/services/documentProcessorService.js`):**
   - Extracción de texto de PDFs y escaneados utilizando `pdf-parse` y análisis visual con IA.
   - Resumen y extracción de entidades jurídicas (partes, pretensión, pruebas).
2. **Actualización de `DocumentoExpediente.js` y Rutas de Subida:**
   - Almacenar `textoExtraido`, `resumenIA` y búsqueda por texto completo.
3. **RAG Contextual de Expediente en LexPY:**
   - Cuando se consulta sobre un expediente, recuperar los documentos adjuntos del caso y citar su contenido.
4. **Pruebas Automatizadas y Auditoría de Cierre.**


