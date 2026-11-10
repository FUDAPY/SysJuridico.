const mongoose = require('mongoose');
require('dotenv').config();

const BaseLegal = require('../server/models/BaseLegal');
const AprendizajeSistema = require('../server/models/AprendizajeSistema');

/**
 * OtelaxWisdom - Motor de Conocimiento y Sabiduría Jurídica Paraguaya
 * Ingesta completa y estructurada del marco legal vigente de la República del Paraguay:
 * Constitución Nacional 1992, Códigos de fondo y forma, leyes vigentes, acordadas CSJ y doctrina vinculante.
 */
const CORPUS_OTELAX_WISDOM = [
  // ==========================================
  // CONSTITUCIÓN NACIONAL (1992)
  // ==========================================
  {
    titulo: 'Constitución de la República del Paraguay (1992)',
    categoria: 'codigo',
    fuero: 'Constitucional',
    estadoNormativo: 'Vigente',
    numeroLey: 'CN1992',
    fuente: 'Convención Nacional Constituyente / BACN',
    url: 'https://www.bacn.gov.py/constitucion-nacional-de-la-republica-del-paraguay',
    tags: ['constitucion', 'derechos fundamentales', 'amparo', 'habeas corpus', 'inconstitucionalidad', 'debido proceso', 'poder judicial'],
    contenido: `CONSTITUCIÓN DE LA REPÚBLICA DEL PARAGUAY (1992)

PARTE DOGMÁTICA - DE LOS DERECHOS FUNDAMENTALES Y GARANTÍAS:
Artículo 16 - De la defensa en juicio: La defensa en juicio de las personas y de sus derechos es inviolable. Toda persona tiene derecho a ser juzgada por tribunales y jueces competentes, independientes e imparciales.
Artículo 17 - De los derechos procesales: En el proceso penal, o en cualquier otro del cual pudiera derivarse pena o sanción, toda persona tiene derecho a: que sea presumida su inocencia; que se le juzgue en juicio público; que no se le obligue a declarar contra sí misma; que no sea juzgada más de una vez por el mismo hecho (non bis in idem).
Artículo 131 - De las garantías constitucionales: Las garantías consagradas en esta Constitución se harán efectivas mediante las leyes de procedimiento respectivas.
Artículo 132 - De la inconstitucionalidad: La Corte Suprema de Justicia tiene facultad para declarar la inconstitucionalidad de las normas jurídicas y de las resoluciones judiciales, en los casos y en la forma establecidos en esta Constitución y en la ley.
Artículo 133 - Del Hábeas Corpus: Garantía tutelar de la libertad física y la vida contra detenciones ilegales o arbitrarias.
Artículo 134 - Del Amparo: Toda persona que por un acto u omisión, manifiestamente ilegítimo, de una autoridad o de un particular, se considere lesionada gravemente o en peligro inminente de serlo en derechos consagrados en esta Constitución o en la ley, y debido a la urgencia del caso no pudiera remediarse por la vía ordinaria, puede promover amparo ante juez competente.
Artículo 135 - Del Hábeas Data: Toda persona puede acceder a la información y a los datos que sobre sí misma, o sobre sus bienes, obren en registros oficiales o privados de carácter público, así como conocer su uso y finalidad. Podrá solicitar ante magistrado competente la actualización, rectificación o destrucción de aquellos si fuesen erróneos o afectasen ilegítimamente sus derechos (base constitucional para la exclusión de Informconf).

PARTE ORGÁNICA - PODER JUDICIAL:
Artículo 247 - De la función y de la composición: El Poder Judicial es el custodio de esta Constitución. La administra, la interpreta y la cumple. La administración de justicia está a cargo del Poder Judicial, ejercido por la Corte Suprema de Justicia, por los tribunales y por los juzgados que establezca la ley.
Artículo 248 - De la independencia del Poder Judicial: Queda garantizada la independencia del Poder Judicial. Solo este puede conocer y decidir en actos de carácter contencioso. En ningún caso los miembros de los otros poderes ni otros funcionarios podrán arrogarse atribuciones judiciales.
Artículo 256 - De la forma de los juicios: Los juicios podrán ser orales y públicos, en la forma y en la medida que la ley determine. Toda sentencia judicial debe estar fundada en esta Constitución y en la ley.`,
  },

  // ==========================================
  // RAMA CIVIL Y COMERCIAL
  // ==========================================
  {
    titulo: 'Código Civil de la República del Paraguay (Ley Nº 1183/1985)',
    categoria: 'codigo',
    fuero: 'Civil y Comercial',
    estadoNormativo: 'Vigente',
    numeroLey: '1183',
    fuente: 'Gaceta Oficial / BACN',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/148/codigo-civil',
    tags: ['codigo civil', 'obligaciones', 'contratos', 'prescripcion', 'responsabilidad civil', 'derechos reales', 'personas'],
    contenido: `CÓDIGO CIVIL DE LA REPÚBLICA DEL PARAGUAY (LEY Nº 1183/1985)

LIBRO PRIMERO - DE LAS PERSONAS Y DERECHOS PERSONALES:
Personas físicas y jurídicas, capacidad, domicilio y atributos de la personalidad.
LIBRO SEGUNDO - DE LOS HECHOS Y ACTOS JURÍDICOS Y DE LAS OBLIGACIONES:
Artículo 277: Los actos jurídicos son los actos voluntarios lícitos, que tengan por fin inmediato crear, modificar, transferir, conservar o extinguir derechos.
Artículo 355: La nulidad de un acto jurídico puede ser absoluta o relativa.
Artículo 417: Las obligaciones tienen por objeto prestaciones susceptibles de apreciación pecuniaria.
Artículo 633 - Prescripción liberatoria: La prescripción liberatoria extingue las acciones por el no ejercicio de ellas durante el tiempo establecido por la ley.
Artículo 659 - Plazos de prescripción: Prescriben a los diez años las acciones personales que no tengan plazo fijado por ley; a los dos años la acción por responsabilidad civil extracontractual (Art. 663); al año las acciones derivadas de cheques (Art. 1740) y títulos de crédito.
LIBRO TERCERO - DE LOS CONTRATOS Y OTRAS FUENTES DE OBLIGACIONES:
Artículo 669: Las partes pueden reglar libremente sus derechos mediante contratos, observando las normas imperativas y el orden público. Los contratos válidamente celebrados obligan como la ley misma.
Artículo 715: Los pactos tienen fuerza de ley entre las partes.
Artículo 1833 - Responsabilidad extracontractual: El que comete un acto ilícito queda obligado a indemnizar el daño causado a otro.
LIBRO CUARTO - DE LOS DERECHOS REALES Y LA POSESIÓN:
Posesión de buena y mala fe, interdictos posesorios, dominio, usucapión ordinaria (10 años) y extraordinaria (20 años).`,
  },
  {
    titulo: 'Código Procesal Civil de la República del Paraguay (Ley Nº 1337/1988)',
    categoria: 'codigo',
    fuero: 'Civil y Comercial',
    estadoNormativo: 'Vigente',
    numeroLey: '1337',
    fuente: 'Gaceta Oficial / BACN',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/149/codigo-procesal-civil',
    tags: ['cpc', 'caducidad', 'art 172', 'demanda', 'excepciones', 'plazos', 'recursos', 'juicio ejecutivo', 'ordinario'],
    contenido: `CÓDIGO PROCESAL CIVIL DE LA REPÚBLICA DEL PARAGUAY (LEY Nº 1337/1988)

PRINCIPIOS Y REGLAS PROCESALES GENERALES:
Artículo 141 - Carácter de los plazos: Los plazos legales y judiciales son perentorios e improrrogables, salvo disposición expresa en contrario. Corren desde el día siguiente hábil de la notificación.
Artículo 172 - Caducidad de la instancia: Se operará la caducidad de la instancia cuando no se instare el curso del proceso dentro del plazo de SEIS MESES en primera instancia y TRES MESES en segunda o ulterior instancia.
Artículo 173 - Cómputo: Los plazos de caducidad correrán desde la fecha de la última petición de las partes, o resolución o actuación del juez o tribunal que tuviere por objeto impulsar el procedimiento.
Artículo 174 - Suspensión e interrupción: La caducidad se interrumpe por cualquier acto procesal idóneo de parte o de órgano judicial dirigido a activar el trámite del expediente.
Artículo 178 - Efectos: Declarada la caducidad en primera instancia, queda extinguido el proceso pero no la acción, que podrá promoverse nuevamente si no estuviere prescripta.

DEMANDA, EXCEPCIONES Y RECURSOS:
Artículo 215 - Requisitos de la demanda: Nombre, domicilio, cosa demandada con exactitud, hechos expuestos con claridad, derecho fundado y petición precisa.
Artículo 222 - Plazo para contestar demanda en juicio ordinario: Dieciocho (18) días perentorios.
Artículo 223/224 - Excepciones previas: Incompetencia, falta de personería, litispendencia, defecto legal, cosa juzgada, transacción y prescripción. Plazo: Primeros nueve (9) días del traslado de la demanda.
Artículo 395 - Recursos: Aclaratoria, Reposición, Apelación y Nulidad.
Artículo 438 y ss. - Juicio Ejecutivo: Ejecución de pagarés, cheques, letras y reconocimiento de deudas líquidas y exigibles.`,
  },

  // ==========================================
  // RAMA PENAL
  // ==========================================
  {
    titulo: 'Código Penal de la República del Paraguay (Ley Nº 1160/1997 modificada por Ley Nº 3440/2008)',
    categoria: 'codigo',
    fuero: 'Penal',
    estadoNormativo: 'Vigente',
    numeroLey: '1160',
    fuente: 'Gaceta Oficial / BACN',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/145/codigo-penal',
    tags: ['codigo penal', 'estafa', 'apropiacion', 'lesion de confianza', 'homicidio', 'violencia familiar', 'prescripcion penal'],
    contenido: `CÓDIGO PENAL DE LA REPÚBLICA DEL PARAGUAY (LEY Nº 1160/1997 / MODIFICADA POR LEY Nº 3440/2008)

PARTE GENERAL - PRINCIPIOS BÁSICOS:
Artículo 1 - Principio de legalidad (Nullum crimen, nulla poena sine lege): Nadie será sancionado por un acto que no haya sido expresamente declarado punible por la ley antes de su comisión.
Artículo 2 - Principio de reprochabilidad: No hay pena sin reprochabilidad. La gravedad de la pena no podrá exceder el límite de la reprochabilidad del autor.
Artículo 14 - Definición de hecho punible: Delito (hasta 5 años de pena privativa de libertad o multa) y Crimen (pena superior a 5 años).
Artículo 101/102 - Prescripción de la acción penal: La acción penal prescribe en un tiempo igual al máximo de la pena fijada para el hecho, nunca menor a 3 años para delitos y hasta 15 años para crímenes.

PARTE ESPECIAL - HECHOS PUNIBLES CONTRA EL PATRIMONIO Y LAS PERSONAS:
Artículo 160 - Apropiación: El que se adueñara indebidamente de una cosa mueble ajena que le hubiese sido confiada será castigado con pena privativa de libertad de hasta cinco años o con multa.
Artículo 187 - Estafa: El que con la intención de obtener para sí o para un tercero un beneficio patrimonial indebido, indujera al error a otro mediante afirmaciones falsas o deformación de hechos, y produjera un perjuicio patrimonial, será castigado con pena de hasta cinco años o multa. En casos especialmente graves (reiteración, perjuicio masivo), la pena privativa de libertad será de hasta ocho años.
Artículo 192 - Lesión de confianza: El que en base a la ley, a una resolución judicial o a un contrato, hubiese asumido la responsabilidad de proteger el interés patrimonial ajeno y le causare perjuicio, será castigado con pena de hasta cinco años o con multa.
Artículo 229 - Violencia familiar: El que ejerza violencia física o psíquica sobre un familiar o conviviente será sancionado con pena privativa de libertad de uno a seis años.
Artículo 246 - Producción de documentos no auténticos: Falsificación material o ideológica para inducir al error en las relaciones jurídicas.`,
  },
  {
    titulo: 'Código Procesal Penal de la República del Paraguay (Ley Nº 1286/1998)',
    categoria: 'codigo',
    fuero: 'Penal',
    estadoNormativo: 'Vigente',
    numeroLey: '1286',
    fuente: 'Gaceta Oficial / BACN',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/146/codigo-procesal-penal',
    tags: ['cpp', 'proceso penal', 'prision preventiva', 'medidas alternativas', 'audiencia preliminar', 'juicio oral', 'garantias'],
    contenido: `CÓDIGO PROCESAL PENAL DE LA REPÚBLICA DEL PARAGUAY (LEY Nº 1286/1998)

PRINCIPIOS Y GARANTÍAS PROCESALES:
Artículo 1 - Juicio previo: Nadie podrá ser condenado sino en virtud de una sentencia dictada por juez competente en juicio previo fundado en la ley.
Artículo 4 - Principio de inocencia: Se presumirá la inocencia del imputado durante todo el procedimiento mientras no se declare su culpabilidad por sentencia firme.
Artículo 10 - In dubio pro reo: En caso de duda razonable, se decidirá a favor del imputado.
Artículo 136 - Duración máxima del procedimiento: Todo procedimiento penal tendrá una duración máxima de cuatro años contados desde el primer acto del procedimiento (imputación formal).

MEDIDAS CAUTELARES Y ETAPAS DEL PROCESO:
Artículo 242 - Prisión preventiva: Solo procederá de forma excepcional cuando concurran elementos de convicción de autoría, peligro de fuga o peligro de obstrucción probatoria.
Artículo 245 - Medidas cautelares alternativas y sustitutivas: Prohibición de salir del país, fianza personal o real de letrado o tercero, obligación de presentarse periódicamente ante el juzgado.
ETAPAS DEL PROCEDIMIENTO ORDINARIO:
1. Etapa Preparatoria: Investigación fiscal, imputación, fijación de fecha de acusación (plazo ordinario 6 meses).
2. Etapa Intermedia: Presentación del acto conclusivo (acusación, sobreseimiento definitivo o provisional, criterio de oportunidad) y celebración de la Audiencia Preliminar (Art. 352). Auto de apertura a juicio oral.
3. Etapa de Juicio Oral y Público: Producción inmediata de pruebas, alegatos, deliberación y sentencia judicial.`,
  },

  // ==========================================
  // RAMA LABORAL Y SEGURIDAD SOCIAL
  // ==========================================
  {
    titulo: 'Código del Trabajo de la República del Paraguay (Ley Nº 213/1993 y Ley Nº 496/1995)',
    categoria: 'codigo',
    fuero: 'Laboral',
    estadoNormativo: 'Vigente',
    numeroLey: '213',
    fuente: 'Gaceta Oficial / BACN / MTESS',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/147/codigo-del-trabajo',
    tags: ['codigo laboral', 'despido injustificado', 'art 91', 'preaviso', 'estabilidad laboral', 'aguinaldo', 'ips', 'vacaciones'],
    contenido: `CÓDIGO DEL TRABAJO DE LA REPÚBLICA DEL PARAGUAY (LEY Nº 213/1993 Y MODIFICATORIA LEY Nº 496/1995)

PRINCIPIOS GENERALES:
Artículo 3: El trabajo es un derecho y un deber social. Las normas laborales son de orden público y los derechos del trabajador son irrenunciables.
Artículo 7: En caso de duda sobre la interpretación o aplicación de las normas legales, se prevalecerá la más favorable al trabajador (in dubio pro operario).

EXTINCIÓN DEL CONTRATO DE TRABAJO E INDEMNIZACIONES:
Artículo 87 - Preaviso legal: Aviso previo de rescisión unilateral:
- Hasta 1 año de servicio: 30 días.
- De 1 a 5 años: 45 días.
- De 5 a 10 años: 60 días.
- Más de 10 años: 90 días.
Si el empleador no preavisa, debe pagar el importe correspondiente en dinero.
Artículo 91 - Indemnización por despido injustificado:
En caso de despido sin causa justificada por el empleador, este pagará al trabajador una indemnización equivalente a QUINCE (15) SALARIOS DIARIOS por cada año de servicio o fracción superior a seis meses.
Artículo 94 - Estabilidad laboral especial (10 años de antigüedad):
El trabajador que cumpla diez años de servicios continuos adquiere estabilidad especial. No puede ser despedido sin previa comprobación en juicio de justa causa legal (Art. 81). Si el despido se declara injustificado, procede la reincorporación o el doble de la indemnización común.
Artículo 218 - Vacaciones anuales remuneradas:
- 1 a 3 años de servicio: 12 días hábiles continuos.
- 4 a 8 años de servicio: 18 días hábiles continuos.
- Más de 8 años de servicio: 30 días hábiles continuos.
Artículo 243 - Aguinaldo anual (Décimotercer salario):
Remuneración complementaria equivalente a la doceava parte (1/12) de todas las remuneraciones devengadas durante el año calendario. Es inembargable y exento de todo descuento.
Retención IPS obrero: 9% sobre salario devengado.`,
  },
  {
    titulo: 'Código Procesal del Trabajo de la República del Paraguay (Ley Nº 742/1961)',
    categoria: 'codigo',
    fuero: 'Laboral',
    estadoNormativo: 'Vigente',
    numeroLey: '742',
    fuente: 'Gaceta Oficial / BACN',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/150/codigo-procesal-del-trabajo',
    tags: ['cpl', 'proceso laboral', 'demanda laboral', 'audiencia conciliacion', 'inversion de la prueba', 'prescripcion laboral'],
    contenido: `CÓDIGO PROCESAL DEL TRABAJO DE LA REPÚBLICA DEL PARAGUAY (LEY Nº 742/1961)

PRINCIPIOS DEL PROCEDIMIENTO LABORAL:
Artículo 1: Principios de inmediación, concentración, gratuidad para el trabajador, celeridad procesal e impulso de oficio.
Artículo 136 - Inversión de la carga probatoria: En los juicios originados por despido, si el trabajador acredita la existencia de la relación de trabajo, incumbe al empleador justificar la legalidad de la causa alegada para la rescisión o el pago íntegro de las indemnizaciones.
Artículo 234 - Audiencia de conciliación: Instancia obligatoria inicial presidida por el juez del trabajo para intentar el avenimiento de las partes.
Artículo 633 - Prescripción de acciones laborales: Las acciones nacidas del contrato de trabajo prescriben al año de terminada la relación laboral.`,
  },

  // ==========================================
  // RAMA NIÑEZ, ADOLESCENCIA Y FAMILIA
  // ==========================================
  {
    titulo: 'Código de la Niñez y la Adolescencia (Ley Nº 1680/2001)',
    categoria: 'codigo',
    fuero: 'Niñez y Adolescencia',
    estadoNormativo: 'Vigente',
    numeroLey: '1680',
    fuente: 'Gaceta Oficial / BACN',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/151/codigo-de-la-ninez-y-la-adolescencia',
    tags: ['ninez', 'prestacion de alimentos', 'patria potestad', 'regimen de relacionamiento', 'asistencia alimentaria'],
    contenido: `CÓDIGO DE LA NIÑEZ Y LA ADOLESCENCIA (LEY Nº 1680/2001)

PRINCIPIOS RECTORES:
Artículo 3 - Principio del interés superior del niño: Toda medida concerniente al niño o adolescente que adopten el Estado, los padres o la sociedad atenderá primordialmente a su interés superior, garantizando su desarrollo integral y el pleno goce de sus derechos.
Artículo 4 - Prioridad absoluta: Los derechos del niño y adolescente gozan de atención prioritaria en la administración de justicia y en las políticas públicas.

JUICIO DE ASISTENCIA Y PRESTACIÓN DE ALIMENTOS:
Artículo 97 - Contenido del deber de alimentos: Los alimentos comprenden todo lo indispensable para el sustento, habitación, vestido, educación, asistencia médica, recreación y formación integral del menor.
Artículo 98 - Obligados a prestar alimentos: La obligación recae en ambos progenitores conforme a sus ingresos y condiciones económicas. En subsidio, en ascendientes consanguíneos directos.
Artículo 185 - Alimentos provisorios: Desde la iniciación del juicio, a petición de parte o del Defensor Público, el juez fijará una pensión alimentaria provisoria inembargable mediante oficio de retención directa sobre el salario del demandado ante su empleador o depósito bancario en cuenta judicial oficial.
Artículo 93 - Régimen de relacionamiento: Los padres que no ejerzan la guarda tienen el derecho y la obligación de mantener un trato fluido y periódico con sus hijos.`,
  },
  {
    titulo: 'Ley Nº 1600/2000 - Contra la Violencia Doméstica',
    categoria: 'ley',
    fuero: 'Niñez y Adolescencia',
    estadoNormativo: 'Vigente',
    numeroLey: '1600',
    fuente: 'BACN / CSJ',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/1600/ley-n-1600-contra-la-violencia-domestica',
    tags: ['violencia domestica', 'medidas de proteccion', 'exclusion de hogar', 'restriccion perimetral'],
    contenido: `LEY Nº 1600/2000 - CONTRA LA VIOLENCIA DOMÉSTICA EN PARAGUAY

MEDIDAS CAUTELARES Y DE PROTECCIÓN JUDICIAL URGENTES:
Artículo 1: Objeto: Establecer normas de protección para toda persona que sufra lesiones o maltratos físicos, psíquicos o sexuales por parte de miembros de su grupo familiar o conviviente.
Artículo 2 - Medidas cautelares de urgencia que el Juez de Paz debe dictar de oficio o a petición de parte en el plazo de 24 horas:
a) Exclusión del agresor del hogar común;
b) Prohibición de acceso del agresor a la residencia o lugar de trabajo de la víctima;
c) Prohibición de acercamiento y comunicación telefónica, digital o por interpósita persona;
d) Fijación provisoria de alimentos y restitución de efectos personales;
e) Auxilio de la fuerza pública para la ejecución inmediata.
El incumplimiento de las medidas configura desacato judicial penal según la Ley 4711/2012.`,
  },

  // ==========================================
  // RAMA CONTENCIOSO ADMINISTRATIVO Y PÚBLICO
  // ==========================================
  {
    titulo: 'Ley Nº 1462/1935 - Procedimiento para lo Contencioso Administrativo',
    categoria: 'ley',
    fuero: 'Contencioso Administrativo',
    estadoNormativo: 'Vigente',
    numeroLey: '1462',
    fuente: 'BACN / CSJ',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/157/ley-n-1462-establece-el-procedimiento-para-lo-contencioso-administrativo',
    tags: ['contencioso administrativo', 'tribunal de cuentas', 'recurso contencioso', 'plazo 18 dias', 'acto administrativo'],
    contenido: `LEY Nº 1462/1935 - PROCEDIMIENTO PARA LO CONTENCIOSO ADMINISTRATIVO

COMPETENCIA Y PROCEDIMIENTO ANTE EL TRIBUNAL DE CUENTAS:
Artículo 1: El Tribunal de Cuentas conocerá originariamente, en única instancia, del recurso de lo contencioso administrativo.
Artículo 2: Se reputará causa contencioso administrativa la lesión de un derecho administrativo causada contra la administración pública por la autoridad administrativa cuando proceda de resolución que cause estado.
Artículo 3 - Plazo de interposición: El plazo para interponer la demanda contencioso administrativa es de DIECIOCHO (18) DÍAS HÁBILES, contados a partir de la notificación de la resolución administrativa definitiva que agotó la vía administrativa.
Artículo 4: Vía administrativa agotada: Es requisito indispensable que el particular haya deducido los recursos administrativos correspondientes antes de acudir a la sede judicial contenciosa.`,
  },
  {
    titulo: 'Ley Nº 6715/2021 - De Procedimientos Administrativos',
    categoria: 'ley',
    fuero: 'Contencioso Administrativo',
    estadoNormativo: 'Vigente',
    numeroLey: '6715',
    fuente: 'BACN / Gaceta Oficial',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/10974/ley-n-6715-',
    tags: ['procedimiento administrativo', 'acto administrativo', 'recursos administrativos', 'reconsideracion', 'jerarquico', 'silencio administrativo'],
    contenido: `LEY Nº 6715/2021 - RÉGIMEN DE PROCEDIMIENTOS ADMINISTRATIVOS EN PARAGUAY

ELEMENTOS DEL ACTO ADMINISTRATIVO Y RECURSOS:
Artículo 1 - Objeto: Regular el régimen jurídico de los actos administrativos, el procedimiento administrativo, el régimen de los recursos administrativos y el procedimiento sancionador.
Artículo 14 - Requisitos de validez: Competencia, causa, objeto lícito, motivación y finalidad pública.
Artículo 52 - Silencio administrativo: Vencido el plazo sin resolución expresa, se entenderá desestimada la pretensión (silencio negativo), habilitando la siguiente instancia de recurso o la acción judicial, salvo norma expresa de silencio positivo.
RÉGIMEN DE RECURSOS ORDINARIOS:
- Recurso de Reconsideración: Ante la misma autoridad que dictó el acto, plazo de diez (10) días hábiles.
- Recurso Jerárquico: Ante la máxima autoridad institucional, plazo de diez (10) días hábiles.
Agotada la vía administrativa, queda expedita la vía judicial contencioso-administrativa conforme a la Ley 1462/1935.`,
  },
  {
    titulo: 'Ley Nº 1626/2000 - De la Función Pública',
    categoria: 'ley',
    fuero: 'Contencioso Administrativo',
    estadoNormativo: 'Vigente',
    numeroLey: '1626',
    fuente: 'BACN / Secretaría de la Función Pública',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/1626/de-la-funcion-publica',
    tags: ['funcion publica', 'empleado publico', 'sumario administrativo', 'estabilidad laboral publica', 'sanciones'],
    contenido: `LEY Nº 1626/2000 - DE LA FUNCIÓN PÚBLICA EN PARAGUAY

ESTATUTO Y RÉGIMEN DISCIPLINARIO DEL SERVIDOR PÚBLICO:
Artículo 1: Esta ley regula la situación jurídica de los funcionarios y empleados públicos al servicio del Estado.
Artículo 47 - Estabilidad: El funcionario público que complete dos años de servicio ininterrumpido en cargo permanente adquiere estabilidad.
Artículo 64 - Faltas disciplinarias y sanciones: Faltas leves (amonestación, multa) y faltas graves (suspensión, destitución o inhabilitación).
Artículo 73 - Sumario Administrativo: La destitución de un funcionario permanente requiere previo sumario administrativo instruido por Juez Instructor con garantía plena del debido proceso y derecho a la defensa.`,
  },

  // ==========================================
  // ACORDADAS CSJ - EXPEDIENTE ELECTRÓNICO
  // ==========================================
  {
    titulo: 'Acordada CSJ Nº 1335/2019 y Nº 1107/2016 - Trámite Electrónico y Notificaciones CSJ',
    categoria: 'resolucion',
    fuero: 'Civil y Comercial',
    estadoNormativo: 'Vigente',
    numeroLey: 'CSJ1335',
    fuente: 'Corte Suprema de Justicia del Paraguay',
    url: 'https://www.csj.gov.py/acordadas',
    tags: ['acordada csj', 'expediente electronico', 'notificacion electronica', 'judisoft', 'computo de plazos'],
    contenido: `CORTE SUPREMA DE JUSTICIA - ACORDADAS REGLAMENTARIAS DEL EXPEDIENTE JUDICIAL ELECTRÓNICO

REGLAS VINCULANTES DE TRAMITACIÓN JUDICIAL DIGITAL:
1. Validez de los escritos y resoluciones electrónicas: Los documentos ingresados al sistema con firma digital o electrónica de los magistrados, actuarios y abogados matriculados tienen plena validez legal y procesal equiparable al soporte papel.
2. Notificaciones electrónicas automáticas: Las resoluciones judiciales notificables por cédula quedan notificadas en la bandeja electrónica de casillero digital del profesional.
3. Cómputo de plazos en el expediente electrónico: El plazo perentorio comienza a correr a partir del día siguiente hábil a aquel en que la resolución quede depositada y disponible en el casillero electrónico de la parte.
4. Días inhábiles y caída de sistema: En caso de interrupción técnica comprobada del portal de la CSJ en el último día de un plazo perentorio, el plazo se prorroga automáticamente hasta el día hábil siguiente.`,
  },

  // ==========================================
  // LEY TRIBUTARIA Y OBLIGACIONES COMERCIALES
  // ==========================================
  {
    titulo: 'Ley Nº 6380/2019 - De Modernización y Simplificación del Sistema Tributario Nacional',
    categoria: 'ley',
    fuero: 'Tributario',
    estadoNormativo: 'Vigente',
    numeroLey: '6380',
    fuente: 'DNIT / BACN',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/9258/ley-n-6380-de-modernizacion-y-simplificacion-del-sistema-tributario-nacional',
    tags: ['tributario', 'ire', 'irp', 'iva', 'prescripcion tributaria', 'dnit'],
    contenido: `LEY Nº 6380/2019 - SISTEMA TRIBUTARIO DE LA REPÚBLICA DEL PARAGUAY

IMPUESTOS PRINCIPALES Y RÉGIMEN FISCAL:
1. Impuesto a la Renta Empresarial (IRE): Tasa general del 10% sobre utilidades de fuente paraguaya.
2. Impuesto a la Renta Personal (IRP): Grava rentas de servicios personales (tasas progresivas del 8% al 10%) y rentas y ganancias de capital.
3. Impuesto al Valor Agregado (IVA): Tasa general del 10% sobre enajenación de bienes y prestación de servicios profesionales, tasa del 5% para canasta familiar y productos farmacéuticos.
4. Prescripción de las obligaciones tributarias: Prescribe a los CINCO (5) AÑOS contados desde el 1 de enero del año civil siguiente a aquel en que la obligación debió cumplirse.`
  },
  // ==========================================
  // INSTITUCIONES PÚBLICAS DEL PARAGUAY: FUNCIONES Y ATRIBUCIONES
  // ==========================================
  {
    titulo: 'Ministerio Público / Fiscalía General del Estado - Ley Orgánica Nº 1562/2000',
    categoria: 'ley',
    fuero: 'Penal',
    estadoNormativo: 'Vigente',
    numeroLey: '1562',
    fuente: 'BACN / Ministerio Público',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/1562/ley-organica-del-ministerio-publico',
    tags: ['ministerio publico', 'fiscalia', 'fiscal general', 'accion penal publica', 'investigacion penal', 'agente fiscal'],
    contenido: `MINISTERIO PÚBLICO DE LA REPÚBLICA DEL PARAGUAY (LEY Nº 1562/2000 Y ARTS. 266-272 DE LA CONSTITUCIÓN NACIONAL)

NATURALEZA, ROL CONSTITUCIONAL Y ATRIBUCIONES:
Artículo 266 CN: El Ministerio Público representa a la sociedad ante los órganos jurisdiccionales del Estado, gozando de autonomía funcional y administrativa en el cumplimiento de sus deberes. Lo ejerce el Fiscal General del Estado y los agentes fiscales.
Artículo 268 CN y Ley 1562 - Deberes y atribuciones fundamentales:
1. Ejercicio de la acción penal pública: Promover de oficio o por denuncia la acción penal pública en los hechos punibles que lleguen a su conocimiento, sin perjuicio de la querella adhesiva.
2. Dirección funcional de la investigación penal: Dirige a la Policía Nacional en su carácter de Policía Judicial (Art. 52 CPP). Supervisa la legalidad de las diligencias, allanamientos, incautaciones y peritajes.
3. Imputación y requerimientos conclusivos: Formular acta de imputación (Art. 302 CPP), solicitar medidas cautelares privativas o alternativas de libertad, y presentar requerimientos de acusación, sobreseimiento provisional/definitivo o suspensión condicional del procedimiento.
4. Criterio de objetividad: El agente fiscal no es parte interesada en condenar, sino que debe investigar objetivamente tanto los hechos que fundamenten la acusación como aquellos que eximan o atenúen la responsabilidad del imputado.
5. Estructura especializada: Unidades de Delitos Económicos y Anticorrupción, Narcotráfico, Crimen Organizado, Medio Ambiente, Trata de Personas, Violencia Familiar y Niñez y Adolescencia.`,
  },
  {
    titulo: 'Policía Nacional del Paraguay - Ley Orgánica Nº 7338/2024 y Nº 5757/2016',
    categoria: 'ley',
    fuero: 'Penal',
    estadoNormativo: 'Vigente',
    numeroLey: '7338',
    fuente: 'BACN / Comandancia de la Policía Nacional',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/7338',
    tags: ['policia nacional', 'fuerza publica', 'aprehension', 'flagrancia', 'seguridad interna', 'policia judicial'],
    contenido: `POLICÍA NACIONAL DE LA REPÚBLICA DEL PARAGUAY (LEY Nº 7338/2024, LEY Nº 5757/2016 Y ART. 175 DE LA CONSTITUCIÓN NACIONAL)

MISIÓN CONSTITUCIONAL, ATRIBUCIONES Y LÍMITES OPERATIVOS:
Artículo 175 CN: La Policía Nacional es una institución profesional, no deliberante, obediente, organizada con jerarquía y disciplina en forma permanente. Tiene por misión la preservación del orden público legalmente establecido, así como los derechos y la seguridad de las personas y entidades y de sus bienes; ocuparse de la prevención de los delitos; ejecutar los mandatos de la autoridad competente y, bajo dirección judicial, investigar los delitos.
ATRIBUCIONES PRINCIPALES Y POLICÍA JUDICIAL (Art. 52 CPP):
1. Aprehensión en flagrancia (Art. 239 CPP): Proceder a la aprehensión inmediata de quien sea sorprendido en el momento de cometer un hecho punible o inmediatamente después.
2. Plazos improrrogables de comunicación legal:
   - Comunicación al Ministerio Público: Máximo de SEIS (6) HORAS desde la aprehensión.
   - Puesta a disposición del Juez Penal de Garantías: Máximo de VEINTICUATRO (24) HORAS para resolver la situación procesal.
3. Uso de la fuerza: Gradual, necesario, racional y proporcional a la gravedad de la resistencia o agresión.
4. Documentación e identificación civil: Expedición y archivo exclusivo de la Cédula de Identidad Civil y del Certificado de Antecedentes Policiales a través del Departamento de Identificaciones.
5. Auxilio jurisdiccional obligatorio: Brindar custodia, ejecutar órdenes judiciales de captura, allanamiento con orden judicial escrita y auxilio a oficiales de justicia.`,
  },
  {
    titulo: 'Dirección Nacional de la Patrulla Caminera - Ley Nº 5016/2014 Nacional de Tránsito y Seguridad Vial',
    categoria: 'ley',
    fuero: 'Contencioso Administrativo',
    estadoNormativo: 'Vigente',
    numeroLey: '5016',
    fuente: 'BACN / Ministerio de Obras Públicas y Comunicaciones (MOPC)',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/3448/ley-n-5016-nacional-de-transito-y-seguridad-vial',
    tags: ['patrulla caminera', 'policia caminera', 'transito', 'alcotest', 'rutas nacionales', 'retencion de vehiculos'],
    contenido: `DIRECCIÓN NACIONAL DE LA PATRULLA CAMINERA (LEY Nº 5016/2014 NACIONAL DE TRÁNSITO Y SEGURIDAD VIAL)

JURISDICCIÓN, FACULTADES DE CONTROL, ALCOTEST Y RETENCIÓN:
1. Ámbito de competencia territorial: Control, fiscalización y ordenamiento del tránsito exclusivamente en la Red Vial Nacional (rutas nacionales, ramales y caminos departamentales no comprendidos en zonas urbanas municipales).
2. Pruebas de Alcoholemia / Alcotest:
   - Obligatoriedad: Los conductores están obligados a someterse a las pruebas que determine la autoridad fiscalizadora.
   - Equipo homologado: El alcoholímetro debe contar con calibración vigente y certificación por el INTN (Instituto Nacional de Tecnología, Normalización y Metrología).
   - Acta de procedimiento: Debe labrarse acta con copia al infractor, dejando constancia de hora, graduación alcohólica y datos del aparato.
   - Derecho a contraprueba: El conductor puede solicitar pericia clínica o sanguínea inmediata a su costa.
   - Tolerancia CERO: La ley paraguaya establece 0.00 mg/L de alcohol en sangre.
   - Derivación penal: Cuando la graduación supera los límites reglamentarios (0.20 mg/L o 0.40 g/L), se remiten los antecedentes al Ministerio Público por el hecho punible de Exposición al Peligro en el Tránsito Terrestre (Art. 217 Código Penal).
3. Retención de vehículos (Causas taxativas):
   - Alcotest positivo del conductor si no hay acompañante habilitado.
   - Falta de chapa identificatoria o chapa no correspondiente.
   - Carencia de cédula verde / habilitación municipal o registro de conducir vencido.
   - Desperfectos mecánicos graves que pongan en peligro directo a terceros.
4. Prohibición expresa: La Patrulla Caminera NO puede retener la Cédula de Identidad física ni el Registro de Conducir como prenda o garantía de pago de multas.`,
  },
  {
    titulo: 'Ministerio de Justicia de la República del Paraguay - Ley Nº 1652/2000 y Código de Ejecución Penal',
    categoria: 'ley',
    fuero: 'Penal',
    estadoNormativo: 'Vigente',
    numeroLey: '1652',
    fuente: 'BACN / Ministerio de Justicia',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/1652',
    tags: ['ministerio de justicia', 'sistema penitenciario', 'registro civil', 'carceles', 'ejecucion penal', 'senaai'],
    contenido: `MINISTERIO DE JUSTICIA DE LA REPÚBLICA DEL PARAGUAY (LEY Nº 1652/2000 Y CÓDIGO DE EJECUCIÓN PENAL LEY Nº 5162/2014)

ATRIBUCIONES INSTITUCIONALES, EJECUCIÓN PENAL Y REGISTRO CIVIL:
1. Administración penitenciaria y carcelaria: Custodia, guarda y rehabilitación de personas privadas de libertad en penitenciarías nacionales bajo supervisión del Juez de Ejecución Penal.
2. Dirección General del Registro del Estado Civil: Registro oficial e inscripción de nacimientos, matrimonios, uniones de hecho, defunciones, reconocimientos filiales y expedición de certificados oficiales para actos jurídicos.
3. Servicio Nacional de Atención al Adolescente Infractor (Senaai): Ejecución de medidas socioeducativas y privativas de libertad dictadas por juzgados de la Niñez y la Adolescencia para adolescentes en conflicto con la ley penal.
4. Acceso a la justicia y promoción de los derechos humanos en las instituciones del Estado.`,
  },
  {
    titulo: 'Poder Judicial y Corte Suprema de Justicia - Ley Nº 879/1981 Código de Organización Judicial',
    categoria: 'codigo',
    fuero: 'Organización Judicial',
    estadoNormativo: 'Vigente',
    numeroLey: '879',
    fuente: 'BACN / CSJ',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/879/codigo-de-organizacion-judicial',
    tags: ['poder judicial', 'corte suprema', 'coj', 'registros publicos', 'matricula de abogados', 'jueces'],
    contenido: `PODER JUDICIAL DE LA REPÚBLICA DEL PARAGUAY - CORTE SUPREMA DE JUSTICIA (LEY Nº 879/1981 Y CONSTITUCIÓN NACIONAL)

ORGANIZACIÓN, SALAS JURISDICCIONALES Y DEPENDENCIAS RELEVANTES:
1. Composición de la Corte Suprema de Justicia (9 Ministros):
   - Sala Constitucional: Acciones y excepciones de inconstitucionalidad contra leyes, decretos y sentencias arbitrarias (Art. 132 CN).
   - Sala Civil y Comercial: Recursos extraordinarios de casación, apelación y queja en materia civil, mercantil y contencioso-administrativo.
   - Sala Penal: Recursos de casación, revisión de condenas y control de sentencias del fuero penal.
2. Superintendencia General de Justicia: Facultades disciplinarias y de control sobre magistrados, funcionarios judiciales, actuarios, oficiales de justicia, abogados, escribanos y peritos.
3. Matriculación profesional: Otorgamiento, suspensión y cancelación de la matrícula oficial de abogados habilitados para ejercer la procuración y defensa ante tribunales.
4. Dirección General de los Registros Públicos (DGRP): Dependencia de la CSJ que lleva el Registro de Inmuebles, Registro de Automotores, Registro de Personas Jurídicas y Comercio, Registro de Quiebras, Hipotecas e Interdicciones.`,
  },
  {
    titulo: 'Ministerio de la Defensa Pública - Ley Nº 4423/2011',
    categoria: 'ley',
    fuero: 'General',
    estadoNormativo: 'Vigente',
    numeroLey: '4423',
    fuente: 'BACN / MDP',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/4423',
    tags: ['defensa publica', 'defensor publico', 'asistencia gratuita', 'vulnerabilidad', 'defensa penal'],
    contenido: `MINISTERIO DE LA DEFENSA PÚBLICA DE LA REPÚBLICA DEL PARAGUAY (LEY Nº 4423/2011)

MISIÓN Y SERVICIO PÚBLICO DE ASISTENCIA JURÍDICA GRATUITA:
1. Autonomía funcional y presupuestaria en el sistema de administración de justicia.
2. Representación y defensa letrada obligatoria y gratuita a personas de escasos recursos o en situación de vulnerabilidad en los fueros penal (garantía de defensa obligatoria Art. 16 CN), niñez y adolescencia (juicios de alimentos, filiación, guarda), laboral y civil.`,
  },
  {
    titulo: 'Dirección Nacional de Ingresos Tributarios (DNIT) - Ley Nº 7143/2023',
    categoria: 'ley',
    fuero: 'Tributario',
    estadoNormativo: 'Vigente',
    numeroLey: '7143',
    fuente: 'BACN / DNIT',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/7143',
    tags: ['dnit', 'tributos', 'aduanas', 'set', 'ruc', 'evasion fiscal', 'contrabando'],
    contenido: `DIRECCIÓN NACIONAL DE INGRESOS TRIBUTARIOS (DNIT) - LEY Nº 7143/2023 (FUSIÓN SET + ADUANAS)

ATRIBUCIONES DE RECAUDACIÓN, FISCALIZACIÓN Y CONTROL:
1. Competencia unificada sobre tributos internos (antigua Subsecretaría de Estado de Tributación) y comercio exterior/aranceles aduaneros (antigua Dirección Nacional de Aduanas).
2. Administración del Registro Único de Contribuyentes (RUC), sistema de facturación electrónica nacional (E-Kuatia) y timbrado de comprobantes de venta.
3. Fiscalización, sumarios por defraudación o evasión impositiva y denuncia penal ante el Ministerio Público por Hechos Punibles contra el Orden Económico y Tributario (Art. 261 Código Penal).`,
  },
  {
    titulo: 'Ministerio de Trabajo, Empleo y Seguridad Social (MTESS) - Ley Nº 5115/2013',
    categoria: 'ley',
    fuero: 'Laboral',
    estadoNormativo: 'Vigente',
    numeroLey: '5115',
    fuente: 'BACN / MTESS',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/5115',
    tags: ['mtess', 'ministerio de trabajo', 'inspeccion laboral', 'homologacion liquidacion', 'conciliacion laboral'],
    contenido: `MINISTERIO DE TRABAJO, EMPLEO Y SEGURIDAD SOCIAL (LEY Nº 5115/2013)

POLÍTICA LABORAL, MEDIACIÓN ADMINISTRATIVA Y FISCALIZACIÓN:
1. Inspección y fiscalización del cumplimiento de las normas del Código Laboral (Ley 213/93), seguridad, higiene y salud ocupacional en las empresas.
2. Instancia administrativa previa de mediación y conciliación laboral gratuita en conflictos individuales o colectivos entre empleadores y trabajadores.
3. Homologación de liquidaciones por finiquito de contrato laboral y registro formal de contratos de trabajo y reglamentos internos.`,
  },
  {
    titulo: 'Instituto de Previsión Social (IPS) - Decreto-Ley Nº 1860/1950 y Leyes Complementarias',
    categoria: 'ley',
    fuero: 'Laboral',
    estadoNormativo: 'Vigente',
    numeroLey: '1860',
    fuente: 'BACN / IPS',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/1860',
    tags: ['ips', 'seguridad social', 'aporte obrero patronal', 'jubilaciones', 'salud'],
    contenido: `INSTITUTO DE PREVISIÓN SOCIAL (IPS) - DECRETO-LEY Nº 1860/1950 Y MODIFICATORIAS

RÉGIMEN DEL SEGURO SOCIAL OBLIGATORIO:
1. Obligatoriedad: Todo trabajador en relación de dependencia debe ser inscripto en el IPS desde el primer día de trabajo.
2. Aportes: Aporte Obrero (9% descontado del salario del trabajador) y Aporte Patronal (16.5% a cargo exclusivo del empleador).
3. Coberturas: Prestaciones de salud médica integral, subsidios por maternidad y enfermedad, pensiones y jubilaciones ordinarias y extraordinarias.
4. Delito de omisión de retención de aportes: No depositar los aportes descontados al trabajador configura hecho punible sancionado en el Código Penal.`,
  },
  {
    titulo: 'Municipalidades y Policía Municipal de Tránsito (PMT) - Ley Nº 3966/2010 Orgánica Municipal',
    categoria: 'ley',
    fuero: 'Contencioso Administrativo',
    estadoNormativo: 'Vigente',
    numeroLey: '3966',
    fuente: 'BACN / Junta Municipal',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/3966',
    tags: ['municipalidad', 'pmt', 'transito urbano', 'juzgado de faltas', 'multas municipales'],
    contenido: `MUNICIPALIDADES Y POLICÍA MUNICIPAL DE TRÁNSITO - LEY Nº 3966/2010 ORGÁNICA MUNICIPAL

JURISDICCIÓN URBANA Y JUZGADOS DE FALTAS MUNICIPALES:
1. Competencia sobre el ejido urbano municipal: Regulación, señalización y control del tránsito vehicular y peatonal dentro de los límites del municipio.
2. Estacionamiento tarifado y grúas de remoción: Facultad de remover vehículos mal estacionados o que obstruyan rampas de personas con discapacidad o bocacalles.
3. Juzgados de Faltas Municipales: Órganos con competencia administrativa para juzgar infracciones a ordenanzas municipales, fijar multas e inhabilitar registros de conducir.`,
  },
];

const APRENDIZAJES_INICIALES_OTELAX = [
  {
    pregunta: '¿Cuáles son los plazos y requisitos para evitar la caducidad de instancia en Paraguay según el Art. 172 del CPC?',
    respuesta: `Conforme al **Artículo 172 del Código Procesal Civil Paraguayo (Ley Nº 1337/1988)**:
1. **Plazo en primera instancia:** Se produce la caducidad de la instancia si transcurren **SEIS (6) MESES** sin que se instare el curso del proceso.
2. **Plazo en segunda o ulterior instancia:** Se opera a los **TRES (3) MESES**.
3. **Cómputo (Art. 173 CPC):** Corre desde la fecha de la última providencia, resolución judicial o petición de parte que tenga por objeto impulsar el trámite.
4. **Modo de interrupción:** Se interrumpe mediante cualquier escrito de impulso idóneo (urgimiento, solicitud de apertura a prueba, autos para sentencia, remisión de oficios).`,
    origen: 'local',
    validado: true,
    tags: ['caducidad', 'art 172', 'cpc', 'plazos'],
  },
  {
    pregunta: '¿Cómo se calcula la indemnización por despido injustificado según la Ley 213/93 del Código Laboral?',
    respuesta: `Conforme al **Artículo 91 del Código Laboral Paraguayo (Ley Nº 213/1993)**:
1. **Monto Indemnizatorio:** Corresponde **15 días de salario diario** por cada año de servicio o fracción superior a 6 meses.
2. **Salario Base de Cálculo:** Se toma el promedio de salarios percibidos durante los últimos 6 meses trabajados, dividido entre 30 para obtener el salario diario.
3. **Preaviso (Art. 87):** Si no hubo preaviso por escrito, se adicionan 30 días (hasta 1 año), 45 días (1 a 5 años), 60 días (5 a 10 años) o 90 días (más de 10 años).
4. **Aguinaldo proporcional (Art. 243):** 1/12 de todo lo percibido en el año.
5. **Vacaciones causadas y proporcionales:** Según antigüedad.`,
    origen: 'local',
    validado: true,
    tags: ['laboral', 'despido', 'art 91', 'indemnizacion'],
  },
  {
    pregunta: '¿Cuáles son los requisitos y el procedimiento para promover un juicio de prestación de alimentos en Paraguay?',
    respuesta: `Conforme a los **Artículos 97, 98 y 185 del Código de la Niñez y la Adolescencia (Ley Nº 1680/2001)**:
1. **Competencia:** Juzgado de Primera Instancia de la Niñez y la Adolescencia del lugar de residencia del niño.
2. **Requisitos probatorios:** Certificado de nacimiento que acredite el parentesco y constancia de necesidades o gastos del menor.
3. **Fijación de Alimentos Provisorios (Art. 185):** El juez debe fijar inmediatamente una cuota provisoria al admitir la demanda mediante oficio judicial de embargo/retención directa sobre el salario del demandado ante su empleador o depósito en el BNF.
4. **Inembargabilidad:** Los fondos de prestación alimenticia son inembargables y destinados exclusivamente al sostenimiento integral del menor.`,
    origen: 'local',
    validado: true,
    tags: ['ninez', 'alimentos', 'ley 1680', 'prestacion alimentaria'],
  },
  {
    pregunta: '¿Qué plazo existe para deducir excepciones previas y contestar la demanda en el juicio ordinario civil?',
    respuesta: `Conforme al **Código Procesal Civil (Ley Nº 1337/1988)**:
1. **Contestación de Demanda Ordinaria (Art. 222):** Plazo perentorio e improrrogable de **dieciocho (18) días hábiles** desde la notificación electrónica o por cédula.
2. **Excepciones Previas (Art. 223/224):** Deben oponerse de forma conjunta dentro de los **primeros nueve (9) días** del plazo para contestar la demanda.
3. **Excepciones admisibles:** Incompetencia, falta de personería, litispendencia, defecto legal, cosa juzgada, transacción y prescripción liberatoria.`,
    origen: 'local',
    validado: true,
    tags: ['cpc', 'excepciones', 'plazos', 'contestacion demanda'],
  },
  {
    pregunta: '¿Qué elementos configuran el hecho punible de Estafa según el Art. 187 del Código Penal Paraguayo?',
    respuesta: `Conforme al **Artículo 187 del Código Penal (Ley Nº 1160/1997 modificada por Ley Nº 3440/2008)**:
1. **Tipo Objetivo:**
   - Afirmación de hechos falsos o desfiguración de hechos verdaderos (ardid / engaño idóneo).
   - Producción o mantenimiento de un error en la víctima.
   - Acto de disposición patrimonial realizado por la víctima debido al error.
   - Perjuicio patrimonial efectivo.
2. **Tipo Subjetivo:** Dolo directo de estafa y ánimo de lucro / beneficio patrimonial indebido para sí o un tercero.
3. **Pena:** Hasta 5 años de pena privativa de libertad o multa. En casos especialmente graves (reiteración o perjuicio de gran cuantía), la pena privativa de libertad será de hasta 8 años.`,
    origen: 'local',
    validado: true,
    tags: ['penal', 'estafa', 'art 187', 'tipo penal'],
  },
];

async function sembrarOtelaxWisdom() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('[OtelaxWisdom] Conectado exitosamente a MongoDB');

    // 1. Marcar leyes derogadas existentes como 'Derogada' para que nunca sean usadas por el RAG
    const resDerogadas = await BaseLegal.updateMany(
      {
        $or: [
          { titulo: { $regex: /histórica|derogada/i } },
          { titulo: { $regex: /Ley 2597|Ley 5102/i } },
        ],
      },
      { $set: { estadoNormativo: 'Derogada' } }
    );
    console.log(`[OtelaxWisdom] Normas derogadas identificadas y aisladas: ${resDerogadas.modifiedCount}`);

    // 2. Sembrar o actualizar cada norma principal del Corpus OtelaxWisdom
    let insertadosLeyes = 0;
    let actualizadosLeyes = 0;

    for (const norma of CORPUS_OTELAX_WISDOM) {
      const existe = await BaseLegal.findOne({
        $or: [
          { numeroLey: norma.numeroLey },
          { titulo: norma.titulo },
        ],
      });

      if (!existe) {
        await BaseLegal.create(norma);
        insertadosLeyes++;
      } else {
        await BaseLegal.updateOne(
          { _id: existe._id },
          {
            $set: {
              fuero: norma.fuero,
              estadoNormativo: norma.estadoNormativo,
              numeroLey: norma.numeroLey,
              contenido: norma.contenido,
              tags: norma.tags,
              fuente: norma.fuente,
              url: norma.url,
            },
          }
        );
        actualizadosLeyes++;
      }
    }
    console.log(`[OtelaxWisdom] Códigos y Leyes procesados: ${insertadosLeyes} nuevos, ${actualizadosLeyes} sincronizados.`);

    // 3. Sembrar aprendizajes doctrinarios y procesales validados
    let insertadosAprendizajes = 0;
    for (const apr of APRENDIZAJES_INICIALES_OTELAX) {
      const existeApr = await AprendizajeSistema.findOne({ pregunta: apr.pregunta });
      if (!existeApr) {
        await AprendizajeSistema.create(apr);
        insertadosAprendizajes++;
      }
    }
    console.log(`[OtelaxWisdom] Enseñanzas jurídicas registradas en el RAG: ${insertadosAprendizajes} añadidas.`);

    // 4. Verificación final de estadísticas de conocimiento
    const totalBase = await BaseLegal.countDocuments({ estadoNormativo: 'Vigente' });
    const totalApr = await AprendizajeSistema.countDocuments({ validado: true });
    console.log(`[OtelaxWisdom] 🚀 Motor de conocimiento activo: ${totalBase} normas vigentes + ${totalApr} enseñanzas doctrinarias validadas.`);

    await mongoose.disconnect();
    console.log('[OtelaxWisdom] Ingesta finalizada con éxito.');
  } catch (err) {
    console.error('[OtelaxWisdom] Error durante la ingesta:', err);
    process.exit(1);
  }
}

sembrarOtelaxWisdom();
