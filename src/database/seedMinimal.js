const db = require('./db');
const { hashPassword } = require('../services/authService');
const { v4: uuidv4 } = require('uuid');

/**
 * Script de inicialización mínima del sistema GESSA
 * Incluye:
 * - 4 Roles (administrador, operador, validador, contratista)
 * - 4 Usuarios (uno por cada rol)
 * - 1 Contratista con 1 Comedor
 * - 1 Lote con 2 Boletos
 */

async function seedMinimalDatabase() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 INICIALIZACIÓN MÍNIMA BASE DE DATOS GESSA            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. ROLES
    console.log('📋 1/8 Creando roles del sistema...');
    await insertRoles();

    // 2. PERMISOS
    console.log('🔐 2/8 Creando permisos del sistema...');
    await insertPermissions();

    // 3. ASIGNAR PERMISOS A ROLES
    console.log('🔗 3/8 Asignando permisos a roles...');
    await assignPermissionsToRoles();

    // 4. USUARIOS (uno por cada rol)
    console.log('👥 4/8 Creando usuarios de ejemplo...');
    await createSampleUsers();

    // 5. PRECIO DE EJEMPLO
    console.log('💰 5/8 Creando precio de ejemplo...');
    await createSamplePrice();

    // 6. CONTRATISTA Y COMEDOR
    console.log('🏢 6/8 Creando contratista y comedor...');
    const contratistaId = await createSampleContractorAndDiner();

    // 7. LOTE CON 2 BOLETOS
    console.log('🎫 7/8 Creando lote con 2 boletos...');
    await createSampleLoteWithTickets(contratistaId);

    // 8. FINALIZAR
    console.log('✅ 8/8 Finalizando...');

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
    { nombre: 'validador', descripcion: 'Validador - Solo puede escanear boletos', nivel_acceso: 1 },
    { nombre: 'contratista', descripcion: 'Contratista - Puede ver sus propios boletos y reportes', nivel_acceso: 2 }
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
    { codigo: 'reportes.auditoria', nombre: 'Ver auditoría', modulo: 'reportes' },

    // CONTRATISTAS
    { codigo: 'contratistas.ver_propios', nombre: 'Ver datos propios', modulo: 'contratistas' }
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
    ],
    contratista: [
      'boletos.leer',
      'reportes.leer',
      'contratistas.ver_propios'
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

// 4. Crear usuarios de ejemplo (uno por cada rol)
async function createSampleUsers() {
  const usuarios = [
    {
      username: 'admin',
      password: 'admin123',
      nombre_completo: 'Administrador del Sistema',
      email: 'admin@gessa.com',
      rol: 'administrador'
    },
    {
      username: 'operador1',
      password: 'operador123',
      nombre_completo: 'Juan Pérez López',
      email: 'operador@gessa.com',
      rol: 'operador'
    },
    {
      username: 'validador1',
      password: 'validador123',
      nombre_completo: 'María García Hernández',
      email: 'validador@gessa.com',
      rol: 'validador'
    },
    {
      username: 'contratista1',
      password: 'contratista123',
      nombre_completo: 'PEMEX Usuario',
      email: 'contratista@pemex.com',
      rol: 'contratista'
    }
  ];

  for (const usuario of usuarios) {
    // Verificar si ya existe
    const existingUser = await new Promise((resolve, reject) => {
      db.get(`SELECT id FROM usuarios WHERE username = ?`, [usuario.username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      console.log(`   ⚠ Usuario ${usuario.username} ya existe, omitiendo...`);
      continue;
    }

    // Obtener ID del rol
    const rol = await new Promise((resolve, reject) => {
      db.get(`SELECT id FROM roles WHERE nombre = ?`, [usuario.rol], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!rol) {
      console.error(`   ⚠ Rol ${usuario.rol} no encontrado`);
      continue;
    }

    // Hashear password
    const passwordHash = await hashPassword(usuario.password);

    // Crear usuario
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO usuarios (username, password_hash, nombre_completo, email, rol_id, activo)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [usuario.username, passwordHash, usuario.nombre_completo, usuario.email, rol.id],
        (err) => {
          if (err) reject(err);
          else {
            console.log(`   ✓ Usuario: ${usuario.username} (${usuario.rol})`);
            resolve();
          }
        }
      );
    });
  }
}

// 5. Crear precio de ejemplo
async function createSamplePrice() {
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT OR IGNORE INTO precios (nombre, precio_unitario, descripcion, activo)
       VALUES (?, ?, ?, 1)`,
      ['Comida Corrida', 100.00, 'Comida del día: sopa, guisado, agua y tortillas'],
      (err) => {
        if (err) reject(err);
        else {
          console.log('   ✓ Precio: Comida Corrida - $100.00');
          resolve();
        }
      }
    );
  });
}

// 6. Crear contratista y comedor
async function createSampleContractorAndDiner() {
  // Crear contratista
  const contratistaId = await new Promise((resolve, reject) => {
    db.run(
      `INSERT OR IGNORE INTO contratistas (nombre, codigo, activo) VALUES (?, ?, 1)`,
      ['PEMEX División Sur', 'PEMEX-SUR'],
      function(err) {
        if (err) {
          reject(err);
        } else {
          // Obtener ID del contratista
          db.get(
            `SELECT id FROM contratistas WHERE codigo = ?`,
            ['PEMEX-SUR'],
            (err, row) => {
              if (err) reject(err);
              else {
                console.log('   ✓ Contratista: PEMEX División Sur (PEMEX-SUR)');
                resolve(row.id);
              }
            }
          );
        }
      }
    );
  });

  // Crear comedor
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT OR IGNORE INTO comedores (nombre, contratista_id, ubicacion, activo)
       VALUES (?, ?, ?, 1)`,
      ['Comedor Principal Norte', contratistaId, 'Planta Norte - Edificio A'],
      (err) => {
        if (err) reject(err);
        else {
          console.log('   ✓ Comedor: Comedor Principal Norte');
          resolve();
        }
      }
    );
  });

  return contratistaId;
}

// 7. Crear lote con 2 boletos
async function createSampleLoteWithTickets(contratistaId) {
  const loteId = `LOTE-${Date.now()}`;
  const fechaVencimiento = new Date();
  fechaVencimiento.setDate(fechaVencimiento.getDate() + 30); // 30 días desde hoy

  // Obtener ID del comedor
  const comedor = await new Promise((resolve, reject) => {
    db.get(
      `SELECT id FROM comedores WHERE contratista_id = ? LIMIT 1`,
      [contratistaId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  // Obtener ID del precio
  const precio = await new Promise((resolve, reject) => {
    db.get(
      `SELECT id, precio_unitario FROM precios WHERE nombre = ?`,
      ['Comida Corrida'],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  // Crear lote
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO lotes (
        lote_id, contratista, cantidad, fecha_vencimiento,
        estado_pago, monto, comedor_id, precio_id, precio_nombre, precio_unitario
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        loteId,
        'PEMEX División Sur',
        2,
        fechaVencimiento.toISOString().split('T')[0],
        'AUTORIZADO',
        200.00,
        comedor.id,
        precio.id,
        'Comida Corrida',
        precio.precio_unitario
      ],
      (err) => {
        if (err) reject(err);
        else {
          console.log(`   ✓ Lote: ${loteId} (2 boletos, $200.00)`);
          resolve();
        }
      }
    );
  });

  // Crear 2 boletos
  const boletos = [
    { uuid: uuidv4(), numero: 1 },
    { uuid: uuidv4(), numero: 2 }
  ];

  for (const boleto of boletos) {
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO boletos (
          uuid, contratista, fecha_vencimiento, lote, comedor_id, redimido
        ) VALUES (?, ?, ?, ?, ?, 0)`,
        [
          boleto.uuid,
          'PEMEX División Sur',
          fechaVencimiento.toISOString().split('T')[0],
          loteId,
          comedor.id
        ],
        (err) => {
          if (err) reject(err);
          else {
            console.log(`   ✓ Boleto #${boleto.numero}: ${boleto.uuid.substring(0, 8)}...`);
            resolve();
          }
        }
      );
    });
  }
}

// ==================== FUNCIÓN DE IMPRESIÓN ====================

function printCredentials() {
  console.log('\n┌────────────────────────────────────────────────────────────┐');
  console.log('│  🔑 CREDENCIALES DE ACCESO                                │');
  console.log('├────────────────────────────────────────────────────────────┤');
  console.log('│                                                            │');
  console.log('│  👤 ADMINISTRADOR:                                        │');
  console.log('│     Usuario:  admin                                        │');
  console.log('│     Password: admin123                                     │');
  console.log('│                                                            │');
  console.log('│  👤 OPERADOR:                                             │');
  console.log('│     Usuario:  operador1                                    │');
  console.log('│     Password: operador123                                  │');
  console.log('│                                                            │');
  console.log('│  👤 VALIDADOR:                                            │');
  console.log('│     Usuario:  validador1                                   │');
  console.log('│     Password: validador123                                 │');
  console.log('│                                                            │');
  console.log('│  👤 CONTRATISTA:                                          │');
  console.log('│     Usuario:  contratista1                                 │');
  console.log('│     Password: contratista123                               │');
  console.log('│                                                            │');
  console.log('├────────────────────────────────────────────────────────────┤');
  console.log('│  📊 DATOS DE EJEMPLO CREADOS:                             │');
  console.log('├────────────────────────────────────────────────────────────┤');
  console.log('│                                                            │');
  console.log('│  ✅ 4 Roles (administrador, operador, validador,          │');
  console.log('│              contratista)                                  │');
  console.log('│  ✅ 15 Permisos del sistema                               │');
  console.log('│  ✅ 4 Usuarios (uno por cada rol)                         │');
  console.log('│  ✅ 1 Precio: Comida Corrida ($100.00)                    │');
  console.log('│  ✅ 1 Contratista: PEMEX División Sur                     │');
  console.log('│  ✅ 1 Comedor: Comedor Principal Norte                    │');
  console.log('│  ✅ 1 Lote con 2 boletos (AUTORIZADO, $200.00)            │');
  console.log('│                                                            │');
  console.log('├────────────────────────────────────────────────────────────┤');
  console.log('│  ⚠️  IMPORTANTE:                                          │');
  console.log('├────────────────────────────────────────────────────────────┤');
  console.log('│                                                            │');
  console.log('│  • Cambia las contraseñas inmediatamente                   │');
  console.log('│  • Los datos son solo para testing                         │');
  console.log('│  • Puedes crear más registros desde el panel               │');
  console.log('│                                                            │');
  console.log('└────────────────────────────────────────────────────────────┘\n');

  console.log('📝 PRÓXIMOS PASOS:\n');
  console.log('   1. Accede con cualquiera de los 4 usuarios');
  console.log('   2. Prueba los permisos de cada rol');
  console.log('   3. Los 2 boletos ya están listos para escanear/validar');
  console.log('   4. El lote está AUTORIZADO y listo para descargar\n');
}

// ==================== EJECUTAR SCRIPT ====================

if (require.main === module) {
  seedMinimalDatabase()
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

module.exports = { seedMinimalDatabase };
