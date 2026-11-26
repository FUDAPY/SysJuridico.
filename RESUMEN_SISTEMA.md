# SYSJURÍDICO & OTELAXWISDOM — MANUAL Y RESUMEN INTEGRAL DEL SISTEMA

> **Desarrollado e Impulsado por:** ZETTI DIGITAL PY ([https://zetti.grupooh.online](https://zetti.grupooh.online))  
> **Licencia:** MIT &copy; ZETTI DIGITAL PY de Giuliano Catella  
> **Versión del Sistema:** 2.5.0-PRO (Edición Institucional Paraguay)

---

## ÍNDICE GENERAL
1. **Resumen Ejecutivo (Para el Profesional Jurídico y Directores del Estudio)**
2. **Arquitectura y Principios de Diseño ("Zero-Touch" & "Local-First")**
3. **Módulos y Secciones del Sistema (Desglose Exhaustivo)**
   - 3.1. Centro Operativo / Dashboard Proactivo (`index.html`)
   - 3.2. Asistente Inteligente Techapyrã IA (`lexpy.html`)
   - 3.3. Red de Conocimiento Jurídico / Obsidian Graph (`grafo.html`)
   - 3.4. Editor Forense & Generador de Escritos (`editor.html`)
   - 3.5. Gestión de Expedientes Judiciales (`expedientes.html`)
   - 3.6. Gestión de Clientes & Entidades (`clientes.html`)
   - 3.7. Agenda Procesal, Audiencias y Plazos Fatales (`agenda.html`)
   - 3.8. Créditos, Honorarios y Cobros (`creditos.html`)
   - 3.9. Caja Chica y Movimientos Contables (`movimientos.html`)
   - 3.10. Calculadora Laboral MTESS (`liquidacion.html`)
   - 3.11. Archivo Digital & Evidencia Documental (`archivos.html`)
   - 3.12. Control de Acceso y Gestión de Usuarios (`usuarios.html`)
4. **Motor Cognitivo: OtelaxWisdom v2 + Google Gemini 2.5 Pro**
5. **Conector Oficial con el Poder Judicial (CSJ Paraguay)**
6. **Políticas de Seguridad Criptográfica y Respaldo**

---

## 1. RESUMEN EJECUTIVO

**SysJurídico** es la plataforma tecnológica integral diseñada específicamente para el ejercicio del Derecho en la República del Paraguay. Combina la administración operativa de un bufete (causas, clientes, agenda, cobranzas, contabilidad y expedientes) con un **núcleo de inteligencia artificial jurídica de doble motor**:
- **OtelaxWisdom v2 (RAG Local):** Corpus indexado de más de 7.100 leyes vigentes de la Biblioteca y Archivo Central del Congreso Nacional (BACN), la Constitución Nacional de 1992, y más de 72.300 fallos y resoluciones de la Corte Suprema de Justicia (CSJ), estructurados en 10 Fueros Especializados.
- **Google Gemini 2.5 Pro (Razonamiento Forense):** Motor cognitivo multimodal para análisis procesal, detección de caducidades (Art. 172 CPC), sugerencias de impulso procesal y redacción automatizada de escritos en formato judicial auténtico (`.docx` descargable con márgenes reglamentarios de la CSJ).

El sistema opera bajo una interfaz **Blanca Institucional**, con contrastes elevados, tipografías forenses (`Liberation Mono` y familias sans-serif de alta legibilidad), marca de agua institucional de la balanza de la justicia de baja opacidad y una barra de herramientas con comandos por voz (Speech-to-Text) y lectura en voz alta (Text-to-Speech).

---

## 2. ARQUITECTURA Y PRINCIPIOS DE DISEÑO

### 2.1. Política Zero-Touch (Protección Inviolable de Datos)
El sistema garantiza que ninguna actualización, refactorización o mantenimiento informático toque, altere o purgue las 7 colecciones críticas de producción ni el repositorio físico:
1. `clientes`: Datos filiatorios, C.I., RUC, domicilios y teléfonos.
2. `creditos`: Préstamos, pagarés, planes de cuotas, saldos e intereses.
3. `archivos`: Metadatos y el directorio físico `/uploads` en disco.
4. `expedientes`: Carátulas, juzgados, secretarías, historial de actuaciones y estados.
5. `movimientos`: Registros contables, ingresos, egresos y caja chica.
6. `agenda`: Audiencias, vencimientos, notificaciones y plazos perentorios.
7. `usuarios`: Cuentas, roles y credenciales vigentes.

### 2.2. Domicilio Procesal y Perfil Forense Único
Todo escrito judicial emitido o redactado por la plataforma toma automáticamente:
- **Domicilio Procesal Fijo Institucional:** *Edificio BIJ, Av. Camilo Recalde c/ Capitán Miranda, Microcentro, Ciudad del Este*.
- **Datos del Profesional Firmante:** Nombre Completo, Matrícula C.S.J. y Cédula de Identidad, cargados en el perfil de usuario.

---

## 3. MÓDULOS Y SECCIONES DEL SISTEMA

### 3.1. Centro Operativo / Dashboard Proactivo (`index.html`)
Al iniciar sesión, el sistema analiza en tiempo real el estado de todos los expedientes y plazos, desplegando:
- **Barra de Comandos Asistida:** Soporta menciones con `@expediente` para vincular causas al instante, prompts rápidos de impulso procesal y botón de micrófono para dictado de voz.
- **Cuatro Tarjetas Estratégicas de Acción Inmediata:**
  1. *Novedades Hoy:* Actuaciones judiciales y providencias ingresadas en las últimas 24 horas vía CSJ.
  2. *Riesgo de Caducidad (Art. 172 CPC):* Detecta expedientes civiles sin impulso procesal por más de 90 días (primera instancia) o 60 días (segunda instancia), sugiriendo la providencia de urgencia exacta.
  3. *Plazos Fatales de la Semana:* Audiencias, contestaciones de traslados y recursos con vencimiento perentorio inminente.
  4. *Causas Para Impulsar:* Expedientes paralizados con proyectos de escritos listos para firmar y presentar.
- **Sincronizador Inteligente CSJ:** Panel con indicador de estado (Conectado / Desconectado / Error), detección automática del magistrado y actuario interviniente, y opción de sincronización forzada bajo demanda.
- **Galería de Modelos Rápidos:** Accesos directos para iniciar demandas ordinarias, contestaciones, juicios ejecutivos, peticiones sucesorias y demandas laborales con un solo clic.

### 3.2. Asistente Jurídico Techapyrã IA (`lexpy.html`)
- **Modo Asistente Forense:** Especializado en el derecho positivo paraguayo.
- **Transparencia Epistemológica:** Declara siempre si la respuesta proviene de la base local de OtelaxWisdom (`[OTELAXWISDOM LOCAL]`) o si recurrió a validación externa oficial (`[WEB OFICIAL VERIFICADA]`).
- **Dictado e Interacción:** Entrada por voz nativa (Web Speech API) y lectura de dictámenes en voz alta.

### 3.3. Red de Conocimiento Jurídico / Obsidian Graph (`grafo.html`)
- **Visualizador Orbital 2D (HTML5 Canvas):** Renderizado de más de 32.000 artículos y 72.300 resoluciones en 10 cúmulos orbitales concéntricos:
  1. Fuero Civil y Comercial
  2. Fuero Penal y Garantías
  3. Fuero Laboral y Seguridad Social
  4. Fuero Niñez y Adolescencia
  5. Fuero Contencioso Administrativo
  6. Fuero Constitucional
  7. Fuero Tributario y Aduanero
  8. Fuero de Organización Judicial
  9. Fuero Internacional & DD.HH. (Corte IDH y Tratados Supranacionales)
  10. Fuero General & Normas Marco (2.811 leyes generales)
- **Física Estabilizada (Zero-Trembling):** Algoritmo de enfriamiento progresivo (*burn-in* de 90 pasos en memoria) que congela las órbitas para evitar colisiones elásticas o vibraciones.
- **Inspector Lateral & Modal Completo:** Permite inspeccionar el texto íntegro de la norma, buscar artículos y copiar fragmentos directamente o enviarlos al Editor Forense con un clic.
- **Exportación a Obsidian:** Genera grafos compatibles con el plugin Graph Analysis y canvas de Obsidian.

### 3.4. Editor Forense & Generador de Escritos (`editor.html`)
- **Tipografía y Formato Oficial:** Configurado en `Liberation Mono 12pt`, interlineado 1.5, con márgenes reglamentarios (4.0 cm izquierdo, 2.0 cm derecho) y regla graduada superior.
- **Navegador Estructural (Outline):** Detecta automáticamente y permite navegar por las secciones obligatorias: `OBJETO`, `HECHOS`, `DERECHO`, `PRUEBAS`, `PETITORIO` y `SERÁ JUSTICIA`.
- **Panel Split-Brain (Razonamiento en Doble Columna):**
  - *Columna A:* Texto forense limpio y listo para presentación.
  - *Columna B:* Estrategia jurídica, citas de OtelaxWisdom verificadas y lista de verificación de riesgos procesales (caducidad, personería, tasas judiciales y plazos).
- **Exportación Nativa Word (`.docx`):** Microservicio en `server/services/editorService.js` que compila el documento en formato nativo Office OpenXML con márgenes exactos de 4 cm y 2 cm, encabezados del Juzgado y firma del letrado.
- **Lector Multimodal de PDFs Judiciales:** Carga archivos PDF de expedientes escaneados para su análisis integral con Gemini 2.5 Pro.

### 3.5. Gestión de Expedientes Judiciales (`expedientes.html`)
- Registro de causas con número, año, secretaría, juzgado y fuero.
- Control de partes procesales: Actor, Demandado, Tercerías y Abogados intervinientes.
- Registro cronológico de actuaciones, providencias y resoluciones interlocutorias o definitivas.
- Vinculación directa con el sistema de notificaciones y la agenda de plazos.

### 3.6. Gestión de Clientes & Entidades (`clientes.html`)
- Ficha unificada de personas físicas y jurídicas.
- Identificación tributaria (RUC) con dígito verificador y Cédula de Identidad.
- Historial de causas asociadas, documentos adjuntos, estado de cuentas y créditos vigentes.

### 3.7. Agenda Procesal & Plazos Fatales (`agenda.html`)
- Calendario judicial integrado (vista mensual, semanal y diaria).
- Alertas de audiencias preliminares, juicios orales, traslados de excepciones y contestaciones.
- Diferenciación visual entre días hábiles procesales y plazos de días corridos.

### 3.8. Créditos, Honorarios y Cobros (`creditos.html`)
- Control de pagarés y contratos de honorarios profesionales.
- Cálculo de cuotas, intereses moratorios y punitorios según tasas reglamentarias del BCP.
- Generación de recibos de pago y control de saldos pendientes por cliente o causa.

### 3.9. Caja Chica y Movimientos Contables (`movimientos.html`)
- Libro de ingresos y egresos del estudio jurídico.
- Imputación de gastos a expedientes específicos (tasas judiciales, diligenciamientos, fotocopias y viáticos).
- Balance financiero por rango de fechas y reportes para liquidación impositiva.

### 3.10. Calculadora Laboral MTESS (`liquidacion.html`)
- Sistema oficial de liquidaciones por despido justificado, injustificado y retiro justificado según el Código del Trabajo paraguayo (Ley Nº 213/1993 y sus modificaciones).
- Cálculo automático de preaviso, indemnización por antigüedad, aguinaldo proporcional y vacaciones causadas o proporcionales.
- **Puente Directo al Editor Judicial:** El botón `📝 Redactar Demanda en Editor Forense` transfiere automáticamente todos los montos liquidados y los datos de las partes a la plantilla de Demanda Laboral Ordinaria.

### 3.11. Archivo Digital & Evidencia Documental (`archivos.html`)
- Repositorio seguro de documentos escaneados, contratos, cédulas de notificación y pruebas documentales.
- Almacenamiento local persistente en `/uploads` con control estricto de tipos MIME y descarga protegida por sesión.

### 3.12. Control de Acceso y Gestión de Usuarios (`usuarios.html`)
- Roles diferenciados: Administrador, Abogado Asociado y Procurador/Secretario.
- Perfil forense con número de Matrícula CSJ y Cédula obligatorio.
- Compartición controlada de expedientes entre colegas mediante autorización explícita.

---

## 4. MOTOR COGNITIVO: OTELAXWISDOM v2 + GEMINI 2.5 PRO

1. **Ingesta Local-First:** Cuando se realiza una consulta o se solicita un escrito, el sistema consulta primero la base local `base_legal` (7.179 normas indexadas, 32.370 artículos) y la colección `jurisprudencia` (72.375 resoluciones CSJ).
2. **Razonamiento Estructurado:** Gemini 2.5 Pro procesa la doctrina aplicable, descarta normas derogadas y aplica el principio de vigencia estricta del derecho paraguayo.
3. **Control Anti-Alucinaciones:** Toda fundamentación cita expresamente la ley, el número de artículo o el acuerdo y sentencia de la Sala Civil, Penal o Constitucional de la CSJ.

---

## 5. CONECTOR OFICIAL CON EL PODER JUDICIAL (CSJ PARAGUAY)

- **Cifrado de Credenciales:** Las credenciales del Portal de Gestión de Partes del Poder Judicial se encriptan con clave simétrica **AES-256-CBC**.
- **Independencia de Cuentas:** Cada usuario mantiene su propia conexión judicial independiente, garantizando el secreto profesional y la trazabilidad de accesos.
- **Detección Automática de Juzgado:** El sincronizador detecta el juez interviniente y el actuario para precompletar las cartas de presentación y encabezados de los escritos.

---

## 6. POLÍTICAS DE SEGURIDAD CRIPTOGRÁFICA Y RESPALDO

- **Autenticación:** Tokens JWT (JSON Web Tokens) con firma criptográfica y expiración configurable.
- **Hashing de Contraseñas:** `bcryptjs` con factor de coste 10.
- **Protección de Cabeceras:** Middleware `helmet` con políticas estrictas de Content Security Policy (CSP) y prevención de Clickjacking / XSS.
- **Tasa Límite (Rate Limiting):** Prevención de ataques de fuerza bruta y saturación de endpoints mediante `express-rate-limit`.

---

<p align="center">
  <strong>SysJurídico &mdash; Sistema de Gestión Jurídica Integral</strong><br />
  Hecho por <strong><a href="https://zetti.grupooh.online" target="_blank">ZETTI DIGITAL PY</a></strong>
</p>
