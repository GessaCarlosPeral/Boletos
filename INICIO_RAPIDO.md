# 🚀 Inicio Rápido - Sistema GESSA Boletos

## ⚡ Comandos Esenciales

```bash
# Iniciar el sistema
cd /Users/condor/gessa-boletos-mvp
./start.sh

# O manualmente
npm start
```

## 🌐 URLs de Acceso

| Componente | URL | Descripción |
|------------|-----|-------------|
| **Dashboard** | http://localhost:3000 | Página principal |
| **Panel Admin** | http://localhost:3000/admin | Generar boletos |
| **Validador** | http://localhost:3000/validador | Escanear QR |

## 📝 Flujo Completo

### 1. Generar Boletos (Panel Admin)

1. Abrir http://localhost:3000/admin
2. Seleccionar contratista del dropdown (o crear nuevo)
3. Ingresar cantidad de boletos (ej: 500)
4. Seleccionar fecha de vencimiento
5. Click en "Generar Lote de Boletos"
6. Esperar 10-30 segundos
7. Click en "Descargar PDF"
8. Imprimir y distribuir

### 2. Validar Boletos (Tablet/Móvil)

1. Abrir http://localhost:3000/validador en tablet
2. Click en "Iniciar Escáner"
3. Permitir acceso a la cámara
4. Apuntar a código QR del boleto
5. Sistema valida automáticamente
6. Ver resultado en pantalla

**Alternativa sin cámara**:
- Ingresar código UUID manualmente
- Click en "Validar Código"

## 🧪 Ejecutar Pruebas

```bash
# Pruebas completas del sistema
node test-sistema.js

# Pruebas de validación
node test-validacion.js

# Test simple de componentes
node test-simple.js
```

## 📊 Ver Estadísticas

1. Ir a http://localhost:3000/admin
2. Scroll hasta "Estadísticas del Sistema"
3. Ver totales y por contratista

O usar API directamente:
```bash
curl http://localhost:3000/api/boletos/estadisticas
```

## 🔧 Solución Rápida de Problemas

### Puerto 3000 ocupado
```bash
lsof -ti:3000 | xargs kill -9
npm start
```

### Error "Cannot find module"
```bash
npm install
npm start
```

### Base de datos corrupta
```bash
rm data/boletos.db
npm start
# Se creará nueva BD automáticamente
```

### PDFs no se generan
```bash
mkdir -p pdfs
chmod 755 pdfs
npm start
```

## 📱 Instalar Validador como App (PWA)

### En Android
1. Abrir validador en Chrome
2. Menú → "Agregar a pantalla de inicio"
3. Usar como app nativa

### En iOS
1. Abrir validador en Safari
2. Compartir → "Agregar a pantalla de inicio"
3. Usar como app nativa

## 🔐 API REST (para integraciones)

### Generar boletos
```bash
curl -X POST http://localhost:3000/api/boletos/generar \
  -H "Content-Type: application/json" \
  -d '{
    "contratista": "PEMEX",
    "cantidad": 100,
    "fechaVencimiento": "2025-12-31"
  }'
```

### Validar boleto
```bash
curl -X POST http://localhost:3000/api/boletos/validar \
  -H "Content-Type: application/json" \
  -d '{"uuid": "UUID-AQUI"}'
```

### Usar boleto
```bash
curl -X POST http://localhost:3000/api/boletos/usar \
  -H "Content-Type: application/json" \
  -d '{
    "uuid": "UUID-AQUI",
    "ubicacion": "Comedor Principal"
  }'
```

### Estadísticas
```bash
curl http://localhost:3000/api/boletos/estadisticas
```

## 📦 Archivos Importantes

| Archivo | Ubicación | Descripción |
|---------|-----------|-------------|
| Base de datos | `./data/boletos.db` | SQLite con todos los boletos |
| PDFs generados | `./pdfs/*.pdf` | Boletos listos para imprimir |
| Logs del servidor | Terminal | Ver errores y actividad |

## 🔄 Backup de Base de Datos

```bash
# Crear backup manual
cp data/boletos.db data/boletos_backup_$(date +%Y%m%d).db

# Restaurar backup
cp data/boletos_backup_FECHA.db data/boletos.db
```

## ⏱️ Tiempos Estimados

| Operación | Tiempo |
|-----------|--------|
| Generar 10 boletos | ~3 segundos |
| Generar 100 boletos | ~10 segundos |
| Generar 500 boletos | ~30 segundos |
| Validar un boleto | <200ms |
| Marcar como usado | <100ms |

## 💡 Tips Útiles

1. **Generar en lotes pequeños**: Para pruebas, usar 5-10 boletos
2. **Fechas rápidas**: Usar botones "+1 Mes", "+3 Meses", etc.
3. **Modo offline**: El validador funciona sin internet después de cargar
4. **Imprimir boletos**: Usar papel estándar carta, los QR funcionan bien
5. **Backup diario**: Copiar boletos.db cada día

## 📞 Soporte

Si algo no funciona:
1. Verificar que el servidor está corriendo
2. Revisar los logs en la terminal
3. Ejecutar `node test-sistema.js` para diagnosticar
4. Consultar README.md para más detalles

---

**Sistema desarrollado por Cóndor AGI**
Versión 1.0 - MVP Simplificado
