const db = require('./db');
const { hashPassword } = require('../services/authService');

/**
 * Script para poblar datos iniciales del sistema de autenticación
 * - Roles
 * - Permisos
 * - Relaciones roles-permisos
 * - Usuario administrador por defecto
 */

async function seedAuthData() {
  console.log('\n========== INICIANDO SEED DE AUTENTICACIÓN ==========\n');

  try {
    // 1. INSERTAR ROLES
    console.log('1. Insertando roles...');
    await insertRoles();

    // 2. INSERTAR PERMISOS
    console.log('2. Insertando permisos...');
    await insertPermissions();

    // 3. ASIGNAR PERMISOS A ROLES
    console.log('3. Asignando permisos a roles...');
    await assignPermissionsToRoles();

    // 4. CREAR USUARIO ADMINISTRADOR POR DEFECTO
    console.log('4. Creando usuario administrador por defecto...');
    await createAdminUser();

    console.log('\n========== SEED COMPLETADO EXITOSAMENTE ==========\n');
    console.log('✅ Roles, permisos y usuario admin creados correctamente\n');
    console.log('🔑 Credenciales de administrador:');
    console.log('   Username: admin');
    console.log('   Password: admin123\n');
    console.log('⚠️  IMPORTANTE: Cambia la contraseña del administrador en producción\n');

  } catch (error) {
    console.error('❌ Error en seed de autenticación:', error);
    throw error;
  }
}

// Función para insertar roles
function insertRoles() {
  const roles = [
    { nombre: 'administrador', descripcion: 'Acceso total al sistema', nivel_acceso: 3 },
    { nombre: 'gerente_comedor', descripcion: 'Gerente de comedor - Puede generar boletos', nivel_acceso: 2 },
    { nombre: 'finanzas', descripcion: 'Finanzas - Autoriza descarga de boletos', nivel_acceso: 2 }
  ];

  const promises = roles.map(rol => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT OR IGNORE INTO roles (nombre, descripcion, nivel_acceso) VALUES (?, ?, ?)`,
        [rol.nombre, rol.descripcion, rol.nivel_acceso],
        (err) => {
          if (err) reject(err);
          else {
            console.log(`   ✓ Rol creado: ${rol.nombre}`);
            resolve();
          }
        }
      );
    });
  });

  return Promise.all(promises);
}

// Función para insertar permisos
function insertPermissions() {
  const permisos = [
    // BOLETOS
    { codigo: 'boletos.crear', nombre: 'Crear boletos', modulo: 'boletos' },
    { codigo: 'boletos.leer', nombre: 'Ver boletos', modulo: 'boletos' },
    { codigo: 'boletos.solicitar_autorizacion', nombre: 'Solicitar autorización de descarga', modulo: 'boletos' },
    { codigo: 'boletos.autorizar', nombre: 'Autorizar descarga de boletos', modulo: 'boletos' },
    { codigo: 'boletos.descargar', nombre: 'Descargar PDFs de boletos', modulo: 'boletos' },
    { codigo: 'boletos.eliminar', nombre: 'Eliminar lotes de boletos', modulo: 'boletos' },
    { codigo: 'boletos.validar', nombre: 'Validar boletos en comedor', modulo: 'boletos' },

    // USUARIOS
    { codigo: 'usuarios.crear', nombre: 'Crear usuarios', modulo: 'usuarios' },
    { codigo: 'usuarios.leer', nombre: 'Ver usuarios', modulo: 'usuarios' },
    { codigo: 'usuarios.actualizar', nombre: 'Actualizar usuarios', modulo: 'usuarios' },
    { codigo: 'usuarios.eliminar', nombre: 'Eliminar usuarios', modulo: 'usuarios' },
    { codigo: 'usuarios.cambiar_rol', nombre: 'Cambiar rol de usuarios', modulo: 'usuarios' },

    // COMEDORES
    { codigo: 'comedores.crear', nombre: 'Crear comedores', modulo: 'comedores' },
    { codigo: 'comedores.leer', nombre: 'Ver comedores', modulo: 'comedores' },
    { codigo: 'comedores.actualizar', nombre: 'Actualizar comedores', modulo: 'comedores' },
    { codigo: 'comedores.eliminar', nombre: 'Eliminar comedores', modulo: 'comedores' },

    // REPORTES
    { codigo: 'reportes.leer', nombre: 'Ver reportes básicos', modulo: 'reportes' },
    { codigo: 'reportes.avanzados', nombre: 'Ver reportes financieros', modulo: 'reportes' },
    { codigo: 'reportes.auditoria', nombre: 'Ver logs de auditoría', modulo: 'reportes' }
  ];

  const promises = permisos.map(permiso => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT OR IGNORE INTO permisos (codigo, nombre, modulo) VALUES (?, ?, ?)`,
        [permiso.codigo, permiso.nombre, permiso.modulo],
        (err) => {
          if (err) reject(err);
          else {
            console.log(`   ✓ Permiso creado: ${permiso.codigo}`);
            resolve();
          }
        }
      );
    });
  });

  return Promise.all(promises);
}

// Función para asignar permisos a roles
async function assignPermissionsToRoles() {
  // Matriz de permisos por rol
  const rolePermissions = {
    administrador: [
      'boletos.crear', 'boletos.leer', 'boletos.solicitar_autorizacion',
      'boletos.autorizar', 'boletos.descargar', 'boletos.eliminar', 'boletos.validar',
      'usuarios.crear', 'usuarios.leer', 'usuarios.actualizar', 'usuarios.eliminar', 'usuarios.cambiar_rol',
      'comedores.crear', 'comedores.leer', 'comedores.actualizar', 'comedores.eliminar',
      'reportes.leer', 'reportes.avanzados', 'reportes.auditoria'
    ],
    gerente_comedor: [
      'boletos.crear', 'boletos.leer', 'boletos.solicitar_autorizacion', 'boletos.descargar', 'boletos.validar',
      'comedores.crear', 'comedores.leer', 'comedores.actualizar',
      'reportes.leer'
    ],
    finanzas: [
      'boletos.leer', 'boletos.autorizar', 'boletos.descargar',
      'reportes.leer', 'reportes.avanzados'
    ]
  };

  for (const [roleName, permissions] of Object.entries(rolePermissions)) {
    // Obtener ID del rol
    const rol = await new Promise((resolve, reject) => {
      db.get(`SELECT id FROM roles WHERE nombre = ?`, [roleName], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!rol) {
      console.error(`   ⚠ Rol no encontrado: ${roleName}`);
      continue;
    }

    // Asignar cada permiso al rol
    for (const permCode of permissions) {
      const permiso = await new Promise((resolve, reject) => {
        db.get(`SELECT id FROM permisos WHERE codigo = ?`, [permCode], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!permiso) {
        console.error(`   ⚠ Permiso no encontrado: ${permCode}`);
        continue;
      }

      await new Promise((resolve, reject) => {
        db.run(
          `INSERT OR IGNORE INTO roles_permisos (rol_id, permiso_id) VALUES (?, ?)`,
          [rol.id, permiso.id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    console.log(`   ✓ Permisos asignados a: ${roleName} (${permissions.length} permisos)`);
  }
}

// Función para crear usuario administrador por defecto
async function createAdminUser() {
  // Verificar si ya existe el usuario admin
  const existingAdmin = await new Promise((resolve, reject) => {
    db.get(`SELECT id FROM usuarios WHERE username = ?`, ['admin'], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (existingAdmin) {
    console.log('   ⚠ Usuario administrador ya existe, omitiendo creación');
    return;
  }

  // Obtener ID del rol administrador
  const adminRole = await new Promise((resolve, reject) => {
    db.get(`SELECT id FROM roles WHERE nombre = ?`, ['administrador'], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (!adminRole) {
    throw new Error('Rol administrador no encontrado');
  }

  // Hash de contraseña por defecto
  const passwordHash = await hashPassword('admin123');

  // Crear usuario administrador
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO usuarios (username, password_hash, nombre_completo, email, rol_id)
       VALUES (?, ?, ?, ?, ?)`,
      ['admin', passwordHash, 'Administrador del Sistema', 'admin@gessa.com', adminRole.id],
      (err) => {
        if (err) reject(err);
        else {
          console.log('   ✓ Usuario administrador creado exitosamente');
          resolve();
        }
      }
    );
  });
}

// Ejecutar seed si se llama directamente
if (require.main === module) {
  seedAuthData()
    .then(() => {
      console.log('Seed completado. Cerrando conexión...');
      db.close();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error en seed:', error);
      db.close();
      process.exit(1);
    });
}

module.exports = { seedAuthData };
