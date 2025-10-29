# Manual Operativo del Sistema GESSA - Boletos de Comedor

**Versión:** 1.0
**Fecha:** Octubre 2025
**Sistema:** GESSA - Sistema de Gestión de Boletos para Comedores

---

## Tabla de Contenidos

1. [Introducción](#1-introducción)
2. [Acceso al Sistema](#2-acceso-al-sistema)
3. [Roles y Permisos](#3-roles-y-permisos)
4. [Módulo de Administración](#4-módulo-de-administración)
5. [Módulo de Validación](#5-módulo-de-validación)
6. [Flujos de Trabajo Completos](#6-flujos-de-trabajo-completos)
7. [Glosario de Términos](#7-glosario-de-términos)
8. [Preguntas Frecuentes](#8-preguntas-frecuentes)
9. [Soporte y Contacto](#9-soporte-y-contacto)

---

## 1. Introducción

### 1.1 ¿Qué es GESSA?

GESSA es un sistema integral de gestión de boletos para comedores industriales que permite:

- ✅ Generar lotes de boletos con códigos QR únicos
- ✅ Gestionar contratistas y comedores
- ✅ Autorizar descargas mediante workflow de aprobación
- ✅ Validar boletos en tiempo real (escáner QR)
- ✅ Generar reportes y estadísticas detalladas
- ✅ Controlar precios por tipo de platillo
- ✅ Gestionar pagos (contado/crédito)
- ✅ Auditoría completa de todas las operaciones

### 1.2 Arquitectura del Sistema

El sistema está compuesto por dos módulos principales:

**Panel de Administración:** Gestión completa de boletos, usuarios, precios y reportes
**Validador Móvil:** Aplicación móvil/tablet para escanear y validar boletos

---

## 2. Acceso al Sistema

### 2.1 URLs de Acceso

- **Panel de Administración:** `https://tu-dominio.com/admin`
- **Módulo de Validación:** `https://tu-dominio.com/validator`
- **Login:** `https://tu-dominio.com/login.html`

### 2.2 Credenciales Iniciales

Al instalar el sistema por primera vez, se crea automáticamente un usuario administrador:

```
Usuario: admin
Contraseña: [proporcionada durante la instalación]
```

⚠️ **IMPORTANTE:** Cambiar la contraseña del administrador después del primer acceso.

### 2.3 Proceso de Login

1. Abrir la URL de login en el navegador
2. Ingresar usuario y contraseña
3. Presionar el botón "Iniciar Sesión"
4. El sistema redirigirá automáticamente al panel correspondiente según el rol del usuario

---

## 3. Roles y Permisos

### 3.1 Tipos de Roles

El sistema cuenta con tres niveles de acceso:

#### **Administrador** (Nivel 3)
- Acceso completo al sistema
- Gestión de usuarios y roles
- Configuración de precios
- Autorización de descargas
- Visualización de toda la auditoría

#### **Operador** (Nivel 2)
- Generación de lotes de boletos
- Consulta de lotes y estadísticas
- Descarga de PDFs (con autorización previa)
- Sin acceso a gestión de usuarios

#### **Validador** (Nivel 1)
- Solo acceso al módulo de validación
- Escaneo y redención de boletos
- Consulta de historial de escaneos
- Sin acceso al panel administrativo

### 3.2 Matriz de Permisos

| Funcionalidad | Administrador | Operador | Validador |
|--------------|:-------------:|:--------:|:---------:|
| Generar boletos | ✅ | ✅ | ❌ |
| Ver lotes | ✅ | ✅ | ❌ |
| Autorizar descargas | ✅ | ❌ | ❌ |
| Gestionar precios | ✅ | ❌ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ |
| Ver estadísticas | ✅ | ✅ | ❌ |
| Validar boletos | ✅ | ✅ | ✅ |
| Ver auditoría | ✅ | ⚠️ (limitada) | ❌ |

---

## 4. Módulo de Administración

### 4.1 Vista General del Panel

El panel de administración está organizado en 5 pestañas principales:

1. **📝 Generar Boletos:** Creación de nuevos lotes
2. **📦 Ver Lotes:** Consulta y gestión de lotes existentes
3. **📊 Estadísticas:** Reportes y gráficas del sistema
4. **💰 Precios:** Configuración de tipos de platillos y precios
5. **👥 Usuarios:** Gestión de usuarios y permisos

---

### 4.2 PESTAÑA 1: Generar Boletos

#### 4.2.1 Formulario de Generación

**Campos obligatorios:**

**1. Nombre del Contratista (*)**
- Seleccionar de la lista de contratistas existentes
- O crear uno nuevo seleccionando "➕ Otro"
- Si es nuevo, aparecerá un campo adicional para escribir el nombre

**2. Comedor (opcional)**
- Asignar el lote a un comedor específico
- Útil para reportes segmentados
- Si no existe el comedor, seleccionar "➕ Nuevo comedor"

**3. Tipo de Platillo (*)**
- Seleccionar el tipo de comida del menú desplegable
- Este campo determina el precio unitario automáticamente
- Ejemplos: "Desayuno", "Comida Corrida", "Cena Ejecutiva"

**4. Cantidad de Boletos (*)**
- Número entre 1 y 10,000
- Cada boleto tendrá un código QR único

**5. Monto Total ($)**
- **Se calcula automáticamente** al seleccionar tipo de platillo y cantidad
- Campo de solo lectura
- Fórmula: `Precio Unitario × Cantidad`

**6. Fecha de Vencimiento (*)**
- Fecha hasta la cual los boletos serán válidos
- Botones rápidos disponibles: +1 mes, +3 meses, +6 meses, Fin 2025

**7. Tipo de Pago (*)**
- **💵 Contado:** Requiere comprobante de pago para autorizar descarga
- **💳 Crédito:** No requiere comprobante, solo autorización

#### 4.2.2 Proceso de Generación

```
1. Completar formulario
   ↓
2. Click en "🎫 Generar Lote de Boletos"
   ↓
3. Sistema valida datos y crea boletos
   ↓
4. Se muestra mensaje de éxito con:
   - ID del lote generado (Ej: LOTE_1234567890)
   - Cantidad de boletos creados
   - Contratista asignado
   - Fecha de vencimiento
   ↓
5. Aparece botón "📥 Descargar PDF de Boletos"
   ↓
6. IMPORTANTE: El PDF no se puede descargar directamente
   Se requiere AUTORIZACIÓN previa (ver sección 4.3.4)
```

#### 4.2.3 Resultado Exitoso

Al generar un lote exitosamente, verás:

```
✅ Lote Generado Exitosamente

Lote: LOTE_1760123456789
Cantidad: 50 boletos
Contratista: PEMEX División Sur
Vence: 31/12/2025

📥 Descargar PDF de Boletos
[Este botón aún no funcionará hasta que se autorice]
```

---

### 4.3 PESTAÑA 2: Ver Lotes

#### 4.3.1 Filtros y Búsqueda

**Barra de búsqueda:**
- Buscar lotes por número: `LOTE_1234567890`
- Búsqueda en tiempo real mientras escribes

**Filtros disponibles:**
- **Por contratista:** Ver solo lotes de un contratista específico
- **Ordenar por:**
  - Más recientes primero (predeterminado)
  - Más antiguos primero
  - Última actividad (últimos escaneos)
  - Más rechazos
  - Estado: Pendientes primero
  - Mayor cantidad de boletos

#### 4.3.2 Vista de Tarjetas de Lotes

Cada lote se muestra como una tarjeta con la siguiente información:

```
┌──────────────────────────────────────────┐
│ PEMEX División Sur                        │
│ Creado: 15/10/2025 10:30 AM             │
│ Vence: 31/12/2025                        │
│ 🍽️ Comida Corrida                       │
│ Monto: $5,000.00                         │
│ 💵 Contado                               │
│ 📊 Último escaneo: 15/10/2025 2:30 PM   │
│                                           │
│ 50 boletos | 30 usados | 20 disponibles │
│                                           │
│ Estado: 🟡 PENDIENTE DE PAGO             │
│ [Ver Detalle]                            │
└──────────────────────────────────────────┘
```

**Estados posibles:**
- 🟡 **PENDIENTE:** Sin autorización de descarga
- 🟢 **AUTORIZADO:** Descarga aprobada, PDF disponible
- 🔴 **RECHAZADO:** Autorización denegada

#### 4.3.3 Modal de Detalle de Lote

Al hacer click en "Ver Detalle", se abre una ventana modal con información completa:

**Sección 1: Información General**
- Lote ID
- Contratista
- Comedor (si aplica)
- Tipo de platillo
- Fecha de creación
- Fecha de vencimiento
- Monto total
- Tipo de pago

**Sección 2: Estadísticas de Uso**
- Total de boletos
- Boletos usados
- Boletos disponibles
- Boletos vencidos
- Boletos rechazados (con motivo)
- Tasa de uso (%)
- Botón "📸 Ver Fotos de Escaneos"

**Sección 3: Información de Pago** (si autorizado)
- Código de autorización
- Fecha de pago
- Autorizado por (usuario)
- Comprobante de pago (imagen)
- Notas adicionales

**Sección 4: Tabla de Boletos**

Incluye barra de búsqueda y filtro por estado:

| UUID | Estado | Fecha Uso | Ubicación | Acciones |
|------|--------|-----------|-----------|----------|
| abc123... | 🟢 USADO | 15/10 14:30 | Comedor Norte | Ver |
| def456... | ⚪ DISPONIBLE | - | - | - |
| ghi789... | 🔴 VENCIDO | - | - | - |

#### 4.3.4 Autorizar Descarga de PDF

**⚠️ IMPORTANTE:** Este proceso es CRÍTICO para el control de pagos.

**Cuándo autorizar:**
- Para **CONTADO:** Solo cuando se haya recibido y verificado el pago
- Para **CRÉDITO:** Cuando el contratista esté aprobado para crédito

**Pasos para autorizar:**

```
1. Abrir detalle del lote
   ↓
2. Si el estado es "PENDIENTE", aparecerá:
   Sección "Autorizar Descarga de Boletos"
   ↓
3. Completar formulario:
   - Código de Autorización: [Auto-generado]
   - Autorizado Por: [Tu usuario, auto-completado]
   - Fecha de Pago: [Seleccionar fecha] *
   - Comprobante de Pago: [Subir imagen] *
   - Notas: [Opcional]

   * Solo para tipo CONTADO
   ↓
4. Click en "✓ Autorizar Descarga"
   ↓
5. Sistema valida y aprueba
   ↓
6. El lote cambia a estado "AUTORIZADO"
   ↓
7. El botón "📥 Descargar PDF" ahora funciona
```

**Validaciones del sistema:**
- No se puede autorizar dos veces el mismo lote
- El comprobante de pago es obligatorio para CONTADO
- Solo usuarios con nivel Administrador pueden autorizar

#### 4.3.5 Descargar PDF de Boletos

**Requisito previo:** El lote debe estar AUTORIZADO

**Proceso:**

```
1. Click en botón "📥 Descargar PDF de Boletos"
   ↓
2. Se abre modal "Descargar PDF de Boletos"
   ↓
3. Completar información:
   - Usuario que descarga: [Nombre completo]
   - Razón de la descarga: [Seleccionar]
     • Primera impresión
     • Reimpresión por extravío
     • Reimpresión por daño
     • Corrección de datos
     • Archivo/Respaldo
     • Otro (especificar)
   ↓
4. Click en "📥 Descargar"
   ↓
5. Sistema registra la descarga en historial
   ↓
6. PDF se descarga automáticamente
```

**Control de descargas:**
- Cada lote tiene un límite de 3 descargas por defecto
- Todas las descargas quedan registradas con:
  - Usuario que descargó
  - Fecha y hora
  - Razón de la descarga
  - IP desde donde se descargó

**Formato del PDF:**
- Hoja tamaño carta con 4 boletos por página
- Cada boleto incluye:
  - Código QR único
  - UUID del boleto
  - Nombre del contratista
  - Fecha de vencimiento
  - Comedor (si aplica)
  - Logotipo de GESSA

---

### 4.4 PESTAÑA 3: Estadísticas

#### 4.4.1 Filtros Globales

Aplican a TODAS las estadísticas y gráficas:

- **Filtrar por contratista:** Ver métricas de un contratista específico
- **Filtrar por comedor:** Ver métricas de un comedor específico

#### 4.4.2 Métricas Principales (Cards Superiores)

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  TOTAL BOLETOS  │  │ TASA DE USO     │  │ INGRESOS TOTAL  │
│     2,450       │  │     68.5%       │  │  $245,000.00    │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ BOLETOS USADOS  │  │ DISPONIBLES     │  │ RECHAZOS        │
│     1,678       │  │      772        │  │       45        │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ CONTRATISTAS    │  │ COMEDORES       │  │ LOTES ACTIVOS   │
│       12        │  │       8         │  │       23        │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

#### 4.4.3 Gráficas de Análisis

**Gráfica 1: Boletos Generados en el Tiempo**
- Tipo: Línea
- Eje X: Tiempo (días/semanas/meses)
- Eje Y: Cantidad de boletos
- Utilidad: Ver tendencias de generación

**Gráfica 2: Ingresos en el Tiempo**
- Tipo: Línea
- Eje X: Tiempo
- Eje Y: Monto en pesos ($)
- Utilidad: Proyecciones financieras

**Gráfica 3: Tasa de Uso de Boletos**
- Tipo: Línea dual
- Línea azul: Boletos usados
- Línea roja: Boletos rechazados
- Utilidad: Detectar problemas de validación

**Gráfica 4: Top 5 Contratistas**
- Tipo: Barras horizontales
- Muestra los 5 contratistas con más boletos
- Utilidad: Identificar clientes principales

**Gráfica 5: Distribución por Comedor**
- Tipo: Dona (Doughnut)
- Muestra proporción de boletos por comedor
- Utilidad: Balancear carga entre comedores

**Gráfica 6: Estado de Pagos**
- Tipo: Barras
- Estados: Pendiente, Autorizado, Rechazado
- Utilidad: Control de cobros

**Gráfica 7: Distribución por Tipo de Platillo**
- Tipo: Barras horizontales
- Muestra cantidad de boletos por tipo de comida
- Utilidad: Planificación de menús

#### 4.4.4 Exportación de Datos

*Función en desarrollo para versión 2.0*

---

### 4.5 PESTAÑA 4: Precios

#### 4.5.1 ¿Qué son los Precios?

Los "Precios" en GESSA representan **tipos de platillos** con su valor asociado:

- Desayuno: $80.00
- Comida Corrida: $100.00
- Comida Ejecutiva: $150.00
- Cena: $90.00

#### 4.5.2 Precio Activo Actual

En la parte superior de la pestaña se muestra en un recuadro verde:

```
PRECIO ACTIVO ACTUAL
     $100.00
  Comida Corrida
```

Este es el precio más recientemente creado o editado.

#### 4.5.3 Agregar Nuevo Precio

**Formulario:**

1. **Nombre del Precio (*):**
   - Descripción del tipo de comida
   - Ej: "Desayuno Continental", "Comida Buffet"

2. **Precio Unitario ($) (*):**
   - Costo por boleto individual
   - Formato: 0.00 (acepta centavos)

3. **Descripción (opcional):**
   - Información adicional
   - Ej: "Incluye bebida y postre"

**Pasos:**

```
1. Completar campos del formulario
   ↓
2. Click en "💾 Guardar Precio"
   ↓
3. Sistema valida:
   - Nombre no duplicado
   - Precio mayor a 0
   ↓
4. Precio se agrega a la lista
   ↓
5. Aparece disponible en formulario de generación
```

#### 4.5.4 Editar Precio Existente

```
1. Localizar precio en la lista
   ↓
2. Click en botón "✏️ Editar"
   ↓
3. Datos se cargan en formulario
   ↓
4. Modificar campos necesarios
   ↓
5. Click en "💾 Guardar Precio"
   ↓
6. Cambios se aplican
```

⚠️ **IMPORTANTE:** Editar un precio NO afecta lotes ya generados.

#### 4.5.5 Desactivar Precio

```
1. Localizar precio en la lista
   ↓
2. Click en toggle de estado (verde/gris)
   ↓
3. Precio se desactiva (no aparece en formularios)
   ↓
4. Lotes existentes conservan el precio anterior
```

**Diferencia Activar/Desactivar vs Eliminar:**
- **Desactivar:** El precio ya no aparece en formularios nuevos, pero los lotes antiguos lo conservan
- **Eliminar:** NO está disponible para evitar pérdida de datos

#### 4.5.6 Lista de Precios

Cada precio se muestra con:

```
┌──────────────────────────────────────────┐
│ Comida Corrida                     🟢    │
│ $100.00                                  │
│ Incluye agua y tortilla                  │
│ Creado: 01/01/2025                       │
│                                          │
│ [✏️ Editar] [Toggle Activar/Desactivar] │
└──────────────────────────────────────────┘
```

---

### 4.6 PESTAÑA 5: Usuarios

#### 4.6.1 Lista de Usuarios

Muestra todos los usuarios del sistema con:

```
┌──────────────────────────────────────────┐
│ 👤 Juan Pérez                      🟢    │
│ @jperez                                  │
│ 🔑 Operador                              │
│ 📧 jperez@gessa.com                      │
│ Último acceso: 15/10/2025 10:30 AM      │
│                                          │
│ [✏️ Editar] [Ver Actividad] [Desactivar]│
└──────────────────────────────────────────┘
```

#### 4.6.2 Filtros de Usuarios

- **Por rol:** Administrador / Operador / Validador / Todos
- **Por estado:** Activos / Inactivos / Todos

#### 4.6.3 Crear Nuevo Usuario

**Pasos:**

```
1. Click en "➕ Nuevo Usuario"
   ↓
2. Completar formulario:
   - Nombre de usuario: [sin espacios, minúsculas]
   - Nombre completo: [nombre real]
   - Email: [correo válido]
   - Rol: [seleccionar nivel]
   - Contraseña: [mínimo 6 caracteres]
   ↓
3. Click en "💾 Guardar Usuario"
   ↓
4. Sistema valida:
   - Usuario no duplicado
   - Email no duplicado
   - Contraseña con requisitos mínimos
   ↓
5. Usuario creado y activo
   ↓
6. Se envía notificación al email (si configurado)
```

**Validaciones:**
- Username único en el sistema
- Email único en el sistema
- Contraseña mínimo 6 caracteres
- Solo Administradores pueden crear usuarios

#### 4.6.4 Editar Usuario Existente

**Proceso similar a crear, pero:**
- No se requiere contraseña (se conserva la anterior)
- Si se desea cambiar contraseña, ingresar nueva
- No se puede editar el username (es identificador único)

#### 4.6.5 Ver Actividad de Usuario

Muestra historial de auditoría del usuario:

```
┌──────────────────────────────────────────┐
│ Historial de Actividad - Juan Pérez     │
├──────────────────────────────────────────┤
│ 15/10/2025 14:30                         │
│ ✅ AUTORIZAR LOTE                        │
│ Autorizó descarga de LOTE_1234567890    │
│ IP: 192.168.1.100                        │
├──────────────────────────────────────────┤
│ 15/10/2025 10:15                         │
│ 📝 GENERAR LOTE                          │
│ Creó lote con 50 boletos                 │
│ IP: 192.168.1.100                        │
├──────────────────────────────────────────┤
│ 15/10/2025 08:00                         │
│ 🔐 LOGIN                                 │
│ Inició sesión                            │
│ IP: 192.168.1.100                        │
└──────────────────────────────────────────┘
```

#### 4.6.6 Desactivar/Activar Usuario

```
1. Click en botón "Desactivar" en tarjeta de usuario
   ↓
2. Confirmar acción
   ↓
3. Usuario NO puede iniciar sesión
   ↓
4. Sesiones activas se cierran automáticamente
   ↓
5. Para reactivar: Click en "Activar"
```

⚠️ **No se pueden eliminar usuarios** para preservar integridad de auditoría.

---

## 5. Módulo de Validación

### 5.1 Acceso al Validador

**Dispositivos recomendados:**
- 📱 Smartphone Android/iOS
- 💻 Tablet
- 🖥️ Computadora con cámara web

**URL:** `https://tu-dominio.com/validator`

**Credenciales:** Cualquier usuario con rol "Validador" o superior

### 5.2 Interfaz del Validador

La interfaz está optimizada para uso móvil:

```
┌─────────────────────────────────────────┐
│   🎫 GESSA - Validador de Boletos       │
│        Sistema de Validación            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│                                         │
│         [VISTA DE CÁMARA]               │
│                                         │
│      Enfoca el código QR aquí          │
│                                         │
└─────────────────────────────────────────┘

─────── O INGRESA MANUALMENTE ───────

┌─────────────────────────────────────────┐
│ UUID del Boleto:                        │
│ [_________________________________]     │
│                                         │
│ Ubicación (opcional):                   │
│ [_________________________________]     │
│                                         │
│        [✓ Validar Boleto]               │
└─────────────────────────────────────────┘
```

### 5.3 Escanear Boleto con Cámara

**Proceso automático:**

```
1. Permitir acceso a la cámara (primera vez)
   ↓
2. Apuntar cámara hacia código QR del boleto
   ↓
3. Sistema detecta y escanea automáticamente
   ↓
4. Vibración/sonido de confirmación
   ↓
5. Validación en tiempo real
   ↓
6. Resultado en pantalla (ver 5.5)
```

**Tips para escaneo exitoso:**
- ✅ Buena iluminación
- ✅ Código QR completo en el cuadro
- ✅ Distancia de 10-20 cm
- ✅ Mantener estable (evitar movimiento)
- ❌ Evitar reflejos de luz
- ❌ No acercar demasiado

### 5.4 Validar Boleto Manualmente

**Cuándo usar:**
- Código QR dañado o ilegible
- Problemas con la cámara
- Boleto impreso de baja calidad

**Proceso:**

```
1. Buscar UUID en el boleto físico
   - Está debajo del código QR
   - Formato: abc123-def456-ghi789
   ↓
2. Escribir/pegar UUID en campo "UUID del Boleto"
   ↓
3. (Opcional) Agregar ubicación: "Comedor Norte"
   ↓
4. Click en "✓ Validar Boleto"
   ↓
5. Sistema procesa validación
   ↓
6. Resultado en pantalla
```

### 5.5 Resultados de Validación

#### 5.5.1 ✅ Boleto VÁLIDO (Caso exitoso)

```
┌─────────────────────────────────────────┐
│         ✅ BOLETO VÁLIDO                │
│                                         │
│ UUID: abc123-def456-ghi789              │
│ Contratista: PEMEX División Sur         │
│ Vence: 31/12/2025                       │
│ Comedor: Comedor Norte                  │
│                                         │
│ Redimido exitosamente ✓                 │
│ Hora: 15/10/2025 14:30:15              │
│                                         │
│      [Escanear Siguiente]               │
└─────────────────────────────────────────┘
```

**Acciones del sistema:**
- Marca el boleto como "USADO" en base de datos
- Registra fecha, hora y ubicación
- Toma foto de la pantalla (si está activado)
- Sonido/vibración de éxito

#### 5.5.2 ❌ Boleto NO VÁLIDO (Casos de rechazo)

**Caso 1: Boleto ya usado**

```
┌─────────────────────────────────────────┐
│         ❌ BOLETO NO VÁLIDO             │
│                                         │
│ Motivo: YA FUE USADO ANTERIORMENTE      │
│                                         │
│ UUID: abc123-def456-ghi789              │
│ Usado el: 14/10/2025 12:30             │
│ Ubicación: Comedor Sur                  │
│                                         │
│      [Escanear Siguiente]               │
└─────────────────────────────────────────┘
```

**Caso 2: Boleto vencido**

```
┌─────────────────────────────────────────┐
│         ❌ BOLETO NO VÁLIDO             │
│                                         │
│ Motivo: BOLETO VENCIDO                  │
│                                         │
│ UUID: abc123-def456-ghi789              │
│ Venció el: 30/09/2025                   │
│ Días vencido: 15                        │
│                                         │
│      [Escanear Siguiente]               │
└─────────────────────────────────────────┘
```

**Caso 3: Boleto no existe**

```
┌─────────────────────────────────────────┐
│         ❌ BOLETO NO VÁLIDO             │
│                                         │
│ Motivo: BOLETO NO ENCONTRADO            │
│                                         │
│ Este código no existe en el sistema     │
│ Posible falsificación                   │
│                                         │
│      [Escanear Siguiente]               │
└─────────────────────────────────────────┘
```

**Acciones del sistema en rechazos:**
- Registra intento de validación en historial_escaneos
- Guarda motivo del rechazo
- Toma foto de evidencia (si configurado)
- Sonido/vibración de error
- NO modifica el estado del boleto

### 5.6 Historial de Escaneos

**Vista en el validador:**

```
┌─────────────────────────────────────────┐
│        📋 Historial Reciente            │
├─────────────────────────────────────────┤
│ 14:30 ✅ PEMEX División Sur             │
│       Boleto válido - Comedor Norte     │
├─────────────────────────────────────────┤
│ 14:25 ❌ PEMEX División Sur             │
│       Ya usado - Comedor Norte          │
├─────────────────────────────────────────┤
│ 14:20 ✅ Constructora ABC               │
│       Boleto válido - Comedor Sur       │
└─────────────────────────────────────────┘
```

### 5.7 Captura de Fotos en Validación

**Función: Evidencia fotográfica**

**Configuración:**
- Se activa/desactiva en configuración del servidor
- Variable de entorno: `ENABLE_PHOTO_CAPTURE=true`

**Proceso:**
1. Al validar un boleto, el sistema solicita permiso de cámara
2. Toma una foto del trabajador que presenta el boleto
3. Foto se guarda en servidor: `/uploads/escaneos/`
4. Foto se asocia al registro de escaneo
5. Disponible en panel admin para auditoría

**Acceso a fotos:**
- Panel Admin > Ver Lotes > Detalle de Lote > "📸 Ver Fotos de Escaneos"
- Galería con todas las fotos del lote
- Click en foto para ampliar
- Muestra metadata: fecha, hora, ubicación, resultado

---

## 6. Flujos de Trabajo Completos

### 6.1 Flujo Completo: Lote de Boletos (CONTADO)

**Actores:** Administrador, Contratista, Validador

```
FASE 1: SOLICITUD
┌─────────────────────────────────────────┐
│ 1. Contratista solicita 100 boletos    │
│    al Administrador                     │
│    Método: Llamada/Email/Presencial    │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 2. Administrador verifica:              │
│    - Contratista registrado             │
│    - Tipo de platillo requerido         │
│    - Fecha de vencimiento               │
│    - Forma de pago: CONTADO             │
└─────────────────────────────────────────┘

FASE 2: GENERACIÓN
              ↓
┌─────────────────────────────────────────┐
│ 3. Admin accede a panel                 │
│    Pestaña: "📝 Generar Boletos"        │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 4. Completa formulario:                 │
│    - Contratista: [Seleccionar/Crear]  │
│    - Comedor: [Opcional]                │
│    - Tipo platillo: "Comida Corrida"   │
│    - Cantidad: 100                      │
│    - Monto: $10,000.00 (auto)           │
│    - Vencimiento: 31/12/2025            │
│    - Tipo pago: CONTADO                 │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 5. Click "🎫 Generar Lote"              │
│    Sistema crea 100 boletos únicos      │
│    Estado: PENDIENTE                    │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 6. Se genera lote: LOTE_1234567890      │
│    PDF NO disponible aún                │
└─────────────────────────────────────────┘

FASE 3: PAGO
              ↓
┌─────────────────────────────────────────┐
│ 7. Admin informa al contratista:        │
│    "Lote generado: LOTE_1234567890      │
│     Monto a pagar: $10,000.00           │
│     Cuenta bancaria: XXXX-XXXX"         │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 8. Contratista realiza pago             │
│    y envía comprobante al Admin         │
└─────────────────────────────────────────┘

FASE 4: AUTORIZACIÓN
              ↓
┌─────────────────────────────────────────┐
│ 9. Admin verifica pago recibido         │
│    Confirma monto y fecha               │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 10. Admin accede a:                     │
│     "📦 Ver Lotes" > Buscar lote        │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 11. Click "Ver Detalle" en el lote      │
│     Aparece sección "Autorizar"         │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 12. Completa formulario autorización:   │
│     - Código: [Auto-generado]           │
│     - Autorizado por: [Auto]            │
│     - Fecha pago: 14/10/2025            │
│     - Comprobante: [Subir imagen]       │
│     - Notas: "Pago verificado OK"       │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 13. Click "✓ Autorizar Descarga"        │
│     Estado cambia a: AUTORIZADO         │
│     PDF ahora disponible                │
└─────────────────────────────────────────┘

FASE 5: ENTREGA
              ↓
┌─────────────────────────────────────────┐
│ 14. Admin descarga PDF:                 │
│     - Usuario: "Juan Admin"             │
│     - Razón: "Primera impresión"        │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 15. Sistema genera PDF con 100 boletos  │
│     (25 páginas, 4 boletos por página)  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 16. Admin imprime PDF                   │
│     y entrega boletos al contratista    │
└─────────────────────────────────────────┘

FASE 6: USO
              ↓
┌─────────────────────────────────────────┐
│ 17. Contratista distribuye boletos      │
│     a sus trabajadores                  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 18. Trabajador presenta boleto en       │
│     comedor                             │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 19. Validador escanea código QR         │
│     Sistema valida en tiempo real       │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 20. Si válido: ✅ Se marca como USADO   │
│     Trabajador recibe su comida         │
└─────────────────────────────────────────┘

FASE 7: SEGUIMIENTO
              ↓
┌─────────────────────────────────────────┐
│ 21. Admin consulta estadísticas:        │
│     - 100 boletos generados             │
│     - 85 usados (85%)                   │
│     - 15 disponibles                    │
│     - 2 rechazos (duplicados)           │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 22. Al vencer: 31/12/2025               │
│     Boletos no usados pasan a VENCIDOS  │
│     No se pueden usar después           │
└─────────────────────────────────────────┘

✅ FLUJO COMPLETADO
```

**Tiempo estimado total:** 1-3 días (dependiendo de pago)

---

### 6.2 Flujo Completo: Lote de Boletos (CRÉDITO)

**Diferencias respecto a CONTADO:**

```
FASE 3: PAGO (Simplificada)
              ↓
┌─────────────────────────────────────────┐
│ 7. NO se requiere pago inmediato        │
│    Contratista tiene crédito aprobado   │
└─────────────────────────────────────────┘

FASE 4: AUTORIZACIÓN (Simplificada)
              ↓
┌─────────────────────────────────────────┐
│ 9. Admin autoriza sin comprobante       │
│    Solo requiere fecha de crédito       │
│    NO se sube imagen de comprobante     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 10. Estado: AUTORIZADO                  │
│     PDF disponible inmediatamente       │
└─────────────────────────────────────────┘

FASE ADICIONAL: COBRO POSTERIOR
              ↓
┌─────────────────────────────────────────┐
│ Fin de mes: Admin genera reporte        │
│ de todos los lotes CRÉDITO              │
│ Factura al contratista                  │
└─────────────────────────────────────────┘
```

**Tiempo estimado total:** Horas (mismo día)

---

### 6.3 Flujo de Reimpresión de Boletos

**Escenario:** Boletos extraviados o dañados

```
1. Contratista reporta extravío
   ↓
2. Admin verifica:
   - Lote existe
   - Estado: AUTORIZADO
   - Descargas disponibles: 1 de 3 usadas
   ↓
3. Admin accede a detalle del lote
   ↓
4. Click en "📥 Descargar PDF de Boletos"
   ↓
5. Completa modal:
   - Usuario: "Juan Admin"
   - Razón: "Reimpresión por extravío"
   ↓
6. Sistema valida:
   - ¿Quedan descargas disponibles? ✅ Sí (2 de 3)
   - ¿Lote autorizado? ✅ Sí
   ↓
7. Descarga exitosa
   Contador: 2 de 3 descargas usadas
   ↓
8. Admin imprime y entrega
   ↓
9. Se registra en historial_descargas:
   - Usuario: Juan Admin
   - Razón: Reimpresión por extravío
   - Fecha: 15/10/2025 16:45
   - IP: 192.168.1.100
```

**Si se agotan las 3 descargas:**

```
Sistema bloquea descarga
   ↓
Admin con nivel Administrador puede:
- Aumentar límite de descargas
- O crear nuevo lote (caso extremo)
```

---

### 6.4 Flujo de Gestión de Usuarios

#### 6.4.1 Crear Operador Nuevo

```
1. Admin recibe solicitud de acceso
   ↓
2. Verifica identidad del solicitante
   ↓
3. Accede a "👥 Usuarios"
   ↓
4. Click "➕ Nuevo Usuario"
   ↓
5. Completa formulario:
   - Username: mgarcia
   - Nombre: María García
   - Email: mgarcia@empresa.com
   - Rol: Operador
   - Contraseña: Temporal123
   ↓
6. Click "💾 Guardar Usuario"
   ↓
7. Usuario creado y activo
   ↓
8. Admin comunica credenciales:
   Usuario: mgarcia
   Contraseña: Temporal123
   URL: https://gessa.com/login.html
   ↓
9. María accede por primera vez
   ↓
10. (Recomendado) Cambiar contraseña
```

#### 6.4.2 Desactivar Usuario que Sale de la Empresa

```
1. RH notifica baja de empleado
   ↓
2. Admin accede a "👥 Usuarios"
   ↓
3. Busca usuario en lista
   ↓
4. Click en "Desactivar"
   ↓
5. Confirma acción
   ↓
6. Usuario desactivado:
   - No puede iniciar sesión
   - Sesiones activas se cierran
   - Historial de auditoría se conserva
   ↓
7. Tarjeta del usuario aparece en gris
   con indicador "❌ Inactivo"
```

---

### 6.5 Flujo de Configuración de Precios

#### 6.5.1 Agregar Nuevo Tipo de Platillo

```
Escenario: Se agrega "Cena Ligera" al menú

1. Admin accede a "💰 Precios"
   ↓
2. Revisa precios actuales:
   - Desayuno: $80
   - Comida Corrida: $100
   - Comida Ejecutiva: $150
   ↓
3. Completa formulario nuevo precio:
   - Nombre: "Cena Ligera"
   - Precio: $75.00
   - Descripción: "Incluye sopa y plato fuerte"
   ↓
4. Click "💾 Guardar Precio"
   ↓
5. Precio agregado a la lista
   Estado: 🟢 Activo
   ↓
6. Ahora aparece en:
   - Pestaña "📝 Generar Boletos"
   - Select "Tipo de Platillo"
   ↓
7. Desde ahora, todos los lotes nuevos
   pueden usar "Cena Ligera - $75.00"
```

#### 6.5.2 Actualizar Precio Existente

```
Escenario: Inflación, se ajusta precio de Comida

1. Admin decide aumentar precio
   de "Comida Corrida" de $100 a $110
   ↓
2. Accede a "💰 Precios"
   ↓
3. Localiza "Comida Corrida"
   ↓
4. Click "✏️ Editar"
   ↓
5. Datos se cargan en formulario
   ↓
6. Cambia:
   Precio Unitario: $110.00
   Descripción: "Precio actualizado Oct 2025"
   ↓
7. Click "💾 Guardar Precio"
   ↓
8. Precio actualizado
   ↓
9. IMPORTANTE:
   - Lotes generados ANTES conservan $100
   - Lotes generados DESPUÉS usarán $110
   - Sistema NO actualiza lotes antiguos
```

---

## 7. Glosario de Términos

### Términos Principales

**Boleto:** Documento digital único con código QR que representa un vale de comida. Cada boleto tiene un UUID único irrepetible.

**Lote:** Conjunto de boletos generados en una sola operación, todos con las mismas características (contratista, fecha de vencimiento, tipo de platillo).

**Contratista:** Empresa o persona que adquiere boletos para distribuir a sus trabajadores.

**Comedor:** Instalación física donde se redimen los boletos (se sirve la comida).

**UUID:** Identificador Único Universal. Código alfanumérico único de cada boleto (ej: abc123-def456-ghi789).

**QR:** Código de barras bidimensional que contiene el UUID del boleto, escaneable con cámara.

**Validador:** Usuario que opera el escáner de boletos en el comedor.

**Redimir:** Acción de usar un boleto para obtener comida. Un boleto solo se puede redimir una vez.

**Tipo de Platillo:** Categoría de comida con precio asignado (Desayuno, Comida, Cena, etc.).

### Estados de Lote

**PENDIENTE:** Lote generado pero sin autorización de descarga. No se puede descargar el PDF.

**AUTORIZADO:** Lote aprobado para descarga. PDF disponible.

**RECHAZADO:** Autorización negada (no se usa actualmente).

### Estados de Boleto

**DISPONIBLE:** Boleto generado, autorizado y listo para usar. No ha sido redimido.

**USADO:** Boleto ya redimido en un comedor. No se puede volver a usar.

**VENCIDO:** Boleto que pasó su fecha de vencimiento sin ser usado. No se puede usar.

**RECHAZADO:** Boleto que intentó ser validado pero fue rechazado (ya usado, vencido, etc.). El boleto NO cambia de estado, solo se registra el intento.

### Tipos de Pago

**CONTADO:** Requiere pago previo y comprobante antes de autorizar descarga.

**CRÉDITO:** No requiere pago previo ni comprobante. Se factura posteriormente.

### Acciones de Sistema

**Generar:** Crear un nuevo lote de boletos en el sistema.

**Autorizar:** Aprobar un lote para que el PDF pueda ser descargado.

**Descargar:** Obtener el archivo PDF con los boletos del lote.

**Validar:** Verificar si un boleto es válido y marcarlo como usado.

**Escanear:** Leer el código QR de un boleto con la cámara.

**Auditoría:** Registro automático de todas las acciones en el sistema.

---

## 8. Preguntas Frecuentes

### 8.1 Generación de Boletos

**P: ¿Cuántos boletos puedo generar en un lote?**
R: Entre 1 y 10,000 boletos por lote. Para cantidades mayores, generar múltiples lotes.

**P: ¿Puedo editar un lote después de generarlo?**
R: No. Los lotes no se pueden editar. Si hay un error, debes desactivar el lote y generar uno nuevo.

**P: ¿Puedo cambiar la fecha de vencimiento de un lote?**
R: No directamente. Contacta al administrador del sistema para ajustes en base de datos.

**P: ¿Los boletos vencidos se pueden extender?**
R: No. Una vez vencidos, se deben generar nuevos boletos.

**P: ¿Qué pasa si genero un lote para el contratista equivocado?**
R: No se puede cambiar. Debes generar un nuevo lote con el contratista correcto. El lote incorrecto quedará sin usar.

### 8.2 Autorización y Descargas

**P: ¿Por qué no puedo descargar el PDF inmediatamente?**
R: El sistema requiere autorización previa para control de pagos. Es un flujo de aprobación diseñado.

**P: ¿Cuántas veces puedo descargar el mismo PDF?**
R: 3 veces por defecto. Cada descarga queda registrada en el historial.

**P: ¿Qué hago si agoto las 3 descargas?**
R: Contacta al administrador para aumentar el límite o solicitar nueva descarga.

**P: ¿Puedo autorizar un lote sin comprobante de pago?**
R: Solo si el tipo de pago es CRÉDITO. Para CONTADO es obligatorio.

**P: ¿Cómo anulo una autorización?**
R: No se puede anular directamente. Contacta soporte técnico para revertir en base de datos.

### 8.3 Validación

**P: ¿Qué hago si un boleto válido es rechazado?**
R: Verifica:
1. ¿El boleto ya fue usado? (revisar en detalle de lote)
2. ¿Ya venció? (revisar fecha de vencimiento)
3. ¿El código QR está dañado? (intentar validación manual con UUID)

**P: ¿Un boleto rechazado se puede volver a usar?**
R: Depende del motivo:
- **Ya usado:** NO
- **Vencido:** NO
- **No encontrado:** Verificar si es falsificación
- **Error de lectura:** SÍ, intentar de nuevo

**P: ¿Cómo valido un boleto si la cámara no funciona?**
R: Usar validación manual ingresando el UUID del boleto en el campo de texto.

**P: ¿Puedo validar boletos sin conexión a internet?**
R: No. El sistema requiere conexión en tiempo real para validar contra la base de datos.

**P: ¿Qué hago con boletos impresos de mala calidad?**
R: Solicitar reimpresión al administrador. Mientras tanto, usar validación manual con el UUID.

### 8.4 Usuarios y Permisos

**P: ¿Puedo cambiar mi propia contraseña?**
R: Actualmente no hay función de cambio de contraseña en el sistema. Contacta al administrador.

**P: ¿Qué pasa si olvido mi contraseña?**
R: Contacta al administrador para que te asigne una nueva.

**P: ¿Puedo tener más de un usuario con el mismo email?**
R: No. El email debe ser único por usuario.

**P: ¿Un operador puede autorizar descargas?**
R: No. Solo usuarios con rol Administrador pueden autorizar.

**P: ¿Puedo eliminar un usuario?**
R: No se pueden eliminar para preservar auditoría. Solo se pueden desactivar.

### 8.5 Precios

**P: ¿Cambiar un precio afecta lotes ya generados?**
R: No. Los lotes existentes conservan el precio con el que fueron creados.

**P: ¿Puedo tener dos precios con el mismo nombre?**
R: No. El nombre del precio debe ser único.

**P: ¿Puedo eliminar un precio?**
R: No se pueden eliminar. Solo desactivar para que no aparezca en formularios nuevos.

**P: ¿El precio puede ser $0.00?**
R: No. El sistema requiere un precio mayor a cero.

### 8.6 Reportes y Estadísticas

**P: ¿Cómo exporto los datos a Excel?**
R: Función en desarrollo para versión 2.0. Actualmente solo visualización en pantalla.

**P: ¿Las estadísticas son en tiempo real?**
R: Sí. Se actualizan cada vez que accedes a la pestaña de Estadísticas.

**P: ¿Puedo ver estadísticas de un período específico?**
R: Función de filtro por fechas en desarrollo para versión 2.0.

**P: ¿Cómo sé cuántos boletos se desperdiciaron (no usados)?**
R: En Estadísticas, ver métrica "Disponibles" + "Vencidos" = boletos no aprovechados.

### 8.7 Problemas Técnicos

**P: El sistema está lento, ¿qué hago?**
R:
1. Refrescar la página (F5)
2. Borrar caché del navegador
3. Verificar conexión a internet
4. Si persiste, contactar soporte

**P: No puedo iniciar sesión, ¿por qué?**
R: Verificar:
1. ¿Usuario y contraseña correctos?
2. ¿Tu usuario está activo? (consultar con admin)
3. ¿Bloqueo por intentos fallidos? (esperar 5 minutos)

**P: El código QR no se escanea, ¿qué hago?**
R:
1. Mejorar iluminación
2. Limpiar lente de cámara
3. Acercar/alejar el boleto
4. Usar validación manual como alternativa

**P: "Error de red" al validar, ¿qué significa?**
R:
1. Verificar conexión a internet
2. Reintentar validación
3. Si persiste, anotar UUID y validar después
4. Contactar soporte si es frecuente

---

## 9. Soporte y Contacto

### 9.1 Niveles de Soporte

**Nivel 1: Autoservicio**
- Consultar este manual operativo
- Revisar sección de Preguntas Frecuentes
- Intentar resolución básica (refrescar, reintentar)

**Nivel 2: Soporte Interno**
- Contactar al administrador del sistema
- Revisar logs de auditoría
- Verificar permisos de usuario

**Nivel 3: Soporte Técnico**
- Problemas técnicos graves
- Errores del sistema
- Solicitudes de cambios/mejoras

### 9.2 Información para Reportar Problemas

Al reportar un problema, incluir:

```
✅ Descripción del problema
✅ Usuario que experimenta el problema
✅ Fecha y hora exacta
✅ Pasos para reproducir el error
✅ Mensaje de error (si aparece)
✅ Navegador usado (Chrome, Firefox, Safari)
✅ Dispositivo (PC, tablet, smartphone)
✅ Screenshots (capturas de pantalla)
```

### 9.3 Horarios de Soporte

- **Soporte Interno:** Horario de oficina (8:00 - 18:00 hrs)
- **Soporte Técnico:** L-V 9:00 - 17:00 hrs
- **Emergencias:** Contactar al administrador del sistema

### 9.4 Canales de Contacto

*[Personalizar según tu organización]*

- **Email Soporte:** soporte@tuempresa.com
- **Teléfono:** +52 XXX XXX XXXX
- **Chat Interno:** [Sistema de mensajería corporativa]

---

## Apéndices

### A. Atajos de Teclado

*Función en desarrollo*

### B. Especificaciones Técnicas

**Navegadores compatibles:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Dispositivos móviles:**
- iOS 13+
- Android 8+

**Resoluciones recomendadas:**
- Desktop: 1366x768 o superior
- Tablet: 1024x768 o superior
- Smartphone: 375x667 o superior

### C. Changelog de Versiones

**v1.0 (Octubre 2025)**
- ✅ Generación de lotes de boletos
- ✅ Workflow de autorización
- ✅ Validador con escáner QR
- ✅ Gestión de usuarios y roles
- ✅ Configuración de precios por platillo
- ✅ Dashboard de estadísticas con 7 gráficas
- ✅ Sistema de auditoría completa
- ✅ Soporte para pago CONTADO y CRÉDITO
- ✅ Historial de escaneos con fotos

**v2.0 (Planeado para 2026)**
- 📋 Exportación de datos a Excel/CSV
- 📋 Filtros por rango de fechas
- 📋 Sistema de notificaciones email/SMS
- 📋 Validación offline con sincronización
- 📋 Cambio de contraseña por usuario
- 📋 Sistema de reportes personalizados
- 📋 Confirmación de recepción con firma digital

---

## Notas Finales

Este manual está diseñado para ser actualizado continuamente. Si encuentras información desactualizada o tienes sugerencias de mejora, contacta al equipo de desarrollo.

**Última actualización:** Octubre 2025
**Versión del manual:** 1.0
**Versión del sistema:** 1.0

---

**© 2025 GESSA - Sistema de Gestión de Boletos para Comedores**
*Todos los derechos reservados*
