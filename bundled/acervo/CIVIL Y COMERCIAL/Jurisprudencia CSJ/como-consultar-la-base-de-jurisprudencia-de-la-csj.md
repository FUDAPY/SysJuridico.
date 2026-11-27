---
titulo: "Cómo consultar la Base de Jurisprudencia del Poder Judicial (Corte Suprema de Justicia del Paraguay)"
tipo: "DOCTRINA"
fuero: "CIVIL Y COMERCIAL"
numero_norma: "Base de Jurisprudencia del Poder Judicial"
fuente: "Corte Suprema de Justicia del Paraguay — Base de Jurisprudencia: https://www.csj.gov.py/jurisprudencia"
url_fuente: "\\"https://www.csj.gov.py/jurisprudencia\\""
vigencia: "Guía de uso. Los criterios de búsqueda y el volumen de registros varían con la carga diaria de resoluciones."
actualizado: "2026-11-27T20:37:57.287Z"
repo_path: "CIVIL Y COMERCIAL/Jurisprudencia CSJ/como-consultar-la-base-de-jurisprudencia-de-la-csj.md"
content_hash: "25e8b1bfc9aa072c3ac5c4cf03034cf29d7910f14cc773eb30fcfd140a2d334e"
visibilidad: "PUBLICO_ACERVO"
subtipo: "GENERAL"
origen: "REPO_GITHUB_ZETTI"
estado_revision: "APROBADO"
---
# Cómo consultar la Base de Jurisprudencia del Poder Judicial (Corte Suprema de Justicia del Paraguay)

## Resumen Ejecutivo

La Corte Suprema de Justicia publica sus resoluciones en una base de datos de acceso libre en `https://www.csj.gov.py/jurisprudencia`. La base permite filtrar por **palabras del texto**, **número de resolución**, **rango de fechas**, **normas de referencia**, **tipo de resolución** (Acuerdo y Sentencia o Auto Interlocutorio), **año**, **materia**, **sala**, **ministro preopinante**, **acción resuelta**, **instancia** (resultado: confirma, revoca, anula, hace lugar, etc.) y **tribunal de origen**.

Cada registro ofrece dos accesos:

- **Ficha de la resolución** (`/jurisprudencia/home/detalle?codigo=<código>`): identificación, carátula, y el campo **"Análisis"**, que contiene los sumarios oficiales de la resolución con sus epígrafes y la indicación del voto (mayoría, minoría, por su propio fundamento).
- **Documento** (`/jurisprudencia/home/DocumentoJurisprudencia?codigo=<código>`): el texto completo de la resolución en formato PDF.

## Criterios de búsqueda útiles para el fuero civil y comercial

| Criterio | Valor que debe seleccionarse |
|---|---|
| Sala | "SALA CIVIL" (incluye los fallos de la Corte Suprema en lo civil y comercial) |
| Sala (alzada) | "TRIBUNAL DE APELACION EN LO CIVIL Y COMERCIAL" — Primera a Sexta Sala |
| Materia | "Civil y Comercial" |
| Tipo de resolución | "Acuerdo y Sentencia" (fallos de fondo) o "Auto Interlocutorio" |
| Instancia | "Confirma", "Revoca", "Anular", "Hace Lugar", "Desestimar", "Declarar la Prescripción", entre otras |

**Advertencia sobre el volumen de resultados.** Al 27 de noviembre de 2026, la consulta por Sala "SALA CIVIL" y Materia "Civil y Comercial" arroja **11.463 registros**, ordenados por fecha de la resolución. El dato es dinámico: se incrementa con cada carga. No debe citarse como cifra fija.

## Reglas de uso jurisprudencial

1. **La jurisprudencia de la Sala Civil no es vinculante.** En el sistema paraguayo no existe el precedente obligatorio general; los fallos de la Corte Suprema tienen autoridad persuasiva y, en los recursos de casación y nulidad, función uniformadora. La cita debe hacerse por número de resolución, año, sala y carátula.
2. **Verificar la línea posterior.** Antes de invocar un fallo como criterio vigente debe verificarse si la misma Sala lo reiteró, lo modificó o lo dejó sin efecto en resoluciones posteriores.
3. **Distinguir el voto.** El campo "Análisis" identifica si el sumario corresponde al voto de la mayoría, a un voto por su propio fundamento o a una disidencia. Un sumario de disidencia no expresa la doctrina del tribunal.
4. **Citar el documento, no la ficha.** La ficha es un resumen elaborado por el Poder Judicial; la cita textual debe tomarse del PDF de la resolución.

## Notas de Fuente

**Verificación.** Los criterios, los valores de los filtros y el total de registros consignados en esta guía fueron obtenidos directamente del formulario de criterios y del servicio de datos de la base oficial los días 27 de noviembre de 2026. Los enlaces de las fichas individuales de este repositorio corresponden al campo "código" interno de la base, que es estable.

**Limitación.** La base no publica todas las resoluciones: la cobertura depende de la carga efectuada por cada sala y tribunal. La ausencia de una resolución en la base no implica su inexistencia.

**Fecha de corte de la verificación.** 27 de noviembre de 2026.
