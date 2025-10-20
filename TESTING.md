# 🧪 Pruebas del Sistema GESSA

Este documento describe las pruebas implementadas para el Sistema de Boletos GESSA.

## 📋 Suites de Pruebas

### 1. **Pruebas del Sistema** (`test-sistema.js`)
Pruebas básicas del funcionamiento general del sistema.

**Tests incluidos:**
- ✓ Verificar que el servidor responde
- ✓ Generar lote de boletos
- ✓ Obtener estadísticas
- ✓ Validar boleto inexistente
- ✓ Validar formato inválido
- ✓ Generar múltiples lotes
- ✓ Verificar PDFs generados
- ✓ Verificar base de datos SQLite

### 2. **Pruebas de Validación** (`test-validacion.js`)
Pruebas del sistema de validación y uso de boletos.

**Tests incluidos:**
- ✓ Validar y usar boletos válidos
- ✓ Detectar boletos ya usados
- ✓ Detectar boletos vencidos
- ✓ Registrar ubicación de uso

### 3. **Pruebas de Autorizaciones** (`test-autorizaciones.js`) 🆕
Pruebas del sistema de autorización de pagos y descarga de PDFs.

**Tests incluidos:**
- ✓ Generar lote con monto
- ✓ Verificar estado inicial PENDIENTE
- ✓ Bloqueo de descarga sin autorización
- ✓ Validación de datos requeridos
- ✓ Proceso de autorización con comprobante
- ✓ Cambio de estado a AUTORIZADO
- ✓ Habilitación de descarga de PDF
- ✓ Almacenamiento de comprobantes
- ✓ Verificación de estructura de BD
- ✓ Manejo de lotes inexistentes
- ✓ Obtener lista de lotes con estados
- ✓ Generación sin monto

## 🚀 Ejecutar Pruebas

### Suite completa
```bash
npm test
# o
node test-completo.js
```

### Pruebas individuales
```bash
# Pruebas del sistema
npm run test:sistema

# Pruebas de validación
npm run test:validacion

# Pruebas de autorizaciones
npm run test:autorizaciones
```

## ✅ Resultado Esperado

### Suite de Autorizaciones (12 tests)
```
✅ Tests pasados: 12
❌ Tests fallados: 0
📈 Porcentaje de éxito: 100.0%
```

**Funcionalidades verificadas:**
- ✓ Generación de lotes con monto
- ✓ Estado inicial PENDIENTE
- ✓ Bloqueo de descarga sin autorización
- ✓ Proceso de autorización con comprobante
- ✓ Cambio de estado a AUTORIZADO
- ✓ Habilitación de descarga de PDF
- ✓ Almacenamiento de comprobantes
- ✓ Validaciones de datos requeridos

## 🔍 Detalles de las Pruebas de Autorización

### Flujo Completo Probado

1. **Generación de Lote con Monto**
   - Se crea un lote con monto especificado
   - Se verifica que el estado inicial sea `PENDIENTE`
   - Se confirma que el mensaje indica autorización pendiente

2. **Verificación de Estado**
   - Se obtiene la información de pago del lote
   - Se verifica que el monto esté registrado
   - Se confirma que el PDF esté generado pero no autorizado

3. **Bloqueo de Descarga**
   - Se verifica que `autorizado` sea `false`
   - Se confirma que el estado sea `PENDIENTE`
   - Se valida que la descarga esté bloqueada

4. **Validación de Datos**
   - Se intenta autorizar sin datos completos
   - Se verifica que el sistema rechace la solicitud
   - Se confirma el mensaje de error apropiado

5. **Autorización Exitosa**
   - Se envía código de autorización
   - Se sube comprobante de pago (imagen)
   - Se registra quién autorizó
   - Se guarda fecha de pago
   - Se agregan notas opcionales

6. **Verificación Post-Autorización**
   - Se confirma estado `AUTORIZADO`
   - Se verifica que todos los datos estén guardados
   - Se valida que el comprobante esté almacenado
   - Se confirma que el PDF esté disponible

7. **Casos Especiales**
   - Lotes sin monto especificado
   - Autorización de lotes inexistentes
   - Listado de lotes con múltiples estados

## 📊 Estructura de Base de Datos Validada

### Tabla `lotes`
```sql
- lote_id (TEXT, UNIQUE, NOT NULL)
- contratista (TEXT, NOT NULL)
- cantidad (INTEGER, NOT NULL)
- fecha_creacion (DATETIME)
- fecha_vencimiento (DATE, NOT NULL)
- pdf_path (TEXT)
- pdf_url (TEXT)
- estado_pago (TEXT, DEFAULT 'PENDIENTE')  ← Nuevo
- codigo_autorizacion (TEXT)                ← Nuevo
- comprobante_pago (TEXT)                   ← Nuevo
- fecha_pago (DATETIME)                     ← Nuevo
- autorizado_por (TEXT)                     ← Nuevo
- monto (REAL)                              ← Nuevo
- notas (TEXT)                              ← Nuevo
```

## 🔐 API Endpoints Probados

### Generación
```
POST /api/boletos/generar
Body: { contratista, cantidad, fechaVencimiento, monto? }
```

### Autorización
```
POST /api/boletos/autorizar/:loteId
Content-Type: multipart/form-data
Fields:
  - codigoAutorizacion (required)
  - autorizadoPor (required)
  - fechaPago (required)
  - comprobante (file, required)
  - notas (optional)
```

### Verificación
```
GET /api/boletos/pago/:loteId
GET /api/boletos/verificar-descarga/:loteId
GET /api/boletos/lotes
```

## 🎯 Cobertura de Pruebas

- **Casos de Éxito**: ✅ Completo
- **Casos de Error**: ✅ Completo
- **Validaciones**: ✅ Completo
- **Flujo de Autorización**: ✅ Completo
- **Manejo de Archivos**: ✅ Completo
- **Base de Datos**: ✅ Completo

## 📝 Notas

- Las pruebas crean automáticamente imágenes de prueba
- Los archivos de prueba se limpian después de ejecutarse
- Las pruebas requieren que el servidor esté corriendo
- Los comprobantes de pago se almacenan en `/comprobantes/`
- Se valida tanto el flujo feliz como los casos de error

## 🐛 Debugging

Si las pruebas fallan:

1. Verificar que el servidor esté corriendo en puerto 3000
2. Revisar que la base de datos tenga permisos de escritura
3. Confirmar que el directorio `/comprobantes/` sea accesible
4. Verificar que multer esté instalado correctamente
5. Revisar los logs del servidor para errores

## 📈 Métricas

- **Total de tests**: 12 (suite de autorizaciones)
- **Tasa de éxito**: 100%
- **Tiempo de ejecución**: ~3-5 segundos
- **Cobertura**: Todos los endpoints de autorización

---

**Última actualización**: Octubre 2025
**Versión del sistema**: 1.0.0 (MVP con autorizaciones)
