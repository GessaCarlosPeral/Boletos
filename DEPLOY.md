# 🚀 Guía de Despliegue - Gessa Boletos MVP

## 📦 Requisitos Previos

- Docker instalado localmente (para pruebas)
- Cuenta en GitHub (repo privado recomendado)
- Servidor Hostinger VPS con Coolify instalado
- Acceso SSH al servidor

---

## 🧪 **PASO 1: Probar localmente con Docker**

### 1.1 Construir la imagen Docker

```bash
cd /Users/condor/gessa-boletos-mvp
docker-compose build
```

### 1.2 Levantar el contenedor

```bash
docker-compose up
```

### 1.3 Verificar funcionamiento

Abrir en navegador: http://localhost:3000

✅ **Admin**: http://localhost:3000/admin
✅ **Validator**: http://localhost:3000/validator

### 1.4 Detener contenedor

```bash
docker-compose down
```

---

## 📤 **PASO 2: Subir a GitHub**

### 2.1 Inicializar Git (si no existe)

```bash
git init
```

### 2.2 Crear .gitignore

Crear archivo `.gitignore` con:

```
node_modules/
.env
data/*.db
escaneos/*
comprobantes/*
pdfs/*
npm-debug.log
.DS_Store
```

### 2.3 Crear repositorio en GitHub

1. Ir a https://github.com/new
2. Nombre: `gessa-boletos-mvp`
3. ✅ Privado
4. NO inicializar con README

### 2.4 Conectar y subir código

```bash
git add .
git commit -m "🚀 Dockerizado para Coolify"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/gessa-boletos-mvp.git
git push -u origin main
```

---

## ☁️ **PASO 3: Desplegar en Coolify (VPS Hostinger)**

### 3.1 Acceder a Coolify

Abrir panel Coolify en tu VPS: `http://TU-IP-VPS:8000`

### 3.2 Crear nuevo proyecto

1. Click en "**+ New**" → "**Resource**"
2. Seleccionar "**Public Repository**"
3. Pegar URL del repo: `https://github.com/TU-USUARIO/gessa-boletos-mvp`
4. Click "**Continue**"

### 3.3 Configurar despliegue

Coolify detectará automáticamente el `Dockerfile`. Configurar:

- **Project Name**: Gessa Boletos
- **Domain**: boletos.tudominio.com (o IP + puerto)
- **Port**: 3000
- **Build Pack**: Dockerfile

### 3.4 Configurar volúmenes persistentes

En la sección "**Storage**", agregar volúmenes:

```
/app/data -> data
/app/escaneos -> escaneos
/app/comprobantes -> comprobantes
/app/pdfs -> pdfs
```

### 3.5 Configurar SSL automático (opcional)

Si tienes dominio:
1. En Coolify, activar "**Enable HTTPS**"
2. Coolify configurará Let's Encrypt automáticamente

### 3.6 Desplegar

Click en "**Deploy**" 🚀

Coolify:
1. Clonará el repo
2. Construirá la imagen Docker
3. Levantará el contenedor
4. Expondrá la aplicación

---

## ✅ **PASO 4: Verificar funcionamiento**

Abrir en navegador: `http://TU-DOMINIO` o `http://TU-IP:3000`

**Rutas importantes:**
- `/admin` - Panel administrativo
- `/validator` - Validador de boletos
- `/api/boletos/estadisticas` - API de estadísticas

---

## 🔧 **PASO 5: Configuración post-despliegue**

### 5.1 Configurar variables de entorno (opcional)

En Coolify → Settings → Environment Variables:

```
NODE_ENV=production
PORT=3000
```

### 5.2 Configurar backups automáticos

Coolify hace backups automáticos de volúmenes. Verificar en:
**Settings → Backups**

### 5.3 Configurar dominio personalizado

En Coolify → Domains → Agregar dominio:
```
boletos.tudominio.com
```

En tu proveedor de DNS:
```
Tipo: A
Nombre: boletos
Valor: IP_DE_TU_VPS
```

---

## 🔄 **Actualizar la aplicación**

### Opción 1: Redeploy automático (GitHub Webhook)

Coolify puede redesplegar automáticamente en cada `git push`.

Configurar en Coolify → Settings → **Enable Automatic Deployment**

### Opción 2: Redeploy manual

1. Hacer cambios en local
2. `git add .`
3. `git commit -m "Descripción cambios"`
4. `git push`
5. En Coolify → Click "**Redeploy**"

---

## 📊 **Monitoreo**

### Ver logs en tiempo real

En Coolify → **Logs** → Ver logs del contenedor

### Verificar salud del contenedor

Coolify muestra automáticamente el estado con el healthcheck.

---

## 🆘 **Solución de problemas**

### La aplicación no inicia

1. Ver logs en Coolify
2. Verificar que los volúmenes estén correctamente montados
3. Verificar que el puerto 3000 esté disponible

### Archivos no persisten

Verificar que los volúmenes estén configurados en Coolify → Storage

### Error de base de datos

SSH al servidor y verificar:
```bash
ls -la /ruta/a/volumen/data/
```

La DB debe tener permisos de escritura.

---

## 📝 **Comandos útiles (SSH al servidor)**

### Ver contenedores corriendo

```bash
docker ps
```

### Ver logs del contenedor

```bash
docker logs -f NOMBRE_CONTENEDOR
```

### Entrar al contenedor

```bash
docker exec -it NOMBRE_CONTENEDOR sh
```

### Backup manual de la base de datos

```bash
docker exec NOMBRE_CONTENEDOR sqlite3 /app/data/boletos.db ".backup /app/data/backup-$(date +%Y%m%d).db"
```

---

## 🎯 **URLs importantes**

- **Aplicación**: http://tudominio.com
- **Admin**: http://tudominio.com/admin
- **Validator**: http://tudominio.com/validator
- **Coolify Panel**: http://TU-IP:8000

---

## 🔐 **Seguridad post-despliegue**

1. ✅ **HTTPS activado** (Let's Encrypt vía Coolify)
2. ⚠️ **Agregar autenticación al admin** (TODO)
3. ✅ **Firewall**: Solo puertos 80, 443, 22, 8000 abiertos
4. ✅ **Backups automáticos** configurados en Coolify

---

## 💡 **Próximos pasos recomendados**

1. Agregar autenticación al panel admin
2. Configurar alertas de Coolify (email/Slack)
3. Implementar rate limiting en API
4. Migrar a PostgreSQL si escala
5. Implementar S3/Cloudflare R2 para archivos

---

**¿Problemas?** Revisar logs en Coolify o contactar soporte.
