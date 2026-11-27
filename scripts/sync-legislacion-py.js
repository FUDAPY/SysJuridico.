#!/usr/bin/env node
/**
 * CLI de Sincronización Oficial de Legislación Paraguaya en OtelaxWisdom
 * Repositorio: https://github.com/FUDAPY/LESGILACION_PARAGUAYA_ZETTI.git
 */

require('dotenv').config();
const { sincronizarRepoZetti } = require('../server/services/otelaxwisdomGithubSync');

async function main() {
  console.log('='.repeat(70));
  console.log('🏛️  SYSJURÍDICO — SINCRONIZACIÓN DE LEGISLACIÓN PARAGUAYA (ZETTI)');
  console.log('='.repeat(70));
  console.log('Iniciando sincronización idempotente hacia OtelaxWisdom...\n');

  try {
    const forzar = process.argv.includes('--force') || process.argv.includes('-f');
    const resultado = await sincronizarRepoZetti({ forzar });

    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMEN DE LA SINCRONIZACIÓN:');
    console.log('='.repeat(70));
    console.log(`⏱️  Duración:            ${(resultado.duracionMs / 1000).toFixed(2)}s`);
    console.log(`📁 Total escaneados:    ${resultado.totalEscaneados}`);
    console.log(`✨ Nuevos insertados:   ${resultado.insertados}`);
    console.log(`🔄 Actualizados:        ${resultado.actualizados}`);
    console.log(`⚡ Omitidos (sin cambio): ${resultado.omitidos}`);
    console.log(`❌ Errores:             ${resultado.errores.length}`);

    console.log('\n⚖️  DISTRIBUCIÓN POR FUERO:');
    console.table(
      Object.entries(resultado.porFuero).map(([fuero, total]) => ({
        Fuero: fuero,
        Documentos: total,
      }))
    );

    console.log('📜 DISTRIBUCIÓN POR TIPO DE NORMA:');
    console.table(
      Object.entries(resultado.porTipo).map(([tipo, total]) => ({
        Tipo: tipo,
        Documentos: total,
      }))
    );

    if (resultado.errores.length > 0) {
      console.warn('\n⚠️  Detalle de errores encontrados:');
      resultado.errores.forEach((e) => console.error(` - [${e.archivo}]: ${e.error}`));
    }

    console.log('\n✅ Sincronización finalizada exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error crítico durante la sincronización:', error.message);
    process.exit(1);
  }
}

main();
