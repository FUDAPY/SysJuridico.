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
- Node.js 18 o superior.
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

> **Seguridad:** el archivo `.env` y cualquier credencial de Firebase (`*firebase-adminsdk*.json`) están excluidos vía `.gitignore` y no deben subirse al repositorio.

### Despliegue en Dokploy

El proyecto incluye `Dockerfile` y `.dockerignore` listos para un despliegue tipo Docker en Dokploy. Configurar las variables de entorno del apartado anterior directamente en el panel de Dokploy (no en el repositorio) y desplegar.

## Licencia

Este proyecto se distribuye bajo la **OTELAX DEV PRIVATE SOFTWARE LICENSE**. Ver el archivo [LICENSE](LICENSE) para el detalle completo. En resumen: todos los derechos reservados, Se concede permiso para usar y copiar el código fuente de este software,
siempre y cuando se mantenga la mención clara y visible de sus autores
originales: Otelax Dev y Giuliano Emanuel Maria Catella Riveros.
