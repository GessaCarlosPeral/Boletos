const db = require('../database/db');
const { hashPassword } = require('./authService');

/**
 * Obtener usuario por username
 * @param {string} username
 * @returns {Promise<object|null>}
 */
function getUserByUsername(username) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT u.*, r.nombre as rol_nombre, r.nivel_acceso
       FROM usuarios u
       INNER JOIN roles r ON u.rol_id = r.id
       WHERE u.username = ? AND u.activo = 1`,
      [username],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      }
    );
  });
}

/**
 * Obtener usuario por ID
 * @param {number} userId
 * @returns {Promise<object|null>}
 */
function getUserById(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT u.*, r.nombre as rol_nombre, r.nivel_acceso
       FROM usuarios u
       INNER JOIN roles r ON u.rol_id = r.id
       WHERE u.id = ? AND u.activo = 1`,
      [userId],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      }
    );
  });
}

/**
 * Obtener permisos de un usuario
 * @param {number} userId
 * @returns {Promise<Array>}
 */
function getUserPermissions(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT DISTINCT p.codigo, p.nombre, p.modulo
       FROM usuarios u
       INNER JOIN roles r ON u.rol_id = r.id
       INNER JOIN roles_permisos rp ON r.id = rp.rol_id
       INNER JOIN permisos p ON rp.permiso_id = p.id
       WHERE u.id = ? AND u.activo = 1`,
      [userId],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
}

/**
 * Verificar si usuario tiene un permiso específico
 * @param {number} userId
 * @param {string} permissionCode
 * @returns {Promise<boolean>}
 */
async function userHasPermission(userId, permissionCode) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT COUNT(*) as count
       FROM usuarios u
       INNER JOIN roles r ON u.rol_id = r.id
       INNER JOIN roles_permisos rp ON r.id = rp.rol_id
       INNER JOIN permisos p ON rp.permiso_id = p.id
       WHERE u.id = ? AND p.codigo = ? AND u.activo = 1`,
      [userId, permissionCode],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count > 0);
        }
      }
    );
  });
}

/**
 * Crear nuevo usuario
 * @param {object} userData
 * @returns {Promise<number>} ID del usuario creado
 */
async function createUser(userData) {
  const { username, password, nombre_completo, email, rol_id, creado_por, contratista_id } = userData;

  const passwordHash = await hashPassword(password);

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO usuarios (username, password_hash, nombre_completo, email, rol_id, creado_por, contratista_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, passwordHash, nombre_completo, email, rol_id, creado_por || null, contratista_id || null],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

/**
 * Actualizar último acceso del usuario
 * @param {number} userId
 * @returns {Promise<void>}
 */
function updateLastAccess(userId) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = ?`,
      [userId],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

/**
 * Listar todos los usuarios
 * @returns {Promise<Array>}
 */
function getAllUsers() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT u.id, u.username, u.nombre_completo, u.email, u.activo,
              u.fecha_creacion, u.ultimo_acceso,
              r.nombre as rol_nombre
       FROM usuarios u
       INNER JOIN roles r ON u.rol_id = r.id
       ORDER BY u.fecha_creacion DESC`,
      [],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
}

/**
 * Actualizar usuario
 * @param {number} userId
 * @param {object} updateData
 * @returns {Promise<void>}
 */
function updateUser(userId, updateData) {
  const { nombre_completo, email, rol_id, activo, contratista_id } = updateData;

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE usuarios
       SET nombre_completo = COALESCE(?, nombre_completo),
           email = COALESCE(?, email),
           rol_id = COALESCE(?, rol_id),
           activo = COALESCE(?, activo),
           contratista_id = ?
       WHERE id = ?`,
      [nombre_completo, email, rol_id, activo, contratista_id !== undefined ? contratista_id : null, userId],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

/**
 * Cambiar contraseña de usuario
 * @param {number} userId
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
async function changePassword(userId, newPassword) {
  const passwordHash = await hashPassword(newPassword);

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE usuarios SET password_hash = ? WHERE id = ?`,
      [passwordHash, userId],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

module.exports = {
  getUserByUsername,
  getUserById,
  getUserPermissions,
  userHasPermission,
  createUser,
  updateLastAccess,
  getAllUsers,
  updateUser,
  changePassword
};
