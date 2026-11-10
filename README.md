<div align="center">

# ⚖️ SysJurídico &mdash; Legal Management & AI Intelligence Suite

**Sistema integral de gestión judicial, control financiero, cálculo laboral y asistencia jurídica inteligente adaptada a la Legislación de la República del Paraguay.**

Diseñado bajo una arquitectura modular de alto rendimiento, optimizada para despliegues en VPS con Dokploy, Traefik y MongoDB.

[![Version](https://img.shields.io/badge/versión-2.5.0-0a3d62?style=for-the-badge)](https://dev.grupooh.online/)
[![Node](https://img.shields.io/badge/node.js-%3E%3D20.0-339933?logo=node.js&logoColor=white&style=for-the-badge)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/express-4.21-000000?logo=express&logoColor=white&style=for-the-badge)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/mongodb-8.0-47A248?logo=mongodb&logoColor=white&style=for-the-badge)](https://www.mongodb.com/)
[![Dokploy](https://img.shields.io/badge/deployment-Dokploy%20%7C%20Traefik-0284c7?style=for-the-badge)](https://dokploy.com/)
[![License](https://img.shields.io/badge/licencia-MIT-f59e0b?style=for-the-badge)](LICENSE)

</div>

---

## 📑 Tabla de Contenidos

1. [Descripción General](#-descripción-general)
2. [Stack Tecnológico y Herramientas](#-stack-tecnológico-y-herramientas)
3. [Módulos y Capacidades del Sistema](#-módulos-y-capacidades-del-sistema)
4. [Arquitectura de Inteligencia Artificial & RAG Local](#-arquitectura-de-inteligencia-artificial--rag-local)
5. [Estructura del Proyecto](#-estructura-del-proyecto)
6. [Instalación y Configuración](#-instalación-y-configuración)
7. [Variables de Entorno](#-variables-de-entorno)
8. [API REST & Endpoints Clave](#-api-rest--endpoints-clave)
9. [Seguridad y Políticas de Despliegue](#-seguridad-y-políticas-de-despliegue)
10. [Licencia y Créditos Institucionales](#-licencia-y-créditos-institucionales)

---

## 📖 Descripción General

**SysJurídico** es una plataforma profesional para despachos forenses y estudios jurídicos que consolida en un solo entorno el seguimiento de litigios, la facturación de honorarios mediante créditos y cobranzas, la agenda de vencimientos procesales, el cálculo automatizado de liquidaciones laborales y la asistencia legal en tiempo real mediante **Techapyrã IA**.

El sistema combina la velocidad de una API REST moderna en Node.js con un frontend estático ultra liviano en JavaScript vanilla (sin sobrecarga de frameworks), integrando un motor RAG (*Retrieval-Augmented Generation*) local que consulta tanto bases normativas indexadas en MongoDB como fuentes públicas oficiales paraguayas (CSJ, BACN, SILpy y Digesto Jurídico).

---

## 🛠️ Stack Tecnológico y Herramientas

SysJurídico implementa tecnologías probadas y de alta eficiencia para garantizar disponibilidad 24/7 y tiempos de respuesta inferiores a 100 ms:

| Capa | Componente | Descripción y Uso |
|---|---|---|
| **Backend Core** | Node.js (≥ v20 LTS) + Express 4.x | Servidor HTTP RESTful, middlewares de validación, compresión y enrutamiento modular. |
| **Persistencia** | MongoDB 8.x + Mongoose 8.x | Esquemas estructurados, índices de texto compuesto para RAG y transacciones ACID. |
| **Autenticación** | JWT (`jsonwebtoken`) + `bcryptjs` | Tokens con caducidad configurable, cifrado robusto de contraseñas y control de acceso por roles (`admin`, `abogado`). |
| **Seguridad HTTP** | `helmet`, `cors`, `express-rate-limit` | Protección contra XSS, sanitización de cabeceras, limitador de peticiones contra ataques DDoS. |
| **Frontend** | HTML5 Semántico + CSS3 Variables + JS Vanilla | Interfaz responsiva inspirada en plataformas SaaS de alta gama, con modo oscuro/claro nativo, Bento cards y componentes modales. |
| **Visualización** | D3.js v7 (Data-Driven Documents) | Renderizado de la Red de Conocimiento en canvas interactivo tipo Obsidian Graph View. |
| **Motor de IA (Techapyrã IA)** | DeepSeek V3 (`deepseek-chat`) / OpenAI / Gemini | Motor analítico jurídico para dictámenes, síntesis de doctrina CSJ y redacción forense. |
| **RAG & Procesamiento** | RAG Híbrido (MongoDB + Text Index) + `pdf-parse` | Extracción de texto de fojas y documentos procesales, búsqueda por similitud y coincidencia exacta de normas. |
| **Web Scraping Forense** | `axios` + `cheerio` | Conectores HTTP para extracción en tiempo real de resoluciones, acuerdos y leyes desde portales oficiales. |
| **Impresión Térmica** | CSS Paged Media `@media print` (80mm) | Formateo e impresión directa de tickets de pago para impresoras térmicas de punto de venta. |
| **Infraestructura** | Docker + Docker Compose + Traefik + Dokploy | Contenedorización, certificados SSL automáticos vía Let's Encrypt y despliegue continuo en VPS. |

---

## 🚀 Módulos y Capacidades del Sistema

### 1. Centro Operativo / Asistente Jurídico (Inicio)
- **Briefing Matutino:** Resumen diario de prioridades, plazos perentorios y caducidades procesales conforme al Art. 172 del Código Procesal Civil Paraguayo.
- **Jurisprudencia CSJ Destacada:** Carrusel interactivo con fallos y doctrinas de la Corte Suprema de Justicia clasificados por fuero.
- **KPIs Estratégicos:** Métricas en tiempo real de novedades procesales, plazos fatales, causas para impulsar y cobranzas pendientes.
- **Buscador Multimodal:** Búsqueda unificada en causas internas y jurisprudencia externa con autocompletado y mención `@expediente`.

### 2. Gestión de Expedientes Judiciales & Honorarios
- **Ficha Integral de Causa:** Carátula, número, año, juzgado/despacho, circunscripción judicial, materia, tipo de proceso y fase procesal.
- **Generación Automática de Créditos:** Vinculación directa con el plan de pagos y cuotas de honorarios al momento de crear el expediente.
- **Auditoría Procesal:** Registro de última actuación, fechas de visto y botón de eliminación segura con confirmación.
- **Filtros Avanzados y Exportación:** Filtrado por despacho, estado (activo/archivado), modo focus para concentración forense y exportación a formato CSV.

### 3. Créditos, Cobranzas & Comprobantes POS de 80 mm
- **Control Financiero:** Seguimiento de capital pactado, saldo restante y estado de cuotas por cliente y causa judicial.
- **Emisión de Tickets Térmicos:** Generación instantánea de tickets de 80 mm adaptados para impresoras de recibos térmicos con membrete formal, detalle de cuota y firma del estudio.
- **Reimpresión Directa:** Historial de comprobantes con botón de reimpresión rápida.

### 4. Agenda Jurídica & Audiencias
- **Calendario Forense:** Visualización mensual y semanal de audiencias preliminares, juicios orales, traslados y reuniones.
- **Alertas Procesales:** Código de colores por urgencia y asignación de abogado responsable.

### 5. Calculadora Laboral MTESS (Ley 213/93)
- **Asistente de 4 Pasos:** Liquidación precisa por despido injustificado, retiro justificado o renuncia conforme al Código Laboral Paraguayo.
- **Cálculo Exacto de Rubros:** Preaviso, indemnización legal por antigüedad escalonada, aguinaldo proporcional, vacaciones causadas y proporcionales, y retención de aporte obrero IPS (9%).
- **Exportación A4 Oficial:** Generación de informe imprimible en formato A4 listo para presentación ante el Ministerio de Trabajo, Empleo y Seguridad Social (MTESS).

### 6. Editor Judicial Integrado
- **Lienzo Judicial A4:** Procesador de texto forense enriquecido con formato de fojas, márgenes judiciales reglamentarios y plantillas estándar.
- **Inserción Inteligente:** Botón de consulta al asistente Techapyrã para insertar cláusulas contractuales o argumentos de contestación en la posición del cursor.
- **Exportación Versátil:** Descarga en documentos editables `.docx`, formato `.pdf` e impresión formal.

### 7. Red de Conocimiento Obsidian (Graph View Local)
- **Visualización Topológica:** Renderizado con simulación de fuerzas D3.js de todas las leyes de `BaseLegal`, acuerdos CSJ, causas judiciales, clientes y conceptos doctrinarios.
- **Ejecución Local en Dokploy:** Opera de manera autónoma en el servidor VPS sin requerir software de terceros ni servicios externos de pago.
- **Panel Inspector:** Drawer lateral con detalle de articulados, metadatos y enlaces directos a la fuente original de la norma.

---

## 🧠 Arquitectura de Inteligencia Artificial & RAG Local

SysJurídico implementa una arquitectura híbrida de tres niveles para garantizar respuestas jurídicamente fundadas y verificables:

```
                  ┌──────────────────────────────────────────────┐
                  │              Usuario / Abogado               │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │            Techapyrã IA Engine               │
                  │   (Orquestador Semántico / aiProviderService) │
                  └──────────────────────┬───────────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
     ┌─────────────────────────────┐           ┌─────────────────────────────┐
     │      NIVEL 1: RAG LOCAL     │           │ NIVEL 2: CONECTORES EN VIVO │
     ├─────────────────────────────┤           ├─────────────────────────────┤
     │ • BaseLegal (Leyes/Códigos) │           │ • CSJ Jurisprudencia        │
     │ • AprendizajeSistema        │           │ • BACN (Congreso Nacional)  │
     │ • DocumentoExpediente (OCR) │           │ • SILpy / Digesto Jurídico  │
     │ • MemoriaAgente (Contexto)  │           │ • Scraping determinista     │
     └──────────────┬──────────────┘           └──────────────┬──────────────┘
                    │                                         │
                    └────────────────────┬────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │             SÍNTESIS Y PROVEEDOR             │
                  │   DeepSeek V3 / OpenAI / Gemini / Groq       │
                  │   Formateo estricto en Markdown forense      │
                  └──────────────────────────────────────────────┘
```

1. **Recuperación Local Determinista:** Cuando el usuario consulta sobre una ley específica (p. ej., Ley 1462/1935 o Ley 6715/2021), el motor localiza el registro exacto en MongoDB mediante coincidencia de número normativo antes de aplicar búsqueda textual, evitando falsos positivos y contexto irrelevante.
2. **Scraping Oficial de Respaldo:** Si la norma o fallo no se encuentra indexada, los conectores extraen la información oficial directamente desde portales públicos del Estado Paraguayo.
3. **Respuesta Estructurada:** La IA sintetiza el fundamento legal citando ley, artículo, estado de vigencia y URL oficial, entregando el resultado en Markdown limpio y sin divagaciones.

---

## 📂 Estructura del Proyecto

```
SysJuridico/
├── .env.example              # Plantilla de variables de entorno (sin secretos)
├── .gitignore                # Reglas estrictas de exclusión de credenciales y planes
├── docker-compose.yml        # Configuración de servicios (App + Traefik)
├── Dockerfile                # Imagen optimizada en Node.js 20 Alpine
├── package.json              # Dependencias y scripts de ejecución
├── LICENSE                   # Licencia MIT de libre distribución
├── public/                   # Frontend estático servido por Express
│   ├── css/
│   │   └── styles.css        # Sistema de diseño, temas dark/light y estilos de impresión
│   ├── js/
│   │   ├── api.js            # Cliente HTTP, navegación lateral y pie de página
│   │   ├── dashboard.js      # Lógica del Centro Operativo y briefing matutino
│   │   ├── expedientes.js    # CRUD de causas, modal de carga y exportación
│   │   ├── creditos.js       # Cobranzas y generación de tickets 80mm
│   │   ├── editor.js         # Procesador de texto judicial y exportador
│   │   ├── grafo.js          # Simulación D3.js para la Red de Conocimiento
│   │   ├── lexpy.js          # Chat forense y redactor de escritos con Techapyrã
│   │   └── liquidacion.js    # Motor de cálculo laboral MTESS
│   ├── index.html            # Vista principal (Inicio / Asistente Jurídico)
│   ├── expedientes.html      # Módulo de causas judiciales
│   ├── creditos.html         # Módulo de créditos y cobranzas
│   ├── editor.html           # Módulo de redacción forense
│   ├── grafo.html            # Módulo de grafo Obsidian
│   ├── lexpy.html            # Módulo de chat y redactor legal
│   ├── liquidacion.html      # Módulo de liquidación laboral
│   ├── agenda.html           # Calendario judicial
│   └── login.html            # Portal de autenticación
├── scripts/
│   ├── seed-admin.js         # Creación del usuario administrador inicial
│   ├── migrate-firestore.js  # Migración histórica desde Firebase Firestore
│   └── inspect-firestore.js  # Diagnóstico de colecciones legadas
└── server/
    ├── server.js             # Punto de entrada de la aplicación Express
    ├── config/
    │   └── db.js             # Conexión persistente a MongoDB con Mongoose
    ├── controllers/          # Controladores de negocio por módulo
    ├── middleware/           # Autenticación JWT y manejador global de errores
    ├── models/               # Modelos de datos (Expediente, Credito, BaseLegal, etc.)
    ├── routes/               # Enrutadores RESTful versionados
    ├── services/             # Lógica pesada (IA, Scraping, RAG, Liquidación, CSJ Sync)
    └── utils/                # Utilidades de respuesta HTTP y errores tipados
```

---

## ⚡ Instalación y Configuración

### Requisitos del Sistema
- **Node.js**: v20.x o superior
- **MongoDB**: v7.0 o v8.0 (instancia local, réplica o servicio gestionado)
- **Gestor de paquetes**: `npm` v10+

### Paso a Paso

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/FUDAPY/SysJuridico.git
   cd SysJuridico
   ```

2. **Instalar dependencias de producción:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   ```bash
   cp .env.example .env
   # Editar .env con tus credenciales seguras
   ```

4. **Inicializar la cuenta administradora:**
   ```bash
   npm run seed:admin
   ```

5. **(Opcional) Migración de datos legados de Firebase:**
   ```bash
   # Requiere configurar FIREBASE_SERVICE_ACCOUNT_PATH en el .env
   npm run migrate:firestore
   ```

6. **Iniciar el servidor:**
   ```bash
   # Modo desarrollo con recarga en caliente:
   npm run dev

   # Modo producción:
   npm start
   ```

---

## 🔐 Variables de Entorno

Configuradas mediante el archivo `.env` en la raíz (nunca versionado en git):

| Clave | Obligatoria | Valor por Defecto | Descripción |
|---|---|---|---|
| `PORT` | No | `4000` | Puerto en el que escucha el servidor Express. |
| `DATABASE_URL` | **Sí** | &mdash; | Cadena de conexión MongoDB (`mongodb://user:pass@host:27017/db?authSource=admin`). |
| `JWT_SECRET` | **Sí** | &mdash; | Cadena criptográfica de alta entropía para firmar tokens de sesión. |
| `JWT_EXPIRES_IN` | No | `8h` | Período de vigencia del token de autenticación. |
| `ADMIN_SEED_EMAIL` | **Sí** | &mdash; | Correo electrónico para el administrador creado por `seed-admin`. |
| `ADMIN_SEED_PASSWORD` | **Sí** | &mdash; | Contraseña segura para el administrador inicial. |
| `LEXPY_AI_PROVIDER` | No | `deepseek` | Proveedor del motor inteligente: `deepseek`, `openai`, `gemini`, `openrouter`, `groq` o `none`. |
| `LEXPY_AI_API_KEY` | Condicional | &mdash; | Clave de API del proveedor seleccionado. |
| `LEXPY_AI_MODEL` | No | `deepseek-chat` | Modelo específico a consumir por Techapyrã IA. |
| `FIREBASE_SERVICE_ACCOUNT_PATH`| No | &mdash; | Ruta absoluta al archivo JSON de credenciales de Firebase (solo para migración). |

---

## 📡 API REST & Endpoints Clave

Todos los endpoints (excepto login y health) requieren la cabecera `Authorization: Bearer <TOKEN_JWT>`.

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/auth/login` | Autentica credenciales y entrega el token JWT. |
| `GET` | `/api/dashboard` | Retorna métricas de ingresos, causas y saldos pendientes. |
| `GET` | `/api/dashboard/mi-dia` | Entrega el briefing de plazos, vencimientos y caducidades. |
| `GET/POST` | `/api/expedientes` | Lista causas judiciales con filtros o registra una nueva con crédito opcional. |
| `GET/PUT/DELETE`| `/api/expedientes/:id` | Consulta, actualiza o elimina un expediente del sistema. |
| `POST` | `/api/expedientes/csj/sincronizar` | Sincroniza actuaciones directamente desde el portal de la CSJ. |
| `GET/POST` | `/api/creditos` | Lista créditos o registra cobros con cálculo de saldo remanente. |
| `POST` | `/api/liquidaciones/calcular` | Ejecuta el cálculo laboral bajo Ley 213/93 (sin persistir). |
| `POST` | `/api/liquidaciones` | Calcula y almacena el registro formal de liquidación. |
| `POST` | `/api/lexpy/chat` | Consulta al motor Techapyrã IA con resolución RAG local y oficial. |
| `GET` | `/api/obsidian/grafo` | Entrega los nodos y enlaces para el visor interactivo de relaciones. |
| `GET` | `/api/health` | Verificación de estado del servidor y conexión a base de datos. |

---

## 🛡️ Seguridad y Políticas de Despliegue

1. **Zero Secrets Policy:** Ninguna clave de API, contraseña ni archivo de credenciales (`.env`, `firebase-key.json`) se almacena en el control de versiones. Las variables se inyectan a nivel de entorno en Dokploy.
2. **Cabeceras Seguras:** Integración de `helmet` para aplicar *Content Security Policy*, prevenir *clickjacking* (`X-Frame-Options`) y mitigar ataques MIME-sniffing.
3. **Control de Flujo:** `express-rate-limit` restringe ráfagas de solicitudes en rutas de autenticación y endpoints de análisis.
4. **Validación Estricta:** Todas las entradas se procesan mediante `express-validator` sanitizando entradas para prevenir inyecciones NoSQL y XSS.

---

## ⚖️ Licencia y Créditos Institucionales

Distribuido bajo la Licencia **MIT**. Consulte el archivo [LICENSE](LICENSE) para más detalles.

```
Todos los derechos reservados.
Sistema creado e impulsado por Otelax Dev (www.dev.grupooh.online)
Autor: Giuliano Emanuel Maria Catella Riveros
```

- **Sitio Web Oficial:** [https://dev.grupooh.online/](https://dev.grupooh.online/)
- **Repositorio Oficial:** [https://github.com/FUDAPY/SysJuridico](https://github.com/FUDAPY/SysJuridico)
