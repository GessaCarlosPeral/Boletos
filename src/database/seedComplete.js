const db = require('./db');
const { hashPassword } = require('../services/authService');

/**
 * Script completo de inicialización del sistema
 * Incluye:
 * - Roles y permisos
 * - Usuario administrador
 * - Datos de ejemplo (contratistas, comedores, precios)
 */

async function seedCompleteDatabase() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 INICIALIZACIÓN COMPLETA DE BASE DE DATOS GESSA       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. ROLES
    console.log('📋 1/7 Creando roles del sistema...');
    await insertRoles();

    // 2. PERMISOS
    console.log('🔐 2/7 Creando permisos del sistema...');
    await insertPermissions();

    // 3. ASIGNAR PERMISOS A ROLES
    console.log('🔗 3/7 Asignando permisos a roles...');
    await assignPermissionsToRoles();

    // 4. USUARIO ADMINISTRADOR
    console.log('👤 4/7 Creando usuario administrador...');
    await createAdminUser();

    // 5. PRECIOS DE EJEMPLO
    console.log('💰 5/7 Creando precios de ejemplo...');
    await createSamplePrices();

    // 6. CONTRATISTAS Y COMEDORES DE EJEMPLO
    console.log('🏢 6/7 Creando contratistas y comedores de ejemplo...');
    await createSampleContractorsAndDiners();

    // 7. DATOS FINALES
    console.log('📊 7/7 Creando configuraciones finales...');
    await createFinalConfigs();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ INICIALIZACIÓN COMPLETADA EXITOSAMENTE               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    printCredentials();

  } catch (error) {
    console.error('\n❌ ERROR EN INICIALIZACIÓN:', error);
    throw error;
  }
}

// ==================== FUNCIONES DE CREACIÓN ====================

// 1. Insertar roles
function insertRoles() {
  const roles = [
    { nombre: 'administrador', descripcion: 'Acceso total al sistema', nivel_acceso: 3 },
    { nombre: 'operador', descripcion: 'Operador - Puede generar y consultar boletos', nivel_acceso: 2 },
    { nombre: 'validador', descripcion: 'Validador - Solo puede escanear boletos', nivel_acceso: 1 }
  ];

  const promises = roles.map(rol => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT OR IGNORE INTO roles (nombre, descripcion, nivel_acceso) VALUES (?, ?, ?)`,
        [rol.nombre, rol.descripcion, rol.nivel_acceso],
        (err) => {
          if (err) reject(err);
          else {
            console.log(`   ✓ Rol: ${rol.nombre} (nivel ${rol.nivel_acceso})`);
            resolve();
          }
        }
      );
    });
  });

  return Promise.all(promises);
}

// 2. Insertar permisos
function insertPermissions() {
  const permisos = [
    // BOLETOS
    { codigo: 'boletos.crear', nombre: 'Crear boletos', modulo: 'boletos' },
    { codigo: 'boletos.leer', nombre: 'Ver boletos', modulo: 'boletos' },
    { codigo: 'boletos.autorizar', nombre: 'Autorizar descarga de boletos', modulo: 'boletos' },
    { codigo: 'boletos.descargar', nombre: 'Descargar PDFs de boletos', modulo: 'boletos' },
    { codigo: 'boletos.validar', nombre: 'Validar boletos en comedor', modulo: 'boletos' },

    // USUARIOS
    { codigo: 'usuarios.crear', nombre: 'Crear usuarios', modulo: 'usuarios' },
    { codigo: 'usuarios.leer', nombre: 'Ver usuarios', modulo: 'usuarios' },
    { codigo: 'usuarios.actualizar', nombre: 'Actualizar usuarios', modulo: 'usuarios' },
    { codigo: 'usuarios.eliminar', nombre: 'Eliminar usuarios', modulo: 'usuarios' },

    // PRECIOS
    { codigo: 'precios.crear', nombre: 'Crear precios', modulo: 'precios' },
    { codigo: 'precios.leer', nombre: 'Ver precios', modulo: 'precios' },
    { codigo: 'precios.actualizar', nombre: 'Actualizar precios', modulo: 'precios' },

    // REPORTES
    { codigo: 'reportes.leer', nombre: 'Ver reportes', modulo: 'reportes' },
    { codigo: 'reportes.auditoria', nombre: 'Ver auditoría', modulo: 'reportes' }
  ];

  const promises = permisos.map(permiso => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT OR IGNORE INTO permisos (codigo, nombre, modulo) VALUES (?, ?, ?)`,
        [permiso.codigo, permiso.nombre, permiso.modulo],
        (err) => {
          if (err) reject(err);
          else {
            console.log(`   ✓ Permiso: ${permiso.codigo}`);
            resolve();
          }
        }
      );
    });
  });

  return Promise.all(promises);
}

// 3. Asignar permisos a roles
async function assignPermissionsToRoles() {
  const rolePermissions = {
    administrador: [
      'boletos.crear', 'boletos.leer', 'boletos.autorizar', 'boletos.descargar', 'boletos.validar',
      'usuarios.crear', 'usuarios.leer', 'usuarios.actualizar', 'usuarios.eliminar',
      'precios.crear', 'precios.leer', 'precios.actualizar',
      'reportes.leer', 'reportes.auditoria'
    ],
    operador: [
      'boletos.crear', 'boletos.leer', 'boletos.descargar',
      'precios.leer',
      'reportes.leer'
    ],
    validador: [
      'boletos.validar'
    ]
  };

  for (const [roleName, permissions] of Object.entries(rolePermissions)) {
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

    for (const permCode of permissions) {
      const permiso = await new Promise((resolve, reject) => {
        db.get(`SELECT id FROM permisos WHERE codigo = ?`, [permCode], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      if (!permiso) continue;

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

    console.log(`   ✓ ${roleName}: ${permissions.length} permisos asignados`);
  }
}

// 4. Crear usuario administrador
async function createAdminUser() {
  const existingAdmin = await new Promise((resolve, reject) => {
    db.get(`SELECT id FROM usuarios WHERE username = ?`, ['admin'], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (existingAdmin) {
    console.log('   ⚠ Usuario admin ya existe, omitiendo...');
    return;
  }

  const adminRole = await new Promise((resolve, reject) => {
    db.get(`SELECT id FROM roles WHERE nombre = ?`, ['administrador'], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  const passwordHash = await hashPassword('admin123');

  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO usuarios (username, password_hash, nombre_completo, email, rol_id)
       VALUES (?, ?, ?, ?, ?)`,
      ['admin', passwordHash, 'Administrador del Sistema', 'admin@gessa.com', adminRole.id],
      (err) => {
        if (err) reject(err);
        else {
          console.log('   ✓ Usuario admin creado');
          resolve();
        }
      }
    );
  });
}

// 5. Crear precios de ejemplo
async function createSamplePrices() {
  const precios = [
    { nombre: 'Desayuno', precio: 80.00, descripcion: 'Desayuno completo: café, pan, fruta y platillo principal' },
    { nombre: 'Comida Corrida', precio: 100.00, descripcion: 'Comida del día: sopa, guisado, agua y tortillas' },
    { nombre: 'Comida Ejecutiva', precio: 150.00, descripcion: 'Comida especial: entrada, plato fuerte, postre y bebida' },
    { nombre: 'Cena', precio: 90.00, descripcion: 'Cena ligera: sopa o ensalada, plato principal y bebida' },
    { nombre: 'Buffet', precio: 180.00, descripcion: 'Buffet libre: variedad de platillos y bebidas' }
  ];

  for (const precio of precios) {
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT OR IGNORE INTO precios (nombre, precio_unitario, descripcion, activo)
         VALUES (?, ?, ?, 1)`,
        [precio.nombre, precio.precio, precio.descripcion],
        (err) => {
          if (err) reject(err);
          else {
            console.log(`   ✓ Precio: ${precio.nombre} - $${precio.precio}`);
            resolve();
          }
        }
      );
    });
  }
}

// 6. Crear contratistas y comedores de ejemplo
async function createSampleContractorsAndDiners() {
  const contratistas = [
    { nombre: 'PEMEX División Sur', codigo: 'PEMEX-SUR' },
    { nombre: 'Constructora ABC', codigo: 'CONST-ABC' },
    { nombre: 'Servicios Industriales XYZ', codigo: 'SERV-XYZ' }
  ];

  for (const contratista of contratistas) {
    // Crear contratista
    const contratistaId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT OR IGNORE INTO contratistas (nombre, codigo, activo) VALUES (?, ?, 1)`,
        [contratista.nombre, contratista.codigo],
        function(err) {
          if (err) reject(err);
          else {
            // Obtener ID del contratista recién creado
            db.get(
              `SELECT id FROM contratistas WHERE codigo = ?`,
              [contratista.codigo],
              (err, row) => {
                if (err) reject(err);
                else resolve(row.id);
              }
            );
          }
        }
      );
    });

    console.log(`   ✓ Contratista: ${contratista.nombre} (${contratista.codigo})`);

    // Crear comedores para cada contratista
    const comedores = [
      { nombre: 'Comedor Norte', ubicacion: 'Planta Norte' },
      { nombre: 'Comedor Sur', ubicacion: 'Planta Sur' }
    ];

    for (const comedor of comedores) {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT OR IGNORE INTO comedores (nombre, contratista_id, ubicacion, activo)
           VALUES (?, ?, ?, 1)`,
          [comedor.nombre, contratistaId, comedor.ubicacion],
          (err) => {
            if (err) reject(err);
            else {
              console.log(`      ↳ Comedor: ${comedor.nombre}`);
              resolve();
            }
          }
        );
      });
    }
  }
}

// 7. Crear configuraciones finales
async function createFinalConfigs() {
  // Aquí puedes agregar configuraciones adicionales si las necesitas
  console.log('   ✓ Configuraciones finales aplicadas');
}

// ==================== FUNCIÓN DE IMPRESIÓN ====================

function printCredentials() {
  console.log('\n┌────────────────────────────────────────────────────────────┐');
  console.log('│  🔑 CREDENCIALES DE ACCESO                                │');
  console.log('├────────────────────────────────────────────────────────────┤');
  console.log('│                                                            │');
  console.log('│  URL:      https://tu-dominio.com/login.html              │');
  console.log('│  Usuario:  admin                                           │');
  console.log('│  Password: admin123                                        │');
  console.log('│                                                            │');
  console.log('├────────────────────────────────────────────────────────────┤');
  console.log('│  📊 DATOS DE EJEMPLO CREADOS:                             │');
  console.log('├────────────────────────────────────────────────────────────┤');
  console.log('│                                                            │');
  console.log('│  ✅ 3 Roles (administrador, operador, validador)          │');
  console.log('│  ✅ 14 Permisos del sistema                               │');
  console.log('│  ✅ 1 Usuario administrador                               │');
  console.log('│  ✅ 5 Precios de platillos                                │');
  console.log('│  ✅ 3 Contratistas                                        │');
  console.log('│  ✅ 6 Comedores (2 por contratista)                       │');
  console.log('│                                                            │');
  console.log('├────────────────────────────────────────────────────────────┤');
  console.log('│  ⚠️  IMPORTANTE:                                          │');
  console.log('├────────────────────────────────────────────────────────────┤');
  console.log('│                                                            │');
  console.log('│  • Cambia la contraseña del admin inmediatamente          │');
  console.log('│  • Los datos de ejemplo son solo para testing             │');
  console.log('│  • Puedes crear más usuarios desde el panel admin         │');
  console.log('│  • Los contratistas y comedores se pueden modificar        │');
  console.log('│                                                            │');
  console.log('└────────────────────────────────────────────────────────────┘\n');

  console.log('📝 PRÓXIMOS PASOS:\n');
  console.log('   1. Accede al sistema con las credenciales de admin');
  console.log('   2. Crea usuarios operadores para tu equipo');
  console.log('   3. Ajusta los precios según tus necesidades');
  console.log('   4. Genera tu primer lote de boletos de prueba\n');
}

// ==================== EJECUTAR SCRIPT ====================

if (require.main === module) {
  seedCompleteDatabase()
    .then(() => {
      console.log('✅ Proceso completado. Cerrando conexión a BD...\n');
      setTimeout(() => {
        db.close();
        process.exit(0);
      }, 1000);
    })
    .catch((error) => {
      console.error('\n❌ Error fatal:', error);
      db.close();
      process.exit(1);
    });
}

module.exports = { seedCompleteDatabase };
