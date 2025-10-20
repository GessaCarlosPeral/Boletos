# 🎫 Sistema GESSA Boletos - MVP

Sistema minimalista de generación y validación de boletos mediante códigos QR.

## 🚀 Inicio Rápido

```bash
# Iniciar el sistema
./start.sh

# O manualmente
npm install
npm start
```

El servidor iniciará en: `http://localhost:3000`

## 📱 Accesos

- **Inicio**: http://localhost:3000
- **Panel Admin**: http://localhost:3000/admin
- **Validador**: http://localhost:3000/validador

## ✨ Características

### ✅ Implementado

- [x] Generador de lotes de boletos con UUID único
- [x] Generación de códigos QR de alta calidad
- [x] Generación automática de PDF listo para imprimir
- [x] Base de datos SQLite (1 tabla)
- [x] Validador PWA con scanner de cámara
- [x] Validación en tiempo real
- [x] Marcado de boletos usados (1 uso único)
- [x] Panel de administración web
- [x] Estadísticas por contratista
- [x] Modo offline con Service Worker
- [x] Feedback visual y sonoro en validación
- [x] Responsive design (móvil y desktop)

## 🏗️ Arquitectura

```
gessa-boletos-mvp/
├── src/
│   ├── database/
│   │   └── db.js              # Configuración SQLite
│   ├── services/
│   │   ├── boletoService.js   # Lógica de boletos
│   │   └── pdfService.js      # Generación de PDF
│   ├── routes/
│   │   └── boletos.js         # API REST
│   └── server.js              # Servidor Express
├── public/
│   ├── index.html             # Dashboard principal
│   ├── admin/
│   │   ├── index.html         # Panel admin
│   │   └── admin.js           # Lógica admin
│   └── validator/
│       ├── index.html         # Validador PWA
│       ├── validator.js       # Lógica validador
│       ├── manifest.json      # PWA manifest
│       └── sw.js              # Service Worker
├── data/
│   └── boletos.db             # Base de datos SQLite
└── pdfs/                      # PDFs generados
```

## 🔌 API Endpoints

### POST /api/boletos/generar
Genera un nuevo lote de boletos

```json
{
  "contratista": "PEMEX División Sur",
  "cantidad": 500,
  "fechaVencimiento": "2025-12-31"
}
```

### POST /api/boletos/validar
Valida un boleto por UUID

```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000"
}
```

### POST /api/boletos/usar
Marca un boleto como usado

```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "ubicacion": "Comedor principal"
}
```

### GET /api/boletos/estadisticas
Obtiene estadísticas del sistema

## 💾 Base de Datos

Tabla única: `boletos`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER | ID autoincremental |
| uuid | TEXT | Código único UUID v4 |
| contratista | TEXT | Nombre del contratista |
| fecha_creacion | DATETIME | Fecha de creación |
| fecha_vencimiento | DATE | Fecha de vencimiento |
| redimido | INTEGER | 0 = no usado, 1 = usado |
| fecha_uso | DATETIME | Fecha y hora de uso |
| ubicacion | TEXT | Ubicación de validación |
| lote | TEXT | ID del lote |

## 🔒 Seguridad

- UUID v4: 128 bits de entropía (imposible de falsificar)
- Validación única: Un boleto solo puede usarse una vez
- Registro completo: Fecha, hora y ubicación de cada uso
- Sin datos personales: Privacidad garantizada

## 📊 Flujo de Operación

### 1. Generación (Panel Admin)
1. Contratista solicita boletos
2. GESSA ingresa datos en panel admin
3. Sistema genera UUID únicos
4. Crea códigos QR
5. Genera PDF listo para imprimir
6. Contratista descarga y distribuye

### 2. Validación (Tablet/Móvil)
1. Empleado presenta QR
2. Personal escanea con validador
3. Sistema valida contra base de datos
4. Marca como usado si es válido
5. Muestra resultado visual y sonoro

## 🎯 Casos de Uso

### Caso 1: Generar 500 boletos
```
Contratista: PEMEX División Sur
Cantidad: 500
Vencimiento: 31/12/2025
Resultado: PDF con 500 boletos únicos (2 minutos)
```

### Caso 2: Validar boleto
```
Escenario 1: Boleto válido → ✅ Acceso autorizado
Escenario 2: Boleto usado → ❌ Ya fue utilizado
Escenario 3: Boleto vencido → ❌ Fuera de vigencia
Escenario 4: Código inválido → ❌ No existe
```

## 🛠️ Stack Tecnológico

| Componente | Tecnología | Versión |
|------------|-----------|---------|
| Backend | Node.js + Express | 5.1.0 |
| Base de Datos | SQLite | 5.1.7 |
| Generador QR | qrcode | 1.5.4 |
| PDF | PDFKit | 0.17.2 |
| UUID | uuid | 13.0.0 |
| Frontend | Vanilla JS | - |
| PWA | Service Worker | - |
| Scanner | jsQR | 1.4.0 |

## 📱 PWA (Progressive Web App)

El validador es una PWA instalable:

1. Abre el validador en Chrome/Safari
2. Click en "Agregar a pantalla de inicio"
3. Usa como app nativa
4. Funciona offline con sincronización

## 🔧 Requisitos del Sistema

### Hardware Mínimo
- RAM: 2 GB
- Almacenamiento: 1 GB
- Procesador: 1 GHz

### Software
- Node.js 14 o superior
- Navegador moderno (Chrome, Firefox, Safari, Edge)
- Cámara para escáner QR (validador)

## 📈 Escalabilidad

El sistema puede manejar:
- ✅ 10,000+ boletos generados
- ✅ 100+ validaciones por minuto
- ✅ Base de datos < 50 MB
- ✅ PDFs generados en < 30 segundos

## 🚨 Solución de Problemas

### Error: "Cannot find module"
```bash
npm install
```

### Error: "EADDRINUSE port 3000"
```bash
# Cambiar puerto
PORT=3001 npm start
```

### Cámara no funciona en validador
- Verificar permisos de cámara en navegador
- Usar HTTPS o localhost
- Probar con código manual

### PDF no se genera
- Verificar directorio `pdfs/` existe
- Verificar permisos de escritura

## 📞 Soporte

Sistema desarrollado por **Cóndor AGI**
- Garantía: 90 días en software
- Soporte técnico incluido

## 🎉 Próximos Pasos

Para poner el sistema en producción:

1. **Hardware**:
   - Raspberry Pi 4 (4GB) + Case
   - O cualquier PC con Node.js

2. **Tablets**:
   - 2x Android 8+ con cámara
   - Instalar Chrome

3. **Red**:
   - Conexión WiFi estable
   - IP fija para el servidor

4. **Capacitación**:
   - 15 minutos para personal
   - Manual de 1 página incluido

## 📄 Licencia

Uso exclusivo para GESSA - Todos los derechos reservados.
