// Test de validación con boletos reales de la base de datos
const sqlite3 = require('sqlite3').verbose();
const http = require('http');

const db = new sqlite3.Database('./data/boletos.db');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:3000');
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testValidacion() {
  console.log('🧪 PRUEBAS DE VALIDACIÓN DE BOLETOS REALES\n');
  console.log('='.repeat(60));

  try {
    // Obtener boletos de la base de datos
    console.log('\n📋 Obteniendo boletos de la base de datos...');

    const boletos = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM boletos WHERE redimido = 0 LIMIT 3', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`✅ Encontrados ${boletos.length} boletos disponibles\n`);

    if (boletos.length === 0) {
      console.log('⚠️  No hay boletos disponibles para probar');
      return;
    }

    // TEST 1: Validar primer boleto (debe ser válido)
    console.log('📋 TEST 1: Validar boleto disponible');
    const boleto1 = boletos[0];
    console.log(`   UUID: ${boleto1.uuid}`);
    console.log(`   Contratista: ${boleto1.contratista}`);
    console.log(`   Vence: ${boleto1.fecha_vencimiento}`);

    const validacion1 = await makeRequest('POST', '/api/boletos/validar', {
      uuid: boleto1.uuid
    });

    if (validacion1.data.valido) {
      console.log('✅ Boleto válido correctamente');
    } else {
      console.log('❌ Error: Boleto debería ser válido');
      console.log('   Mensaje:', validacion1.data.mensaje);
    }

    // TEST 2: Usar el boleto
    console.log('\n📋 TEST 2: Marcar boleto como usado');
    const uso = await makeRequest('POST', '/api/boletos/usar', {
      uuid: boleto1.uuid,
      ubicacion: 'Comedor Principal - PRUEBA'
    });

    if (uso.data.exito) {
      console.log('✅ Boleto marcado como usado');
      console.log(`   Fecha de uso: ${uso.data.fechaUso}`);
      console.log(`   Ubicación: ${uso.data.ubicacion}`);
    } else {
      console.log('❌ Error al marcar boleto');
    }

    // TEST 3: Intentar usar el mismo boleto de nuevo (debe rechazar)
    console.log('\n📋 TEST 3: Intentar usar boleto ya utilizado');
    const reusoValidacion = await makeRequest('POST', '/api/boletos/validar', {
      uuid: boleto1.uuid
    });

    if (!reusoValidacion.data.valido && reusoValidacion.data.mensaje.includes('usado')) {
      console.log('✅ Sistema rechaza boleto usado correctamente');
      console.log(`   Mensaje: ${reusoValidacion.data.mensaje}`);
    } else {
      console.log('❌ Error: Sistema debería rechazar boleto usado');
    }

    // TEST 4: Validar segundo boleto
    if (boletos.length > 1) {
      console.log('\n📋 TEST 4: Validar y usar segundo boleto');
      const boleto2 = boletos[1];

      const val2 = await makeRequest('POST', '/api/boletos/validar', {
        uuid: boleto2.uuid
      });

      if (val2.data.valido) {
        console.log('✅ Segundo boleto válido');

        const uso2 = await makeRequest('POST', '/api/boletos/usar', {
          uuid: boleto2.uuid,
          ubicacion: 'Comedor Alterno - PRUEBA'
        });

        if (uso2.data.exito) {
          console.log('✅ Segundo boleto usado exitosamente');
        }
      }
    }

    // TEST 5: Verificar estadísticas finales
    console.log('\n📋 TEST 5: Verificar estadísticas después de uso');
    const stats = await makeRequest('GET', '/api/boletos/estadisticas');

    if (stats.data) {
      console.log('✅ Estadísticas actualizadas:');
      stats.data.forEach(stat => {
        console.log(`   ${stat.contratista}:`);
        console.log(`     Total: ${stat.total} | Usados: ${stat.usados} | Disponibles: ${stat.disponibles}`);
      });
    }

    // Verificar en base de datos
    console.log('\n📋 TEST 6: Verificar registro en base de datos');
    const boletosUsados = await new Promise((resolve, reject) => {
      db.all(
        'SELECT uuid, fecha_uso, ubicacion FROM boletos WHERE uuid IN (?, ?)',
        [boleto1.uuid, boletos[1]?.uuid],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    console.log('✅ Boletos en base de datos:');
    boletosUsados.forEach(b => {
      console.log(`   UUID: ${b.uuid.substring(0, 8)}...`);
      console.log(`   Usado: ${b.fecha_uso || 'No'}`);
      console.log(`   Ubicación: ${b.ubicacion || 'N/A'}`);
      console.log('');
    });

    console.log('='.repeat(60));
    console.log('\n🎉 ¡PRUEBAS DE VALIDACIÓN COMPLETADAS!\n');

  } catch (error) {
    console.error('❌ Error en pruebas:', error);
  } finally {
    db.close();
  }
}

setTimeout(testValidacion, 1000);
