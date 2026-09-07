<div align="center">

# ⚖️ Sistema Juridico SysJuridico

**Sistema de gestión jurídica, control financiero y asistencia legal impulsado por Inteligencia Artificial con la Legislación Paraguaya, diseñado bajo una arquitectura de microservicios e infraestructura optimizada para VPS (Dokploy y MongoDB).**

![Version](https://img.shields.io/badge/version-1.0.0-0a3d62?style=flat-square)
![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white&style=flat-square)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&style=flat-square)
![MongoDB](https://img.shields.io/badge/MongoDB-8.x-47A248?logo=mongodb&logoColor=white&style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)

</div>

---

# ES: Documentación (Español)

## ES: Descripción

**SysJuridico** es un sistema de gestión jurídica, control financiero y asistencia legal impulsado por Inteligencia Artificial con la Legislación Paraguaya, diseñado bajo una arquitectura de microservicios e infraestructura optimizada para VPS (Dokploy y MongoDB).

Centraliza clientes, expedientes, honorarios y créditos, agenda, liquidaciones laborales (Ley 213/93) y el asistente **LexPY** (RAG sobre MongoDB + fuentes públicas). El backend expone una **API REST protegida con JWT** (Node.js + Express + Mongoose) y sirve, además, un frontend estático sin frameworks (HTML/CSS/JS); incluye un script oficial para migrar los datos históricos desde **Firebase Firestore**.


## ES: Características principales

- **Panel de resumen**: métricas de ingresos (diario, mensual, anual), saldo por cobrar y movimientos recientes, en Guaraníes (Gs.).
- **Gestión de clientes**: CRUD completo con búsqueda por nombre, cédula o teléfono.
- **Expedientes y honorarios**: carátula, abogado asignado, estado del caso, plan de pagos/cuotas automático y **comprobantes de pago en tickets de 80 mm**.
- **Créditos / Cobranzas**: control de montos totales, saldos pendientes y estado por cliente/expediente.
- **Agenda**: calendario mensual de audiencias, reuniones y vencimientos por abogado.
- **Calculadora de Liquidación Laboral (MTESS)**: asistente de 4 pasos con reglas de la Ley 213/93 (indemnización por tramos, preaviso, vacaciones, aguinaldo, descuento IPS 9%, trabajadores mensuales y jornales) y reporte imprimible en A4 con membrete corporativo.
- **LexPY (IA + RAG)**: responde saludos y consultas; para consultas técnicas busca primero en la base legal local (MongoDB) y, si hace falta, consulta fuentes públicas (CSJ Paraguay, BaseLegal), citando siempre sus fuentes en formato Markdown. Soporta proveedores OpenAI, Gemini, OpenRouter y **Groq**.
- **Roles y permisos**: perfiles `admin` y `abogado` con menús y alcance diferenciados.
- **Requisitos y trámites + Ubicación de archivos**: catálogo de trámites con costos y registro físico (tomo/estante) de carpetas.
- **Migración Firebase → MongoDB**: script idempotente que reescribe referencias para conservar las relaciones del sistema.
- **Seguridad**: contraseñas con `bcrypt`, tokens JWT, `helmet`, `cors`, límite de payload y auditoría de claves (el `.env` y las credenciales de Firebase **nunca** se versionan).

## ES: Tecnologías y stack

| Capa | Tecnología |
|---|---|
| Backend | Node.js ≥ 20, Express 4, Mongoose 8 |
| Base de datos | MongoDB (colecciones Mongoose + texto completo) |
| Autenticación | JWT (`jsonwebtoken`) + `bcryptjs` |
| Seguridad / HTTP | `helmet`, `cors`, `express-rate-limit`, `morgan`, `express-validator` |
| Frontend | HTML5, CSS3 y JavaScript vanilla (sin frameworks) en `public/` |
| IA (LexPY) | RAG local + scraping (axios + cheerio) + proveedores IA (OpenAI / Gemini / OpenRouter / Groq) |
| Migración | `firebase-admin` (Firestore → MongoDB) |
| Despliegue | Docker / Docker Compose / Dokploy (Traefik) |

**Estructura del repositorio**

```
├── server/          # API REST (controllers, models, routes, services, middleware)
├── public/          # Frontend estático (html, css, js, img)
├── scripts/         # migración Firestore → MongoDB, seed de admin
├── docker-compose.yml
├── Dockerfile
├── .env.example     # Plantilla de variables de entorno (sin secretos)
└── LICENSE
```

## ES: Instalación y configuración

### ES: Requisitos previos

- Node.js **20 o superior**.
- Instancia de **MongoDB** accesible (local, Atlas o un servicio de Dokploy).

### ES: Pasos rápidos

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno (copiar la plantilla y editarla)
cp .env.example .env
#    Completar como mínimo: DATABASE_URL, JWT_SECRET, ADMIN_SEED_EMAIL y ADMIN_SEED_PASSWORD

# 3. Crear el usuario administrador inicial
npm run seed:admin

# 4. (Opcional) Migrar datos desde Firebase Firestore
#    Requiere FIREBASE_SERVICE_ACCOUNT_PATH apuntando al JSON de credenciales.
#    Ese archivo contiene secretos y NUNCA debe subirse al repositorio.
npm run migrate:firestore

# 5. Iniciar en desarrollo (recarga automática) o producción
npm run dev        # o: npm start
```

> En Windows PowerShell usa `copy .env.example .env` en lugar de `cp`.

### ES: Variables de entorno principales

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión a MongoDB (p. ej. `mongodb://usuario:clave@host:27017/sysjuridico?authSource=admin`) |
| `JWT_SECRET` | Secreto largo y aleatorio para firmar tokens |
| `JWT_EXPIRES_IN` | Vigencia del token (por defecto `8h`) |
| `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` | Crea el admin automáticamente en el primer arranque |
| `LEXPY_AI_PROVIDER` | `openai` \| `gemini` \| `openrouter` \| `groq` \| `none` |
| `LEXPY_AI_API_KEY` | Clave del proveedor de IA elegido |
| `LEXPY_AI_MODEL` | Modelo (p. ej. `openai/gpt-oss-120b` en Groq) |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Ruta al JSON de credenciales de Firebase (solo migración) |

## ES: Ejemplos de uso

### ES: Iniciar sesión y consumir la API

```bash
# 1. Obtener token
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@estudio.com","password":"tu-clave"}' | jq -r .token)

# 2. Listar clientes (requiere el token)
curl -s http://localhost:4000/api/clientes -H "Authorization: Bearer $TOKEN"
```

### ES: Chatear con LexPY (saludo y consulta técnica)

```bash
curl -s -X POST http://localhost:4000/api/lexpy/chat \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"pregunta":"hola, ¿quién sos?"}'

curl -s -X POST http://localhost:4000/api/lexpy/chat \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"pregunta":"¿Qué regula la Ley 213/93 en Paraguay?"}'
```

### ES: Calcular una liquidación laboral

```bash
curl -s -X POST http://localhost:4000/api/liquidaciones/calcular \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "tipoLiquidacion": "despido_injustificado",
    "fechaIngreso": "2020-01-10",
    "fechaSalida": "2026-02-28",
    "tipoTrabajador": "MENSUAL",
    "salarioMensual": 4000000,
    "diasTrabajadosNoCobrados": 10,
    "tieneIps": true,
    "persona": { "cedula": "3.456.789", "nombre": "Juan", "apellido": "Pérez" }
  }'
```

### ES: Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/login` | Inicia sesión y devuelve el JWT |
| `GET/POST/PUT/DELETE` | `/api/clientes`, `/api/expedientes`, `/api/agenda`, `/api/creditos`, `/api/requisitos`, `/api/archivos` | CRUD de cada módulo |
| `GET` | `/api/dashboard`, `/api/dashboard/mi-dia` | Resúmenes por rol |
| `POST` | `/api/liquidaciones/calcular` | Calcula liquidación (no persiste) |
| `POST` | `/api/liquidaciones` | Calcula y guarda |
| `POST` | `/api/lexpy/chat` | Consulta al asistente LexPY |
| `GET` | `/api/health` | Estado de conexión a MongoDB |

## ES: Guía de contribución

¡Gracias por tu interés en colaborar! Para mantener el proyecto ordenado:

1. **Haz un fork** del repositorio y crea una rama descriptiva:
   ```bash
   git checkout -b feat/mi-mejora
   ```
2. **Desarrolla** con cambios pequeños y verificables. Respeta el estilo existente (JavaScript vanilla en el frontend, `async/await` en el backend, comentarios técnicos breves).
3. **No subas secretos**: `.env`, claves API ni el JSON de Firebase deben permanecer fuera del control de versiones.
4. **Prueba** localmente antes de enviar el cambio:
   ```bash
   npm run dev
   ```
5. **Abre un Pull Request** describiendo qué resuelve tu cambio y cómo se prueba.

### ES: Buenas prácticas

- Usa commits atómicos y mensajes claros en español o inglés.
- Mantén la compatibilidad hacia atrás de la API REST.
- Cuando agregues una dependencia, justifícala en la descripción del PR.
- Documenta en este README cualquier variable de entorno nueva.

## ES: Licencia

Distribuido bajo la licencia **MIT** (libre uso con mención de autores). Ver el archivo [LICENSE](LICENSE).

Copyright © 2026 · **Otelax Dev** · **Giuliano Emanuel Maria Catella Riveros**

Se permite el uso, copia, modificación, distribución y uso comercial del software, siempre que se mantenga el aviso de copyright y esta nota de licencia en todas las copias o partes sustanciales.

---

---

# EN: Documentation (English)

## EN: Overview

**SysJuridico** is a legal management, financial control and AI-powered legal assistance system built on Paraguayan legislation, architected as microservices and optimized for VPS infrastructure (Dokploy and MongoDB).

It centralizes clients, case files (expedientes), fees and credit plans, scheduling, severance calculations (Act 213/93) and the **LexPY** AI assistant (RAG over MongoDB + public sources). The backend exposes a **JWT-protected REST API** (Node.js + Express + Mongoose) and also serves a framework-free static frontend (HTML/CSS/JS); it ships an official migration script for legacy data from **Firebase Firestore**.

## EN: Key features

- **Dashboard**: daily, monthly and yearly income metrics, outstanding balances and recent transactions in Guaraníes (Gs.).
- **Client management**: full CRUD with search by name, ID or phone.
- **Cases & fees**: case title, assigned attorney, status, automatic installment plan and **80 mm payment receipts**.
- **Credits / collections**: total amounts, outstanding balances and status per client or case.
- **Legal agenda**: monthly calendar for hearings, meetings and deadlines per attorney.
- **MTESS severance calculator**: 4-step wizard implementing Paraguay's Labor Code (Act 213/93) rules — tiered severance, notice, vacations, bonus (aguinaldo), 9% IPS deduction, monthly and daily-wage workers — with a printable A4 report using the firm's letterhead.
- **LexPY (AI + RAG)**: handles greetings; for technical questions it searches the local legal knowledge base (MongoDB) first and falls back to public sources (CSJ Paraguay, BaseLegal), always citing sources in Markdown. Supports OpenAI, Gemini, OpenRouter and **Groq**.
- **Roles & permissions**: `admin` and `attorney` profiles with different menus and scope.
- **Requirements & file locations**: services catalog with costs and physical folder tracking.
- **Firebase → MongoDB migration**: idempotent script that rewrites references to keep relationships intact.
- **Security**: bcrypt password hashing, JWT tokens, helmet, CORS and secret hygiene — `.env` and Firebase credentials are never committed.

## EN: Tech stack

| Layer | Technology |
|---|---|
| Backend | Node.js ≥ 20, Express 4, Mongoose 8 |
| Database | MongoDB (Mongoose collections + full-text indexes) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| Security / HTTP | `helmet`, `cors`, `express-rate-limit`, `morgan`, `express-validator` |
| Frontend | HTML5, CSS3 and vanilla JavaScript (no frameworks) in `public/` |
| AI (LexPY) | Local RAG + scraping (axios + cheerio) + AI providers (OpenAI / Gemini / OpenRouter / Groq) |
| Migration | `firebase-admin` (Firestore → MongoDB) |
| Deployment | Docker / Docker Compose / Dokploy (Traefik) |

## EN: Installation & setup

### EN: Prerequisites

- Node.js **20 or newer**.
- A reachable **MongoDB** instance (local, Atlas or a Dokploy service).

### EN: Quick start

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file from the template and edit it
cp .env.example .env
#    Fill at least: DATABASE_URL, JWT_SECRET, ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD

# 3. Create the initial administrator user
npm run seed:admin

# 4. (Optional) Migrate existing data from Firebase Firestore
#    Requires FIREBASE_SERVICE_ACCOUNT_PATH pointing to the credentials JSON.
#    That file holds secrets and must NEVER be committed to the repository.
npm run migrate:firestore

# 5. Run in development (auto-reload) or production
npm run dev        # or: npm start
```

> On Windows PowerShell use `copy .env.example .env` instead of `cp`.

### EN: Main environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | MongoDB connection string (e.g. `mongodb://user:pass@host:27017/sysjuridico?authSource=admin`) |
| `JWT_SECRET` | Long, random secret used to sign tokens |
| `JWT_EXPIRES_IN` | Token lifetime (default `8h`) |
| `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` | Auto-creates the admin on first boot |
| `LEXPY_AI_PROVIDER` | `openai` \| `gemini` \| `openrouter` \| `groq` \| `none` |
| `LEXPY_AI_API_KEY` | API key of the selected AI provider |
| `LEXPY_AI_MODEL` | Model name (e.g. `openai/gpt-oss-120b` on Groq) |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to the Firebase credentials JSON (migration only) |

## EN: Usage examples

### EN: Authenticate and consume the API

```bash
# 1. Get a token
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@estudio.com","password":"your-password"}' | jq -r .token)

# 2. List clients (requires the token)
curl -s http://localhost:4000/api/clientes -H "Authorization: Bearer $TOKEN"
```

### EN: Chat with LexPY (greeting and technical question)

```bash
curl -s -X POST http://localhost:4000/api/lexpy/chat \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"pregunta":"hi, who are you?"}'

curl -s -X POST http://localhost:4000/api/lexpy/chat \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"pregunta":"What does Paraguayan Act 213/93 regulate?"}'
```

### EN: Calculate a labor severance

```bash
curl -s -X POST http://localhost:4000/api/liquidaciones/calcular \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "tipoLiquidacion": "despido_injustificado",
    "fechaIngreso": "2020-01-10",
    "fechaSalida": "2026-02-28",
    "tipoTrabajador": "MENSUAL",
    "salarioMensual": 4000000,
    "diasTrabajadosNoCobrados": 10,
    "tieneIps": true,
    "persona": { "cedula": "3.456.789", "nombre": "John", "apellido": "Doe" }
  }'
```

### EN: Main endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticates and returns a JWT |
| `GET/POST/PUT/DELETE` | `/api/clientes`, `/api/expedientes`, `/api/agenda`, `/api/creditos`, `/api/requisitos`, `/api/archivos` | CRUD per module |
| `GET` | `/api/dashboard`, `/api/dashboard/mi-dia` | Role-based summaries |
| `POST` | `/api/liquidaciones/calcular` | Computes severance (no persistence) |
| `POST` | `/api/liquidaciones` | Computes and stores |
| `POST` | `/api/lexpy/chat` | Asks the LexPY assistant |
| `GET` | `/api/health` | MongoDB connection status |

## EN: Contributing

Thanks for your interest in helping! To keep the project tidy:

1. **Fork** the repository and create a descriptive branch:
   ```bash
   git checkout -b feat/my-improvement
   ```
2. **Develop** in small, verifiable steps. Follow the existing style (vanilla JS frontend, `async/await` backend, short technical comments).
3. **Never commit secrets**: `.env`, API keys or the Firebase JSON must stay out of version control.
4. **Test locally** before opening a change:
   ```bash
   npm run dev
   ```
5. **Open a Pull Request** explaining what the change fixes and how it was tested.

### EN: Best practices

- Use atomic commits with clear messages in English or Spanish.
- Keep backwards compatibility of the REST API.
- Justify any new dependency in the PR description.
- Document every new environment variable in this README.

## EN: License

Released under the **MIT** license (free to use with attribution). See [LICENSE](LICENSE).

Copyright © 2026 · **Otelax Dev** · **Giuliano Emanuel Maria Catella Riveros**

Permission is granted to use, copy, modify, merge, publish, distribute, sublicense and sell copies of the software, as long as this copyright notice and the permission notice are included in all copies or substantial portions.



