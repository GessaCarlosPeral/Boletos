// Script de pruebas completas del sistema GESSA
const http = require('http');

const API_BASE = 'http://localhost:3000';

// Función helper para hacer requests HTTP
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Tests
async function runTests() {
  console.log('🧪 INICIANDO PRUEBAS DEL SISTEMA GESSA\n');
  console.log('='.repeat(60));

  let boletosGenerados = [];
  let testsPasados = 0;
  let testsFallados = 0;

  try {
    // TEST 1: Verificar que el servidor responde
    console.log('\n📋 TEST 1: Verificar servidor');
    try {
      const healthCheck = await makeRequest('GET', '/');
      if (healthCheck.status === 200) {
        console.log('✅ Servidor respondiendo correctamente');
        testsPasados++;
      } else {
        throw new Error('Servidor no responde correctamente');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
      testsFallados++;
    }

    // TEST 2: Generar lote pequeño de boletos
    console.log('\n📋 TEST 2: Generar lote de 5 boletos');
    try {
      const response = await makeRequest('POST', '/api/boletos/generar', {
        contratista: 'TEST - PEMEX División Sur',
        cantidad: 5,
        fechaVencimiento: '2025-12-31'
      });

      if (response.status === 200 && response.data.exito) {
        console.log('✅ Lote generado exitosamente');
        console.log(`   - Lote ID: ${response.data.lote}`);
        console.log(`   - Cantidad: ${response.data.cantidad}`);
        console.log(`   - Contratista: ${response.data.contratista}`);
        console.log(`   - PDF: ${response.data.pdfUrl}`);
        testsPasados++;
      } else {
        throw new Error('No se pudo generar el lote');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
      testsFallados++;
    }

    // Esperar un poco para que se complete la generación
    await new Promise(resolve => setTimeout(resolve, 2000));

    // TEST 3: Obtener estadísticas
    console.log('\n📋 TEST 3: Obtener estadísticas');
    try {
      const response = await makeRequest('GET', '/api/boletos/estadisticas');

      if (response.status === 200 && Array.isArray(response.data)) {
        console.log('✅ Estadísticas obtenidas');
        response.data.forEach(stat => {
          console.log(`   - ${stat.contratista}:`);
          console.log(`     Total: ${stat.total} | Usados: ${stat.usados} | Disponibles: ${stat.disponibles}`);
        });

        // Guardar UUIDs para pruebas de validación
        if (response.data.length > 0) {
          // Necesitamos obtener los UUIDs de la base de datos
          // Por ahora simulamos uno
          boletosGenerados = ['test-uuid-1', 'test-uuid-2'];
        }
        testsPasados++;
      } else {
        throw new Error('No se pudieron obtener estadísticas');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
      testsFallados++;
    }

    // TEST 4: Validar boleto inexistente
    console.log('\n📋 TEST 4: Validar boleto inexistente');
    try {
      const response = await makeRequest('POST', '/api/boletos/validar', {
        uuid: '00000000-0000-0000-0000-000000000000'
      });

      if (response.data && !response.data.valido) {
        console.log('✅ Sistema rechaza boleto inexistente correctamente');
        console.log(`   - Mensaje: ${response.data.mensaje}`);
        testsPasados++;
      } else {
        throw new Error('Sistema no validó correctamente');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
      testsFallados++;
    }

    // TEST 5: Validar formato de UUID inválido
    console.log('\n📋 TEST 5: Validar formato inválido');
    try {
      const response = await makeRequest('POST', '/api/boletos/validar', {
        uuid: 'codigo-invalido-123'
      });

      if (response.data && !response.data.valido) {
        console.log('✅ Sistema rechaza formato inválido');
        testsPasados++;
      } else {
        throw new Error('Sistema aceptó formato inválido');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
      testsFallados++;
    }

    // TEST 6: Generar otro lote diferente
    console.log('\n📋 TEST 6: Generar lote de otro contratista');
    try {
      const response = await makeRequest('POST', '/api/boletos/generar', {
        contratista: 'TEST - CFE Región Sureste',
        cantidad: 3,
        fechaVencimiento: '2025-06-30'
      });

      if (response.status === 200 && response.data.exito) {
        console.log('✅ Segundo lote generado');
        console.log(`   - Cantidad: ${response.data.cantidad}`);
        console.log(`   - Contratista: ${response.data.contratista}`);
        testsPasados++;
      } else {
        throw new Error('No se pudo generar segundo lote');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
      testsFallados++;
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // TEST 7: Verificar estadísticas actualizadas
    console.log('\n📋 TEST 7: Verificar estadísticas actualizadas');
    try {
      const response = await makeRequest('GET', '/api/boletos/estadisticas');

      if (response.status === 200 && response.data.length >= 2) {
        console.log('✅ Estadísticas con múltiples contratistas');
        const total = response.data.reduce((sum, stat) => sum + stat.total, 0);
        console.log(`   - Total de boletos en sistema: ${total}`);
        testsPasados++;
      } else {
        throw new Error('Estadísticas no actualizadas');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
      testsFallados++;
    }

    // TEST 8: Verificar que los PDFs se generaron
    console.log('\n📋 TEST 8: Verificar archivos PDF generados');
    try {
      const fs = require('fs');
      const pdfsDir = './pdfs';

      if (fs.existsSync(pdfsDir)) {
        const files = fs.readdirSync(pdfsDir).filter(f => f.endsWith('.pdf'));
        if (files.length >= 2) {
          console.log('✅ PDFs generados correctamente');
          console.log(`   - Archivos encontrados: ${files.length}`);
          files.forEach(f => console.log(`     • ${f}`));
          testsPasados++;
        } else {
          throw new Error('No se encontraron suficientes PDFs');
        }
      } else {
        throw new Error('Directorio pdfs no existe');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
      testsFallados++;
    }

    // TEST 9: Verificar base de datos
    console.log('\n📋 TEST 9: Verificar base de datos SQLite');
    try {
      const fs = require('fs');
      const dbPath = './data/boletos.db';

      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        console.log('✅ Base de datos creada');
        console.log(`   - Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);
        testsPasados++;
      } else {
        throw new Error('Base de datos no existe');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
      testsFallados++;
    }

  } catch (error) {
    console.log('\n❌ ERROR CRÍTICO:', error.message);
  }

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 RESUMEN DE PRUEBAS\n');
  console.log(`✅ Tests pasados: ${testsPasados}`);
  console.log(`❌ Tests fallados: ${testsFallados}`);
  console.log(`📈 Porcentaje de éxito: ${((testsPasados / (testsPasados + testsFallados)) * 100).toFixed(1)}%`);

  console.log('\n' + '='.repeat(60));

  if (testsFallados === 0) {
    console.log('\n🎉 ¡TODOS LOS TESTS PASARON EXITOSAMENTE!\n');
    console.log('El Sistema GESSA está funcionando correctamente.\n');
  } else {
    console.log('\n⚠️  Algunos tests fallaron. Revisa los errores arriba.\n');
  }

  process.exit(testsFallados > 0 ? 1 : 0);
}

// Ejecutar tests
console.log('⏳ Esperando que el servidor esté listo...\n');
setTimeout(() => {
  runTests().catch(error => {
    console.error('❌ Error ejecutando tests:', error);
    process.exit(1);
  });
}, 1000);
