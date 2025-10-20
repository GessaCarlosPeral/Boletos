// Script de prueba para verificar que el número de lote aparece en el PDF
const http = require('http');

const API_BASE = 'http://localhost:3000';

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

async function testLoteEnPDF() {
  console.log('🧪 PRUEBA: Número de Lote en PDF\n');
  console.log('='.repeat(60));

  try {
    // Generar un lote pequeño
    console.log('\n📋 Generando lote de prueba...');

    const response = await makeRequest('POST', '/api/boletos/generar', {
      contratista: 'TEST - Verificación de Lote',
      cantidad: 3,
      fechaVencimiento: '2025-12-31',
      monto: 1500.00
    });

    if (response.status === 200 && response.data.exito) {
      console.log('✅ Lote generado exitosamente\n');
      console.log(`   🎫 Lote ID: ${response.data.lote}`);
      console.log(`   📄 PDF URL: ${response.data.pdfUrl}`);
      console.log(`   💰 Monto: $${response.data.contratista}`);
      console.log(`   📦 Cantidad: ${response.data.cantidad} boletos`);
      console.log(`   📊 Estado: ${response.data.estadoPago}\n`);

      console.log('📝 Instrucciones:');
      console.log('   1. Abre el navegador en: http://localhost:3000/admin');
      console.log('   2. Ve a la pestaña "Ver Lotes"');
      console.log(`   3. Busca el lote: ${response.data.lote}`);
      console.log('   4. Autoriza el lote con cualquier código y comprobante');
      console.log(`   5. Descarga el PDF desde: http://localhost:3000${response.data.pdfUrl}`);
      console.log('   6. Verifica que en el PDF aparezca:');
      console.log(`      - En el encabezado: "Lote: ${response.data.lote}"`);
      console.log(`      - En cada boleto: "Lote: ${response.data.lote}"\n`);

      console.log('='.repeat(60));
      console.log('✅ Test completado - Verificación manual requerida\n');

      process.exit(0);
    } else {
      throw new Error('No se pudo generar el lote');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar test
console.log('⏳ Esperando que el servidor esté listo...\n');
setTimeout(() => {
  testLoteEnPDF().catch(error => {
    console.error('❌ Error ejecutando test:', error);
    process.exit(1);
  });
}, 1000);
