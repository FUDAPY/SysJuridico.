# SPEC: Modernización de SysJuridico basada en Ingeniería Inversa de expedientes.click y Motor DeepSeek

## 1. OBJETIVO PRINCIPAL
Modernizar integralmente la experiencia visual, funcionalidad y capacidades de inteligencia artificial de **SysJuridico**, tomando como estándar de referencia la arquitectura y diseño de **expedientes.click** (revisado mediante ingeniería inversa con cuenta premium activa). Se mantiene al 100% la estructura de base de datos actual en MongoDB y todos los módulos operativos preexistentes, elevando el diseño visual a estándares de SaaS jurídico de alta gama e integrando **DeepSeek** (`deepseek-chat` / `deepseek-reasoner`) como motor principal de IA con navegación RAG, redacción de escritos, contratos, análisis de expedientes y scraping continuo de CSJ y BaseLegal.

---

## 2. HALLAZGOS DE INGENIERÍA INVERSA (expedientes.click)
A partir de la inspección técnica realizada sobre `https://expedientes.click/` autenticado con usuario `thesadboypy@gmail.com` (Plan `PREMIUM_PLUS`):

1. **Estructura y Rutas Clave:**
   - **Dashboard / Centro Operativo (`/`):** Métricas operativas, bandeja de atención priorizada por IA, resumen de expedientes activos y plazos próximos a vencer.
   - **Expedientes (`/expedientes`):** Vista de causa detallada conectada con partes intervinientes, juzgado, número, materia, línea de tiempo de actuaciones y notas.
   - **Control de Plazos / Calendario (`/plazos`, `/calendario`):** Cómputo procesal inteligente (días hábiles, inhábiles, ferias judiciales, caducidades y recordatorios).
   - **Editor & Plantillas (`/editor`, `/plantillas`):** Generación asistida por IA de escritos jurídicos utilizando el contexto del expediente (partes, pretensión, hechos, antecedentes procesales).
   - **Biblioteca Jurídica (`/biblioteca`):** Catálogo de jurisprudencia y legislación nacional estructurado.
   - **Chat Asistente (`/chat`):** Chat contextual con Deep Research y cuotas diarias de análisis documental.

2. **Diseño Visual y UX:**
   - **Paleta cromática:** Navy Profundo (`#061735`, `#0f172a`), Azul Real vibrante (`#2474FF`, `#1d4ed8`), fondos claros (`#f4f7fb`, `#ffffff`) y soporte Dark Mode nativo (`#0b1120`, `#1e293b`).
   - **Tipografía:** *Poppins* para títulos/encabezados y *Inter* / *Open Sans* para textos de alta densidad de datos.
   - **Componentes:** Tarjetas redondeadas (`rounded-2xl`), elevaciones suaves (`shadow-[0_18px_60px_-30px_rgba(15,23,42,0.45)]`), badges semánticos tipo píldora para estados (`Al día`, `Urgente`, `En trámite`), buscador global y atajos de teclado.

---

## 3. ALCANCE DEL REQUERIMIENTO (En Alcance)

### 3.1. Preservación Estricta de Módulos y Base de Datos Existente
Se mantienen todas las colecciones MongoDB existentes y los módulos del estudio:
- 👥 **Clientes (`/clientes.html`):** CRUD, historial de casos, saldos y estado de cuenta.
- 📁 **Expedientes (`/expedientes.html`):** Carátula, juzgado, abogado asignado, plan de pagos y tickets térmicos de 80 mm.
- 💰 **Créditos y Cobranzas (`/creditos.html`):** Control de vencimientos, amortizaciones y saldos.
- 📅 **Agenda (`/agenda.html`):** Audiencias, reuniones y vencimientos vinculados a expedientes.
- 🧾 **Requisitos y Trámites (`/requisitos.html`):** Catálogo arancelario y requisitos documentales.
- 🗂️ **Ubicación de Archivos (`/archivos.html`):** Registro físico (tomo, estante, carpeta).
- ⚙️ **Usuarios (`/usuarios.html`):** Roles `admin` y `abogado`, permisos y auditoría.
- 🧮 **Liquidación Laboral (`/liquidacion.html`):** Motor de cálculo Ley 213/93 MTESS con reporte A4.

### 3.2. Integración de DeepSeek AI como Motor Central
- **Proveedor:** `deepseek` integrado nativamente en `aiProviderService.js`.
- **Modelos:**
  - `deepseek-chat` (DeepSeek-V3): Modelo principal para consultas, generación de escritos y contratos.
  - `deepseek-reasoner` (DeepSeek-R1): Modo opcional para razonamiento jurídico profundo y estrategia procesal.
- **Capacidades:**
  - Chat contextual y asistencia en tiempo real.
  - Generador de escritos legales y contratos parametrizados por expediente/cliente.
  - RAG Híbrido: `BaseLegal` (MongoDB) + Scraping en tiempo real (CSJ Paraguay y BaseLegal.com.py) con fallback robusto.

### 3.3. Memoria Agéntica Constante (Agentic Long-Term Memory)
- **Objetivo:** Evitar el desperdicio de tokens acumulando transcripciones infinitas y dotar a LexPY de memoria persistente a largo plazo por usuario, expediente y tema.
- **Mecanismo:**
  - Colección `AgenticMemory` en MongoDB: almacena resúmenes destilados, entidades jurídicas reconocidas (partes, pretensión, montos, plazos), hechos probados y enlaces bidireccionales (`backlinks`).
  - Extracción y destilación automática tras cada ciclo de conversación: genera notas atómicas sintetizadas (máximo 150-250 tokens de memoria destilada en lugar de 4.000 tokens de chat crudo).
  - Inyección contextual dinámica: el sistema recupera únicamente los fragmentos de memoria y metadatos relevantes para el expediente o usuario activo antes de consultar a DeepSeek.

### 3.4. Conectores Jurídicos Ampliados (Ecosistema Legal Paraguayo)
- **Fuentes e Integraciones:**
  - **CSJ Jurisprudencia (`csj-jurisprudencia.js`):** Acordadas, fallos de las Salas Constitucional, Civil y Penal de la Corte Suprema.
  - **CSJ Legislación (`csj-legislacion.js`):** Leyes y decretos vigentes.
  - **BACN Leyes (`leyes-bacn.js` + `paraguay-hq/data/leyes_bacn`):** Repositorio histórico y vigente del Congreso Nacional.
  - **Digesto Legislativo & Gaceta Oficial:** Consulta de publicaciones oficiales del Poder Ejecutivo.
  - **Congreso Abierto / SILpy:** Estado de proyectos de ley, tramitaciones parlamentarias y comisiones dictaminantes.
- **Caché y Fallback:** Servicio unificado `server/services/paraguayConnectorsService.js` con TTL en MongoDB para alta velocidad y resiliencia ante caídas de sitios gubernamentales.

### 3.5. Interfaz Visual de Grafo de Conocimiento (Obsidian Graph View) & API de Plugins
- **Grafo Visual Interactivo:**
  - Vista gráfica (`public/grafo.html` y componente en `public/lexpy.html`) renderizando nodos interconectados:
    - *Nodos Leyes y Artículos* (Constitución, Código Civil, Código Laboral, etc.)
    - *Nodos Expedientes y Causas* (con carátulas y juzgados)
    - *Nodos Clientes y Partes*
    - *Nodos Precedentes y Acordadas CSJ*
  - Relaciones tipo Obsidian: enlaces tipo `fundamenta_en`, `regula_a`, `involucra_a`, `deroga`, con buscador en tiempo real, filtro por etiquetas y panel lateral de inspección de nodo.
- **Compatibilidad con Plugins de Obsidian:**
  - Endpoints compatibles con **Smart Connections** y **Text Generator**:
    - `POST /api/v1/chat/completions`: Formato OpenAI estándar que enruta hacia DeepSeek inyectando contexto legal paraguayo y memoria agéntica.
    - `GET /api/v1/models`: Listado de modelos (`deepseek-chat`, `deepseek-reasoner`, `lexpy-paraguay`).
    - `GET /api/lexpy/obsidian/grafo`: Exporta la red de notas y enlaces en formato JSON compatible con grafos de conocimiento.
  - Manual de configuración rápida para integrar la bóveda local de Obsidian con SysJuridico.

### 3.6. Vinculación y Sincronización con Portal CSJ (Corte Suprema de Justicia)
- **Objetivo:** Permitir al profesional del derecho conectar sus credenciales de la CSJ (Portal de Gestión Jurisdiccional / Judisoft) para sincronizar en tiempo real los expedientes que tiene asignados en tribunales paraguayos.
- **Alcance Funcional:**
  - Configuración y almacenamiento cifrado (AES-256) de credenciales de la CSJ (`usuarioCSJ`, `passwordCSJ`, `matriculaCSJ`).
  - Sincronización automática y bajo demanda de causas: carátula, número de expediente, año, juzgado, secretaría, estado y línea de tiempo de actuaciones judiciales.
  - Indicador de estado de sincronización en `public/expedientes.html` con botón "Sincronizar CSJ" y modal de vinculación.

### 3.7. Editor de Escritos Jurídicos Integrado (Estilo Google Docs / expedientes.click)
- **Objetivo:** Disponer de un procesador de texto legal interactivo propio donde el abogado pueda solicitar redacciones a la IA, editar libremente el contenido, estructurar cláusulas y exportar directamente.
- **Componentes:**
  - Nueva vista `public/editor.html` con script `public/js/editor.js`.
  - Lienzo de edición tipo hoja A4 con márgenes judiciales y barra de herramientas completa (formatos de texto, títulos, alineaciones, listas, sangría, membretes oficiales).
  - **Panel Asistente IA Lateral:**
    - Selector de expediente vinculado para cargar automáticamente las partes, juzgado y hechos del caso.
    - Generador asistido por DeepSeek: demandas, contestaciones, recursos, apelaciones, contratos y oficios.
    - Botones de acción directa: "Insertar en el cursor", "Reemplazar selección", "Mejorar redacción / estilo forense", "Guardar en el expediente" y "Descargar DOCX / PDF / Imprimir".

### 3.8. Lectura Multimodal de Documentos y RAG por Expediente (PDFs, Escaneados, Contratos)
- **Objetivo:** Permitir la subida de archivos adjuntos (PDFs con texto, documentos escaneados, imágenes de escritos, resoluciones) a cada expediente, procesar su contenido con OCR/extracción y habilitar a LexPY para responder preguntas específicas sobre esos documentos.
- **Flujo:**
  - Extracción de texto y metadatos: procesamiento con `pdf-parse` y análisis visual multimodal.
  - Almacenamiento indexado en `DocumentoExpediente`: guarda el texto extraído, entidades clave y resumen.
  - Inyección RAG contextual: cuando el abogado pregunta en LexPY o en el editor sobre un expediente, el sistema recupera los fragmentos de los documentos del caso para responder con precisión y citas literales ("Según el documento subido el 05/11...").

### 3.9. Rediseño Visual Completo (Frontend)
- Adopción de la identidad visual de `expedientes.click` en `public/css/styles.css` y las plantillas HTML:
  - Header y Sidebar modernos con navegación unificada y badges interactivos.
  - Rediseño de tablas de datos con filtros instantáneos, ordenamiento y estados visuales.
  - Selector de modo Oscuro / Claro persistente (`localStorage`).
  - Modal flotante de asistencia LexPY con DeepSeek disponible en todas las vistas.

---

## 4. FUERA DE ALCANCE (Non-Goals)
- No se reemplazará MongoDB por Supabase/PostgreSQL (se mantiene la arquitectura actual en VPS Dokploy).
- No se romperán los esquemas de datos ni las claves foráneas de los clientes/expedientes históricos.
- No se introducirán frameworks frontend pesados que requieran empaquetado complejo (se mantiene HTML5/CSS3/Vanilla JS optimizado para carga instantánea y despliegue simple).

---

## 5. CRITERIOS DE ACEPTACIÓN MEDIBLES
1. **Prueba de DeepSeek AI:** Consultas a través de `/api/lexpy/chat` responden correctamente utilizando `deepseek-chat`, citando leyes paraguayas y antecedentes con latencia < 3s.
2. **Memoria Agéntica:** Las conversaciones sucesivas recuerdan hechos clave del usuario/caso sin reinyectar todo el historial crudo, logrando un ahorro > 75% en tokens de entrada.
3. **Conectores Paraguayos:** Búsquedas sobre normas o fallos de CSJ/BACN retornan datos estructurados o desde caché local.
4. **Grafo Obsidian:** El visualizador en `grafo.html` muestra nodos de causas y leyes interconectados con exploración interactiva fluida.
5. **Compatibilidad Obsidian:** El endpoint `/api/v1/chat/completions` responde en formato OpenAI estándar y puede ser consumido por plugins como Text Generator o Smart Connections.
6. **Coherencia Visual:** Todas las vistas lucen consistentes con el diseño de `expedientes.click` en modo claro y oscuro manteniendo la paleta de SysJuridico.
7. **Seguridad y Secretos:** Cero credenciales expuestas en Git; variables configuradas exclusivamente en `.env`.

---

## 6. SUPOSICIONES Y DEPENDENCIAS
- Conexión saliente a `https://api.deepseek.com` disponible.
- Base de datos MongoDB en Dokploy operativa.
