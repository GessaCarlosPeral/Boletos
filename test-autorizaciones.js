// Script de pruebas para el Sistema de Autorizaciones GESSA
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:3000';

// Función helper para hacer requests HTTP con JSON
function makeRequest(method, urlPath, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, API_BASE);
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

// Función helper para hacer requests con FormData (multipart)
function makeMultipartRequest(urlPath, formData) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, API_BASE);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

    let body = '';

    // Construir el cuerpo multipart
    for (const [key, value] of Object.entries(formData)) {
      if (key === 'comprobante' && value.filepath) {
        // Archivo
        const fileData = fs.readFileSync(value.filepath);
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="${key}"; filename="${value.filename}"\r\n`;
        body += `Content-Type: ${value.mimetype}\r\n\r\n`;
        body += fileData.toString('binary');
        body += '\r\n';
      } else {
        // Campo de texto
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
        body += value;
        body += '\r\n';
      }
    }

    body += `--${boundary}--\r\n`;

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(body, 'binary')
      }
    };

    const req = http.request(url, options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(responseBody);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseBody });
        }
      });
    });

    req.on('error', reject);
    req.write(body, 'binary');
    req.end();
  });
}

// Crear imagen de prueba para comprobante
function crearImagenPrueba() {
  const testImagesDir = './test-images';
  if (!fs.existsSync(testImagesDir)) {
    fs.mkdirSync(testImagesDir, { recursive: true });
  }

  const imagePath = path.join(testImagesDir, 'comprobante-test.png');

  // Crear una imagen PNG básica (1x1 pixel rojo)
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
    0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB4, 0x00, 0x00, 0x00,
    0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);

  fs.writeFileSync(imagePath, pngData);
  return imagePath;
}

// Tests
async function runTests() {
  console.log('🧪 INICIANDO PRUEBAS DE AUTORIZACIONES GESSA\n');
  console.log('='.repeat(70));

  let testsPasados = 0;
  let testsFallados = 0;
  let loteIdPrueba = null;
  let loteIdPrueba2 = null;

  try {
    // TEST 1: Generar lote con monto (estado PENDIENTE)
    console.log('\n📋 TEST 1: Generar lote con monto');
    try {
      const response = await makeRequest('POST', '/api/boletos/generar', {
        contratista: 'TEST - Constructora Autorización',
        cantidad: 10,
        fechaVencimiento: '2025-12-31',
        monto: 5000.00
      });

      if (response.status === 200 && response.data.exito) {
        loteIdPrueba = response.data.lote;
        console.log('✅ Lote generado con monto');
        console.log(`   - Lote ID: ${response.data.lote}`);
        console.log(`   - Estado: ${response.data.estadoPago}`);
        console.log(`   - Mensaje: ${response.data.mensaje}`);

        if (response.data.estadoPago === 'PENDIENTE') {
          console.log('   ✓ Estado inicial correcto: PENDIENTE');
          testsPasados++;
        } else {
          throw new Error('Estado inicial no es PENDIENTE');
        }
      } else {
        throw new Error('No se pudo generar el lote');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
      testsFallados++;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // TEST 2: Verificar que el lote tiene estado PENDIENTE
    console.log('\n📋 TEST 2: Verificar estado de pago del lote');
    try {
      const response = await makeRequest('GET', `/api/boletos/pago/${loteIdPrueba}`);

      if (response.status === 200 && response.data) {
        console.log('✅ Información de pago obtenida');
        console.log(`   - Estado: ${response.data.estado_pago}`);
        console.log(`   - Monto: $${response.data.monto}`);
        console.log(`   - PDF URL: ${response.data.pdf_url || 'N/A'}`);

        if (response.data.estado_pago === 'PENDIENTE') {
          testsPasados++;
        } else {
          throw new Error('Estado no es PENDIENTE');
        }
      } else {
        throw new Error('No se pudo obtener info de pago');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
      testsFallados++;
    }

    // TEST 3: Verificar que la descarga no está autorizada
    console.log('\n📋 TEST 3: Verificar que descarga no está autorizada');
    try {
      const response = await makeRequest('GET', `/api/boletos/verificar-descarga/${loteIdPrueba}`);

      if (response.status === 200 && response.data) {
        console.log('✅ Verificación de descarga completada');
        console.log(`   - Autorizado: ${response.data.autorizado}`);
        console.log(`   - Estado: ${response.data.estadoPago}`);

        if (response.data.autorizado === false) {
          console.log('   ✓ Descarga correctamente bloqueada');
          testsPasados++;
        } else {
          throw new Error('Descarga autorizada cuando no debería');
        }
      } else {
        throw new Error('No se pudo verificar descarga');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
      testsFallados++;
    }

    // TEST 4: Intentar autorizar sin comprobante (debe fallar)
    console.log('\n📋 TEST 4: Intentar autorizar sin todos los datos requeridos');
    try {
      const response = await makeRequest('POST', `/api/boletos/autorizar/${loteIdPrueba}`, {
        codigoAutorizacion: 'AUTH-2025-001',
        autorizadoPor: 'Juan Pérez'
      });

      if (response.status === 400) {
        console.log('✅ Sistema rechaza autorización sin datos completos');
        console.log(`   - Error: ${response.data.error}`);
        testsPasados++;
      } else {
        throw new Error('Sistema aceptó autorización incompleta');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
      testsFallados++;
    }

    // TEST 5: Autorizar lote correctamente
    console.log('\n📋 TEST 5: Autorizar lote con todos los datos');
    try {
      const imagePath = crearImagenPrueba();

      const formData = {
        codigoAutorizacion: 'AUTH-2025-001',
        autorizadoPor: 'María González - Finanzas',
        fechaPago: '2025-10-02',
        notas: 'Pago verificado mediante transferencia bancaria',
        comprobante: {
          filepath: imagePath,
          filename: 'comprobante-test.png',
          mimetype: 'image/png'
        }
      };

      const response = await makeMultipartRequest(
        `/api/boletos/autorizar/${loteIdPrueba}`,
        formData
      );

      if (response.status === 200 && response.data.exito) {
        console.log('✅ Lote autorizado exitosamente');
        console.log(`   - Lote ID: ${response.data.loteId}`);
        console.log(`   - Comprobante: ${response.data.comprobante}`);
        testsPasados++;
      } else {
        throw new Error(`No se pudo autorizar: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
      testsFallados++;
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // TEST 6: Verificar que ahora está AUTORIZADO
    console.log('\n📋 TEST 6: Verificar que el lote está AUTORIZADO');
    try {
      const response = await makeRequest('GET', `/api/boletos/pago/${loteIdPrueba}`);

      if (response.status === 200 && response.data) {
        console.log('✅ Estado actualizado correctamente');
        console.log(`   - Estado: ${response.data.estado_pago}`);
        console.log(`   - Código: ${response.data.codigo_autorizacion}`);
        console.log(`   - Autorizado por: ${response.data.autorizado_por}`);
        console.log(`   - Fecha pago: ${response.data.fecha_pago}`);
        console.log(`   - Notas: ${response.data.notas || 'N/A'}`);

        if (response.data.estado_pago === 'AUTORIZADO') {
          testsPasados++;
        } else {
          throw new Error('Estado no cambió a AUTORIZADO');
        }
      } else {
        throw new Error('No se pudo obtener info actualizada');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
      testsFallados++;
    }

    // TEST 7: Verificar que ahora la descarga SÍ está autorizada
    console.log('\n📋 TEST 7: Verificar que descarga está autorizada');
    try {
      const response = await makeRequest('GET', `/api/boletos/verificar-descarga/${loteIdPrueba}`);

      if (response.status === 200 && response.data) {
        console.log('✅ Verificación completada');
        console.log(`   - Autorizado: ${response.data.autorizado}`);
        console.log(`   - PDF URL: ${response.data.pdfUrl}`);

        if (response.data.autorizado === true && response.data.pdfUrl) {
          console.log('   ✓ PDF disponible para descarga');
          testsPasados++;
        } else {
          throw new Error('Descarga no autorizada o PDF no disponible');
        }
      } else {
        throw new Error('No se pudo verificar descarga');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
      testsFallados++;
    }

    // TEST 8: Verificar comprobante de pago guardado
    console.log('\n📋 TEST 8: Verificar que el comprobante se guardó');
    try {
      const comprobantesDir = './comprobantes';

      if (fs.existsSync(comprobantesDir)) {
        const files = fs.readdirSync(comprobantesDir);
        const comprobantesCount = files.filter(f => f.startsWith('comprobante-')).length;

        console.log('✅ Directorio de comprobantes existe');
        console.log(`   - Comprobantes guardados: ${comprobantesCount}`);

        if (comprobantesCount > 0) {
          testsPasados++;
        } else {
          throw new Error('No se encontraron comprobantes');
        }
      } else {
        throw new Error('Directorio de comprobantes no existe');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
      testsFallados++;
    }

    // TEST 9: Generar lote sin monto (opcional)
    console.log('\n📋 TEST 9: Generar lote sin monto especificado');
    try {
      const response = await makeRequest('POST', '/api/boletos/generar', {
        contratista: 'TEST - Sin Monto',
        cantidad: 5,
        fechaVencimiento: '2025-11-30'
      });

      if (response.status === 200 && response.data.exito) {
        loteIdPrueba2 = response.data.lote;
        console.log('✅ Lote generado sin monto');
        console.log(`   - Lote ID: ${response.data.lote}`);
        console.log(`   - Estado: ${response.data.estadoPago}`);
        testsPasados++;
      } else {
        throw new Error('No se pudo generar lote sin monto');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
      testsFallados++;
    }

    // TEST 10: Obtener lista de lotes con estado de pago
    console.log('\n📋 TEST 10: Obtener lista de lotes con estados');
    try {
      const response = await makeRequest('GET', '/api/boletos/lotes');

      if (response.status === 200 && Array.isArray(response.data)) {
        console.log('✅ Lista de lotes obtenida');
        console.log(`   - Total de lotes: ${response.data.length}`);

        // Verificar que incluyen estado_pago
        const lotesConEstado = response.data.filter(l => l.estado_pago);
        console.log(`   - Lotes con estado: ${lotesConEstado.length}`);

        response.data.slice(0, 3).forEach(lote => {
          console.log(`   • ${lote.contratista} - ${lote.estado_pago || 'N/A'} - ${lote.monto ? '$' + lote.monto : 'Sin monto'}`);
        });

        if (lotesConEstado.length > 0) {
          testsPasados++;
        } else {
          throw new Error('Lotes no tienen estado de pago');
        }
      } else {
        throw new Error('No se pudo obtener lista de lotes');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
      testsFallados++;
    }

    // TEST 11: Verificar estructura de base de datos
    console.log('\n📋 TEST 11: Verificar tabla de lotes en BD');
    try {
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database('./data/boletos.db');

      const columnas = await new Promise((resolve, reject) => {
        db.all("PRAGMA table_info(lotes)", (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      const camposRequeridos = [
        'lote_id', 'estado_pago', 'codigo_autorizacion',
        'comprobante_pago', 'fecha_pago', 'autorizado_por', 'monto', 'notas'
      ];

      const nombresCols = columnas.map(c => c.name);
      const tienenTodos = camposRequeridos.every(campo => nombresCols.includes(campo));

      console.log('✅ Estructura de tabla lotes verificada');
      console.log(`   - Columnas totales: ${columnas.length}`);
      console.log(`   - Campos de autorización: ${tienenTodos ? 'Completos' : 'Incompletos'}`);

      db.close();

      if (tienenTodos) {
        testsPasados++;
      } else {
        throw new Error('Faltan campos en tabla lotes');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
      testsFallados++;
    }

    // TEST 12: Intentar autorizar lote inexistente
    console.log('\n📋 TEST 12: Autorizar lote inexistente (debe fallar)');
    try {
      const imagePath = crearImagenPrueba();

      const formData = {
        codigoAutorizacion: 'AUTH-FAKE',
        autorizadoPor: 'Test User',
        fechaPago: '2025-10-02',
        comprobante: {
          filepath: imagePath,
          filename: 'test.png',
          mimetype: 'image/png'
        }
      };

      const response = await makeMultipartRequest(
        `/api/boletos/autorizar/LOTE_INEXISTENTE`,
        formData
      );

      if (response.status === 200 && !response.data.exito) {
        console.log('✅ Sistema rechaza lote inexistente');
        testsPasados++;
      } else if (response.status >= 400) {
        console.log('✅ Sistema rechaza lote inexistente con error');
        testsPasados++;
      } else {
        throw new Error('Sistema aceptó lote inexistente');
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
      testsFallados++;
    }

  } catch (error) {
    console.log('\n❌ ERROR CRÍTICO:', error.message);
    console.log(error.stack);
  }

  // Resumen
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 RESUMEN DE PRUEBAS DE AUTORIZACIONES\n');
  console.log(`✅ Tests pasados: ${testsPasados}`);
  console.log(`❌ Tests fallados: ${testsFallados}`);

  const total = testsPasados + testsFallados;
  if (total > 0) {
    console.log(`📈 Porcentaje de éxito: ${((testsPasados / total) * 100).toFixed(1)}%`);
  }

  console.log('\n' + '='.repeat(70));

  if (testsFallados === 0) {
    console.log('\n🎉 ¡TODOS LOS TESTS DE AUTORIZACIONES PASARON!\n');
    console.log('El Sistema de Autorizaciones está funcionando correctamente.\n');
    console.log('Funcionalidades verificadas:');
    console.log('  ✓ Generación de lotes con monto');
    console.log('  ✓ Estado inicial PENDIENTE');
    console.log('  ✓ Bloqueo de descarga sin autorización');
    console.log('  ✓ Proceso de autorización con comprobante');
    console.log('  ✓ Cambio de estado a AUTORIZADO');
    console.log('  ✓ Habilitación de descarga de PDF');
    console.log('  ✓ Almacenamiento de comprobantes');
    console.log('  ✓ Validaciones de datos requeridos\n');
  } else {
    console.log('\n⚠️  Algunos tests fallaron. Revisa los errores arriba.\n');
  }

  // Limpiar archivos de prueba
  try {
    const testImagesDir = './test-images';
    if (fs.existsSync(testImagesDir)) {
      fs.rmSync(testImagesDir, { recursive: true });
      console.log('🧹 Archivos de prueba eliminados\n');
    }
  } catch (error) {
    console.log('⚠️  No se pudieron eliminar archivos de prueba');
  }

  process.exit(testsFallados > 0 ? 1 : 0);
}

// Ejecutar tests
console.log('⏳ Esperando que el servidor esté listo...\n');
setTimeout(() => {
  runTests().catch(error => {
    console.error('❌ Error ejecutando tests:', error);
    console.error(error.stack);
    process.exit(1);
  });
}, 1500);
