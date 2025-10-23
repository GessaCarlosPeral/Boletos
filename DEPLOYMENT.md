# 🚀 Guía de Deployment - GESSA Boletos

Esta guía te ayudará a desplegar el sistema GESSA en un servidor nuevo (Coolify, VPS, etc.)

---

## 📋 Pre-requisitos

- **Node.js** 14.x o superior
- **npm** 6.x o superior
- **Git** instalado
- Acceso SSH al servidor (si es necesario)

---

## 🔧 Instalación en Nuevo Servidor

### **Paso 1: Clonar el repositorio**

```bash
git clone https://github.com/tu-usuario/gessa-boletos-mvp.git
cd gessa-boletos-mvp
```

### **Paso 2: Instalar dependencias**

```bash
npm install
```

### **Paso 3: Crear carpetas necesarias**

```bash
mkdir -p data escaneos comprobantes pdfs uploads
```

### **Paso 4: Inicializar la base de datos**

Ejecuta el script de inicialización completa:

```bash
node src/database/seedComplete.js
```

**Salida esperada:**

```
╔════════════════════════════════════════════════════════════╗
║  🚀 INICIALIZACIÓN COMPLETA DE BASE DE DATOS GESSA       ║
╚════════════════════════════════════════════════════════════╝

📋 1/7 Creando roles del sistema...
   ✓ Rol: administrador (nivel 3)
   ✓ Rol: operador (nivel 2)
   ✓ Rol: validador (nivel 1)

🔐 2/7 Creando permisos del sistema...
   ✓ Permiso: boletos.crear
   ... (más permisos)

🔗 3/7 Asignando permisos a roles...
   ✓ administrador: 14 permisos asignados
   ✓ operador: 6 permisos asignados
   ✓ validador: 1 permisos asignados

👤 4/7 Creando usuario administrador...
   ✓ Usuario admin creado

💰 5/7 Creando precios de ejemplo...
   ✓ Precio: Desayuno - $80
   ✓ Precio: Comida Corrida - $100
   ✓ Precio: Comida Ejecutiva - $150
   ✓ Precio: Cena - $90
   ✓ Precio: Buffet - $180

🏢 6/7 Creando contratistas y comedores de ejemplo...
   ✓ Contratista: PEMEX División Sur (PEMEX-SUR)
      ↳ Comedor: Comedor Norte
      ↳ Comedor: Comedor Sur
   ✓ Contratista: Constructora ABC (CONST-ABC)
      ↳ Comedor: Comedor Norte
      ↳ Comedor: Comedor Sur
   ✓ Contratista: Servicios Industriales XYZ (SERV-XYZ)
      ↳ Comedor: Comedor Norte
      ↳ Comedor: Comedor Sur

📊 7/7 Creando configuraciones finales...
   ✓ Configuraciones finales aplicadas

╔════════════════════════════════════════════════════════════╗
║  ✅ INICIALIZACIÓN COMPLETADA EXITOSAMENTE               ║
╚════════════════════════════════════════════════════════════╝

┌────────────────────────────────────────────────────────────┐
│  🔑 CREDENCIALES DE ACCESO                                │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  URL:      https://tu-dominio.com/login.html              │
│  Usuario:  admin                                           │
│  Password: admin123                                        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### **Paso 5: Iniciar el servidor**

```bash
npm start
```

El servidor estará disponible en:
- **HTTP:** `http://localhost:3000`
- **HTTPS:** `https://localhost:3443` (requiere certificados SSL)

---

## 🔐 Primer Acceso

### **1. Abrir en navegador**

```
https://tu-dominio.com/login.html
```

### **2. Iniciar sesión**

```
Usuario:  admin
Password: admin123
```

### **3. ⚠️ IMPORTANTE: Cambiar contraseña**

Actualmente el sistema **NO tiene** función de cambio de contraseña en la UI.

**Opción recomendada:** Crear un nuevo usuario administrador con credenciales seguras:

1. Ir a pestaña **👥 Usuarios**
2. Click en **➕ Nuevo Usuario**
3. Completar:
   - Username: `tu_usuario`
   - Nombre completo: `Tu Nombre`
   - Email: `tu@email.com`
   - Rol: **Administrador**
   - Password: `contraseña_segura_123`
4. Guardar
5. Cerrar sesión y entrar con nuevo usuario
6. (Opcional) Desactivar usuario `admin` desde panel

---

## 📊 Datos de Ejemplo Creados

El script `seedComplete.js` crea automáticamente:

### **Roles (3)**
- ✅ **Administrador** (nivel 3) - Acceso total
- ✅ **Operador** (nivel 2) - Genera y consulta boletos
- ✅ **Validador** (nivel 1) - Solo escanea boletos

### **Permisos (14)**
- Boletos: crear, leer, autorizar, descargar, validar
- Usuarios: crear, leer, actualizar, eliminar
- Precios: crear, leer, actualizar
- Reportes: leer, auditoría

### **Usuario Administrador (1)**
- Username: `admin`
- Password: `admin123`
- Email: `admin@gessa.com`

### **Precios (5)**
| Nombre | Precio | Descripción |
|--------|--------|-------------|
| Desayuno | $80.00 | Desayuno completo |
| Comida Corrida | $100.00 | Comida del día |
| Comida Ejecutiva | $150.00 | Comida especial |
| Cena | $90.00 | Cena ligera |
| Buffet | $180.00 | Buffet libre |

### **Contratistas (3)**
1. **PEMEX División Sur** (código: PEMEX-SUR)
2. **Constructora ABC** (código: CONST-ABC)
3. **Servicios Industriales XYZ** (código: SERV-XYZ)

### **Comedores (6)**
- 2 comedores por cada contratista:
  - Comedor Norte
  - Comedor Sur

---

## 🔄 Re-inicializar Base de Datos

Si necesitas volver a empezar desde cero:

### **⚠️ ADVERTENCIA: Esto borrará TODOS los datos**

```bash
# 1. Detener el servidor (Ctrl+C)

# 2. Eliminar base de datos
rm data/boletos.db

# 3. Limpiar archivos generados
rm -rf escaneos/* comprobantes/* pdfs/*

# 4. Re-ejecutar seed
node src/database/seedComplete.js

# 5. Reiniciar servidor
npm start
```

---

## 🐳 Deployment con Docker (Opcional)

Si tu servidor usa Docker/Coolify:

### **Dockerfile** (ya incluido en el proyecto)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Crear carpetas necesarias
RUN mkdir -p data escaneos comprobantes pdfs uploads

# Exponer puertos
EXPOSE 3000 3443

CMD ["npm", "start"]
```

### **docker-compose.yml** (ejemplo)

```yaml
version: '3.8'

services:
  gessa-boletos:
    build: .
    ports:
      - "3000:3000"
      - "3443:3443"
    volumes:
      # Persistir base de datos y archivos
      - ./data:/app/data
      - ./escaneos:/app/escaneos
      - ./comprobantes:/app/comprobantes
      - ./pdfs:/app/pdfs
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

### **Construir y ejecutar:**

```bash
docker-compose up -d
```

### **Ejecutar seed dentro del contenedor:**

```bash
docker-compose exec gessa-boletos node src/database/seedComplete.js
```

---

## 📁 Estructura de Carpetas

Después de la instalación, tendrás:

```
gessa-boletos-mvp/
├── data/                    # Base de datos SQLite
│   └── boletos.db          # (creado automáticamente)
├── escaneos/               # Fotos de escaneos de boletos
├── comprobantes/           # Comprobantes de pago subidos
├── pdfs/                   # PDFs de lotes generados
├── uploads/                # Archivos subidos
├── public/                 # Frontend
│   ├── admin/             # Panel de administración
│   ├── validator/         # Módulo de validación
│   └── login.html         # Página de login
├── src/                   # Backend
│   ├── database/          # Scripts de BD
│   │   ├── db.js         # Conexión y esquema
│   │   ├── seedAuth.js   # Seed básico (solo auth)
│   │   └── seedComplete.js # Seed completo (con datos)
│   ├── routes/           # Rutas de API
│   └── services/         # Lógica de negocio
├── package.json
└── server.js             # Servidor principal
```

---

## ⚙️ Variables de Entorno (Opcional)

Puedes crear un archivo `.env` para configuraciones:

```env
# Puerto HTTP
PORT=3000

# Puerto HTTPS
HTTPS_PORT=3443

# Modo de desarrollo/producción
NODE_ENV=production

# JWT Secret (cambiar en producción)
JWT_SECRET=tu_secreto_super_seguro_aqui_cambiar_en_produccion

# Habilitar captura de fotos en validación
ENABLE_PHOTO_CAPTURE=true
```

---

## 🔍 Verificación Post-Instalación

### **Checklist:**

- [ ] Servidor inicia sin errores
- [ ] Puedes acceder a login: `https://tu-dominio.com/login.html`
- [ ] Login con `admin` / `admin123` funciona
- [ ] Panel de administración carga correctamente
- [ ] Ves 3 contratistas en el sistema
- [ ] Ves 5 precios configurados
- [ ] Puedes crear un lote de prueba
- [ ] PDF se genera correctamente

### **Comandos útiles:**

```bash
# Ver logs del servidor
tail -f logs/app.log

# Ver contenido de base de datos
sqlite3 data/boletos.db "SELECT * FROM usuarios;"

# Verificar carpetas creadas
ls -la data/ escaneos/ comprobantes/ pdfs/
```

---

## 🆘 Troubleshooting

### **Error: "Cannot find module 'bcrypt'"**

```bash
npm install
```

### **Error: "EACCES: permission denied, mkdir 'data'"**

```bash
sudo chown -R $USER:$USER .
mkdir -p data escaneos comprobantes pdfs
```

### **Error: "Port 3000 already in use"**

```bash
# Encontrar proceso usando puerto 3000
lsof -ti:3000

# Matar proceso
lsof -ti:3000 | xargs kill -9

# O cambiar puerto en .env
echo "PORT=3001" > .env
```

### **Base de datos corrupta**

```bash
# Backup
cp data/boletos.db data/boletos.db.backup

# Recrear
rm data/boletos.db
node src/database/seedComplete.js
```

---

## 📞 Soporte

Si tienes problemas durante el deployment:

1. Revisa los logs del servidor
2. Verifica que todas las dependencias estén instaladas
3. Asegúrate de que las carpetas tengan permisos correctos
4. Consulta la documentación en `/docs/MANUAL_OPERATIVO.md`

---

## 📝 Notas Importantes

1. **Seguridad:**
   - Cambia la contraseña del admin inmediatamente
   - Usa HTTPS en producción
   - Configura firewall para puertos 3000/3443

2. **Backups:**
   - La base de datos está en `data/boletos.db`
   - Haz backups regulares de esta carpeta
   - Los PDFs y comprobantes también son importantes

3. **Datos de ejemplo:**
   - Son solo para testing
   - Puedes eliminarlos desde el panel admin
   - O ejecutar seed solo con `seedAuth.js` para datos limpios

---

**¡Listo! Tu sistema GESSA está funcionando** 🎉

Próximo paso: Accede al panel admin y comienza a generar tus primeros boletos.
