# 📦 Guía de Instalación - Sistema GESSA Boletos MVP

Esta guía te ayudará a instalar y configurar el Sistema GESSA Boletos en tu computadora o servidor.

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Instalación en Desarrollo](#instalación-en-desarrollo)
3. [Instalación con Docker](#instalación-con-docker)
4. [Configuración Inicial](#configuración-inicial)
5. [Acceso al Sistema](#acceso-al-sistema)
6. [Solución de Problemas](#solución-de-problemas)

---

## 📌 Requisitos Previos

### Opción A: Instalación Directa (Desarrollo)

Necesitas tener instalado:

- **Node.js** versión 16 o superior
  - Descargar desde: https://nodejs.org/
  - Verificar instalación: `node --version`
- **npm** (viene incluido con Node.js)
  - Verificar instalación: `npm --version`
- **Git** para clonar el repositorio
  - Descargar desde: https://git-scm.com/
  - Verificar instalación: `git --version`

### Opción B: Instalación con Docker (Recomendado para Producción)

Necesitas tener instalado:

- **Docker Desktop**
  - Windows/Mac: https://www.docker.com/products/docker-desktop
  - Linux: https://docs.docker.com/engine/install/
  - Verificar instalación: `docker --version`
- **Docker Compose** (incluido en Docker Desktop)
  - Verificar instalación: `docker-compose --version`

---

## 🚀 Instalación en Desarrollo

### Paso 1: Clonar el Repositorio

```bash
# Clonar desde GitHub
git clone https://github.com/condor090/gessa-boletos-mvp.git

# Entrar al directorio del proyecto
cd gessa-boletos-mvp
```

### Paso 2: Instalar Dependencias

```bash
# Instalar todas las dependencias del proyecto
npm install
```

Este proceso puede tardar unos minutos mientras descarga todas las librerías necesarias.

### Paso 3: Inicializar la Base de Datos

```bash
# Ejecutar el script de inicialización de datos de autenticación
node src/database/seedAuth.js
```

Este comando crea:
- ✅ Roles de usuario (Administrador, Gerente de Comedor, Validador)
- ✅ Permisos del sistema
- ✅ Usuario administrador por defecto

### Paso 4: Iniciar el Servidor

```bash
# Iniciar en modo desarrollo
npm start
```

Verás un mensaje como este:

```
🚀 Sistema GESSA Boletos MVP
📡 Servidor HTTP corriendo en:
   - Local: http://localhost:3000
   - Red: http://192.168.1.21:3000

✅ Sistema listo
```

### Paso 5: Verificar Instalación

Abre tu navegador y visita:
- http://localhost:3000

Deberías ver la página principal del sistema.

---

## 🐳 Instalación con Docker

### Paso 1: Clonar el Repositorio

```bash
# Clonar desde GitHub
git clone https://github.com/condor090/gessa-boletos-mvp.git

# Entrar al directorio del proyecto
cd gessa-boletos-mvp
```

### Paso 2: Construir la Imagen Docker

```bash
# Construir la imagen Docker
docker-compose build
```

Este proceso puede tardar varios minutos la primera vez.

### Paso 3: Iniciar los Contenedores

```bash
# Iniciar el sistema en segundo plano
docker-compose up -d
```

### Paso 4: Verificar que está Corriendo

```bash
# Ver los contenedores activos
docker-compose ps

# Ver los logs del sistema
docker-compose logs -f
```

### Paso 5: Inicializar Datos (Primera vez)

```bash
# Ejecutar el script de inicialización dentro del contenedor
docker-compose exec app node src/database/seedAuth.js
```

### Comandos Útiles de Docker

```bash
# Detener el sistema
docker-compose down

# Reiniciar el sistema
docker-compose restart

# Ver logs en tiempo real
docker-compose logs -f

# Acceder a la terminal del contenedor
docker-compose exec app sh
```

---

## ⚙️ Configuración Inicial

### 1. Configurar Puerto (Opcional)

Si el puerto 3000 está ocupado, puedes cambiarlo:

**Sin Docker:**
```bash
# En Mac/Linux
PORT=8080 npm start

# En Windows (CMD)
set PORT=8080 && npm start

# En Windows (PowerShell)
$env:PORT=8080; npm start
```

**Con Docker:**
Edita el archivo `docker-compose.yml` y cambia:
```yaml
ports:
  - "8080:3000"  # Puerto externo:Puerto interno
```

### 2. Configurar SSL/HTTPS (Opcional)

Para usar HTTPS en desarrollo local:

```bash
# Crear directorio para certificados
mkdir ssl

# Generar certificados autofirmados (Mac/Linux)
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes

# Reiniciar el servidor
npm start
```

El servidor ahora estará disponible en:
- http://localhost:3000 (HTTP)
- https://localhost:3443 (HTTPS)

### 3. Variables de Entorno (Opcional)

Puedes crear un archivo `.env` para configuraciones avanzadas:

```bash
# Crear archivo .env
touch .env
```

Contenido del archivo `.env`:
```env
PORT=3000
NODE_ENV=production
JWT_SECRET=tu_secreto_super_seguro_aqui
```

---

## 🔐 Acceso al Sistema

### Credenciales por Defecto

Después de inicializar el sistema, usa estas credenciales para acceder:

**Usuario Administrador:**
- **Usuario:** `admin`
- **Contraseña:** `admin123`

### URLs de Acceso

- **Página Principal:** http://localhost:3000
- **Panel de Login:** http://localhost:3000/login
- **Panel de Administración:** http://localhost:3000/admin
- **Validador de Boletos:** http://localhost:3000/validador

### Primer Inicio de Sesión

1. Abre http://localhost:3000/login en tu navegador
2. Ingresa las credenciales del administrador
3. **¡IMPORTANTE!** Cambia la contraseña inmediatamente:
   - Ve a "Usuarios" en el panel admin
   - Edita el usuario "admin"
   - Haz clic en "🔑 Reset" para cambiar la contraseña

---

## 🛠️ Solución de Problemas

### Problema: "Puerto 3000 ya está en uso"

**Solución:**
```bash
# Ver qué proceso está usando el puerto
lsof -ti:3000

# Matar el proceso
lsof -ti:3000 | xargs kill -9

# O cambiar el puerto (ver Configuración)
PORT=8080 npm start
```

### Problema: "No se puede conectar a la base de datos"

**Solución:**
```bash
# Verificar que existe el directorio data
ls -la data/

# Si no existe, créalo
mkdir data

# Reiniciar el servidor
npm start
```

### Problema: "Error al iniciar Docker"

**Solución:**
```bash
# Verificar que Docker está corriendo
docker ps

# Si no funciona, reinicia Docker Desktop

# Limpiar contenedores anteriores
docker-compose down -v

# Reconstruir
docker-compose build --no-cache
docker-compose up -d
```

### Problema: "Cannot find module 'express'"

**Solución:**
```bash
# Borrar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Problema: "Olvidé la contraseña del administrador"

**Solución:**
```bash
# Sin Docker
node src/database/resetAdminPassword.js

# Con Docker
docker-compose exec app node src/database/resetAdminPassword.js

# Con Coolify (desde la terminal del contenedor)
node src/database/resetAdminPassword.js
```

Esto restablecerá la contraseña a `admin123`.

### Problema: "Permission denied" en Linux

**Solución:**
```bash
# Dar permisos al directorio
sudo chmod -R 755 gessa-boletos-mvp/

# O ejecutar con sudo (no recomendado)
sudo npm start
```

### Problema: La página no carga o muestra error 404

**Solución:**
```bash
# Verificar que el servidor está corriendo
ps aux | grep node

# Verificar los logs
npm start

# Limpiar cache del navegador (Ctrl+Shift+R o Cmd+Shift+R)
```

---

## 📱 Acceso desde Otros Dispositivos

### Desde otra computadora en la misma red

1. Encuentra tu IP local:
   ```bash
   # En Mac/Linux
   ifconfig | grep "inet "

   # En Windows
   ipconfig
   ```

2. Busca algo como: `192.168.1.21`

3. Accede desde otro dispositivo usando:
   - `http://192.168.1.21:3000`

### Desde iPhone/iPad (Requiere HTTPS)

1. Genera certificados SSL (ver sección Configuración)
2. Accede usando: `https://192.168.1.21:3443`
3. Acepta el certificado autofirmado en Safari

---

## 📊 Estructura del Sistema

```
gessa-boletos-mvp/
├── data/                 # Base de datos SQLite
├── pdfs/                 # PDFs de boletos generados
├── comprobantes/         # Comprobantes de pago
├── escaneos/            # Fotos de validaciones
├── public/              # Archivos estáticos (HTML, CSS, JS)
│   ├── admin/           # Panel de administración
│   └── validator/       # App de validación
├── src/                 # Código fuente del servidor
│   ├── database/        # Configuración de base de datos
│   ├── middleware/      # Middlewares (auth, audit)
│   ├── routes/          # Rutas de la API
│   └── services/        # Lógica de negocio
├── ssl/                 # Certificados SSL (opcional)
├── docker-compose.yml   # Configuración de Docker
├── Dockerfile           # Imagen de Docker
└── package.json         # Dependencias del proyecto
```

---

## 🔄 Actualizar el Sistema

### Sin Docker

```bash
# Detener el servidor (Ctrl+C)

# Actualizar código desde GitHub
git pull origin main

# Instalar nuevas dependencias
npm install

# Reiniciar servidor
npm start
```

### Con Docker

```bash
# Detener contenedores
docker-compose down

# Actualizar código
git pull origin main

# Reconstruir imagen
docker-compose build

# Iniciar de nuevo
docker-compose up -d
```

---

## 📞 Soporte

Si tienes problemas con la instalación:

1. Revisa esta guía completa
2. Verifica los logs del sistema
3. Consulta la documentación en GitHub
4. Reporta el problema en: https://github.com/condor090/gessa-boletos-mvp/issues

---

## ✅ Lista de Verificación Post-Instalación

- [ ] El servidor inicia sin errores
- [ ] Puedes acceder a http://localhost:3000
- [ ] Puedes iniciar sesión con usuario "admin"
- [ ] Has cambiado la contraseña del administrador
- [ ] Puedes acceder al panel de administración
- [ ] La base de datos se creó correctamente
- [ ] Puedes crear un nuevo usuario
- [ ] Puedes generar un lote de boletos de prueba

---

**¡Listo!** 🎉 Tu sistema GESSA Boletos está instalado y funcionando.
