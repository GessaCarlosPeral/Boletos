const db = require('./db');
const { hashPassword } = require('../services/authService');

/**
 * Script para resetear la contraseña del usuario admin
 * Útil cuando olvidas la contraseña o despliegas en un nuevo servidor
 */

async function resetAdminPassword() {
  console.log('\n========== RESETEAR CONTRASEÑA DE ADMIN ==========\n');

  try {
    // Verificar si existe el usuario admin
    const admin = await new Promise((resolve, reject) => {
      db.get(`SELECT id, username FROM usuarios WHERE username = ?`, ['admin'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!admin) {
      console.log('❌ Usuario admin no encontrado');
      console.log('💡 Ejecuta primero: node src/database/seedAuth.js');
      return;
    }

    // Nueva contraseña por defecto
    const newPassword = 'admin123';
    const passwordHash = await hashPassword(newPassword);

    // Actualizar contraseña
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE usuarios SET password_hash = ? WHERE id = ?`,
        [passwordHash, admin.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    console.log('✅ Contraseña reseteada exitosamente\n');
    console.log('🔑 Nuevas credenciales:');
    console.log('   Username: admin');
    console.log('   Password: admin123\n');
    console.log('⚠️  IMPORTANTE: Cambia la contraseña en el panel de administración\n');

  } catch (error) {
    console.error('❌ Error al resetear contraseña:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  resetAdminPassword()
    .then(() => {
      console.log('Proceso completado. Cerrando conexión...');
      db.close();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      db.close();
      process.exit(1);
    });
}

module.exports = { resetAdminPassword };
