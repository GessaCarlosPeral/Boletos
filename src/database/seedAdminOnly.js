const db = require('./db');
const { hashPassword } = require('../services/authService');

/**
 * Script mínimo para crear SOLO el usuario administrador
 * Útil cuando ya tienes datos en producción y solo necesitas el admin
 */

async function seedAdminOnly() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  👤 CREACIÓN DE USUARIO ADMINISTRADOR                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Verificar/Crear rol administrador
    console.log('📋 1/2 Verificando rol administrador...');
    const adminRole = await ensureAdminRole();
    console.log(`   ✓ Rol administrador disponible (ID: ${adminRole.id})`);

    // 2. Crear usuario admin
    console.log('\n👤 2/2 Creando usuario administrador...');
    await createAdminUser(adminRole.id);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ USUARIO ADMINISTRADOR CREADO EXITOSAMENTE            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    printCredentials();

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    throw error;
  }
}

// Asegurar que existe el rol administrador
async function ensureAdminRole() {
  // Intentar obtener el rol existente
  const existingRole = await new Promise((resolve, reject) => {
    db.get(`SELECT id FROM roles WHERE nombre = ?`, ['administrador'], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (existingRole) {
    return existingRole;
  }

  // Si no existe, crearlo
  console.log('   ⚠ Rol administrador no existe, creándolo...');

  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO roles (nombre, descripcion, nivel_acceso) VALUES (?, ?, ?)`,
      ['administrador', 'Acceso total al sistema', 3],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  // Obtener el rol recién creado
  return new Promise((resolve, reject) => {
    db.get(`SELECT id FROM roles WHERE nombre = ?`, ['administrador'], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Crear usuario administrador
async function createAdminUser(roleId) {
  // Verificar si ya existe
  const existingAdmin = await new Promise((resolve, reject) => {
    db.get(`SELECT id FROM usuarios WHERE username = ?`, ['admin'], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (existingAdmin) {
    console.log('   ⚠ Usuario admin ya existe');
    console.log('   💡 Si olvidaste la contraseña, elimínalo primero:');
    console.log('      sqlite3 data/boletos.db "DELETE FROM usuarios WHERE username=\'admin\';"');
    console.log('      Luego vuelve a ejecutar este script');
    return;
  }

  // Hash de la contraseña
  const passwordHash = await hashPassword('admin123');

  // Crear usuario
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO usuarios (username, password_hash, nombre_completo, email, rol_id, activo)
       VALUES (?, ?, ?, ?, ?, 1)`,
      ['admin', passwordHash, 'Administrador del Sistema', 'admin@gessa.com', roleId],
      (err) => {
        if (err) reject(err);
        else {
          console.log('   ✓ Usuario admin creado exitosamente');
          resolve();
        }
      }
    );
  });
}

function printCredentials() {
  console.log('┌────────────────────────────────────────────────────────────┐');
  console.log('│  🔑 CREDENCIALES DE ACCESO                                │');
  console.log('├────────────────────────────────────────────────────────────┤');
  console.log('│                                                            │');
  console.log('│  Usuario:  admin                                           │');
  console.log('│  Password: admin123                                        │');
  console.log('│                                                            │');
  console.log('├────────────────────────────────────────────────────────────┤');
  console.log('│  ⚠️  IMPORTANTE:                                          │');
  console.log('├────────────────────────────────────────────────────────────┤');
  console.log('│                                                            │');
  console.log('│  • Cambia la contraseña inmediatamente después de entrar  │');
  console.log('│  • Crea un nuevo usuario admin con credenciales seguras   │');
  console.log('│  • Luego desactiva o elimina este usuario por seguridad   │');
  console.log('│                                                            │');
  console.log('└────────────────────────────────────────────────────────────┘\n');

  console.log('📝 PRÓXIMOS PASOS:\n');
  console.log('   1. Accede al panel: https://tu-dominio.com/login.html');
  console.log('   2. Inicia sesión con admin / admin123');
  console.log('   3. Ve a la pestaña "👥 Usuarios"');
  console.log('   4. Crea un nuevo usuario administrador con tu nombre');
  console.log('   5. Cierra sesión y entra con tu nuevo usuario');
  console.log('   6. Desactiva el usuario "admin" por seguridad\n');
}

// Ejecutar script
if (require.main === module) {
  seedAdminOnly()
    .then(() => {
      console.log('✅ Proceso completado. Cerrando conexión...\n');
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

module.exports = { seedAdminOnly };
