<div align="center">

# ⚖️ SysJurídico &mdash; Legal Management & AI Intelligence Suite

**Sistema integral de gestión judicial, control financiero, cálculo laboral y asistencia jurídica inteligente adaptada a la Legislación de la República del Paraguay.**

Diseñado bajo una arquitectura modular de alto rendimiento, optimizada para despachos jurídicos y despliegues en servidores VPS con Dokploy, Traefik y MongoDB.

[![Version](https://img.shields.io/badge/versión-3.0.0-0a3d62?style=for-the-badge)](https://dev.grupooh.online/)
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
3. [Motor de Sabiduría Jurídica: OtelaxWisdom](#-motor-de-sabiduría-jurídica-otelaxwisdom)
4. [Módulos y Capacidades del Sistema](#-módulos-y-capacidades-del-sistema)
5. [Arquitectura de Inteligencia Artificial & RAG Local](#-arquitectura-de-inteligencia-artificial--rag-local)
6. [Red de Conocimiento Forense (Obsidian Graph View)](#-red-de-conocimiento-forense-obsidian-graph-view)
7. [Estructura del Proyecto](#-estructura-del-proyecto)
8. [Instalación y Configuración](#-instalación-y-configuración)
9. [Variables de Entorno](#-variables-de-entorno)
10. [API REST & Endpoints Clave](#-api-rest--endpoints-clave)
11. [Seguridad y Políticas de Despliegue](#-seguridad-y-políticas-de-despliegue)
12. [Licencia y Créditos Institucionales](#-licencia-y-créditos-institucionales)

---

## 📖 Descripción General

**SysJurídico** es una plataforma profesional para despachos forenses y firmas jurídicas que consolida en un único entorno el seguimiento de litigios, la facturación de honorarios mediante créditos y cobranzas, la agenda de audiencias y plazos perentorios, el cálculo automatizado de liquidaciones laborales bajo normativas del MTESS y la asistencia legal en tiempo real con **Techapyrã IA** potenciada por el motor de conocimiento **OtelaxWisdom**.

El sistema combina un backend RESTful en Node.js de alta concurrencia con una interfaz web en JavaScript vanilla ultraliviana, libre del sobrecosto de frameworks pesados, e integra un motor RAG (*Retrieval-Augmented Generation*) local con base de datos propia en MongoDB que valida la vigencia positiva de las leyes antes de emitir cualquier dictamen o sugerencia procesal.

---

## 🛠️ Stack Tecnológico y Herramientas

SysJurídico implementa tecnologías probadas y de alta eficiencia para garantizar disponibilidad ininterrumpida y tiempos de respuesta inferiores a 100 ms:

| Capa | Componente | Descripción y Uso |
|---|---|---|
| **Backend Core** | Node.js (≥ v20 LTS) + Express 4.x | Servidor HTTP RESTful, middlewares de validación, compresión y enrutamiento modular. |
| **Persistencia** | MongoDB 8.x + Mongoose 8.x | Esquemas estructurados, índices de texto compuesto para RAG y transacciones ACID. |
| **Autenticación** | JWT (`jsonwebtoken`) + `bcryptjs` | Tokens con caducidad configurable, cifrado robusto de contraseñas y control de acceso por roles (`admin`, `abogado`). |
| **Seguridad HTTP** | `helmet`, `cors`, `express-rate-limit` | Protección contra XSS, sanitización de cabeceras, limitador de peticiones contra ataques DDoS. |
| **Frontend** | HTML5 Semántico + CSS3 Variables + JS Vanilla | Interfaz responsiva inspirada en plataformas SaaS de alta gama, con modo oscuro/claro nativo, Bento cards y componentes modales. |
| **Visualización** | Canvas 2D + Simulación Física (Force-Directed) | Renderizado de la Red de Conocimiento en canvas interactivo tipo Obsidian Graph View con clustering temático. |
| **Motor de IA (Techapyrã IA)** | DeepSeek V3 (`deepseek-chat`) / OpenAI / Gemini / Groq | Motor analítico jurídico para dictámenes, síntesis de doctrina CSJ y redacción forense. |
| **Motor Normativo (OtelaxWisdom)** | Corpus Legal Positivo del Paraguay | Base de datos indexada con más de 50 normas, códigos sustantivos/adjetivos, leyes orgánicas y doctrina de la República del Paraguay. |
| **RAG & Procesamiento** | RAG Híbrido (MongoDB + Text Index) + `pdf-parse` | Extracción de texto de fojas y documentos procesales, búsqueda por similitud y coincidencia exacta de normas vigentes. |
| **Web Scraping Forense** | `axios` + `cheerio` | Conectores HTTP para extracción en tiempo real de resoluciones, acuerdos y leyes desde portales oficiales (BACN, CSJ, SILpy, Gaceta Oficial). |
| **Impresión Térmica** | CSS Paged Media `@media print` (80mm) | Formateo e impresión directa de tickets de pago para impresoras térmicas de punto de venta. |
| **Infraestructura** | Docker + Docker Compose + Traefik + Dokploy | Contenedorización, certificados SSL automáticos vía Let's Encrypt y despliegue continuo en VPS. |

---

## 🏛️ Motor de Sabiduría Jurídica: OtelaxWisdom

**OtelaxWisdom** es el corazón cognitivo y documental de SysJurídico. Representa una estructura de datos relacional y semántica que organiza el derecho paraguayo en **siete centros de gravedad o Fueros Centrales**:

1. **🏛️ Fuero Civil y Comercial:**
   - Código Civil Paraguayo (Ley Nº 1183/1985): Contratos, obligaciones, derechos reales, sucesiones, responsabilidad civil.
   - Código Procesal Civil (Ley Nº 1337/1988): Caducidad de instancia (Art. 172: 3 meses en primera instancia, 6 meses en segunda), excepciones dilatorias/perentorias, medidas cautelares, juicio ejecutivo y recursos.
   - Leyes complementarias de cheques, marcas y régimen concursal.

2. **⚖️ Fuero Penal y Garantías Constitucionales:**
   - Código Penal (Ley Nº 1160/1997 y modif. Ley Nº 3440/2008): Tipificación de hechos punibles, autoría y participación, antijuridicidad y culpabilidad.
   - Código Procesal Penal (Ley Nº 1286/1998): Principio de inocencia, etapas del procedimiento (preparatoria, intermedia, juicio oral), plazos máximos, medidas sustitutivas y querella adhesiva.

3. **💼 Fuero Laboral y Seguridad Social:**
   - Código del Trabajo (Ley Nº 213/1993 y modif. Ley Nº 496/1995): Orden público laboral, estabilidad especial (+10 años), despido injustificado, preaviso e indemnizaciones tarifadas.
   - Código Procesal del Trabajo (Ley Nº 742/1961): Inversión de la carga probatoria, conciliación obligatoria y ejecución de sentencias laborales.
   - Normativa previsional del Instituto de Previsión Social (IPS).

4. **👶 Fuero de la Niñez, Adolescencia y Familia:**
   - Código de la Niñez y la Adolescencia (Ley Nº 1680/2001 y modif. Ley Nº 6083/2018): Interés superior del niño, prestación alimentaria perentoria, régimen de relacionamiento, patria potestad y adopciones.

5. **📜 Fuero Contencioso Administrativo & Constitucional:**
   - Constitución Nacional de la República del Paraguay (1992): Supremacía constitucional (Art. 137), garantías constitucionales (Habeas Corpus, Habeas Data, Amparo).
   - Ley Nº 1462/1935: Procedimiento para lo Contencioso Administrativo ante el Tribunal de Cuentas (plazo perentorio de 18 días hábiles).
   - Ley Nº 6715/2021: Procedimientos Administrativos, validez y eficacia de los actos administrativos y recursos de reconsideración/jerárquico.

6. **📊 Fuero Tributario & Fiscal:**
   - Ley Nº 6380/2019 de Modernización y Simplificación del Sistema Tributario Nacional: Impuesto a la Renta Empresarial (IRE), Impuesto a la Renta Personal (IRP), Impuesto al Valor Agregado (IVA).
   - Prescripción tributaria a los 5 años y competencias de recaudación.

7. **🇵🇾 Instituciones Públicas de la República del Paraguay (Leyes Orgánicas y Atribuciones):**
   - **Ministerio Público / Fiscalía General del Estado (Ley Nº 1562/2000):** Titularidad exclusiva de la acción penal pública, dirección funcional de la Policía Judicial y criterio de objetividad.
   - **Policía Nacional (Ley Nº 7338/2024 y Ley Nº 5757/2016):** Preservación del orden público, flagrancia y límites estrictos de aprehensión (6 horas para comunicar al fiscal, 24 horas para poner a disposición del juez penal de garantías).
   - **Dirección Nacional de la Patrulla Caminera (Ley Nº 5016/2014):** Competencia exclusiva en la Red Vial Nacional (rutas nacionales y departamentales). Control de alcotest con tolerancia 0.00 mg/L y obligatoriedad de alcoholímetros calibrados por el INTN. Remisión fiscal obligatoria si supera 0.20 mg/L (Art. 217 CP). Prohibición expresa de retener registros como fianza de pago.
   - **Ministerio de Justicia (Ley Nº 1652/2000):** Administración del sistema penitenciario y de la Dirección General del Registro del Estado Civil.
   - **Poder Judicial y Corte Suprema de Justicia (Ley Nº 879/1981):** Organización de tribunales, superintendencia judicial y control de la Dirección General de los Registros Públicos (DGRP).
   - **Ministerio de la Defensa Pública (Ley Nº 4423/2011):** Asistencia técnica a personas en estado de vulnerabilidad y defensa penal pública.
   - **Dirección Nacional de Ingresos Tributarios - DNIT (Ley Nº 7143/2023):** Fusión operativa de la SET y la Dirección Nacional de Aduanas.
   - **Ministerio de Trabajo, Empleo y Seguridad Social - MTESS (Ley Nº 5115/2013):** Autoridad administrativa del trabajo, homologación de acuerdos e inspección laboral.
   - **Instituto de Previsión Social - IPS (Decreto-Ley Nº 1860/1950):** Cobertura del seguro social obligatorio de salud y jubilación.
   - **Municipalidades y Policía Municipal de Tránsito - PMT (Ley Nº 3966/2010):** Jurisdicción estricta en el ejido urbano municipal.

### 📚 Corpus Normativo del BACN & Arquitectura Local-First
Para garantizar la máxima velocidad de respuesta y erradicar el consumo innecesario de tokens de IA, **OtelaxWisdom** incorpora el catálogo normativo completo de la **Biblioteca y Archivo Central del Congreso Nacional (BACN)**:

- **7.133 fichas normativas** organizadas en archivos Markdown en la carpeta `LESGILACION PARAGUAYA/BACN/normas/` y sincronizadas en la base de datos MongoDB (`base_legal`).
- **Constitución Nacional de la República del Paraguay (1992):** Documento íntegro con su preámbulo y los 291 artículos en `LESGILACION PARAGUAYA/constitucion_nacional.md`.
- **Estructura de Índices y Relaciones:** El índice principal enlaza los índices de [códigos](LESGILACION%20PARAGUAYA/BACN/indices/codigos.md), [leyes](LESGILACION%20PARAGUAYA/BACN/indices/leyes.md), [instituciones públicas](LESGILACION%20PARAGUAYA/BACN/indices/instituciones.md) y [modificaciones y derogaciones detectadas](LESGILACION%20PARAGUAYA/BACN/indices/modificaciones-derogaciones.md). Cada ficha conserva los metadatos y enlaces de BACN, detectando **3.720 relaciones entre normas**.
- **Alcance y Límites Jurídicos del Catálogo:**
  - *Texto íntegro visible en HTML:* **2.836 fichas** exponen el articulado completo en texto estructurado.
  - *Fichas con enlace a archivo oficial:* En **4.297 fichas** donde BACN no expuso texto legible en HTML, se preservaron todos los metadatos y el enlace directo de descarga al PDF oficial del BACN.
  - *Vigencia y Modificaciones:* Las modificaciones y derogaciones son referencias analíticas detectadas en los textos, no una certificación oficial de vigencia ni un texto consolidado.
- **Scraper Reanudable y Verificación de Integridad:** Se incluye el script de scraping reanudable (`scripts/scrape-bacn-laws.js`) y de ingesta (`scripts/ingest-bacn-to-db.js`). La verificación técnica confirmó **7.133 archivos íntegros**, sin fichas faltantes ni errores pendientes de sintaxis.
- **Estrategia Local-First (Ahorro >85% de Tokens):** Techapyrã IA y el Editor Judicial consultan en primer término la base de datos local en MongoDB mediante índices de texto y coincidencias exactas por número de ley (`numeroLey`). Solo en caso de que una disposición no figure en el catálogo interno, el sistema procede a la consulta externa en portales oficiales, garantizando latencias mínimas y certidumbre jurídica.

### ⚖️ Jurisprudencia Oficial de la Corte Suprema de Justicia (CSJ)
Como complemento jurisprudencial de **OtelaxWisdom**, se integró el acervo histórico y contemporáneo de resoluciones del Poder Judicial paraguayo alojado en `LESGILACION PARAGUAYA/Jurisprudencia Paraguaya/`:

- **72.375 fallos judiciales oficiales** estructurados en archivos Markdown organizados por tipo y año:
  - **45.469 Acuerdos y Sentencias** (Salas Constitucional, Civil y Comercial, y Penal).
  - **26.900 Autos Interlocutorios** emitidos por la máxima instancia judicial.
  - **6 resoluciones** de tipo no especificado.
- **Cobertura Textual y Enlaces Oficiales:**
  - **70.928 fallos con texto íntegro extraído** de formatos PDF, DOC, DOCX y RTF mediante herramientas forenses (`antiword`, `unzip`, LibreOffice y `pdf-parse`).
  - **1.447 fallos** preservan metadatos completos y enlaces directos de descarga al portal oficial de la CSJ (220 sin documento informado, 1.224 escaneados sin capa OCR en origen y 3 con archivos incompatibles).
  - Cero fallos faltantes y cero errores pendientes de extracción.
- **Clasificación Forense por Fueros:**
  - **Constitucional:** 26.421 resoluciones (Acciones de inconstitucionalidad, Hábeas Corpus, Amparos).
  - **Penal:** 17.153 resoluciones (Recursos extraordinarios de casación y revisión penal).
  - **Civil y Comercial:** 13.103 resoluciones (Contratos, quiebras, sucesiones, derechos reales).
  - **Contencioso Administrativo:** 13.077 resoluciones (Apelaciones contra fallos del Tribunal de Cuentas y actos estatales).
  - **Laboral:** 2.178 resoluciones (Despidos injustificados, indemnizaciones tarifadas, estabilidad laboral).
  - **Niñez y Adolescencia:** 414 resoluciones (Prestación de alimentos, régimen de relacionamiento, patria potestad).
  - **Tributario:** 29 resoluciones (Determinaciones tributarias y aduaneras).
- **Conexión Local-First en Tiempo Real:** El servicio `buscarJurisprudenciaCSJ()` consulta el catálogo estructurado local (`catalogo.json`) en menos de 70 milisegundos, proveyendo al modelo citas textuales exactas, números de fallo y enlaces oficiales sin saturar peticiones externas ni agotar tokens.
- **Herramientas de Mantenimiento:** Incluye el scraper reanudable [`scripts/scrape-csj-jurisprudencia.js`](scripts/scrape-csj-jurisprudencia.js) y el generador de índices de fueros [`scripts/generate-jurisprudencia-indices.js`](scripts/generate-jurisprudencia-indices.js).

### 🛡️ Principio de Vigencia Estricta
SysJuridico aplica un filtro algorítmico continuo para aislar normas derogadas o históricas (como la Ley Nº 2597/2005 o la Ley Nº 5102/2013). Tanto el motor de RAG como el asistente Techapyrã IA consultan y citan prioritariamente **derecho positivo vigente**.

---

## 🚀 Módulos y Capacidades del Sistema

### 1. Centro Operativo Forense (Dashboard Inteligente)
- **Pensamiento Jurídico & Motivación Forense:** Widget de reflexión deontológica con citas de juristas insignes (Eduardo J. Couture, Piero Calamandrei, Ulpiano, Ángel Ossorio y Gallardo) y botón interactivo `🎲 Otra reflexión`.
- **4 Bento Cards Interactivos con Enlace Directo:**
  - `NOVEDADES HOY` &rarr; Acceso directo a expedientes con novedades (`/expedientes.html?filtro=novedades`).
  - `CADUCIDAD EN RIESGO` &rarr; Acceso directo filtrado a causas sin impulso procesal por más de 90 días conforme al Art. 172 del CPC (`/expedientes.html?filtro=caducidad`).
  - `PLAZOS FATALES (7D)` &rarr; Navegación directa a la agenda judicial de vencimientos (`/agenda.html`).
  - `PARA IMPULSAR` &rarr; Listado inmediato de causas activas en trámite (`/expedientes.html?filtro=impulsar`).
- **Últimas Actuaciones:** Tarjeta con enlace directo al calendario y agenda forense.

### 2. Gestión de Expedientes Judiciales & Honorarios
- **Ficha Integral de Causa:** Carátula, número, año, juzgado/despacho, circunscripción judicial, materia, tipo de proceso y fase procesal.
- **Autocompletado en Vivo de Cliente Titular:** Búsqueda predictiva conectada en tiempo real al CRM de Clientes por nombre, cédula de identidad y teléfono con autoselección y reseteo ágil.
- **Banner de Filtro Activo:** Al ingresar por un KPI del dashboard, muestra una alerta explicativa con la cantidad de causas encontradas y un botón rápido `✕ Ver todos los expedientes`.
- **Generación Automática de Créditos:** Vinculación directa con el plan de pagos y cuotas de honorarios al crear la causa.
- **Exportación Forense:** Exportación a formato CSV para auditorías del despacho.

### 3. Créditos, Cobranzas & Comprobantes POS de 80 mm
- **Control Financiero:** Seguimiento de capital pactado, cobros acumulados y saldo pendiente por cliente y causa.
- **Emisión de Tickets Térmicos:** Formato de 80 mm para impresoras térmicas de recibos con membrete formal, desglose de cuota y firma.
- **Historial y Reimpresión:** Consulta instantánea de pagos anteriores.

### 4. Agenda Jurídica & Audiencias
- **Calendario Forense:** Visualización mensual y semanal de audiencias preliminares, juicios orales, traslados y reuniones.
- **Alertas Procesales:** Código de colores por urgencia y asignación de abogado responsable.

### 5. Calculadora Laboral MTESS (Ley 213/93)
- **Asistente en 4 Pasos:** Liquidación precisa por despido injustificado, retiro justificado o renuncia voluntaria.
- **Cálculo Exacto:** Preaviso, indemnización legal tarifada, aguinaldo proporcional, vacaciones causadas/fraccionadas y retención obrera IPS (9%).
- **Exportación A4:** Documento imprimible listo para homologación en el MTESS.

### 6. Editor Forense Judicial Estilo LibreOffice Writer
- **Entorno de Redacción Forense Profesional:** Procesador de texto avanzado diseñado bajo la ergonomía de LibreOffice Writer y la fluidez de escritura de Google Docs, con soporte nativo de clic inmediato en foja y atajos de teclado (`Ctrl+B`, `Ctrl+I`, `Ctrl+U`, `Ctrl+S`, `Ctrl+F`, `Ctrl+Enter`).
- **Barra de Menús y Doble Barra de Herramientas:**
  - *Menú Superior:* Archivo, Editar, Ver, Insertar, Formato y Techapyrã IA.
  - *Barra Estándar:* Nuevo escrito, Guardar en causa judicial, Descargar .DOCX/Word, Imprimir/PDF, Cortar, Copiar, Pegar, Deshacer/Rehacer, Búsqueda, Fórmulas CSJ y Márgenes.
  - *Barra de Formato:* Selector de estilos de párrafo (Cuerpo, Títulos 1-3), tipografía forense (`Liberation Serif`, `Times New Roman CSJ`, `Arial`, etc.), tamaño en pt, negrita, cursiva, subrayado, tachado, alineaciones (izquierda, centro, derecha y justificado forense), viñetas, numeración, sangrías e interlineado procesal (1.5 líneas CSJ).
- **Regla Horizontal Graduada Forense (0 a 18 cm):** Delimita visualmente en escala real la zona sombreada del margen izquierdo para cosido de expediente (4.0 cm), el área central útil de escritura y el margen derecho (2.0 cm).
- **Marcas de Corte y Salto de Foja:** Marcas de esquina judiciales (`┌ ┐ └ ┘`) y soporte de saltos de página con cálculo dinámico de fojas (~250 palabras por carilla).
- **Copiloto Techapyrã IA Optimizado (`/api/lexpy/editor-ai`):**
  - Motor de baja latencia (<3s) y mínimo consumo de tokens enfocado en redacción quirúrgica.
  - *Acciones rápidas con 1 clic:* Mejorar selección, Fundamentar con CSJ, Hechos cronológicos, Articulado de derecho, Petitorio formal, Excepción procesal previa y Polido de estilo.
  - *Integración con Expediente y Documentos:* Inyecta automáticamente los antecedentes de la causa, carátula, demandante, demandado y resúmenes de documentos adjuntos (PDFs/escaneados).
  - *Jurisprudencia CSJ:* Consulta e inserción directa de acordadas y fallos de la Corte Suprema de Justicia del Paraguay.
- **Barra de Búsqueda y Reemplazo Integrada (Ctrl+F):** Navegación ágil y reemplazo unitario o masivo de términos.
- **Contraste de Alta Legibilidad en Modos Claro y Oscuro:** Soporte universal garantizado en todas las listas desplegables, opciones `<select>`, lienzos y paletas de interfaz.

---

## 🧠 Arquitectura de Inteligencia Artificial & RAG Local

SysJurídico implementa un pipeline cognitivo estructurado en tres niveles:

```
                  ┌──────────────────────────────────────────────┐
                  │              Abogado / Litigante             │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │            Techapyrã IA Engine               │
                  │       (Orquestador Semántico / RAG)          │
                  └──────────────────────┬───────────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
     ┌─────────────────────────────┐           ┌─────────────────────────────┐
     │  NIVEL 1: MOTOR OTELAXWISDOM│           │ NIVEL 2: CONECTORES EN VIVO │
     ├─────────────────────────────┤           ├─────────────────────────────┤
     │ • BaseLegal (50+ Normas PY) │           │ • CSJ Jurisprudencia oficial│
     │ • Aprendizaje Doctrinal RAG │           │ • BACN (Congreso Nacional)  │
     │ • Filtro de Vigencia Positiva│          │ • SILpy / Gaceta Oficial    │
     │ • Memoria Contextual Agente │           │ • Scraping determinista     │
     └──────────────┬──────────────┘           └──────────────┬──────────────┘
                    │                                         │
                    └────────────────────┬────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │             SÍNTESIS Y GENERACIÓN            │
                  │   DeepSeek V3 / OpenAI / Gemini / Groq       │
                  │   Formateo estricto en Markdown forense      │
                  └──────────────────────────────────────────────┘
```

1. **Recuperación Determinista:** Ante la mención de una norma (ej. Ley 1462, Ley 6715, Art. 172 CPC), el sistema recupera el registro exacto validando su vigencia.
2. **Cero Alucinación Normativa:** Si una ley fue derogada, el motor lo advierte explícitamente y remite a la normativa vigente que la sustituye.
3. **Respuesta en Markdown Profesional:** Respuestas organizadas con títulos `#`, citas textuales en bloque, listas de artículos y enlaces oficiales.

---

## 🕸️ Red de Conocimiento Forense (Obsidian Graph View)

Disponible en `/grafo.html`, este módulo transforma toda la base de datos jurídica en un grafo topológico interactivo impulsado por física de fuerzas:

- **Hubs de Gravedad Temática:** 7 grandes nodos centrales correspondientes a los fueros jurídicos.
- **Interconexión Dinámica:**
  - Los códigos procesales se vinculan bilateralmente a los códigos sustantivos (CPC &harr; CC, CPP &harr; CP, CPL &harr; CL).
  - La Constitución Nacional de 1992 actúa como vértice supremo conectado a todos los fueros.
  - Las instituciones públicas se conectan tanto a su fuero orgánico como a sus competencias procesales.
  - Cada expediente judicial se enlaza automáticamente con su cliente y con el código o fuero que rige su materia.
- **Filtros por Chip:** Filtrado en tiempo real por Fueros, Leyes/Códigos, Instituciones, Enseñanzas RAG, Expedientes o Clientes.
- **Visor Interactivo y Desglose de Artículos:** Al tocar cualquier norma legal o institución pública, se despliega el panel inspector lateral de 520 px con desglose artículo por artículo, buscador interno en vivo y botón individual de copiado.
- **Modo Lectura Forense en Pantalla Completa:** Modal de alta legibilidad para lectura continua y búsqueda profunda dentro del articulado completo de la ley seleccionada.
- **Compatibilidad con Obsidian:** Compatible con clientes de notas tipo Obsidian (mediante endpoints OpenAI-compatible en `/api/v1`).

---

## 📂 Estructura del Proyecto

```
SysJuridico/
├── .env.example              # Plantilla de variables de entorno (sin secretos)
├── .gitignore                # Reglas estrictas de exclusión de credenciales
├── docker-compose.yml        # Configuración de servicios (App + Traefik)
├── Dockerfile                # Imagen optimizada en Node.js 20 Alpine
├── package.json              # Dependencias y scripts de ejecución
├── LICENSE                   # Licencia MIT de libre distribución
├── public/                   # Frontend estático servido por Express
│   ├── css/
│   │   └── styles.css        # Sistema de diseño, temas dark/light y estilos de impresión
│   ├── js/
│   │   ├── api.js            # Cliente HTTP, navegación lateral y pie de página institucional
│   │   ├── dashboard.js      # Lógica del Centro Operativo, pensamiento forense y KPIs
│   │   ├── expedientes.js    # CRUD de causas, modal de carga, filtros y URL params
│   │   ├── creditos.js       # Cobranzas y generación de tickets 80mm
│   │   ├── editor.js         # Procesador de texto judicial y exportador
│   │   ├── grafo.js          # Simulación física para la Red de Conocimiento OtelaxWisdom
│   │   ├── lexpy.js          # Chat forense y redactor de escritos con Techapyrã
│   │   └── liquidacion.js    # Motor de cálculo laboral MTESS
│   ├── index.html            # Centro Operativo / Asistente Jurídico
│   ├── expedientes.html      # Módulo de causas judiciales
│   ├── creditos.html         # Módulo de créditos y cobranzas
│   ├── editor.html           # Módulo de redacción forense
│   ├── grafo.html            # Red de Conocimiento Obsidian Graph
│   ├── lexpy.html            # Módulo de chat y redactor legal
│   ├── liquidacion.html      # Módulo de liquidación laboral MTESS
│   ├── agenda.html           # Calendario judicial
│   └── login.html            # Portal de autenticación
├── scripts/
│   ├── seed-admin.js         # Creación del usuario administrador inicial
│   ├── seed-otelax-wisdom.js # Ingesta masiva del corpus OtelaxWisdom (leyes e instituciones)
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
    ├── services/             # Lógica pesada (IA, Scraping, RAG, Liquidación, CSJ Sync, Memoria)
    └── utils/                # Utilidades de respuesta HTTP y errores tipados
```

---

## ⚡ Instalación y Configuración

### Requisitos del Sistema
- **Node.js**: v20.x LTS o superior
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
   # Configurar credenciales seguras en el archivo .env
   ```

4. **Inicializar la cuenta administradora:**
   ```bash
   npm run seed:admin
   ```

5. **Cargar la base de conocimiento OtelaxWisdom (leyes vigentes e instituciones):**
   ```bash
   npm run seed:wisdom
   ```

6. **Iniciar el servidor:**
   ```bash
   # Modo desarrollo:
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

---

## 📡 API REST & Endpoints Clave

Todos los endpoints (excepto `/api/auth/login` y `/api/health`) requieren la cabecera `Authorization: Bearer <TOKEN_JWT>`.

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/auth/login` | Autentica credenciales y entrega el token JWT. |
| `GET` | `/api/dashboard` | Retorna métricas de ingresos, causas y saldos pendientes. |
| `GET` | `/api/dashboard/mi-dia` | Entrega el briefing de plazos, vencimientos y caducidades. |
| `GET/POST` | `/api/expedientes` | Lista causas judiciales con filtros o registra una nueva. |
| `GET/PUT/DELETE`| `/api/expedientes/:id` | Consulta, actualiza o elimina un expediente del sistema. |
| `POST` | `/api/expedientes/csj/sincronizar` | Sincroniza actuaciones directamente desde el portal de la CSJ. |
| `GET/POST` | `/api/creditos` | Lista créditos o registra cobros con cálculo de saldo remanente. |
| `POST` | `/api/liquidaciones/calcular` | Ejecuta el cálculo laboral bajo Ley 213/93 (sin persistir). |
| `POST` | `/api/liquidaciones` | Calcula y almacena el registro formal de liquidación. |
| `POST` | `/api/lexpy/chat` | Consulta al motor Techapyrã IA con resolución RAG local y oficial. |
| `GET` | `/api/obsidian/grafo` | Entrega los nodos y enlaces para el visor interactivo OtelaxWisdom. |
| `GET` | `/api/health` | Verificación de estado del servidor y conexión a base de datos. |

---

## 🛡️ Seguridad y Políticas de Despliegue

1. **Zero Secrets Policy:** Ninguna clave de API, contraseña ni archivo de credenciales (`.env`, certificados) se almacena en el control de versiones. Las variables se inyectan a nivel de entorno en Dokploy.
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
