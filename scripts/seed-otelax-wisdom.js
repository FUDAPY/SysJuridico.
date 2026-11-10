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
Artículo 1 - De la forma del Estado y de gobierno: La República del Paraguay es para siempre libre e independiente. Se constituye en Estado social de derecho, unitario, indivisible, y descentralizado en la forma que establecen esta Constitución y las leyes. La soberanía reside en el pueblo, que la ejerce conforme con lo dispuesto en esta Constitución.
Artículo 4 - Del derecho a la vida: El derecho a la vida es inherente a la persona humana. Se garantiza su protección, en general, desde la concepción. Queda abolida la pena de muerte. Toda persona será protegida por el Estado en su integridad física y psíquica, así como en su honor y en su reputación.
Artículo 9 - De la libertad y de la seguridad de las personas: Todos los habitantes de la República tienen derecho a ser protegidos en su libertad y en su seguridad. Nadie está obligado a hacer lo que la ley no ordena ni privado de lo que ella no prohíbe.
Artículo 11 - De la privación de la libertad: Nadie será privado de su libertad física ni procesado, sino mediando las causas y en las condiciones fijadas por esta Constitución y las leyes.
Artículo 12 - De la detención y del arresto: Nadie será detenido ni arrestado sin orden escrita de autoridad competente, salvo caso de ser sorprendido en flagrante delito de cometer hecho punible. Toda persona detenida tiene derecho a que se le informe en el acto sobre los motivos de su detención, a guardar silencio y a comunicarse de inmediato con su abogado o familiar.
Artículo 16 - De la defensa en juicio: La defensa en juicio de las personas y de sus derechos es inviolable. Toda persona tiene derecho a ser juzgada por tribunales y jueces competentes, independientes e imparciales.
Artículo 17 - De los derechos procesales: En el proceso penal, o en cualquier otro del cual pudiera derivarse pena o sanción, toda persona tiene derecho a: que sea presumida su inocencia; que se le juzgue en juicio público; que no se le obligue a declarar contra sí misma ni contra sus parientes; que no sea juzgada más de una vez por el mismo hecho (non bis in idem); a disponer de defensa técnica; a la comunicación previa y detallada de la imputación; a no ser condenada sin juicio previo fundado en ley anterior al hecho del proceso.
Artículo 46 - De la igualdad de las personas: Todos los habitantes de la República son iguales en dignidad y derechos. No se admiten discriminaciones. El Estado removerá los obstáculos e impedirá los factores que las mantengan o las propicien.
Artículo 47 - De las garantías de la igualdad: El Estado garantizará a todos los habitantes de la República: la igualdad ante las leyes; la igualdad para el acceso a las funciones públicas no electivas; la igualdad de oportunidades en la participación de los beneficios de la naturaleza y del desarrollo económico.
Artículo 54 - De la protección al niño: La familia, la sociedad y el Estado tienen la obligación de garantizar al niño su desarrollo armónico e integral, así como el ejercicio pleno de sus derechos, protegiéndolo contra el abandono, la desnutrición, la violencia, el abuso, el tráfico y la explotación. Los derechos del niño, en caso de conflicto, tienen carácter prevaleciente (Interés Superior del Niño).
Artículo 86 - Del derecho al trabajo: Todos los habitantes de la República tienen derecho a un trabajo lícito, libremente escogido y a realizarse en condiciones dignas y justas. La ley protegerá el trabajo en todas sus formas.
Artículo 92 - Del salario mínimo: El trabajador tiene derecho a disfrutar de una remuneración que le asegure, a él y a su familia, una existencia libre y digna. La ley consagrará el salario mínimo vital, el aguinaldo anual, la bonificación familiar y el reconocimiento de un salario igual para trabajo de igual valor.
Artículo 94 - De la estabilidad y de la indemnización: El derecho a la estabilidad en el trabajo queda garantizado dentro de los límites que la ley establezca, así como su correspondiente indemnización en caso de despido injustificado.
Artículo 131 - De las garantías constitucionales: Las garantías consagradas en esta Constitución se harán efectivas mediante las leyes de procedimiento respectivas.
Artículo 132 - De la inconstitucionalidad: La Corte Suprema de Justicia tiene facultad para declarar la inconstitucionalidad de las normas jurídicas y de las resoluciones judiciales, en los casos y en la forma establecidos en esta Constitución y en la ley.
Artículo 133 - Del Hábeas Corpus: Garantía tutelar de la libertad física y la vida contra detenciones ilegales o arbitrarias. Podrá ser preventivo, reparador o genérico.
Artículo 134 - Del Amparo: Toda persona que por un acto u omisión, manifiestamente ilegítimo, de una autoridad o de un particular, se considere lesionada gravemente o en peligro inminente de serlo en derechos consagrados en esta Constitución o en la ley, y debido a la urgencia del caso no pudiera remediarse por la vía ordinaria, puede promover amparo ante cualquier juez competente.
Artículo 135 - Del Hábeas Data: Toda persona puede acceder a la información y a los datos que sobre sí misma, o sobre sus bienes, obren en registros oficiales o privados de carácter público, así como conocer su uso y finalidad. Podrá solicitar ante magistrado competente la actualización, rectificación o destrucción de aquellos si fuesen erróneos o afectasen ilegítimamente sus derechos (base constitucional para la exclusión de Informconf).
Artículo 137 - De la supremacía de la Constitución: La ley suprema de la República es la Constitución. Esta, los tratados, convenios y acuerdos internacionales aprobados y ratificados, las leyes dictadas por el Congreso y otras disposiciones jurídicas de inferior jerarquía, sancionadas en su consecuencia, integran el derecho positivo nacional en el orden de prelación enunciado. Quienquiera que intente cambiar dicho orden, al margen de los procedimientos previstos en esta Constitución, incurrirá en los delitos que se tipificarán y penarán en la ley. Carecen de validez todas las disposiciones o actos de autoridad opuestos a lo establecido en esta Constitución.

PARTE ORGÁNICA - PODER JUDICIAL Y MINISTERIO PÚBLICO:
Artículo 247 - De la función y de la composición del Poder Judicial: El Poder Judicial es el custodio de esta Constitución. La administra, la interpreta y la cumple. La administración de justicia está a cargo del Poder Judicial, ejercido por la Corte Suprema de Justicia, por los tribunales y por los juzgados que establezca la ley.
Artículo 248 - De la independencia del Poder Judicial: Queda garantizada la independencia del Poder Judicial. Solo este puede conocer y decidir en actos de carácter contencioso. En ningún caso los miembros de los otros poderes ni otros funcionarios podrán arrogarse atribuciones judiciales.
Artículo 256 - De la forma de los juicios y fundamentación: Los juicios podrán ser orales y públicos, en la forma y en la medida que la ley determine. Toda sentencia judicial debe estar fundada en esta Constitución y en la ley.
Artículo 259 - Deberes y atribuciones de la Corte Suprema de Justicia: Ejercer la superintendencia de todos los organismos del Poder Judicial; conocer y resolver sobre inconstitucionalidad; conocer y decidir en única instancia en los conflictos de jurisdicción y competencia.
Artículo 266 - De la composición y de las funciones del Ministerio Público: El Ministerio Público representa a la sociedad ante los órganos jurisdiccionales del Estado, gozando de autonomía funcional y administrativa en el cumplimiento de sus deberes y atribuciones. Lo ejercen el Fiscal General del Estado y los agentes fiscales en la forma determinada por la ley.
Artículo 268 - Deberes y atribuciones del Ministerio Público: 1. Velar por el respeto de los derechos y de las garantías constitucionales; 2. Promover acción penal pública para defender el patrimonio público y social, el medio ambiente y otros intereses difusos; 3. Ejercer acción penal en los casos en que para iniciarla o proseguirla no fuese necesaria instancia de parte.`
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
Artículo 1 a 27 - De las leyes y su obligatoriedad: Las leyes son obligatorias desde el día siguiente al de su publicación oficial o desde el día que ellas mismas determinen. La ignorancia de las leyes no excusa su cumplimiento.
Artículo 28 - De las personas físicas: La persona humana tiene capacidad de derecho desde su concepción en el seno materno. Adquiere plena capacidad de hecho al cumplir diez y ocho años de edad.
Artículo 91 - De las personas jurídicas: Son personas jurídicas el Estado, las Municipalidades, las asociaciones reconocidas de utilidad pública, las fundaciones, las sociedades civiles y comerciales y las cooperativas.

LIBRO SEGUNDO - DE LOS HECHOS Y ACTOS JURÍDICOS Y DE LAS OBLIGACIONES:
Artículo 277 - Actos jurídicos: Los actos jurídicos son los actos voluntarios lícitos, que tengan por fin inmediato crear, modificar, transferir, conservar o extinguir derechos.
Artículo 285 - Vicios de la voluntad: El error, el dolo y la violencia vician la voluntad y causan la anulabilidad del acto jurídico.
Artículo 290 - De la simulación: La simulación tiene lugar cuando se encubre el carácter jurídico de un acto bajo la apariencia de otro, o cuando el acto contiene cláusulas que no son sinceras.
Artículo 305 - Del fraude pauliniano: Los acreedores quirografarios pueden solicitar la revocación de los actos de disposición a título gratuito o a título oneroso ejecutados por su deudor en fraude y perjuicio de sus créditos.
Artículo 355 - Nulidades: La nulidad de un acto jurídico puede ser absoluta o relativa. Es absoluta cuando contraviene el orden público o las buenas costumbres; es relativa cuando se establece para la protección de un interés particular.
Artículo 417 - Objeto de las obligaciones: Las obligaciones tienen por objeto prestaciones susceptibles de apreciación pecuniaria, que correspondan a un interés personal, patrimonial o extrapatrimonial del acreedor.
Artículo 423 - De la mora: El deudor queda constituido en mora por el simple vencimiento del plazo estipulado, sin necesidad de interpelación judicial o extrajudicial alguna (mora automática).
Artículo 500 - Intereses moratorios y punitorios: El deudor moroso debe abonar los intereses pactados o los legales. Los punitorios pactados sustituyen a la indemnización de daños y perjuicios de la mora.
Artículo 633 - Prescripción liberatoria: La prescripción liberatoria extingue las acciones por el no ejercicio de ellas durante el tiempo establecido por la ley.
Artículo 659 - Plazos generales de prescripción: Prescriben a los DIEZ AÑOS las acciones personales que no tengan un plazo especial fijado por este Código; prescriben a los CINCO AÑOS las obligaciones que deben pagarse por años o plazos más cortos (pensiones alimenticias atrasadas, cánones locativos).
Artículo 663 - Prescripción de responsabilidad extracontractual: Prescribe a los DOS AÑOS la acción de indemnización por daños y perjuicios derivados de actos ilícitos (responsabilidad civil extracontractual).
Artículo 1740 - Prescripción de acciones cambiarias: Las acciones derivadas del libramiento de cheques prescriben al año de fenecido el plazo legal de presentación.

LIBRO TERCERO - DE LOS CONTRATOS Y OTRAS FUENTES DE OBLIGACIONES:
Artículo 669 - Libertad contractual: Las partes pueden reglar libremente sus derechos mediante contratos, observando las normas imperativas y el orden público. Los contratos válidamente celebrados obligan como la ley misma.
Artículo 715 - Fuerza vinculante de los contratos: Las convenciones hechas en los contratos forman para las partes una regla a la cual deben someterse como a la ley misma, y deben ser cumplidas de buena fe (Pacta sunt servanda).
Artículo 1833 - Responsabilidad extracontractual: El que comete un acto ilícito queda obligado a indemnizar el daño causado a otro. La culpa o negligencia obliga a la reparación integral del daño emergente y lucro cesante.
Artículo 1834 - Responsabilidad objetiva y por el hecho ajeno: El principal responde solidariamente por los daños causados por sus dependientes o auxiliares en el ejercicio de sus funciones.

LIBRO CUARTO - DE LOS DERECHOS REALES Y LA POSESIÓN:
Artículo 1909 - De la posesión: Poseedor es quien ejerce de hecho un poder material sobre una cosa, comportándose como titular de un derecho real, lo sea o no.
Artículo 1989 - Usucapión ordinaria: El que adquiere un inmueble de buena fe y con justo título prescribe la propiedad por la posesión continua de DIEZ (10) AÑOS.
Artículo 1990 - Usucapión extraordinaria: Quien hubiese poseído continua, pública y pacíficamente un inmueble durante VEINTE (20) AÑOS, sin necesidad de justo título ni de buena fe, adquiere el dominio del mismo mediante sentencia judicial.`
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
Artículo 15 - Deberes de los jueces: Dictar las resoluciones dentro de los plazos legales, fundar toda sentencia en la Constitución y las leyes, dirigir el proceso asegurando la igualdad de las partes y prevenir o sancionar todo acto contrario al deber de lealtad y probidad.
Artículo 47 - Representación procesal: Las partes deberán comparecer a juicio por intermedio de abogado matriculado con poder suficiente o con patrocinio letrado obligatorio en todos los actos procesales.
Artículo 106 - De los escritos judiciales: Todo escrito debe ser encabezado con la expresión de su objeto, nombre de las partes y carátula del expediente, redactado en idioma castellano y firmado por el profesional actuante.
Artículo 141 - Carácter de los plazos procesales: Los plazos legales y judiciales son perentorios e improrrogables, salvo disposición expresa en contrario de la ley.
Artículo 145 - Cómputo de los plazos: Los plazos procesales empezarán a correr desde el día siguiente hábil a aquel en que se hubiere practicado la notificación.
Artículo 172 - Caducidad de la instancia: Se operará la caducidad de la instancia cuando no se instare el curso del proceso dentro del plazo de SEIS MESES en primera instancia y TRES MESES en segunda o ulterior instancia.
Artículo 173 - Cómputo del plazo de caducidad: Los plazos de caducidad correrán desde la fecha de la última petición de las partes, o resolución o actuación del juez o tribunal que tuviere por objeto impulsar el procedimiento.
Artículo 174 - Interrupción de la caducidad: La caducidad se interrumpe por cualquier acto procesal idóneo de parte o de órgano judicial dirigido a activar el trámite del expediente.
Artículo 178 - Efectos de la caducidad: Declarada la caducidad en primera instancia, queda extinguido el proceso pero no la acción, que podrá promoverse nuevamente en juicio ulterior si no estuviere prescripta.

DEMANDA, EXCEPCIONES Y PERÍODO PROBATORIO:
Artículo 215 - Requisitos formales de la demanda: La demanda se presentará por escrito y contendrá: 1. Nombre y domicilio real del demandante; 2. Nombre y domicilio del demandado; 3. La cosa demandada, designándola con exactitud; 4. Los hechos en que se funda expuestos con claridad; 5. El derecho expuesto sucintamente; 6. La petición en términos claros y positivos.
Artículo 222 - Plazo para contestar demanda en juicio ordinario: El demandado deberá contestar la demanda dentro del plazo perentorio de DIECIOCHO (18) DÍAS HÁBILES de notificado.
Artículo 223 - Excepciones previas admisibles: 1. Incompetencia; 2. Falta de personería en el demandante o en su apoderado; 3. Litispendencia; 4. Defecto legal en la forma de proponer la demanda; 5. Cosa juzgada; 6. Transacción, conciliación y desistimiento; 7. Prescripción liberatoria.
Artículo 224 - Plazo para oponer excepciones: Las excepciones previas se opondrán conjuntamente dentro de los PRIMEROS NUEVE (9) DÍAS del plazo para contestar la demanda en el juicio ordinario.
Artículo 247 - Período de pruebas: El plazo para producir las pruebas en el juicio ordinario será fijado por el juez y no excederá de CUARENTA (40) DÍAS HÁBILES.

RÉGIMEN DE RECURSOS PROCESALES:
Artículo 395 - Recurso de aclaratoria: Procede para corregir errores materiales, aclarar conceptos oscuros o suplir cualquier omisión en que se hubiere incurrido sobre alguna de las pretensiones deducidas. Plazo: Tres (3) días.
Artículo 398 - Recurso de reposición: Procede contra las providencias de mero trámite y resoluciones que no causen gravamen irreparable, a fin de que el mismo juez o tribunal las revoque por contrario imperio. Plazo: Tres (3) días.
Artículo 403 - Recurso de apelación: Procede contra las sentencias definitivas y resoluciones interlocutorias que causen gravamen irreparable. Plazo de interposición: Cinco (5) días hábiles.
Artículo 410 - Recurso de nulidad: Procede contra resoluciones dictadas con violación de la forma o de las garantías procesales establecidas por este Código. Se interpone conjuntamente con la apelación.

DEL JUICIO EJECUTIVO:
Artículo 438 - Títulos ejecutivos: Traen aparejada ejecución los instrumentos públicos o privados reconocidos, pagarés a la orden, cheques protestados, letras de cambio, constancias de saldo deudor en cuenta corriente bancaria y créditos por alquileres.
Artículo 448 - Intimación de pago y embargo: El juez librará mandamiento de intimación de pago y embargo ejecutivo sobre los bienes del deudor suficientes para cubrir la deuda, intereses y costas.
Artículo 462 - Excepciones en el juicio ejecutivo: Incompetencia, falta de personería, falsedad material o inhabilidad de título, pago total acreditado documentalmente, compensación de crédito líquido y prescripción.`
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
    tags: ['codigo penal', 'estafa', 'apropiacion', 'lesion de confianza', 'homicidio', 'violencia familiar', 'prescripcion penal', 'alcotest'],
    contenido: `CÓDIGO PENAL DE LA REPÚBLICA DEL PARAGUAY (LEY Nº 1160/1997 / MODIFICADA POR LEY Nº 3440/2008)

PARTE GENERAL - PRINCIPIOS Y REPROCHABILIDAD:
Artículo 1 - Principio de legalidad (Nullum crimen, nulla poena sine lege): Nadie será sancionado por un acto que no haya sido expresamente declarado punible por la ley antes de su comisión, ni con pena que no haya sido previamente establecida.
Artículo 2 - Principio de reprochabilidad: No hay pena sin reprochabilidad. La gravedad de la pena no podrá exceder el límite de la reprochabilidad del autor.
Artículo 14 - Definición de hecho punible, crimen y delito: Son crímenes los hechos punibles cuya sanción legal sea pena privativa de libertad superior a cinco años. Son delitos los hechos punibles cuya sanción legal sea pena privativa de libertad de hasta cinco años o con multa.
Artículo 19 - De la tentativa: Hay tentativa cuando el autor ejecuta actos que implican el comienzo directo de la realización del hecho punible según su plan, sin que el resultado típico llegue a consumarse por causas ajenas a su voluntad.
Artículo 29 - Autoría y coautoría: Será castigado como autor el que realizara el hecho punible por sí o valiéndose de otro. Los que realizaran conjuntamente el hecho serán castigados como coautores.
Artículo 31 - De la instigación y complicidad: El que determinara dolosamente a otro a cometer un hecho punible será castigado con la pena del autor. El que prestara ayuda dolosa a otro para cometer un hecho punible será castigado como cómplice con pena atenuada.
Artículo 101/102 - Prescripción de la acción penal: La acción penal prescribe en un tiempo igual al máximo de la pena fijada para el hecho, nunca menor a tres años para delitos y hasta quince años para crímenes.

PARTE ESPECIAL - HECHOS PUNIBLES CONTRA LAS PERSONAS, EL PATRIMONIO Y LA SEGURIDAD:
Artículo 105 - Homicidio doloso: El que matara a otro será castigado con pena privativa de libertad de cinco a veinte años. En casos especialmente graves (alevosía, por precio o promesa remuneratoria, para ocultar otro delito), la pena privativa de libertad será de hasta treinta años.
Artículo 107 - Homicidio culposo: El que por acción u omisión imprudente o negligente causara la muerte de otro, será castigado con pena privativa de libertad de hasta cinco años o con multa.
Artículo 160 - Apropiación: El que se adueñara indebidamente de una cosa mueble ajena que le hubiese sido confiada será castigado con pena privativa de libertad de hasta cinco años o con multa.
Artículo 161 - Hurto: El que con la intención de apropiarse de una cosa mueble ajena, la sustrajera de la posesión de otro, será castigado con pena privativa de libertad de hasta cinco años o con multa.
Artículo 166 - Robo: El que mediando fuerza sobre las cosas o violencia física o amenazas contra las personas sustrajera una cosa mueble ajena, será sancionado con pena privativa de libertad de uno a quince años.
Artículo 187 - Estafa: El que con la intención de obtener para sí o para un tercero un beneficio patrimonial indebido, indujera al error a otro mediante afirmaciones falsas o deformación de hechos, y produjera un perjuicio patrimonial, será castigado con pena de hasta cinco años o multa. En casos especialmente graves (reiteración, perjuicio masivo), la pena privativa de libertad será de hasta ocho años.
Artículo 192 - Lesión de confianza: El que en base a la ley, a una resolución judicial o a un contrato, hubiese asumido la responsabilidad de proteger el interés patrimonial ajeno y le causare perjuicio, será castigado con pena de hasta cinco años o con multa. En casos graves, hasta diez años de privación de libertad.
Artículo 217 - Exposición al peligro en el tránsito terrestre: El que dolosa o culposamente condujera en la vía pública un vehículo careciendo de la aptitud física o psíquica para hacerlo con seguridad por haber consumido bebidas alcohólicas u otras sustancias que alteren su capacidad, será castigado con pena privativa de libertad de hasta dos años o con multa. Se presume el peligro cuando el conductor supera 0.20 mg/L de alcohol en aire expirado o 0.40 g/L en sangre.
Artículo 229 - Violencia familiar: El que ejerza violencia física o psíquica sobre un familiar o conviviente será sancionado con pena privativa de libertad de uno a seis años. La pena se aumentará si la víctima fuese menor de edad o persona con discapacidad.
Artículo 246 - Producción de documentos no auténticos: El que con la intención de inducir al error en las relaciones jurídicas produjera un documento no auténtico o utilizara uno de tal naturaleza, será castigado con pena de hasta cinco años o con multa.
Artículo 300 - Cohecho pasivo: El funcionario público que solicitara, se hiciera prometer o aceptara un beneficio indebido a cambio de realizar u omitir un acto de su competencia, será castigado con pena de hasta cinco años o con multa.`
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

PRINCIPIOS Y GARANTÍAS PROCESALES FUNDAMENTALES:
Artículo 1 - Juicio previo: Nadie podrá ser condenado sino en virtud de una sentencia dictada por juez competente en juicio previo fundado en la ley anterior al hecho del proceso.
Artículo 4 - Principio de inocencia: Se presumirá la inocencia del imputado durante todo el procedimiento mientras no se declare su culpabilidad por sentencia firme. Ninguna autoridad podrá presentar a una persona como culpable antes de la condena.
Artículo 6 - Inviolabilidad de la defensa técnica: La defensa técnica es un derecho inviolable e irrenunciable. Si el imputado no designa defensor particular de su confianza, el Estado le designará de oficio un Defensor Público.
Artículo 10 - In dubio pro reo: En caso de duda razonable sobre la acreditación de los hechos o la responsabilidad penal, se decidirá a favor del imputado.
Artículo 52 - Policía Judicial y subordinación al fiscal: Los funcionarios de la Policía Nacional que cumplan funciones de policía judicial actuarán bajo la dirección funcional del Ministerio Público en la investigación penal.
Artículo 67 - Querella adhesiva de la víctima: La víctima de un hecho punible o sus herederos forzosos podrán intervenir en el proceso penal como querellantes adhesivos con facultades de ofrecer pruebas, participar en audiencias y acusar conjuntamente con el fiscal.
Artículo 136 - Duración máxima del procedimiento penal: Todo procedimiento penal tendrá una duración máxima improrrogable de CUATRO (4) AÑOS contados desde el primer acto del procedimiento (acta de imputación formal). Vencido el plazo sin sentencia condenatoria firme, el juez declarará de oficio extinguida la acción penal.

MEDIDAS CAUTELARES Y ETAPAS DEL PROCEDIMIENTO:
Artículo 238 - Finalidad de las medidas cautelares: Las medidas cautelares personales solo podrán ser impuestas por el juez penal de garantías mediante resolución fundada, cuando sean absolutamente indispensables para asegurar la presencia del imputado.
Artículo 242 - Prisión preventiva: La prisión preventiva solo procederá de forma excepcional y restrictiva cuando concurran conjuntamente: 1. Elementos de convicción suficientes sobre la autoría en un hecho punible grave; 2. Peligro concreto de fuga; 3. Peligro concreto de obstrucción a la investigación. No procederá si el hecho punible no prevé pena privativa de libertad superior a seis meses.
Artículo 245 - Medidas cautelares alternativas y sustitutivas: Siempre que el peligro de fuga o de obstrucción pueda ser evitado por una medida menos gravosa, el juez aplicará: arresto domiciliario, prohibición de salir del país, fianza real o personal de letrado o tercero, u obligación de presentarse periódicamente ante el juzgado.
Artículo 302 - Acta de Imputación: Si el agente fiscal estima que existen elementos de convicción suficientes sobre la existencia de un hecho punible y la participación del imputado, formulará acta de imputación fijando la fecha límite para el requerimiento conclusivo.
Artículo 313 - Plazo de la etapa preparatoria: La etapa de investigación fiscal tendrá una duración ordinaria de SEIS (6) MESES desde la notificación de la imputación.
Artículo 347 - Requerimientos conclusivos fiscales: El fiscal podrá presentar: 1. Acusación y solicitud de apertura a juicio oral; 2. Sobreseimiento definitivo; 3. Sobreseimiento provisional; 4. Criterio de oportunidad o suspensión condicional del procedimiento.
Artículo 352 - Audiencia preliminar: Recibida la acusación, el juez penal de garantías convocará a las partes a una audiencia oral obligatoria para debatir la admisión de pruebas, resolver excepciones y dictar el auto de apertura a juicio o el sobreseimiento.
Artículo 363 - Auto de apertura a juicio oral y público: Resolución judicial irrecurrible que fija el objeto del juicio, las pruebas admitidas y remite las actuaciones al Tribunal de Sentencia.
Artículo 365 - Inmediación y publicidad del juicio oral: El juicio oral se realizará con la presencia ininterrumpida de los jueces y las partes, en audiencia pública y oral, salvo excepciones expresas fundadas en pudor o seguridad del menor.`
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

PRINCIPIOS GENERALES Y DERECHOS FUNDAMENTALES:
Artículo 1 - Objeto tutelar: Este Código tiene por objeto establecer normas para regular las relaciones entre los trabajadores y los empleadores, concernientes a la prestación subordinada y retribuida de servicios.
Artículo 3 - Orden público laboral: El trabajo es un derecho y un deber social. Las normas laborales son de orden público y los derechos consagrados a favor del trabajador son irrenunciables, siendo nula toda convención en contrario.
Artículo 7 - In dubio pro operario: Si se suscitase duda sobre la interpretación o alcance de las disposiciones legales o contractuales en materia de trabajo, prevalecerá la más favorable al trabajador.
Artículo 8 - Principio de no discriminación: Queda prohibida toda discriminación fundada en razones de sexo, edad, religión, raza, estado civil o filiación política o sindical.
Artículo 9 - Garantía de estabilidad y salario digno: El trabajador tiene derecho a la estabilidad en el empleo y a una retribución equitativa que le asegure a él y a su familia una existencia digna.

CONTRATO DE TRABAJO, JORNADA Y DESCANSO:
Artículo 29 - De la subordinación laboral: Hay contrato de trabajo, cualquiera sea su denominación, siempre que una persona se obligue a ejecutar una obra o prestar un servicio a favor de otra bajo su subordinación y dirección a cambio de una remuneración.
Artículo 47 - Contrato a prueba: El período de prueba para trabajadores no calificados es de 30 días, para calificados o técnicos 60 días, y para cargos de dirección o alta especialización 90 días. Durante dicho lapso cualquiera de las partes puede rescindir sin indemnización.
Artículo 194 - Jornada ordinaria diurna: La jornada ordinaria de trabajo efectivo diurno no excederá de ocho (8) horas diarias ni de cuarenta y ocho (48) horas semanales. La jornada nocturna no excederá de siete (7) horas diarias ni de cuarenta y dos (42) horas semanales.
Artículo 218 - Vacaciones anuales remuneradas: Todo trabajador tiene derecho a un período de vacaciones anuales remuneradas continuas con el siguiente régimen:
a) De uno a tres años de antigüedad: 12 (doce) días hábiles continuos;
b) De más de tres y hasta ocho años de antigüedad: 18 (dieciocho) días hábiles continuos;
c) De más de ocho años de antigüedad: 30 (treinta) días hábiles continuos.
Artículo 243 - Décimotercer salario o Aguinaldo: Se establece una remuneración anual complementaria o aguinaldo equivalente a la doceava parte (1/12) de todas las remuneraciones devengadas durante el año calendario en concepto de salarios ordinarios, horas extras, comisiones u otras retribuciones. Es inembargable y exento de gravámenes y aportes jubilatorios.
Artículo 255 - Salario mínimo legal y móvil: El salario mínimo es la cantidad menor de dinero que debe percibir en efectivo el trabajador para satisfacer las necesidades normales de su hogar en el orden material, moral y cultural.

EXTINCIÓN DEL CONTRATO, DESPIDO E INDEMNIZACIONES:
Artículo 81 - Justas causas de despido del empleador sin indemnización: Faltas graves de conducta, injurias, amenazas, sustracción de bienes, faltas reiteradas de puntualidad o asistencia sin justificación durante tres días consecutivos o cuatro alternados en el mes, desobediencia a órdenes legítimas y embriaguez habitual o consumo de sustancias ilícitas en el lugar de trabajo.
Artículo 84 - Causas justificadas de retiro del trabajador imputables al empleador: Falta de pago del salario en la fecha y lugar convenidos, reducción arbitraria del salario o alteración sustancial de condiciones de trabajo, actos de violencia o injurias por parte del empleador o sus representantes, y exigencia de actos ilícitos.
Artículo 87 - Del preaviso obligatorio: La parte que rescinda unilateralmente el contrato de trabajo sin justa causa deberá dar aviso previo a la otra conforme a la siguiente escala:
1. Cumplido el período de prueba y hasta un año de servicio: 30 (treinta) días de anticipación;
2. De más de un año y hasta cinco años de servicio: 45 (cuarenta y cinco) días de anticipación;
3. De más de cinco años y hasta diez años de servicio: 60 (sesenta) días de anticipación;
4. De más de diez años de servicio: 90 (noventa) días de anticipación.
Si el empleador omitiere el preaviso, abonará al trabajador el importe equivalente a los días de preaviso no concedidos.
Artículo 91 - Indemnización por despido injustificado: En caso de despido sin causa justificada por el empleador, este pagará al trabajador una indemnización equivalente a QUINCE (15) SALARIOS DIARIOS por cada año de servicio o fracción superior a seis meses de antigüedad acumulada. El salario diario se calcula dividiendo por treinta (30) el promedio mensual de las remuneraciones percibidas en los últimos seis meses trabajados.
Artículo 94 - Estabilidad laboral especial (10 años de antigüedad): El trabajador que cumpla diez (10) años de servicios continuos e ininterrumpidos con el mismo empleador adquiere estabilidad especial en el empleo. No podrá ser despedido sin previa comprobación judicial en juicio sumarísimo de la existencia de justa causa imputable al trabajador conforme al Art. 81.
Artículo 95 - Sanción a la violación de la estabilidad especial: Si el despido del trabajador con estabilidad especial no fuese justificado en juicio, el juez ordenará su inmediata reincorporación al mismo cargo. Si la reincorporación no fuera aceptada o admitida, el empleador deberá abonar el DOBLE de la indemnización común por despido establecida en el Artículo 91.`
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

PRINCIPIOS Y COMPETENCIA DEL FUERO LABORAL:
Artículo 1 - Principios rectores: El procedimiento del trabajo se fundará en los principios de inmediación, concentración, gratuidad para el trabajador, celeridad procesal e impulso judicial de oficio.
Artículo 4 - Competencia territorial y por materia: Es competente para entender en las controversias individuales de trabajo el Juez de Primera Instancia del fuero laboral del lugar de prestación del trabajo o del domicilio del demandado, a elección del trabajador.
Artículo 39 - Capacidad procesal del trabajador: Los trabajadores mayores de dieciocho años tienen plena capacidad procesal para intervenir directamente o por mandatario en los juicios del fuero laboral.

DE LA DEMANDA, CONCILIACIÓN Y EXCEPCIONES:
Artículo 71 - Requisitos de la demanda laboral: La demanda se deducirá por escrito o verbalmente en acta, expresando el nombre y domicilio de las partes, los hechos clara y sucintamente expuestos, la liquidación pormenorizada de los rubros reclamados y los fundamentos jurídicos.
Artículo 85 - Notificaciones judiciales laborales: Las notificaciones de traslados de demanda, citación a absolver posiciones y sentencias definitivas se practicarán por cédula en el domicilio real del demandado o electrónicamente en su casillero registrado.
Artículo 136 - Inversión de la carga probatoria: En los juicios originados por despido injustificado, si el trabajador acredita la existencia de la relación laboral mediante prueba documental, testifical o indicios graves, incumbe al empleador justificar fehacientemente la legalidad de la causa invocada o el pago íntegro de las indemnizaciones.
Artículo 234 - Audiencia preliminar obligatoria de conciliación: Admitida la demanda, el juez convocará a las partes a una audiencia oral obligatoria de comparecencia y conciliación con el fin de procurar un acuerdo total o parcial que ponga fin al litigio.
Artículo 235 - Homologación del acuerdo conciliatorio: Los acuerdos conciliatorios homologados por el juez del trabajo adquirirán la fuerza ejecutoria y valor de sentencia judicial pasada en autoridad de cosa juzgada.

RÉGIMEN PROBATORIO, SENTENCIA Y PRESCRIPCIÓN:
Artículo 250 - Apreciación de las pruebas: El juez del trabajo apreciará la prueba conforme a las reglas de la sana crítica, con facultades para interrogar libremente a las partes y peritos y decretar medidas para mejor proveer.
Artículo 300 - Sentencia laboral definitiva: La sentencia decidirá todas las cuestiones litigiosas planteadas, disponiendo las condenas líquidas con intereses y costas procesales a cargo de la parte vencida.
Artículo 633 - Prescripción de créditos y acciones laborales: Las acciones y derechos nacidos del contrato individual de trabajo prescriben al término de UN (1) AÑO contado desde la fecha de extinción de la relación de trabajo.`
  },

  // ==========================================
  // RAMA NIÑEZ, ADOLESCENCIA Y FAMILIA
  // ==========================================
  {
    titulo: 'Código de la Niñez y la Adolescencia (Ley Nº 1680/2001 y Ley Nº 6083/2018)',
    categoria: 'codigo',
    fuero: 'Niñez y Adolescencia',
    estadoNormativo: 'Vigente',
    numeroLey: '1680',
    fuente: 'Gaceta Oficial / BACN',
    url: 'https://www.bacn.gov.py/leyes-paraguayas/151/codigo-de-la-ninez-y-la-adolescencia',
    tags: ['ninez', 'prestacion de alimentos', 'patria potestad', 'regimen de relacionamiento', 'asistencia alimentaria'],
    contenido: `CÓDIGO DE LA NIÑEZ Y LA ADOLESCENCIA DE LA REPÚBLICA DEL PARAGUAY (LEY Nº 1680/2001 Y LEY MODIFICATORIA Nº 6083/2018)

PRINCIPIOS Y GARANTÍAS RECTORES:
Artículo 1 - Ámbito de protección y definiciones: Esta ley protege a la niña, niño y adolescente hasta la mayoría de edad (18 años). Se considera niño a toda persona desde la concepción hasta los trece años, y adolescente desde los catorce hasta cumplir los dieciocho años.
Artículo 3 - Principio del interés superior del niño: Toda medida concerniente a la niñez adoptada por el Estado, los jueces, padres o instituciones atenderá primordialmente al interés superior del menor, que comprende el respeto a su desarrollo físico, psíquico, espiritual, moral y social.
Artículo 4 - Principio de prioridad absoluta: Los derechos del niño y adolescente gozan de atención prioritaria y preferencial en todas las políticas públicas, asignaciones presupuestarias y en la tramitación judicial de sus causas.
Artículo 29 - Derecho a la educación y desarrollo integral: El Estado garantiza la educación básica y media gratuita y obligatoria para todos los niños y adolescentes.

PATRIA POTESTAD Y RÉGIMEN DE RELACIONAMIENTO:
Artículo 70 - Patria potestad compartida: El ejercicio de la patria potestad corresponde conjuntamente a ambos progenitores, sin perjuicio de la atribución de la guarda a uno de ellos en caso de separación.
Artículo 92 - Régimen de relacionamiento: El progenitor que no ejerza la convivencia o guarda del hijo menor tiene el derecho y el deber irrenunciable de mantener con él un régimen fluido, periódico y afectivo de visitas y relacionamiento.
Artículo 93 - Medidas cautelares de relacionamiento: El juez fijará un régimen provisorio de visitas desde el inicio del proceso, y sancionará con multas procesales y apercibimientos la obstrucción injustificada del vínculo filial.

JUICIO DE PRESTACIÓN DE ALIMENTOS:
Artículo 97 - Contenido del deber alimentario: La obligación de alimentos comprende todo lo indispensable para el sustento, habitación, vestido, educación, asistencia médica, medicamentos, recreación y formación vocacional o técnica del menor.
Artículo 98 - Obligados al pago de alimentos: La obligación recae en primer término en ambos padres en proporción equitativa a sus capacidades económicas y a las necesidades del niño. En su defecto, la obligación recae en los abuelos y parientes consanguíneos hasta el segundo grado.
Artículo 185 - Fijación cautelar de alimentos provisorios con retención salarial directa: Promovida la demanda de alimentos, el juez de la Niñez y la Adolescencia fijará inmediatamente y de oficio una cuota provisoria de alimentos, librando mandamiento judicial de retención directa de porcentaje o monto sobre el salario del demandado ante su empleador o girando oficio al Banco Nacional de Fomento (BNF) para la apertura de cuenta judicial exclusiva.
Artículo 188 - Inembargabilidad e inalienabilidad: Las sumas depositadas en concepto de asistencia alimenticia son estrictamente inembargables, no admiten compensación con otras deudas y no devengan cobro de comisiones bancarias.`
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
    contenido: `LEY Nº 1600/2000 - CONTRA LA VIOLENCIA DOMÉSTICA EN LA REPÚBLICA DEL PARAGUAY

PROCEDIMIENTO DE PROTECCIÓN JUDICIAL URGENTE:
Artículo 1 - Ámbito de protección tutelar: Esta ley establece las normas de protección para toda persona que sufra agresiones físicas, psicológicas, sexuales o patrimoniales en el ámbito del grupo familiar o de parejas unidas de hecho o de derecho.
Artículo 2 - Medidas cautelares urgentes de protección que el Juez de Paz debe dictar en el plazo de 24 horas:
a) Exclusión inmediata del presunto agresor de la vivienda común o conyugal;
b) Prohibición de acceso del agresor al domicilio, trabajo o lugares frecuentados por la víctima;
c) Prohibición de acercamiento perimetral y de todo contacto por vía telefónica, mensajería instantánea, redes sociales o por interpósita persona;
d) Restitución inmediata de efectos personales, documentos y prendas de vestir a la víctima;
e) Fijación provisoria de alimentos a favor de los hijos menores;
f) Asignación de custodia policial preventiva a favor de la víctima.
Artículo 4 - Legitimación activa para denunciar: La denuncia podrá ser formulada verbalmente o por escrito por la víctima, sus parientes o cualquier persona o profesional de salud o educación que tome conocimiento del hecho.
Artículo 7 - Desacato y remisión penal: El incumplimiento de cualquiera de las medidas de protección dictadas constituirá hecho punible de Desacato Judicial (Ley Nº 4711/2012) y Violencia Familiar (Art. 229 del Código Penal), debiendo remitirse compulsa inmediata de antecedentes al Ministerio Público.`
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
    contenido: `LEY Nº 1462/1935 - PROCEDIMIENTO PARA LO CONTENCIOSO ADMINISTRATIVO EN PARAGUAY

COMPETENCIA Y ADMISIBILIDAD ANTE EL TRIBUNAL DE CUENTAS:
Artículo 1 - Competencia originaria y exclusiva: El Tribunal de Cuentas conocerá originariamente, en instancia única y colegiada, de las demandas contencioso-administrativas deducidas contra resoluciones de la administración pública.
Artículo 2 - Causa contencioso-administrativa y lesión de derecho: Se reputará causa contencioso-administrativa toda lesión directa a un derecho subjetivo administrativo de una persona física o jurídica, causada por un acto o resolución de la autoridad administrativa del Estado o municipal.
Artículo 3 - Plazo perentorio e improrrogable de interposición: La demanda contencioso-administrativa deberá promoverse dentro del plazo fatal de DIECIOCHO (18) DÍAS HÁBILES, computados desde el día siguiente a la notificación de la resolución definitiva que causó estado. Transcurrido dicho plazo, el acto administrativo quedará firme y consentido, sin recurso judicial ulterior.
Artículo 4 - Agotamiento obligatorio de la vía administrativa: Es presupuesto procesal insoslayable haber deducido previamente todos los recursos ordinarios de reconsideración o jerárquicos establecidos en la ley ante el órgano administrativo competente.
Artículo 5 - Actos que causan estado: Causan estado las resoluciones que no admitan recurso administrativo alguno, o aquellas respecto de las cuales haya operado el silencio administrativo denegatorio.`
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
    contenido: `LEY Nº 6715/2021 - RÉGIMEN GENERAL DE PROCEDIMIENTOS ADMINISTRATIVOS DEL PARAGUAY

PRINCIPIOS Y REQUISITOS DE VALIDEZ DEL ACTO ADMINISTRATIVO:
Artículo 1 - Objeto tutelar: Regular el régimen de los actos administrativos, el procedimiento administrativo común, el sistema de recursos y el procedimiento sancionador en toda la administración pública paraguaya.
Artículo 4 - Principios generales: Principio de juridicidad y legalidad, debido procedimiento, celeridad, economía procesal, transparencia, verdad material e informalismo en beneficio del administrado.
Artículo 14 - Requisitos esenciales de validez del acto administrativo:
1. Competencia: Dictado por órgano legalmente facultado por la Constitución o la ley;
2. Causa y Fundamento: Apoyado en hechos ciertos y normas jurídicas aplicables;
3. Objeto lícito: Físicamente y jurídicamente posible;
4. Motivación: Exposición razonada de los fundamentos fácticos y jurídicos que lo justifican;
5. Finalidad pública: Perseguir exclusivamente el interés general sin desviación de poder.
Artículo 26 - Notificación y eficacia: El acto administrativo adquiere eficacia únicamente a partir de su notificación personal y formal al administrado interesado.

SILENCIO ADMINISTRATIVO Y RECURSOS ORDINARIOS:
Artículo 52 - Silencio administrativo negativo: Si la autoridad administrativa no emite resolución expresa dentro de los plazos legales fijados, se presumirá denegada la solicitud o reclamo del particular (silencio negativo), dejando expedito el acceso a los recursos administrativos o a la vía judicial contencioso-administrativa.
Artículo 75 - Recurso de Reconsideración: Deberá interponerse ante el mismo órgano que dictó el acto administrativo dentro del plazo perentorio de DIEZ (10) DÍAS HÁBILES contados desde su notificación.
Artículo 86 - Recurso Jerárquico: Procede contra la desestimación expresa o tácita de la reconsideración ante la máxima autoridad jerárquica del ente público, debiendo interponerse en el plazo perentorio de DIEZ (10) DÍAS HÁBILES. Con su resolución queda agotada la vía administrativa.`
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
    contenido: `LEY Nº 1626/2000 - DE LA FUNCIÓN PÚBLICA EN LA REPÚBLICA DEL PARAGUAY

ESTATUTO DEL FUNCIONARIO PÚBLICO Y RÉGIMEN DISCIPLINARIO:
Artículo 1 - Objeto: Regular la situación jurídica y deberes de los funcionarios y empleados públicos al servicio de la administración del Estado, ministerios, entes autárquicos y municipalidades.
Artículo 47 - Estabilidad laboral pública: El funcionario público que complete DOS (2) AÑOS ininterrumpidos de servicio activo en un cargo permanente mediante concurso público adquiere estabilidad laboral definitiva en la función pública.
Artículo 64 - Faltas disciplinarias y graduación de sanciones: Las faltas se clasifican en leves (sancionadas con amonestación por escrito o apercibimiento) y graves (sancionadas con suspensión de hasta noventa días sin goce de sueldo, destitución e inhabilitación para el ejercicio de cargos públicos por hasta cinco años).
Artículo 73 - Sumario administrativo previo indispensable: Ningún funcionario público permanente podrá ser destituido de su cargo sin sumario administrativo previo instruido por un Juez Instructor de la Secretaría de la Función Pública.
Artículo 74 - Garantías del debido proceso en el sumario: El sumario garantizará plenamente el traslado formal de cargos, plazo probatorio, alegatos de la defensa y la presunción de inocencia hasta que recaiga resolución firme.`
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
    contenido: `CORTE SUPREMA DE JUSTICIA - ACORDADAS REGLAMENTARIAS DEL EXPEDIENTE JUDICIAL ELECTRÓNICO (ACORDADAS 1335/2019, 1107/2016 Y CONCORDANTES)

REGLAS PROCESALES DEL EXPEDIENTE DIGITAL JUDICIAL:
Artículo 1 - Validez legal y plena eficacia de actuaciones electrónicas: Los documentos, demandas, contestaciones, recursos y resoluciones judiciales suscriptos mediante firma electrónica o firma digital certificada por magistrados, secretarios judiciales y abogados matriculados poseen idéntica validez jurídica y fuerza probatoria que los documentos en soporte papel.
Artículo 2 - Notificaciones electrónicas automáticas: Las resoluciones que conforme a la ley procesal deban notificarse por cédula quedarán notificadas automáticamente de pleno derecho en el buzón o casillero judicial digital asignado a la matrícula del profesional interviniente.
Artículo 3 - Cómputo perentorio de plazos en el expediente electrónico: El plazo perentorio de cualquier término judicial comenzará a correr a partir del DÍA HÁBIL SIGUIENTE a aquel en que la resolución quede depositada y disponible en el casillero digital del profesional.
Artículo 4 - Interrupción técnica del portal Judisoft: En caso de que se produzca una falla técnica o caída comprobada de los servidores del portal judicial electrónico de la Corte Suprema durante el último día hábil de un plazo procesal perentorio, el término se prorrogará automáticamente hasta el primer día hábil siguiente a la normalización del servicio informático judicial.`
  },

  // ==========================================
  // LEY TRIBUTARIA Y OBLIGACIONES FISCALES
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
Artículo 1 - Estructura tributaria nacional: Créanse el Impuesto a la Renta Empresarial (IRE), el Impuesto a la Renta Personal (IRP), el Impuesto a los Dividendos y a las Utilidades (IDU), el Impuesto al Valor Agregado (IVA) y el Impuesto Selectivo al Consumo (ISC).
Artículo 2 - Impuesto a la Renta Empresarial (IRE): Grava las rentas comerciales, industriales y agropecuarias obtenidas por personas jurídicas y unipersonales con una tasa general del DIEZ POR CIENTO (10%) sobre la renta neta real.
Artículo 56 - Impuesto a la Renta Personal (IRP): Grava las ganancias y rentas derivadas de la prestación de servicios personales independientes o en relación de dependencia y las ganancias de capital, con tasas progresivas del OCHO POR CIENTO (8%), NUEVE POR CIENTO (9%) y DIEZ POR CIENTO (10%).
Artículo 80 - Impuesto al Valor Agregado (IVA): Grava la enajenación onerosa de bienes y la prestación de servicios en el territorio nacional. Tasa general del DIEZ POR CIENTO (10%), y tasa reducida del CINCO POR CIENTO (5%) para productos de la canasta familiar básica, agropecuarios en estado natural y medicamentos.
Artículo 154 - Prescripción de las obligaciones tributarias: Las acciones de la administración tributaria para liquidar tributos, exigir el pago de deudas y aplicar sanciones prescribirán a los CINCO (5) AÑOS, contados a partir del 1 de enero del año civil siguiente a aquel en que la obligación debió ser cumplida.`
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

ROL CONSTITUCIONAL Y ATRIBUCIONES LEGALES:
Artículo 266 CN - Representación de la Sociedad: El Ministerio Público representa a la sociedad ante los órganos jurisdiccionales del Estado, gozando de autonomía funcional y administrativa en el cumplimiento de sus deberes. Es ejercido por el Fiscal General del Estado y los agentes fiscales.
Artículo 268 CN - Atribuciones Constitucionales: Velar por el respeto de los derechos y de las garantías constitucionales; promover de oficio o a petición de parte la acción penal pública en defensa del orden jurídico; y ejercer la acción penal en los casos en que no sea necesaria instancia de parte.
Artículo 5 Ley 1562 - Ejercicio de la Acción Penal Pública: Corresponde al Ministerio Público promover y ejercer la acción penal pública en todos los hechos punibles que lleguen a su conocimiento, dirigiendo la investigación preparatoria sin perjuicio de la intervención de la querella adhesiva.
Artículo 18 Ley 1562 - Dirección Funcional de la Policía Judicial: Los oficiales y agentes de la Policía Nacional que cumplan funciones investigativas actuarán bajo la dirección jurídica y funcional estricta del agente fiscal interviniente (Art. 52 del CPP).
Artículo 22 Ley 1562 - Criterio de Objetividad Procesal: El agente fiscal ajustará su actuación a criterios objetivos, velando por la correcta aplicación de la ley y valorando no sólo las circunstancias que fundamenten la acusación, sino también las que sirvan para eximir de responsabilidad al imputado o atenuarla.
Artículo 54 Ley 1562 - Unidades Especializadas de Investigación: Organización en fiscalías adjuntas y unidades operativas especializadas: Delitos Económicos y Anticorrupción, Lucha contra el Narcotráfico, Crimen Organizado, Delitos Informáticos, Medio Ambiente, Trata de Personas, Violencia Familiar y Derechos Humanos.`
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

MISIÓN CONSTITUCIONAL Y FACULTADES OPERATIVAS:
Artículo 175 CN - Misión Constitucional de Seguridad y Orden Público: La Policía Nacional es una institución profesional, no deliberante, obediente, organizada con jerarquía y disciplina en forma permanente. Tiene por misión la preservación del orden público legalmente establecido, los derechos y la seguridad de las personas y sus bienes, la prevención de delitos y, bajo dirección judicial, la investigación de los hechos punibles.
Artículo 6 Ley 7338 - Uso Proporcional y Gradual de la Fuerza: En el cumplimiento del deber, el personal policial empleará la fuerza física o el armamento reglamentario de manera progresiva, racional, necesaria y estrictamente proporcional a la resistencia o agresión del infractor.
Artículo 52 CPP - Policía Judicial y Subordinación al Fiscal: En la investigación de hechos punibles, la Policía Nacional actúa como auxiliar técnico del Ministerio Público y debe cumplir inexcusablemente las directivas impartidas por los agentes fiscales.
Artículo 239 CPP - Aprehensión en Flagrancia y Plazos Improrrogables:
1. Facultad de aprehender: Los oficiales de policía aprehenderán a quien sea sorprendido cometiendo un hecho punible o inmediatamente después de su comisión.
2. Plazo de comunicación al Fiscal: Máximo improrrogable de SEIS (6) HORAS desde el momento de la aprehensión física.
3. Plazo de puesta a disposición judicial: Máximo improrrogable de VEINTICUATRO (24) HORAS ante el Juez Penal de Garantías para determinar la legalidad de la detención o resolver medidas cautelares.
Artículo 14 Ley 7338 - Identificación Ciudadana y Registro de Antecedentes: Facultad exclusiva de expedir Cédulas de Identidad Civil, pasaportes oficiales y Certificados de Antecedentes Policiales a través del Departamento de Identificaciones.
Artículo 25 Ley 7338 - Auxilio Jurisdiccional Obligatorio: Prestar custodia judicial, dar cumplimiento a órdenes de detención y captura emanadas de jueces y fiscales, ejecutar allanamientos con orden judicial escrita y brindar auxilio de la fuerza pública a oficiales de justicia habilitados.`
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

COMPETENCIA EN RED VIAL, PROTOCOLO DE ALCOTEST Y RETENCIONES:
Artículo 1 Ley 5016 - Competencia Territorial Exclusiva en Red Vial Nacional: La Patrulla Caminera ejerce el control, fiscalización, prevención y ordenamiento del tránsito exclusivamente en las rutas nacionales, ramales y caminos de jurisdicción del MOPC que integren la Red Vial Nacional fuera del ejido urbano municipal.
Artículo 112 Ley 5016 - Tolerancia Cero de Alcohol en Sangre: Queda terminantemente prohibido conducir cualquier tipo de vehículo con graduación alcohólica superior a 0.00 mg/L de alcohol en aire expirado o 0.00 g/L en sangre. Todo conductor está obligado a someterse a la prueba de alcotest cuando sea requerido por la autoridad.
Artículo 113 Ley 5016 - Requisitos Legales del Alcotest y Calibración INTN: El alcoholímetro utilizado debe contar con certificado de verificación metrológica y calibración vigente expedido por el Instituto Nacional de Tecnología, Normalización y Metrología (INTN). El inspector labrará acta circunstanciada entregando una copia impresa del ticket al conductor, quien tiene derecho a solicitar contraprueba médica a su costo.
Artículo 114 Ley 5016 - Remisión Penal por Exposición al Peligro (Art. 217 CP): Cuando la prueba de alcotest arroje un resultado igual o superior a 0.20 mg/L en aire expirado (o 0.40 g/L en sangre), se configurará el hecho punible de Exposición al Peligro en el Tránsito Terrestre (Art. 217 del Código Penal), debiendo aprehenderse al conductor y remitir antecedentes inmediatos a la Fiscalía Penal de turno.
Artículo 106 Ley 5016 - Causales Taxativas de Retención de Vehículos: Únicamente procede retener el rodado en los siguientes casos expresos: 1. Alcotest positivo del conductor si no hubiere acompañante habilitado para conducir; 2. Carencia de placas identificatorias o chapa apócrifa; 3. Carencia de cédula verde o habilitación municipal vencida; 4. Desperfectos mecánicos o lumínicos graves que configuren riesgo inminente en ruta.
Artículo 108 Ley 5016 - Prohibición Absoluta de Retención de Documentos como Prenda: Los inspectores de la Patrulla Caminera tienen terminantemente prohibido retener la Cédula de Identidad física o el Registro de Conducir del ciudadano como garantía de pago de multas.`
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

ATRIBUCIONES INSTITUCIONALES, SISTEMA PENITENCIARIO Y REGISTRO CIVIL:
Artículo 1 Ley 1652 - Competencia y Fines del Ministerio de Justicia: Es el órgano del Poder Ejecutivo responsable de coordinar las relaciones con el Poder Judicial, promover el acceso a la justicia, administrar el sistema penitenciario y dirigir el Registro del Estado Civil de las Personas.
Artículo 5 Ley 1652 - Administración Penitenciaria y Custodia Carcelaria: Dirección, organización y custodia de los centros penitenciarios de adultos y centros de privación preventiva de libertad del país, implementando políticas de rehabilitación, reinserción social y salud penitenciaria bajo la supervisión de los Jueces de Ejecución Penal.
Artículo 12 Ley 1652 - Dirección General del Registro del Estado Civil: Registro oficial, custodia y archivo de los libros de nacimientos, matrimonios, defunciones, uniones de hecho y reconocimientos filiales de todos los ciudadanos paraguayos y extranjeros domiciliados en el territorio nacional.
Artículo 18 Ley 1652 - Servicio Nacional de Atención al Adolescente Infractor (Senaai): Ejecución especializada de medidas privativas de libertad y socioeducativas impuestas a menores de dieciocho años por los juzgados de la Niñez y la Adolescencia en conflicto con la ley penal.
Artículo 24 Ley 1652 - Reinserción Social y Ejecución Penal (Ley Nº 5162/2014): Garantizar el respeto a la dignidad humana, condiciones de salubridad y programas de formación laboral y educativa dentro de los establecimientos penitenciarios.`
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

ESTRUCTURA, SALAS JURISDICCIONALES Y DIRECCIÓN DE REGISTROS:
Artículo 247 CN - Función Jurisdiccional del Estado: La administración de justicia está a cargo del Poder Judicial, ejercido por la Corte Suprema de Justicia, los Tribunales de Apelación y los Juzgados de Primera Instancia y Paz. Solo este poder tiene la potestad de juzgar y hacer ejecutar lo juzgado.
Artículo 248 CN - Independencia Judicial Absoluta: Queda prohibida a todo otro poder público la injerencia en los juicios pendientes o la revisión de las sentencias judiciales dictadas.
Artículo 259 CN - Deberes y Atribuciones de la Corte Suprema: Ejercer la superintendencia de todos los organismos del Poder Judicial, dictar acordadas reglamentarias, entender en la acción y excepción de inconstitucionalidad y designar magistrados y actuarios.
Artículo 28 Ley 879 - Sala Constitucional de la CSJ: Conoce exclusivamente de las acciones y excepciones de inconstitucionalidad promovidas contra leyes, decretos, resoluciones ministeriales y sentencias judiciales arbitrarias.
Artículo 35 Ley 879 - Sala Civil y Comercial de la CSJ: Resuelve los recursos extraordinarios de casación, apelación y revisión en materias del fuero civil, comercial y contencioso-administrativo.
Artículo 42 Ley 879 - Sala Penal de la CSJ: Conoce en los recursos extraordinarios de casación penal, revisión de condenas firmes y quejas por retardo de justicia en causas criminales.
Artículo 88 Ley 879 - Superintendencia General de Justicia: Órgano de disciplina que ejerce el control deontológico y sancionador sobre magistrados, funcionarios, actuarios, oficiales de justicia, abogados, procuradores y peritos judiciales.
Artículo 118 Ley 879 - Matriculación Oficial de Abogados: Facultad privativa de otorgar, suspender o cancelar la matrícula habilitante para ejercer la procuración y la defensa letrada ante los tribunales paraguayos.
Artículo 260 Ley 879 - Dirección General de los Registros Públicos (DGRP): Dependencia oficial de la CSJ que custodia y publica los derechos reales: Registro Inmobiliario, Registro de Buques y Aeronaves, Registro de Personas Jurídicas y Asociaciones, Registro de Quiebras y Registro de Automotores.`
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

MISIÓN INSTITUCIONAL Y DEFENSA PÚBLICA GRATUITA:
Artículo 16 CN - Inviolabilidad de la Defensa en Juicio: La defensa de la persona y de sus derechos es inviolable en todo estado de la causa. Si el justiciable carece de abogado, el Estado le proveerá uno gratuitamente a través del Ministerio de la Defensa Pública.
Artículo 1 Ley 4423 - Autonomía Funcional y Presupuestaria: El Ministerio de la Defensa Pública es un órgano con personería y autonomía funcional, normativa y financiera que integra el sistema de administración de justicia.
Artículo 6 Ley 4423 - Defensa Técnica Obligatoria en Materia Penal: Ejercer la defensa técnica ineludible y gratuita de toda persona imputada o acusada que no cuente con abogado defensor particular, desde el primer acto de la investigación preparatoria hasta la ejecución penal.
Artículo 14 Ley 4423 - Asistencia Jurídica Integral en Fuero de Niñez, Familia y Civil: Representación procesal gratuita a favor de niños, adolescentes, víctimas de violencia doméstica, trabajadores y personas en situación comprobada de vulnerabilidad o escasos recursos económicos.`
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

COMPETENCIA RECAUDADORA, CONTROL ADUANERO Y POTESTADES:
Artículo 1 Ley 7143 - Creación y Naturaleza de la DNIT: Ente autárquico del Estado con autonomía de gestión, técnica y financiera, responsable de la aplicación, fiscalización y recaudación de los tributos internos y aduaneros de la República.
Artículo 4 Ley 7143 - Fusión SET y Dirección Nacional de Aduanas: Unificación orgánica bajo una sola dirección nacional de la antigua Subsecretaría de Estado de Tributación (Gerencia General de Impuestos Internos) y la Dirección General de Aduanas (Gerencia General de Aduanas).
Artículo 12 Ley 7143 - Administración del RUC y Facturación Electrónica: Gestión integral del Registro Único de Contribuyentes (RUC), del Sistema Nacional de Facturación Electrónica (E-Kuatia) y de la fiscalización preventiva contra el contrabando y la informalidad comercial.
Artículo 25 Ley 7143 - Sumarios Administrativos y Denuncias Penales: Instrucción de sumarios de determinación tributaria por omisión, defraudación o evasión, y radicación de denuncias ante la Fiscalía por hechos punibles de Evasión Impositiva (Art. 261 CP) y Contrabando (Ley 2422/2004).`
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
    contenido: `MINISTERIO DE TRABAJO, EMPLEO Y SEGURIDAD SOCIAL DE PARAGUAY (LEY Nº 5115/2013)

POLÍTICA LABORAL, MEDIACIÓN ADMINISTRATIVA Y FISCALIZACIÓN:
Artículo 1 Ley 5115 - Fines del MTESS: Órgano rector de las políticas públicas de empleo, relaciones laborales, seguridad social y fiscalización del cumplimiento de las leyes laborales en todo el país.
Artículo 7 Ley 5115 - Inspección y Vigilancia Laboral: Competencia para inspeccionar centros de trabajo, verificar condiciones de seguridad, salubridad y formalización ante el IPS, pudiendo aplicar multas administrativas a empleadores infractores.
Artículo 15 Ley 5115 - Conciliación y Mediación Administrativa Previa: Instancia administrativa gratuita ante la Dirección de Mediación para resolver discrepancias laborales por salarios impagos, horas extras o despido injustificado sin necesidad inmediata de acudir al juzgado.
Artículo 22 Ley 5115 - Homologación de Liquidaciones Laborales: Control y homologación oficial de acuerdos transaccionales de rescisión de contratos y recibos de liquidación por finiquito para otorgarles plena eficacia extintiva conforme a derecho.`
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
    contenido: `INSTITUTO DE PREVISIÓN SOCIAL (IPS) - DECRETO-LEY Nº 1860/1950 Y LEYES CONCORDANTES

RÉGIMEN DEL SEGURO SOCIAL OBLIGATORIO Y APORTES:
Artículo 1 Decreto-Ley 1860 - Seguro Social Obligatorio: El seguro social cubre los riesgos de maternidad, accidentes de trabajo, enfermedades profesionales y comunes, invalidez, vejez y muerte de los trabajadores asalariados de la República.
Artículo 17 Decreto-Ley 1860 - Inscripción Obligatoria Inmediata: Todo empleador está obligado a inscribir a sus trabajadores asalariados en el IPS a partir del primer día hábil de iniciación de las tareas.
Artículo 23 Decreto-Ley 1860 - Distribución de Aportes:
1. Aporte Obrero: Descuento del NUEVE POR CIENTO (9%) sobre el total de salarios brutos devengados por el trabajador.
2. Aporte Patronal: Contribución del DIECISÉIS COMA CINCO POR CIENTO (16.5%) a cargo exclusivo del empleador.
Artículo 34 Decreto-Ley 1860 - Prestaciones Médicas y Jubilatorias: Derecho a asistencia médica, quirúrgica, farmacéutica y hospitalaria completa, subsidio por reposo médico o maternidad y régimen de jubilación ordinaria y proporcional por años de aporte.
Artículo 85 Decreto-Ley 1860 - Delito de Retención Indebida de Aportes: El empleador que descontare los aportes obreros del sueldo del trabajador y no los depositare en el IPS dentro del plazo legal incurrirá en el hecho punible de Lesión de Confianza y Apropiación indebida.`
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
Artículo 1 Ley 3966 - Autonomía Municipal: La Municipalidad es la comunidad de vecinos con gobierno propio y autonomía política, administrativa y normativa en su ámbito territorial urbano y rural municipal.
Artículo 11 Ley 3966 - Regulación del Tránsito Vehicular y Peatonal: Competencia exclusiva para reglamentar, señalizar y ordenar el tráfico de vehículos y peatones dentro del área urbana, expidiendo licencias de conducir y habilitaciones vehiculares.
Artículo 45 Ley 3966 - Estacionamiento Tarifado y Grúas Municipales: Facultad de regular áreas de estacionamiento controlado y disponer la remoción mediante grúa de rodados que obstruyan bocacalles, rampas de accesibilidad o sendas peatonales.
Artículo 80 Ley 3966 - Juzgados de Faltas Municipales: Órganos administrativos competentes para juzgar infracciones al reglamento de tránsito municipal, aplicar multas pecuniarias e inhabilitar registros conforme a las ordenanzas vigentes.`
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
