# SysJuridico

Sistema de gestión jurídica integral para estudios de abogados en Paraguay. Centraliza clientes, expedientes, honorarios/créditos, agenda, liquidaciones laborales y un asistente de inteligencia artificial (LexPY) con arquitectura RAG sobre MongoDB.

## ¿Para qué sirve?

SysJuridico resuelve la operación diaria de un estudio jurídico:

- **Control financiero**: métricas de ingresos (diario, mensual, anual) y saldo por cobrar, en Guaraníes (Gs.).
- **Gestión de clientes y expedientes**: carátulas, abogado asignado, documentos vinculados (Drive/Dropbox) y estado del caso.
- **Créditos y honorarios**: generación automática del plan de pagos/cuotas al cargar un expediente.
- **Agenda legal**: calendario de audiencias, reuniones y vencimientos.
- **Calculadora de Liquidación Laboral**: cálculo conforme al Código del Trabajo paraguayo (Ley 213/1993), con reporte imprimible.
- **LexPY (Chat IA)**: asistente jurídico que consulta primero la base de conocimiento local en MongoDB, y si no encuentra respuesta, recurre a fuentes públicas externas (CSJ Paraguay, BaseLegal), aprendiendo automáticamente de cada interacción validada.
- **Migración de datos**: script dedicado para traer las colecciones existentes en Firebase Firestore hacia MongoDB.

## ¿Cómo funciona el sistema?

**Backend** (Node.js + Express + Mongoose):
- `server/models`: esquemas de Cliente, Expediente, Usuario, MovimientoFinanciero, EventoAgenda, LiquidacionLaboral y las colecciones de IA (`base_legal`, `aprendizajes_sistema`, `sesiones_chat`, `lexpy_fuentes_cache`, `estudio_juridico`).
- `server/controllers` + `server/routes`: API REST protegida con JWT (`server/middleware/auth.js`).
- `server/services`: lógica de negocio (plan de crédito, motor de liquidación laboral, orquestador RAG de LexPY, scraping de fuentes externas, cliente de IA generativa).
- `server/server.js`: punto de entrada; sirve también el frontend estático desde `public/`.

**Frontend** (HTML/CSS/JS sin frameworks, en `public/`):
- Interfaz de tarjetas moderna con menú lateral que se adapta según el rol del usuario.
- Páginas: `login`, `index` (resumen), `clientes`, `expedientes`, `agenda`, `usuarios`, `lexpy` (chat IA) y `liquidacion` (calculadora imprimible).

**Roles y permisos:**

| Rol | Acceso |
|---|---|
| `admin` | Todo el sistema: clientes, todos los expedientes, movimientos financieros, agenda, usuarios, dashboard completo, LexPY. |
| `abogado` | Solo: Resumen del día, sus Expedientes asignados, Créditos/Liquidaciones y LexPY (Chat IA). |

**Flujo de LexPY (RAG + aprendizaje continuo):**
1. Busca en `base_legal` y `aprendizajes_sistema` (MongoDB) usando búsqueda de texto.
2. Si no hay suficiente contexto local, consulta como respaldo fuentes públicas (csj.gov.py / baselegal.com.py) y cachea el resultado.
3. Redacta la respuesta final usando el proveedor de IA configurado (OpenAI, Gemini u OpenRouter).
4. Guarda automáticamente la interacción en `aprendizajes_sistema` para futuras consultas.

## Instalación

### Requisitos previos
- Node.js 20 o superior.
- Una instancia de MongoDB accesible (local, Atlas o interna en Dokploy).

### Pasos

```powershell
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
copy .env.example .env
# Editar .env y completar al menos: DATABASE_URL, JWT_SECRET, ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD

# 3. Crear el usuario administrador inicial
npm run seed:admin

# 4. (Opcional) Migrar datos existentes desde Firebase Firestore
#    Requiere FIREBASE_SERVICE_ACCOUNT_PATH apuntando al JSON de credenciales (nunca subir ese archivo a git)
npm run migrate:firestore

# 5. Levantar el servidor en modo desarrollo
npm run dev

# 5b. O en modo producción
npm start
```

El sistema queda disponible en `http://localhost:4000` (o el puerto definido en `PORT`).

### Variables de entorno principales

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (inyectado por Dokploy en producción). |
| `DATABASE_URL` | Cadena de conexión de MongoDB. |
| `JWT_SECRET` | Secreto para firmar los tokens de sesión. |
| `LEXPY_AI_PROVIDER` | `openai` \| `gemini` \| `openrouter` \| `none`. |
| `LEXPY_AI_API_KEY` | Clave del proveedor de IA (nunca se sube al repositorio). |
| `LEXPY_AI_MODEL` | Modelo a usar (con OpenRouter, usar solo modelos con sufijo `:free`). |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Ruta local al JSON de credenciales de Firebase, solo para la migración. |

> **Seguridad:** el archivo `.env` y cualquier credencial de Firebase (`*firebase-adminsdk*.json`) están excluidos vía `.gitignore`/`.dockerignore` y no deben subirse al repositorio.

### Despliegue en Dokploy

El proyecto incluye `Dockerfile`, `.dockerignore` y (opcional) `docker-compose.yml` para desplegar en tu VPS con Dokploy. El `.env` **NO** se sube al repositorio: todas las variables se definen en el panel de Dokploy.

**Pasos (opción rápida, Application tipo Dockerfile):**

1. En Dokploy crea un **Project → Services → Application** de tipo **Dockerfile** que apunte a tu repositorio `FUDAPY/SysJuridico.` (rama `main`). Dokploy construirá el `Dockerfile` automáticamente.
2. Crea una base de datos **MongoDB** en el mismo proyecto (o usa una instancia externa/Atlas).
3. En **Variables de entorno** de la aplicación define al menos:
   - `PORT=4000`
   - `DATABASE_URL=mongodb://usuario:contrasena@<nombre-servicio-mongodb>:27017/sysjuridico?authSource=admin`
   - `JWT_SECRET=<una clave larga y aleatoria>`
   - `ADMIN_SEED_EMAIL=tu@email.com` y `ADMIN_SEED_PASSWORD=...` (crea el admin automáticamente en el primer arranque)
   - Opcional: `LEXPY_AI_PROVIDER`, `LEXPY_AI_API_KEY`, `LEXPY_AI_MODEL` (ver tabla anterior).
4. En **Domains** agrega tu dominio y asigna el **puerto 4000** (el mismo puerto interno del contenedor). El servidor escucha en `0.0.0.0`, como exige el proxy de Dokploy.
5. Despliega. Verifica con:
   - `https://tudominio/api/health` → debe responder `{"success":true, ...}` con `baseDeDatos.conectado: true`.
   - `https://tudominio/` → debe cargar el login.

> **⚠️ Truco nº 1 del "Bad Gateway":** el puerto del **dominio** en Dokploy debe ser **idéntico** al `PORT` de las variables de entorno. Si en variables dejas `PORT=3000` pero el dominio apunta a `4000` (o al revés), Traefik reenvía a un puerto donde **no hay nada escuchando** → 502, aunque el contenedor esté perfectamente vivo. Decide UNO (recomendado: `4000`) y úsalo en ambos sitios.

**Si ves "Bad Gateway (502)":** casi siempre es porque el puerto del dominio y el `PORT` de la app no coinciden, o porque el contenedor se cae al arrancar. Revisa los **Logs** de la aplicación en Dokploy: las causas típicas son `DATABASE_URL` con un host que el VPS no puede resolver (por ejemplo `localhost`, un host de tu red local o un hostname inexistente) o variables de entorno sin definir. Un contenedor que muere con `process.exit(1)` deja al proxy sin "upstream" → 502.

**Alternativa con MongoDB incluido (opcional):** despliega un servicio de tipo **Docker Compose** apuntando al archivo `docker-compose.yml` de la raíz: levanta la app y MongoDB juntos en la misma red. El dominio se asigna al servicio `app`, puerto `4000`. Ajusta las variables en el panel; los valores por defecto del compose sirven para la primera prueba.

---

## Migración de Firebase Firestore a MongoDB

El script `scripts/migrate-firestore-to-mongo.js` trae los datos de Firestore al MongoDB del VPS, reescribiendo las referencias (`cliente`, `expediente`, `registradoPor`, etc.) para que las relaciones del sistema sigan funcionando.

**Datos que migra:** `users`, `clientes`, `expedientes`, `movimientos(_financieros)`, `agenda`/`eventos_agenda`, `liquidaciones(_laborales)` y las colecciones de LexPY (`base_legal`, `aprendizajes_sistema`, `sesiones_chat`, `lexpy_fuentes_cache`, `estudio_juridico`). Solo procesa las colecciones que existan en Firestore.

### Paso a paso

1. **Genera el base64 de tu archivo de credenciales** (el JSON `sys-juridico-firebase-adminsdk-*.json` de la carpeta raíz — **nunca** se sube a git):
   ```powershell
   # Opción Windows (PowerShell)
   [System.IO.File]::ReadAllBytes("sys-juridico-firebase-adminsdk-fbsvc-436ade3197.json") | [Base64]::EncodeBytes
   ```
   (En Linux: `base64 -w0 sys-juridico-firebase-adminsdk-*.json`)

2. **En Dokploy**, en la Aplicación (o en un **Job**), añade al Environment:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = (el base64 del paso 1)
   - `DATABASE_URL` = la cadena MongoDB de tu VPS (la que ya usas)
   - `JWT_SECRET` y demás variables que ya tenga la aplicación.

3. **Ejecuta la migración** con una de estas opciones:
   - **Opción A (recomendada, vía Job en Dokploy):** crea un *Job* que ejecute `npm run migrate:firestore` dentro del proyecto. Como la credencial viaja en la variable de entorno, no hace falta copiar archivos al contenedor.
   - **Opción B (local contra el VPS):** si expones MongoDB con IP+público (External Credentials en Dokploy) y el puerto 27017 está abierto, edita `DATABASE_URL` en tu `.env` local apuntando a esa IP y ejecuta `npm run migrate:firestore`.
   - **Opción C (dentro del contenedor de la app):** en Dokploy ve a la pestaña **Terminal** de la aplicación (si el contenedor está vivo) y ejecuta `npm run migrate:firestore`, con la variable `FIREBASE_SERVICE_ACCOUNT_JSON` definida en el environment.

4. **Verifica** que llegaron los datos:
   - Entra a la app → Clientes, Expedientes y Agenda deben mostrar los registros migrados.
   - Al abrir un expediente, su plan de pagos/crédito debe aparecer intacto.

> ⚠️ La migración es **idempotente** (puedes repetirla; actualiza por `firestoreId`). Si es tu primera migración con este script y ya habías migrado antes con la versión anterior, simplemente vuelve a ejecutarlo.

## Licencia

Este proyecto se distribuye bajo la **OTELAX DEV PRIVATE SOFTWARE LICENSE**. Ver el archivo [LICENSE](LICENSE) para el detalle completo. En resumen: todos los derechos reservados, Se concede permiso para usar y copiar el código fuente de este software,
siempre y cuando se mantenga la mención clara y visible de sus autores
originales: Otelax Dev y Giuliano Emanuel Maria Catella Riveros.
