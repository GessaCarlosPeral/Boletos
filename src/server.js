const express = require('express');
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
require('./database/db'); // Inicializar base de datos

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = 3443;

// Leer certificados SSL (solo si existen - para desarrollo local)
let httpsOptions = null;
const keyPath = path.join(__dirname, '../ssl/key.pem');
const certPath = path.join(__dirname, '../ssl/cert.pem');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
}

// Middleware
app.use(cors());
app.use(express.json());

// Servir archivos estáticos PRIMERO (antes de las rutas)
app.use(express.static(path.join(__dirname, '../public')));

// Servir PDFs generados
app.use('/pdfs', express.static(path.join(__dirname, '../pdfs')));

// Servir comprobantes de pago
app.use('/comprobantes', express.static(path.join(__dirname, '../comprobantes')));

// Servir fotos de escaneos
app.use('/escaneos', express.static(path.join(__dirname, '../escaneos')));

// Rutas API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/boletos', require('./routes/boletos'));
app.use('/api/comedores', require('./routes/comedores'));
app.use('/api/precios', require('./routes/precios'));
app.use('/api/auditoria', require('./routes/auditoria'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/roles', require('./routes/roles'));

// Rutas HTML (solo para páginas específicas sin extensión)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/index.html'));
});

app.get('/validador', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/validator/index.html'));
});

// Iniciar servidor HTTP
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Sistema GESSA Boletos MVP`);
  console.log(`📡 Servidor HTTP corriendo en:`);
  console.log(`   - Local: http://localhost:${PORT}`);
  console.log(`   - Red: http://192.168.1.21:${PORT}`);

  if (!httpsOptions) {
    console.log(`\n✅ Sistema listo en modo HTTP (producción con proxy SSL)`);
    console.log(`👨‍💼 Panel Admin: http://localhost:${PORT}/admin`);
    console.log(`📱 Validador: http://localhost:${PORT}/validator\n`);
  }
});

// Iniciar servidor HTTPS solo si hay certificados (desarrollo local)
if (httpsOptions) {
  https.createServer(httpsOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    console.log(`\n🔒 Servidor HTTPS corriendo en:`);
    console.log(`   - Local: https://localhost:${HTTPS_PORT}`);
    console.log(`   - Red: https://192.168.1.21:${HTTPS_PORT}`);
    console.log(`\n👨‍💼 Panel Admin (HTTPS):`);
    console.log(`   - https://192.168.1.21:${HTTPS_PORT}/admin`);
    console.log(`\n📱 Validador con cámara (HTTPS):`);
    console.log(`   - https://192.168.1.21:${HTTPS_PORT}/validator`);
    console.log(`\n✅ Sistema listo - Usa HTTPS para acceso desde iPhone\n`);
  });
}

module.exports = app;
