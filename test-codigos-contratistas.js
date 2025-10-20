// Script de prueba para verificar generación automática de códigos de contratistas
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

async function testCodigosContratistas() {
  console.log('🧪 PRUEBA: Códigos Automáticos de Contratistas\n');
  console.log('='.repeat(70));

  const contratistas = [
    'PEMEX División Sur',
    'CFE Región Sureste',
    'Constructora González',
    'Servicios Industriales SA',
    'Compañía Mexicana de Aviación'
  ];

  try {
    for (const contratista of contratistas) {
      console.log(`\n📋 Generando boletos para: ${contratista}`);

      const response = await makeRequest('POST', '/api/boletos/generar', {
        contratista,
        cantidad: 2,
        fechaVencimiento: '2025-12-31',
        monto: 1000
      });

      if (response.status === 200 && response.data.exito) {
        console.log(`   ✅ Lote generado: ${response.data.lote}`);
        console.log(`   📄 PDF: ${response.data.pdfUrl}`);
        console.log(`   📦 Cantidad: ${response.data.cantidad} boletos`);
      } else {
        console.log(`   ❌ Error: ${JSON.stringify(response.data)}`);
      }

      // Esperar un poco entre generaciones
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n📝 Instrucciones de Verificación:\n');
    console.log('1. Abre el navegador en: http://localhost:3000/admin');
    console.log('2. Ve a la pestaña "Ver Lotes"');
    console.log('3. Selecciona cualquier lote y mira los boletos');
    console.log('4. Verifica que aparezca el código del contratista en cada boleto\n');
    console.log('Ejemplos de códigos esperados:');
    console.log('  - PEMEX División Sur → [PDS]');
    console.log('  - CFE Región Sureste → [CRS]');
    console.log('  - Constructora González → [CG]');
    console.log('  - Servicios Industriales SA → [SISA]');
    console.log('  - Compañía Mexicana de Aviación → [CMDA]\n');

    console.log('='.repeat(70));
    console.log('✅ Prueba completada\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar test
console.log('⏳ Esperando que el servidor esté listo...\n');
setTimeout(() => {
  testCodigosContratistas().catch(error => {
    console.error('❌ Error ejecutando test:', error);
    process.exit(1);
  });
}, 1500);
