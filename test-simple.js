// Test simple del sistema sin PDF
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

async function test() {
  console.log('🧪 Iniciando test simple...\n');

  // Test 1: Generar UUID
  console.log('1. Generando UUIDs...');
  const uuids = [];
  for (let i = 0; i < 5; i++) {
    uuids.push(uuidv4());
  }
  console.log(`✅ ${uuids.length} UUIDs generados`);
  console.log('Ejemplo:', uuids[0]);

  // Test 2: Generar QR codes
  console.log('\n2. Generando QR codes...');
  const qrPromises = uuids.map(uuid =>
    QRCode.toDataURL(uuid, {
      errorCorrectionLevel: 'H',
      width: 120,
      margin: 1
    })
  );

  const qrCodes = await Promise.all(qrPromises);
  console.log(`✅ ${qrCodes.length} QR codes generados`);
  console.log('Tamaño del primer QR:', qrCodes[0].length, 'bytes');

  // Test 3: Validar formato UUID
  console.log('\n3. Validando UUIDs...');
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const todosValidos = uuids.every(uuid => uuidRegex.test(uuid));
  console.log(`✅ Todos los UUIDs son válidos: ${todosValidos}`);

  console.log('\n✅ Test completado exitosamente\n');
}

test().catch(console.error);
