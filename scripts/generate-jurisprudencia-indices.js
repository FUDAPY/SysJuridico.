const fs = require('fs');
const path = require('path');

const JURIS_DIR = path.resolve(__dirname, '../LESGILACION PARAGUAYA/Jurisprudencia Paraguaya');
const CATALOG_PATH = path.join(JURIS_DIR, 'catalogo.json');
const INDICES_DIR = path.join(JURIS_DIR, 'indices');

function clasificarFuero(rec) {
  const sala = (rec.sala || '').toUpperCase();
  const materia = (rec.materia || '').toLowerCase();
  const caratula = (rec.caratula || '').toLowerCase();
  const tribunal = (rec.tribunal || '').toLowerCase();
  const norms = (rec.norms || '').toLowerCase();

  // 1. Por Materia explícita
  if (materia.includes('penal') || materia.includes('correccional')) return 'Penal';
  if (materia.includes('laboral') || materia.includes('trabajo')) return 'Laboral';
  if (materia.includes('menor') || materia.includes('niñez') || materia.includes('tutelar')) return 'Niñez y Adolescencia';
  if (materia.includes('administrativ') || tribunal.includes('tribunal de cuentas')) return 'Contencioso Administrativo';
  if (materia.includes('tributar') || caratula.includes('impuesto') || caratula.includes('tributo')) return 'Tributario';
  if (materia.includes('constitucional') || caratula.includes('inconstitucionalidad') || caratula.includes('amparo') || caratula.includes('habeas corpus')) return 'Constitucional';
  if (materia.includes('civil') || materia.includes('comercial')) return 'Civil y Comercial';

  // 2. Por Sala CSJ
  if (sala.includes('CONSTITUCIONAL')) return 'Constitucional';
  if (sala.includes('PENAL')) return 'Penal';
  if (sala.includes('CIVIL')) return 'Civil y Comercial';

  // 3. Por Normas invocadas o carátula
  if (norms.includes('penal') || caratula.includes('delito') || caratula.includes('estafa') || caratula.includes('homicidio')) return 'Penal';
  if (norms.includes('trabajo') || norms.includes('laboral') || caratula.includes('indemnizacion laboral')) return 'Laboral';
  if (norms.includes('menor') || norms.includes('1680')) return 'Niñez y Adolescencia';
  if (norms.includes('1462') || norms.includes('contencioso')) return 'Contencioso Administrativo';
  if (norms.includes('constituc') || norms.includes('133') || norms.includes('134') || norms.includes('135') || norms.includes('137')) return 'Constitucional';
  if (norms.includes('civil') || caratula.includes('quiebra') || caratula.includes('contrato') || caratula.includes('sucesion')) return 'Civil y Comercial';

  return 'Civil y Comercial';
}

async function main() {
  console.log('[Jurisprudencia] Leyendo catálogo oficial CSJ...');
  const cat = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

  if (!fs.existsSync(INDICES_DIR)) {
    fs.mkdirSync(INDICES_DIR, { recursive: true });
  }

  const porFuero = {
    'Constitucional': [],
    'Penal': [],
    'Civil y Comercial': [],
    'Contencioso Administrativo': [],
    'Laboral': [],
    'Niñez y Adolescencia': [],
    'Tributario': [],
  };

  for (const r of cat.records) {
    const f = clasificarFuero(r);
    if (!porFuero[f]) porFuero[f] = [];
    porFuero[f].push({
      id: r.id,
      number: r.number,
      year: r.year,
      date: r.date,
      type: r.type,
      caratula: r.caratula,
      sala: r.sala,
      materia: r.materia,
      source: r.source,
      hasDocument: r.hasDocument,
    });
  }

  // Generar indices/fueros.md
  const linesFueros = [
    '# Clasificación de Jurisprudencia de la CSJ por Fuero',
    '',
    `Total de resoluciones analizadas y catalogadas: **${cat.records.length}**.`,
    '',
    '| Fuero Judicial | Total Resoluciones | Sala Principal | Materias Clave |',
    '|---|---:|---|---|',
    `| **Constitucional** | ${porFuero['Constitucional'].length.toLocaleString('es-PY')} | Sala Constitucional | Acciones de Inconstitucionalidad, Amparos, Hábeas Corpus, Garantías |`,
    `| **Penal** | ${porFuero['Penal'].length.toLocaleString('es-PY')} | Sala Penal | Recursos de Casación Penal, Revisión, Delitos, Ejecución |`,
    `| **Civil y Comercial** | ${porFuero['Civil y Comercial'].length.toLocaleString('es-PY')} | Sala Civil y Comercial | Contratos, Derechos Reales, Sucesiones, Sociedades, Quiebras, Cheques |`,
    `| **Contencioso Administrativo** | ${porFuero['Contencioso Administrativo'].length.toLocaleString('es-PY')} | Tribunal de Cuentas / CSJ | Actos Administrativos, Empleo Público, Contrataciones Públicas |`,
    `| **Laboral** | ${porFuero['Laboral'].length.toLocaleString('es-PY')} | Apelación del Trabajo / CSJ | Despidos, Indemnizaciones Tarifadas, Estabilidad Especial, Cobro de Guaraníes |`,
    `| **Niñez y Adolescencia** | ${porFuero['Niñez y Adolescencia'].length.toLocaleString('es-PY')} | Apelación Niñez / CSJ | Asistencia Alimentaria, Patria Potestad, Restitución Internacional |`,
    `| **Tributario** | ${porFuero['Tributario'].length.toLocaleString('es-PY')} | Tribunal de Cuentas / CSJ | Controversias Impositivas, Aduaneras y Arancelarias |`,
    '',
    '## Criterios de Clasificación Forense',
    '',
    '1. **Materia Declarada:** Detección de la competencia material procesal (Penal, Laboral, Menores, Civil, Administrativa, etc.).',
    '2. **Sala Emisora:** Adscripción por la sala originaria de la Corte Suprema de Justicia (Sala Constitucional, Sala Penal, Sala Civil).',
    '3. **Normativa Invocada y Pretensión en Carátula:** Correlación directa con Códigos sustantivos/adjetivos y leyes orgánicas del Estado paraguayo.',
    '',
  ];

  fs.writeFileSync(path.join(INDICES_DIR, 'fueros.md'), linesFueros.join('\n'), 'utf8');
  console.log('[Jurisprudencia] ✓ indices/fueros.md generado exitosamente.');

  // Actualizar README.md de Jurisprudencia Paraguaya
  const readmePath = path.join(JURIS_DIR, 'README.md');
  let readmeContent = fs.readFileSync(readmePath, 'utf8');

  const seccionFueros = [
    '## Clasificación por Fuero Jurisdiccional',
    '',
    '| Fuero Judicial | Resoluciones | Porcentaje | Sala Competente |',
    '|---|---:|---:|---|',
    `| **Constitucional** | ${porFuero['Constitucional'].length.toLocaleString('es-PY')} | ${((porFuero['Constitucional'].length / cat.records.length) * 100).toFixed(1)}% | Sala Constitucional CSJ |`,
    `| **Penal** | ${porFuero['Penal'].length.toLocaleString('es-PY')} | ${((porFuero['Penal'].length / cat.records.length) * 100).toFixed(1)}% | Sala Penal CSJ |`,
    `| **Civil y Comercial** | ${porFuero['Civil y Comercial'].length.toLocaleString('es-PY')} | ${((porFuero['Civil y Comercial'].length / cat.records.length) * 100).toFixed(1)}% | Sala Civil y Comercial CSJ |`,
    `| **Contencioso Administrativo** | ${porFuero['Contencioso Administrativo'].length.toLocaleString('es-PY')} | ${((porFuero['Contencioso Administrativo'].length / cat.records.length) * 100).toFixed(1)}% | Tribunal de Cuentas / CSJ |`,
    `| **Laboral** | ${porFuero['Laboral'].length.toLocaleString('es-PY')} | ${((porFuero['Laboral'].length / cat.records.length) * 100).toFixed(1)}% | Apelación del Trabajo / CSJ |`,
    `| **Niñez y Adolescencia** | ${porFuero['Niñez y Adolescencia'].length.toLocaleString('es-PY')} | ${((porFuero['Niñez y Adolescencia'].length / cat.records.length) * 100).toFixed(1)}% | Apelación Niñez / CSJ |`,
    `| **Tributario** | ${porFuero['Tributario'].length.toLocaleString('es-PY')} | ${((porFuero['Tributario'].length / cat.records.length) * 100).toFixed(1)}% | Fiscal y Aduanero / CSJ |`,
    `| **Total General** | **${cat.records.length.toLocaleString('es-PY')}** | **100.0%** | **Corte Suprema de Justicia** |`,
    '',
    'Ver detalle analítico en el [índice de fueros](indices/fueros.md).',
    '',
  ].join('\n');

  if (!readmeContent.includes('## Clasificación por Fuero Jurisdiccional')) {
    const marker = '## Acuerdos y Sentencias';
    if (readmeContent.includes(marker)) {
      readmeContent = readmeContent.replace(marker, `${seccionFueros}${marker}`);
      fs.writeFileSync(readmePath, readmeContent, 'utf8');
      console.log('[Jurisprudencia] ✓ README.md de Jurisprudencia actualizado con tabla de fueros.');
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[Error]', err);
  process.exit(1);
});
