<div align="center">

# ⚖️ SysJurídico &mdash; Legal Management & AI Forensics Suite

**Plataforma Integral de Gestión Procesal, Cartera Judicial, Control Financiero, Cálculo Laboral y Asistencia Jurídica Inteligente adaptada al Derecho Positivo de la República del Paraguay.**

Potenciado por **Techapyrã IA** y el Motor de Sabiduría Jurídica **OtelaxWisdom**.

[![Versión](https://img.shields.io/badge/versión-3.6.0--PRO--SECURE-0a3d62?style=for-the-badge)](https://zetti.grupooh.online)
[![Node](https://img.shields.io/badge/node.js-%3E%3D22.0-339933?logo=node.js&logoColor=white&style=for-the-badge)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/express-4.21-000000?logo=express&logoColor=white&style=for-the-badge)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/mongodb-8.0-47A248?logo=mongodb&logoColor=white&style=for-the-badge)](https://www.mongodb.com/)
[![Despliegue](https://img.shields.io/badge/despliegue-Dokploy%20%7C%20Traefik-0284c7?style=for-the-badge)](https://dokploy.com/)
[![Licencia](https://img.shields.io/badge/licencia-MIT-f59e0b?style=for-the-badge)](LICENSE)

</div>

---

## 📑 Índice de Contenido

1. [Descripción General](#1-descripción-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Estructura del Proyecto](#3-estructura-del-proyecto)
4. [Módulos Funcionales](#4-módulos-funcionales)
5. [Arquitectura RAG y Flujo de Conocimiento (OtelaxWisdom)](#5-arquitectura-rag-y-flujo-de-conocimiento-otelaxwisdom)
6. [Modelos de Base de Datos y Endpoints API Principales](#6-modelos-de-base-de-datos-y-endpoints-api-principales)
7. [Variables de Entorno (.env)](#7-variables-de-entorno-env)
8. [Instalación Local y Despliegue en Producción (Dokploy)](#8-instalación-local-y-despliegue-en-producción-dokploy)

---

## 1. Descripción General

**SysJurídico** es una solución integral orientada a firmas de abogados, departamentos legales corporativos y litigantes de la República del Paraguay. Su diseño combina el control operativo integral de causas judiciales con un motor cognitivo especializado en derecho positivo paraguayo:

- **SysJurídico (Core Procesal y Financiero):** Gestiona la cartera de litigios, clientes, control de vencimientos, cuenta corriente por honorarios (cuotas y liquidaciones), expedición de tickets de cobro e historial forense.
- **Techapyrã IA:** Asistente jurídico y procesal senior que actúa en tres modos especializados (`MODO_INICIO`, `MODO_CHAT` y `MODO_EDITOR`). Interpreta expedientes reales de MongoDB, lee fojas y escritos adjuntos en formatos Word, PDF e imágenes con OCR, efectúa cómputo de plazos perentorios y redacta piezas judiciales bajo la técnica procesal paraguaya.
- **Motor OtelaxWisdom:** Arquitectura de Recuperación y Generación Aumentada (RAG) de tres capas basada en un acervo curado en Markdown con más de 200 documentos de legislación, acordadas de la Corte Suprema de Justicia (CSJ), códigos de fondo y adjetivos, memoria privada del estudio jurídico y auto-aprendizaje institucional desde portales oficiales `.gov.py`.

---

## 2. Stack Tecnológico

| Capa / Componente | Tecnología | Justificación y Función en SysJurídico |
|---|---|---|
| **Backend Core** | Node.js (≥ 22.x LTS) + Express 4.x | API REST modular de baja latencia con manejo asíncrono y streaming de respuestas. |
| **Persistencia Primaria** | MongoDB 8.x + Mongoose 8.x | Base de datos documental con índices de texto compuesto para expedientes y RAG local. |
| **Procesamiento de Documentos** | `pdf-parse` | Extracción de capa de texto nativo en resoluciones y sentencias judiciales PDF. |
| **Procesamiento de Escritos Word** | `mammoth` | Extracción de texto plano y jerarquía de documentos `.docx` procesales. |
| **Visión e Inteligencia OCR** | `tesseract.js` | Extracción de texto en español (`spa`) vía WebAssembly para imágenes judiciales (.png, .jpg, .webp). |
| **Exportación Forense Nativa** | `docx` | Generación dinámica de escritos descargables con márgenes reglamentarios (4 cm izquierdo, 2 cm derecho). |
| **Frontend de Alto Rendimiento** | JavaScript Vanilla + HTML5 + CSS3 | Interfaz sin sobrecarga de frameworks, reactiva, tema blanco institucional y consumo mínimo de memoria. |
| **Seguridad de Red y Sesión** | `jsonwebtoken`, `bcryptjs`, `helmet`, `cors`, `express-rate-limit` | Cifrado de contraseñas, tokens JWT, protección DDoS, sanitización de encabezados y CORS estricto. |
| **Inferencia de IA Principal** | Google GenAI SDK (`@google/genai`) / Gemini 2.5 Pro | Motor analítico jurídico con grounding de fuentes y razonamiento legal riguroso. |
| **Contenedorización** | Docker (Node.js 22 Alpine) | Imagen liviana con dependencias nativas de sincronización (`git`, `tar`, `curl`). |
| **Despliegue y Orquestación** | Dokploy + Traefik | Despliegue continuo en VPS, proxy inverso, balanceo y SSL automático Let's Encrypt. |

---

## 3. Estructura del Proyecto

```text
SysJuridico/
├── Dockerfile                     # Imagen de producción en Node 22 Alpine con herramientas de sincronización
├── package.json                   # Dependencias de producción y scripts de mantenimiento
├── README.md                      # Mapa técnico y documentación maestra del sistema
├── bundled/
│   └── acervo/                    # Acervo normativo base empaquetado (fuera de volúmenes persistentes)
├── data/
│   └── otelaxwisdom/              # Volumen persistente (/app/data en producción)
│       ├── acervo/                # Normas activas curadas (.md) sincronizadas
│       ├── auto-aprendido/        # Aprendizajes indexados automáticamente desde .gov.py
│       └── memoria-estudio/       # Memoria privada, estilo forense y cronologías por causa
├── public/                        # Frontend institucional en JavaScript Vanilla
│   ├── index.html                 # Tablero ejecutivo de mando y consulta rápida
│   ├── expedientes.html           # Gestión de expedientes, cronología viva y fojas
│   ├── editor.html                # Editor Judicial forense con guardado automático y versionado
│   ├── lexpy.html                 # Chat Jurídico Techapyrã IA con carga de archivos y vinculación
│   ├── otelaxwisdom.html          # Panel de administración y sincronización del acervo legal
│   ├── liquidacion.html           # Calculadora de indemnizaciones laborales Ley 213/93
│   ├── css/                       # Estilos institucionales y diseño forense profesional
│   └── js/                        # Controladores frontend (dashboard, editor, expedientes, etc.)
├── server/
│   ├── config/
│   │   ├── db.js                  # Conexión resiliente a MongoDB con Mongoose
│   │   └── techapyraSystemPrompt.js # System Prompt Maestro unificado (Inicio, Chat, Editor)
│   ├── controllers/               # Controladores HTTP de cada dominio procesal
│   ├── middleware/                # Autenticación JWT, control de roles y manejo global de errores
│   ├── models/                    # Esquemas Mongoose (Expediente, DocumentoExpediente, BorradorEditor, etc.)
│   ├── routes/                    # Declaración modular de rutas REST
│   ├── services/                  # Lógica de negocio, RAG, sincronización, OCR y enrutamiento de memoria
│   └── server.js                  # Entrada principal del servidor HTTP y bootstrap
└── scripts/                       # Scripts auxiliares de ingesta, seed y utilidades
```

---

## 4. Módulos Funcionales

### A. Inicio (Dashboard Ejecutivo)
- **Supervisión de Cartera:** Monitorea en tiempo real expedientes activos, novedades del día, plazos en riesgo de caducidad de instancia (Art. 172 CPC: 3 meses en primera instancia, 6 meses en segunda) y finanzas del estudio.
- **Asistente `MODO_INICIO`:** Integra una barra de consulta que responde sobre el estado global de causas, audiencias y documentos cargados con resúmenes claros.

### B. Expedientes y Cronología Viva
- **Gestión Integral de Causas:** Registro de carátula, número/año, juzgado, circunscripción, partes, cuantía, radicación judicial y fojas.
- **Eliminación Segura en Cascada:** Al eliminar un expediente, se borran automáticamente sus documentos asociados (`DocumentoExpediente`), créditos, movimientos financieros y citas en agenda.
- **Gestión Documental Multiformato:** Subida y almacenamiento seguro de resoluciones, providencias y escritos en `.pdf`, `.docx`, `.png`, `.jpg` y `.txt`. Extracción de texto y detección de fojas escaneadas sin OCR.
- **Cronología y Memoria IA:** Historial cronológico de actuaciones procesales, consultas de chat vinculadas y borradores generados desde el Editor, respaldados en MongoDB y en disco Markdown.

### C. Chat Jurídico (Techapyrã IA)
- **Modo `MODO_CHAT`:** Conduce análisis jurídicos profundos, cómputo estricto de plazos procesales (días hábiles vs. corridos según CPC y CPP) y formulación de estrategias procesales.
- **Análisis de Archivos en Línea:** Admite adjuntar escritos Word (`.docx`), documentos PDF e imágenes de cédulas o notificaciones procesales mediante botón 📎 o arrastrar y soltar (*drag & drop*).
- **Enrutamiento Inteligente de Memoria:** Clasifica cada respuesta para nutrir la memoria de la causa, archivar conocimiento nuevo o descartar consultas generales sin generar ruido.

### D. Editor Jurídico Forense
- **Modo `MODO_EDITOR`:** Diseñado con parámetros de formato judicial de Paraguay: encabezado formal (`OBJETO:`, `SEÑOR JUEZ:`), personería procesal, hechos cronológicos, derecho positivo, petitorio numerado y cierre de estilo (*"PROVEER DE CONFORMIDAD Y SERÁ JUSTICIA"*).
- **Persistencia y Versionado Automático:** Guarda automáticamente borradores en MongoDB (`BorradorEditor`), manteniendo versiones históricas (`v1`, `v2`, `v3`...), autoría y fecha.
- **Vinculación a la Causa:** Si el escrito está asociado a un expediente, se sincroniza como documento oficial y genera un hito en la cronología viva de la causa.
- **Exportación a `.docx` Nativo:** Genera documentos Word con márgenes judiciales regulados (4 cm izquierdo, 2 cm derecho) y tipografía formal.

### E. OtelaxWisdom (Motor de Conocimiento)
- **Tres Pestañas de Sabiduría:**
  1. *Acervo Nacional (ZETTI):* 8 fueros jurídicos paraguayos y leyes especiales curadas en archivos `.md`.
  2. *Memoria Privada del Estudio:* Directrices forenses internas (`estilo-forense-estudio.md`), modelos de escritos y fichas de clientes.
  3. *Auto-Aprendido (.gov.py):* Conocimiento oficial descargado, validado e indexado dinámicamente desde portales del Estado paraguayo.
- **Sincronización Idempotente:** Sincroniza contra el repositorio oficial `FUDAPY/LESGILACION_PARAGUAYA_ZETTI` mediante Git o descarga directa por tarball HTTPS.

---

## 5. Arquitectura RAG y Flujo de Conocimiento (OtelaxWisdom)

```mermaid
flowchart TD
    User([Consulta / Redacción del Abogado]) --> ContextRouter{¿Tiene Expediente o Archivo?}
    
    ContextRouter -- Sí --> Capa1[Capa 1: Expedientes, PDFs, Word, OCR y Memoria de Causa]
    ContextRouter -- No / Complemento --> Capa2[Capa 2: Acervo OtelaxWisdom Local - minScore >= 25]
    
    Capa1 --> Evaluador{¿Información suficiente y relevante?}
    Capa2 --> Evaluador
    
    Evaluador -- Cobertura Alta --> PromptMaster[System Prompt Maestro: techapyraSystemPrompt.js]
    Evaluador -- Insuficiente / Sin norma orgánica --> Capa3[Capa 3: Fallback Web Institucional .gov.py]
    
    Capa3 --> Scraping[Descarga oficial BACN / CSJ / Portales Ministeriales]
    Scraping --> AutoLearn[Guardado en /app/data/otelaxwisdom/auto-aprendido/]
    AutoLearn --> PromptMaster
    
    PromptMaster --> LLM[Inferencia IA: Gemini 2.5 Pro / DeepSeek]
    LLM --> MemoriaRouter[server/services/memoriaRouterService.js]
    
    MemoriaRouter -->|Causa identificada| DestinoA[(Destino A: Memoria Expediente MongoDB + .md)]
    MemoriaRouter -->|Doctrina / Modelo nuevo| DestinoB[(Destino B: Auto-Aprendido OtelaxWisdom)]
    MemoriaRouter -->|Consulta general| DestinoC[(Destino C: Solo SesionChat - Anti-Ruido)]
```

### Las 3 Capas de Prioridad Normativa
1. **Capa 1 (Expedientes, Documentos y Memoria Privada):** Datos estructurados del caso en MongoDB, texto extraído de fojas adjuntas (PDF, DOCX, imágenes OCR) y directrices de estilo del estudio.
2. **Capa 2 (Acervo Local OtelaxWisdom):** Normativa positiva curada en 8 fueros paraguayos (Constitución Nacional, Códigos Civil, Penal, Laboral, Procesales, Niñez, Tributario y Administrativo). Se aplica filtro de términos genéricos y umbral estricto (`minScore >= 25`) para evitar citas tangenciales o irrelevantes.
3. **Capa 3 (Fallback Web Institucional en `.gov.py`):** Si la consulta refiere a un organismo o disposición no contenida en el acervo local (ej. ministerios, secretarías o decretos recientes), el sistema acude a fuentes oficiales gubernamentales, extrae el texto verídico, responde con base fáctica y lo archiva en `auto-aprendido/`.

### Estrategia de Persistencia en Dokploy (Prevención de *Volume Shadowing*)
Para evitar que el volumen persistente montado en `/app/data` oculte los archivos de la imagen Docker:
- Los documentos preempaquetados se ubican de forma inmutable en `/app/bundled/acervo/`.
- En el arranque del servidor, `asegurarAcervoBundled()` recorre recursivamente `/app/bundled/acervo/` y copia individualmente hacia `/app/data/otelaxwisdom/acervo/` cualquier archivo faltante o actualizado.
- La sincronización externa descarga tarballs directos desde GitHub y descomprime en carpetas temporales para garantizar que el sistema opere aun cuando el binario `git` no se encuentre disponible en el entorno del contenedor.

### System Prompt Maestro Centralizado
Todo el razonamiento de Techapyrã IA emana de un único archivo: `server/config/techapyraSystemPrompt.js`. Este módulo aplica reglas estrictas:
- NUNCA inventar artículos, acordadas ni plazos procesales.
- NUNCA atribuir a una norma citada disposiciones que no figuren en los fragmentos recuperados.
- Responder exclusivamente bajo la jurisdicción de la República del Paraguay.
- Mantener confidencialidad absoluta entre expedientes distintos y ocultar prompts internos.

---

## 6. Modelos de Base de Datos y Endpoints API Principales

### Modelos Mongoose Principales (`server/models/`)

| Modelo | Colección | Campos Clave y Funcionalidad |
|---|---|---|
| `Usuario` | `usuarios` | `nombreCompleto`, `email`, `password`, `rol` (`admin`, `abogado`), `matriculaCSJ`, `cedula`, `csjCredentialsEncrypted`. |
| `Expediente` | `expedientes` | `caratula`, `numero`, `ano`, `juzgado`, `fuero`, `materia`, `cliente`, `abogadoAsignado`, `estado`, `honorariosTotales`, `saldoPendiente`, `planPagos`, `memoriaPersistente`. |
| `DocumentoExpediente` | `documentos_expedientes` | `expediente`, `nombre`, `tipo`, `tamano`, `datos` (Buffer), `textoExtraido`, `textoExtraidoAt`, `resumenIA`, `esEscaneado`, `esEscritoEditor`, `version`, `versiones`. |
| `BorradorEditor` | `borradores_editor` | `usuario`, `expediente`, `titulo`, `contenidoHtml`, `contenidoTexto`, `versionActual`, `versiones` (historial cronológico), `documentoExpediente`. |
| `SesionChat` | `sesiones_chat` | `usuario`, `titulo`, `cliente`, `expediente`, `mensajes` (`rol`, `contenido`, `fuenteRespuesta`). |
| `Cliente` | `clientes` | `nombreCompleto`, `cedula`, `ruc`, `telefono`, `email`, `direccion`, `creadoPor`. |
| `Credito` | `creditos` | `cliente`, `expediente`, `concepto`, `montoTotal`, `saldoPendiente`, `pagos` (control de honorarios). |
| `EventoAgenda` | `eventos_agenda` | `titulo`, `tipo` (`vencimiento`, `audiencia`, `reunion`), `fechaInicio`, `fechaFin`, `expediente`, `responsable`, `estado`. |
| `LiquidacionLaboral` | `liquidaciones_laborales` | `trabajadorNombre`, `fechaIngreso`, `fechaSalida`, `salarioBase`, `motivoSalida`, `rubros`, `totalLiquidacion`. |
| `MovimientoFinanciero`| `movimientos_financieros` | `tipo` (`ingreso`, `egreso`), `monto`, `fecha`, `categoria`, `cliente`, `expediente`. |
| `BaseLegal` | `bases_legales` | `titulo`, `numeroLey`, `tipoNorma`, `fuero`, `estadoNormativo` (`VIGENTE`, `MODIFICADA`, `DEROGADA`), `articulos`. |

### Endpoints API Principales (`server/routes/`)

| Método | Endpoint | Middleware | Descripción y Propósito |
|---|---|---|---|
| `POST` | `/api/auth/login` | Público | Autenticación de usuarios y generación de token JWT. |
| `GET` | `/api/auth/perfil` | `protect` | Obtiene el perfil forense y credenciales del usuario autenticado. |
| `GET` | `/api/dashboard` | `protect`, `admin` | Métricas ejecutivas globales, flujo de caja y resumen procesal. |
| `GET` | `/api/dashboard/mi-dia`| `protect` | Resumen de audiencias, vencimientos y causas del abogado logueado. |
| `GET` | `/api/expedientes` | `protect` | Lista expedientes con control de acceso (admin: todos; abogado: asignados/compartidos). |
| `POST` | `/api/expedientes` | `protect` | Registra nueva causa judicial con generación automática de plan de honorarios. |
| `GET` | `/api/expedientes/:id` | `protect` | Detalle exhaustivo de una causa, partes intervinientes y saldo. |
| `DELETE` | `/api/expedientes/:id` | `protect` | Eliminación en cascada de expediente y todas sus entidades dependientes. |
| `POST` | `/api/expedientes/:id/actuaciones` | `protect` | Registra un hito en la memoria viva y cronología persistente de la causa. |
| `GET` | `/api/expedientes/:id/documentos` | `protect` | Lista los metadatos de archivos adjuntos a un expediente. |
| `POST` | `/api/expedientes/:id/documentos` | `protect` | Sube archivo (.pdf, .docx, .png), extrae texto y genera resumen analítico. |
| `POST` | `/api/lexpy/chat` | `protect` | Consulta técnica a Techapyrã IA con soporte de adjuntos, memoria viva y enrutamiento. |
| `POST` | `/api/lexpy/redactar` | `protect` | Genera borradores completos de demandas, contestaciones y contratos. |
| `POST` | `/api/v1/editor/guardar` | `protect` | Guarda y versiona automáticamente escritos judiciales vinculados o independientes. |
| `GET` | `/api/v1/editor/borradores` | `protect` | Lista borradores guardados del usuario en el Editor Forense. |
| `POST` | `/api/v1/editor/export-docx` | `protect` | Genera y descarga archivo binario `.docx` con formato judicial paraguayo. |
| `GET` | `/api/otelaxwisdom` | `protect` | Consulta el catálogo completo de normas curadas en el acervo local. |
| `POST` | `/api/otelaxwisdom/sync-github` | `protect`, `admin` | Dispara sincronización oficial contra el repositorio de legislación paraguaya. |
| `POST` | `/api/liquidacion/calcular` | `protect` | Calcula liquidación laboral conforme a los artículos 79 a 92 del Código del Trabajo. |

---

## 7. Variables de Entorno (.env)

El sistema requiere las siguientes variables de configuración en su entorno de ejecución:

| Variable | Obligatoria | Descripción y Uso |
|---|---|---|
| `NODE_ENV` | Sí | Entorno de ejecución (`development` o `production`). |
| `PORT` | Sí | Puerto TCP de escucha para el servidor HTTP (por defecto `4000`). |
| `HOST` | No | Dirección IP de enlace de red (por defecto `0.0.0.0`). |
| `DATABASE_URL` | Sí | Cadena de conexión completa a la base de datos MongoDB. |
| `JWT_SECRET` | Sí | Frase secreta criptográfica utilizada para firmar los tokens de sesión JWT. |
| `JWT_EXPIRES_IN` | No | Tiempo de vigencia del token JWT emitido (ej. `7d`, `24h`). |
| `ADMIN_SEED_EMAIL` | No | Correo electrónico inicial para la creación del usuario administrador predeterminado. |
| `ADMIN_SEED_PASSWORD`| No | Contraseña inicial para el usuario administrador predeterminado. |
| `GEMINI_API_KEY` | Sí | Clave de acceso a la API oficial de Google Gemini (`@google/genai`). |
| `GEMINI_MODEL` | No | Identificador del modelo Gemini a utilizar (por defecto `gemini-2.5-pro`). |
| `CSJ_ENCRYPTION_KEY` | No | Clave simétrica AES-256 para el almacenamiento cifrado de credenciales del portal CSJ. |
| `OTELAX_BUNDLED_DIR` | No | Ruta del acervo preempaquetado fuera del volumen montado (por defecto `/app/bundled/acervo`). |
| `OTELAXWISDOM_DATA_DIR` | No | Directorio destino para los archivos activos de legislación (por defecto `/app/data/otelaxwisdom/acervo`). |
| `REPO_LEGISLACION_URL` | No | URL del repositorio Git oficial para sincronización legislativa. |
| `REPO_LEGISLACION_TARBALL_URL` | No | URL pública para la descarga directa del tarball de legislación en GitHub. |
| `LEXPY_AI_PROVIDER` | No | Proveedor de IA alternativo para entornos compatibles (`gemini`, `deepseek`, `openai`). |
| `LEXPY_AI_API_KEY` | No | Clave de API para proveedores alternativos de IA. |
| `LEXPY_AI_BASE_URL` | No | URL base de la API de IA alternativa (ej. `https://api.deepseek.com/v1`). |
| `LEXPY_AI_MODEL` | No | Modelo a emplear en el proveedor alternativo (ej. `deepseek-chat`). |

---

## 8. Instalación Local y Despliegue en Producción (Dokploy)

### A. Ejecución en Entorno Local (Desarrollo)

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/FUDAPY/SysJuridico.git
   cd SysJuridico
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Cree un archivo `.env` en la raíz del proyecto tomando como referencia las variables descritas en la sección anterior:
   ```bash
   NODE_ENV=development
   PORT=4000
   DATABASE_URL=mongodb://localhost:27017/sysjuridico
   JWT_SECRET=clave_secreta_de_desarrollo_insegura_cambiar_en_produccion
   GEMINI_API_KEY=tu_api_key_de_gemini
   ```

4. **Inicializar datos y acervo:**
   ```bash
   npm run seed:admin
   npm run seed:wisdom
   ```

5. **Iniciar en modo desarrollo:**
   ```bash
   npm run dev
   ```
   Acceda a través del navegador en `http://localhost:4000`.

---

### B. Despliegue en Producción con Dokploy

1. **Configuración de Aplicación en Dokploy:**
   - Tipo de proyecto: **Application**.
   - Origen: Repositorio GitHub vinculado (`main` branch).
   - Build Type: **Dockerfile**.
   - Puerto de contenedor expuesto: `4000`.

2. **Volumen Persistente Obligatorio:**
   Configure un volumen persistente para resguardar los archivos generados y los aprendizajes de la IA:
   - **Host Path:** `/var/lib/dokploy/data/sysjuridico-data` (o ruta asignada por el panel).
   - **Mount Path:** `/app/data`

3. **Variables de Entorno en el Panel de Dokploy:**
   Cargue obligatoriamente en la sección **Environment**:
   - `NODE_ENV=production`
   - `PORT=4000`
   - `DATABASE_URL=mongodb://usuario:contraseña@servidor_mongo:27017/sysjuridico?authSource=admin`
   - `JWT_SECRET=super_secret_jwt_key_produccion`
   - `GEMINI_API_KEY=tu_api_key_de_gemini_produccion`

4. **Verificación de Logs tras el Despliegue:**
   Al iniciar el contenedor, compruebe en los registros de consola que el acervo empaquetado sea detectado y copiado al volumen persistente:
   ```text
   [OtelaxWisdom] Bundled path: /app/bundled/acervo (215 archivos .md encontrados) -> Destino: /app/data/otelaxwisdom/acervo (215 archivos .md activos)
   [MongoDB] Conectado exitosamente
   [SysJurídico] Servidor ejecutándose en el puerto 4000
   ```
   Si se requiere una actualización inmediata de leyes, acceda al panel **Gestor OtelaxWisdom** (`/otelaxwisdom.html`) con credenciales de administrador y presione **Sincronizar Acervo**.

---

## 9. Licencia

Este proyecto se distribuye bajo los términos de la **Licencia MIT**. Consulte el archivo [LICENSE](LICENSE) para más detalles.
