---
titulo: "Guía Práctica Oficial para la Consulta de Jurisprudencia de la Sala Constitucional de la CSJ"
tipo: "JURISPRUDENCIA"
fuero: "SALA CONSTITUCIONAL"
numero_norma: "Guía Metodológica del Portal CSJ"
fuente: "Poder Judicial del Paraguay / Dirección de Informática Judicial"
url_fuente: "https://www.csj.gov.py/jurisprudencia/"
vigencia: "Vigente"
actualizado: "2026-11-27T20:37:57.374Z"
repo_path: "SALA CONSTITUCIONAL/Jurisprudencia CSJ/como-consultar-jurisprudencia-sala-constitucional-csj.md"
content_hash: "ff349cb6a699aa1079d2a2c8f6f4fa5812987f5bea63a6ae0ba720422d14bedd"
visibilidad: "PUBLICO_ACERVO"
subtipo: "GENERAL"
origen: "REPO_GITHUB_ZETTI"
estado_revision: "APROBADO"
---
# GUÍA OFICIAL PARA CONSULTAR JURISPRUDENCIA DE LA SALA CONSTITUCIONAL (CSJ)

## 1. INTRODUCCIÓN Y ACCESO AL PORTAL PÚBLICO
La Corte Suprema de Justicia del Paraguay mantiene su base de datos jurisprudencial de acceso público y gratuito a través del portal:
`https://www.csj.gov.py/jurisprudencia/`

Este sistema contiene fallos integrales (Acuerdos y Sentencias, Autos Interlocutorios y Providencias) dictados por las salas y el pleno de la máxima instancia judicial.

---

## 2. PARÁMETROS ESPECÍFICOS DE BÚSQUEDA PARA LA SALA CONSTITUCIONAL
Para filtrar con precisión las resoluciones de la Sala Constitucional:

1. **Filtro por Materia:**
   - Seleccionar **"Constitucional"** (identificador técnico en backend: código `7`).
2. **Filtro por Sala:**
   - Seleccionar **"SALA CONSTITUCIONAL"** (identificador técnico: código `243`).
3. **Filtro por Tipo de Resolución:**
   - **Acuerdo y Sentencia (AyS):** Resoluciones definitivas que resuelven el fondo de las acciones y excepciones de inconstitucionalidad o recursos de amparo.
   - **Auto Interlocutorio (AI):** Resoluciones que deciden sobre medidas cautelares (suspensión de efectos), admisibilidad, rechazos in limine, prejudicialidades o incidentes.
4. **Campos de Texto:**
   - **Carátula:** Permite buscar por nombres de partes, número de expediente y año judicial.
   - **Texto / Sumario:** Permite buscar por voces jurídicas (ej. *"arbitrariedad"*, *"efecto inter partes"*, *"amparo"*, *"rechazo in limine"*, *"hábeas data"*, *"tutela judicial efectiva"*).

---

## 3. IDENTIFICADORES Y ESTRUCTURA DE URL DE RESOLUCIONES
Cada resolución cargada en el sistema judicial cuenta con un código numérico único (`codigo`):
- **Vista de Detalle y Metadatos:**
  `https://www.csj.gov.py/jurisprudencia/home/detalle?codigo=[NUMERO_CODIGO]`
- **Descarga Directa del Documento Oficial (PDF):**
  `https://www.csj.gov.py/jurisprudencia/home/DocumentoJurisprudencia?codigo=[NUMERO_CODIGO]`

### Casos de Referencia Verificados:
- Código `85796`: AyS Nº 291/2021 (Doctrina de la arbitrariedad en consulta de amparo).
- Código `113157`: AyS Nº 508/2025 (Inconstitucionalidad de ley con efecto inter partes, Art. 260 CN).
- Código `104668`: AI Nº 434/2024 (Admisibilidad y traslado en acción de inconstitucionalidad).
- Código `96642`: AyS Nº 244/2023 (Amparo constitucional y principio de subsidiaridad).
- Código `116468`: AI Nº 1907/2025 (Medida cautelar de suspensión de efectos).
- Código `101969`: AI Nº 1967/2023 (Rechazo in limine por falta de agravio constitucional).
