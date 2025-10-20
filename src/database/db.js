const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../data/boletos.db');

// Crear conexión a base de datos
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err);
  } else {
    console.log('Conectado a la base de datos SQLite');
  }
});

// Crear tablas
db.serialize(() => {
  // Tabla de boletos
  db.run(`
    CREATE TABLE IF NOT EXISTS boletos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      contratista TEXT NOT NULL,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_vencimiento DATE NOT NULL,
      redimido INTEGER DEFAULT 0,
      fecha_uso DATETIME,
      ubicacion TEXT,
      lote TEXT NOT NULL,
      comedor_id INTEGER,
      FOREIGN KEY (comedor_id) REFERENCES comedores(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error al crear tabla boletos:', err);
    } else {
      console.log('Tabla boletos lista');

      // Migración: Agregar columna comedor_id si no existe
      db.run(`ALTER TABLE boletos ADD COLUMN comedor_id INTEGER`, (alterErr) => {
        if (alterErr && !alterErr.message.includes('duplicate column')) {
          console.error('Error en migración boletos:', alterErr);
        } else if (!alterErr) {
          console.log('Columna comedor_id agregada a boletos');
        }
      });
    }
  });

  // Tabla de lotes con información de pago
  db.run(`
    CREATE TABLE IF NOT EXISTS lotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lote_id TEXT UNIQUE NOT NULL,
      contratista TEXT NOT NULL,
      cantidad INTEGER NOT NULL,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_vencimiento DATE NOT NULL,
      pdf_path TEXT,
      pdf_url TEXT,
      estado_pago TEXT DEFAULT 'PENDIENTE',
      codigo_autorizacion TEXT,
      comprobante_pago TEXT,
      fecha_pago DATETIME,
      autorizado_por TEXT,
      monto REAL,
      notas TEXT,
      intentos_descarga INTEGER DEFAULT 0,
      max_descargas INTEGER DEFAULT 3,
      comedor_id INTEGER,
      tipo_pago TEXT DEFAULT 'CONTADO',
      FOREIGN KEY (comedor_id) REFERENCES comedores(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error al crear tabla lotes:', err);
    } else {
      console.log('Tabla lotes lista');

      // Migración: Agregar columna comedor_id si no existe
      db.run(`ALTER TABLE lotes ADD COLUMN comedor_id INTEGER`, (alterErr) => {
        if (alterErr && !alterErr.message.includes('duplicate column')) {
          console.error('Error en migración lotes:', alterErr);
        } else if (!alterErr) {
          console.log('Columna comedor_id agregada a lotes');
        }
      });

      // Migración: Agregar columna tipo_pago si no existe
      db.run(`ALTER TABLE lotes ADD COLUMN tipo_pago TEXT DEFAULT 'CONTADO'`, (alterErr) => {
        if (alterErr && !alterErr.message.includes('duplicate column')) {
          console.error('Error en migración tipo_pago:', alterErr);
        } else if (!alterErr) {
          console.log('Columna tipo_pago agregada a lotes');
        }
      });

      // Migración: Agregar columna precio_id si no existe
      db.run(`ALTER TABLE lotes ADD COLUMN precio_id INTEGER`, (alterErr) => {
        if (alterErr && !alterErr.message.includes('duplicate column')) {
          console.error('Error en migración precio_id:', alterErr);
        } else if (!alterErr) {
          console.log('Columna precio_id agregada a lotes');
        }
      });

      // Migración: Agregar columna precio_nombre si no existe
      db.run(`ALTER TABLE lotes ADD COLUMN precio_nombre TEXT`, (alterErr) => {
        if (alterErr && !alterErr.message.includes('duplicate column')) {
          console.error('Error en migración precio_nombre:', alterErr);
        } else if (!alterErr) {
          console.log('Columna precio_nombre agregada a lotes');
        }
      });

      // Migración: Agregar columna precio_unitario si no existe
      db.run(`ALTER TABLE lotes ADD COLUMN precio_unitario REAL`, (alterErr) => {
        if (alterErr && !alterErr.message.includes('duplicate column')) {
          console.error('Error en migración precio_unitario:', alterErr);
        } else if (!alterErr) {
          console.log('Columna precio_unitario agregada a lotes');
        }
      });
    }
  });

  // Tabla de historial de descargas/reimpresiones
  db.run(`
    CREATE TABLE IF NOT EXISTS historial_descargas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lote_id TEXT NOT NULL,
      usuario TEXT,
      razon TEXT NOT NULL,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      FOREIGN KEY (lote_id) REFERENCES lotes(lote_id)
    )
  `, (err) => {
    if (err) {
      console.error('Error al crear tabla historial_descargas:', err);
    } else {
      console.log('Tabla historial_descargas lista');
    }
  });

  // Tabla de contratistas con códigos únicos
  db.run(`
    CREATE TABLE IF NOT EXISTS contratistas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      codigo TEXT UNIQUE NOT NULL,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      activo INTEGER DEFAULT 1
    )
  `, (err) => {
    if (err) {
      console.error('Error al crear tabla contratistas:', err);
    } else {
      console.log('Tabla contratistas lista');
    }
  });

  // Tabla de comedores por contratista
  db.run(`
    CREATE TABLE IF NOT EXISTS comedores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      contratista_id INTEGER NOT NULL,
      ubicacion TEXT,
      codigo TEXT,
      activo INTEGER DEFAULT 1,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contratista_id) REFERENCES contratistas(id),
      UNIQUE(nombre, contratista_id)
    )
  `, (err) => {
    if (err) {
      console.error('Error al crear tabla comedores:', err);
    } else {
      console.log('Tabla comedores lista');
    }
  });

  // Tabla de precios estándar
  db.run(`
    CREATE TABLE IF NOT EXISTS precios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT UNIQUE NOT NULL,
      precio_unitario REAL NOT NULL,
      activo INTEGER DEFAULT 1,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      descripcion TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Error al crear tabla precios:', err);
    } else {
      console.log('Tabla precios lista');
      // Insertar precio por defecto si no existe
      db.run(`INSERT OR IGNORE INTO precios (nombre, precio_unitario, descripcion)
              VALUES ('Precio Estándar', 100.00, 'Precio predeterminado por boleto')`, (err) => {
        if (err) {
          console.error('Error al insertar precio por defecto:', err);
        } else {
          console.log('Precio por defecto creado');
        }
      });
    }
  });

  // Tabla de historial de escaneos (exitosos y rechazados)
  db.run(`
    CREATE TABLE IF NOT EXISTS historial_escaneos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      boleto_uuid TEXT NOT NULL,
      lote_id TEXT NOT NULL,
      tipo TEXT NOT NULL,
      motivo_rechazo TEXT,
      ubicacion TEXT,
      foto_escaneo TEXT,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (boleto_uuid) REFERENCES boletos(uuid),
      FOREIGN KEY (lote_id) REFERENCES lotes(lote_id)
    )
  `, (err) => {
    if (err) {
      console.error('Error al crear tabla historial_escaneos:', err);
    } else {
      console.log('Tabla historial_escaneos lista');

      // Migración: Agregar columna foto_escaneo si no existe
      db.run(`
        ALTER TABLE historial_escaneos ADD COLUMN foto_escaneo TEXT
      `, (alterErr) => {
        if (alterErr && !alterErr.message.includes('duplicate column')) {
          console.error('Error en migración historial_escaneos:', alterErr);
        } else if (!alterErr) {
          console.log('Columna foto_escaneo agregada a historial_escaneos');
        }
      });
    }
  });

  // ==================== SISTEMA DE AUTENTICACIÓN Y AUTORIZACIÓN ====================

  // Tabla de roles
  db.run(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre VARCHAR(50) UNIQUE NOT NULL,
      descripcion TEXT,
      nivel_acceso INTEGER NOT NULL,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error al crear tabla roles:', err);
    } else {
      console.log('Tabla roles lista');
    }
  });

  // Tabla de usuarios
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      nombre_completo VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      rol_id INTEGER NOT NULL,
      activo INTEGER DEFAULT 1,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      ultimo_acceso DATETIME,
      creado_por INTEGER,
      FOREIGN KEY (rol_id) REFERENCES roles(id),
      FOREIGN KEY (creado_por) REFERENCES usuarios(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error al crear tabla usuarios:', err);
    } else {
      console.log('Tabla usuarios lista');
    }
  });

  // Tabla de permisos
  db.run(`
    CREATE TABLE IF NOT EXISTS permisos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo VARCHAR(50) UNIQUE NOT NULL,
      nombre VARCHAR(100) NOT NULL,
      descripcion TEXT,
      modulo VARCHAR(50) NOT NULL,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error al crear tabla permisos:', err);
    } else {
      console.log('Tabla permisos lista');
    }
  });

  // Tabla de relación roles-permisos
  db.run(`
    CREATE TABLE IF NOT EXISTS roles_permisos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rol_id INTEGER NOT NULL,
      permiso_id INTEGER NOT NULL,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rol_id) REFERENCES roles(id),
      FOREIGN KEY (permiso_id) REFERENCES permisos(id),
      UNIQUE(rol_id, permiso_id)
    )
  `, (err) => {
    if (err) {
      console.error('Error al crear tabla roles_permisos:', err);
    } else {
      console.log('Tabla roles_permisos lista');
    }
  });

  // Tabla de autorizaciones de lotes (workflow de aprobación)
  db.run(`
    CREATE TABLE IF NOT EXISTS autorizaciones_lotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lote_id VARCHAR(50) NOT NULL,
      solicitado_por INTEGER NOT NULL,
      fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
      autorizado_por INTEGER,
      fecha_autorizacion DATETIME,
      estado VARCHAR(20) DEFAULT 'pendiente',
      comentarios TEXT,
      FOREIGN KEY (lote_id) REFERENCES lotes(lote_id),
      FOREIGN KEY (solicitado_por) REFERENCES usuarios(id),
      FOREIGN KEY (autorizado_por) REFERENCES usuarios(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error al crear tabla autorizaciones_lotes:', err);
    } else {
      console.log('Tabla autorizaciones_lotes lista');
    }
  });

  // Tabla de auditoría (log de todas las acciones)
  // Intentar agregar columnas faltantes a la tabla auditoria si ya existe
  db.run(`ALTER TABLE auditoria ADD COLUMN tabla_afectada VARCHAR(50)`, (err) => {
    // Ignorar error si la columna ya existe
  });

  db.run(`ALTER TABLE auditoria ADD COLUMN registro_id VARCHAR(100)`, (err) => {
    // Ignorar error si la columna ya existe
  });

  db.run(`ALTER TABLE auditoria ADD COLUMN detalles TEXT`, (err) => {
    // Ignorar error si la columna ya existe
  });

  db.run(`ALTER TABLE auditoria ADD COLUMN fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP`, (err) => {
    // Ignorar error si la columna ya existe
  });

  db.run(`ALTER TABLE auditoria ADD COLUMN tabla VARCHAR(50)`, (err) => {
    // Ignorar error si la columna ya existe
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      accion VARCHAR(50) NOT NULL,
      modulo VARCHAR(50),
      entidad_id VARCHAR(100),
      datos_anteriores TEXT,
      datos_nuevos TEXT,
      tabla_afectada VARCHAR(50),
      tabla VARCHAR(50),
      registro_id VARCHAR(100),
      detalles TEXT,
      ip_address VARCHAR(45),
      user_agent TEXT,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error al crear tabla auditoria:', err);
    } else {
      console.log('Tabla auditoria lista');
    }
  });

  // Tabla de sesiones
  db.run(`
    CREATE TABLE IF NOT EXISTS sesiones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      token VARCHAR(255) UNIQUE NOT NULL,
      ip_address VARCHAR(45),
      user_agent TEXT,
      fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_expiracion DATETIME NOT NULL,
      activa INTEGER DEFAULT 1,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error al crear tabla sesiones:', err);
    } else {
      console.log('Tabla sesiones lista');
    }
  });
});

module.exports = db;
