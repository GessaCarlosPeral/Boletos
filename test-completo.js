// Script para ejecutar todas las pruebas del sistema GESSA
const { spawn } = require('child_process');

console.log('🧪 EJECUTANDO SUITE COMPLETA DE PRUEBAS GESSA\n');
console.log('='.repeat(70));

async function ejecutarPrueba(nombre, archivo) {
  return new Promise((resolve) => {
    console.log(`\n📋 Ejecutando: ${nombre}\n`);

    const proceso = spawn('node', [archivo]);

    proceso.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    proceso.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    proceso.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${nombre} - PASÓ\n`);
        resolve({ nombre, resultado: 'PASÓ', codigo: code });
      } else {
        console.log(`\n❌ ${nombre} - FALLÓ (código: ${code})\n`);
        resolve({ nombre, resultado: 'FALLÓ', codigo: code });
      }
    });
  });
}

async function ejecutarTodasLasPruebas() {
  const pruebas = [
    { nombre: 'Tests del Sistema', archivo: 'test-sistema.js' },
    { nombre: 'Tests de Validación', archivo: 'test-validacion.js' },
    { nombre: 'Tests de Autorizaciones', archivo: 'test-autorizaciones.js' }
  ];

  const resultados = [];

  for (const prueba of pruebas) {
    const resultado = await ejecutarPrueba(prueba.nombre, prueba.archivo);
    resultados.push(resultado);

    // Esperar un poco entre pruebas
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Resumen final
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 RESUMEN GENERAL DE PRUEBAS\n');

  resultados.forEach(r => {
    const icono = r.resultado === 'PASÓ' ? '✅' : '❌';
    console.log(`${icono} ${r.nombre}: ${r.resultado}`);
  });

  const pasaron = resultados.filter(r => r.resultado === 'PASÓ').length;
  const total = resultados.length;

  console.log(`\n📈 Total: ${pasaron}/${total} suites pasaron`);
  console.log('='.repeat(70));

  if (pasaron === total) {
    console.log('\n🎉 ¡TODAS LAS SUITES DE PRUEBAS PASARON!\n');
    console.log('El Sistema GESSA está completamente funcional.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Algunas suites fallaron. Revisa los detalles arriba.\n');
    process.exit(1);
  }
}

ejecutarTodasLasPruebas().catch(error => {
  console.error('❌ Error ejecutando pruebas:', error);
  process.exit(1);
});
