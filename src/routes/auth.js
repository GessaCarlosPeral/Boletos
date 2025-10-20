const express = require('express');
const router = express.Router();
const { comparePassword, generateToken, verifyToken, extractToken } = require('../services/authService');
const { getUserByUsername, getUserById, getUserPermissions, updateLastAccess } = require('../services/userService');
const db = require('../database/db');

/**
 * POST /api/auth/login
 * Login de usuario
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validar datos requeridos
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username y password son requeridos'
      });
    }

    // Obtener usuario
    const user = await getUserByUsername(username);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar contraseña
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Obtener permisos del usuario
    const permissions = await getUserPermissions(user.id);
    const permissionCodes = permissions.map(p => p.codigo);

    // Actualizar último acceso
    await updateLastAccess(user.id);

    // Generar token JWT
    const token = generateToken({
      userId: user.id,
      username: user.username,
      rol: user.rol_nombre,
      nivelAcceso: user.nivel_acceso
    });

    // Guardar sesión en base de datos
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 24);

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO sesiones (usuario_id, token, ip_address, user_agent, fecha_expiracion)
         VALUES (?, ?, ?, ?, ?)`,
        [user.id, token, req.ip, req.headers['user-agent'], expirationDate.toISOString()],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Respuesta exitosa
    res.json({
      success: true,
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        username: user.username,
        nombre: user.nombre_completo,
        email: user.email,
        rol: user.rol_nombre,
        nivelAcceso: user.nivel_acceso,
        permisos: permissionCodes
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor'
    });
  }
});

/**
 * POST /api/auth/logout
 * Cerrar sesión
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);

    if (token) {
      // Invalidar sesión en base de datos
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE sesiones SET activa = 0 WHERE token = ?`,
          [token],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    res.json({
      success: true,
      message: 'Logout exitoso'
    });

  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor'
    });
  }
});

/**
 * GET /api/auth/verify
 * Verificar si el token es válido y obtener información del usuario
 */
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token no proporcionado'
      });
    }

    // Verificar token JWT
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    // Verificar que la sesión esté activa en la base de datos
    const session = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM sesiones WHERE token = ? AND activa = 1`,
        [token],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Sesión inválida o expirada'
      });
    }

    // Obtener información actualizada del usuario
    const user = await getUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Obtener permisos del usuario
    const permissions = await getUserPermissions(user.id);
    const permissionCodes = permissions.map(p => p.codigo);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        nombre: user.nombre_completo,
        email: user.email,
        rol: user.rol_nombre,
        nivelAcceso: user.nivel_acceso,
        permisos: permissionCodes
      }
    });

  } catch (error) {
    console.error('Error en verify:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor'
    });
  }
});

/**
 * GET /api/auth/me
 * Obtener información del usuario actual (requiere autenticación)
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    const user = await getUserById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const permissions = await getUserPermissions(user.id);
    const permissionCodes = permissions.map(p => p.codigo);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        nombre: user.nombre_completo,
        email: user.email,
        rol: user.rol_nombre,
        nivelAcceso: user.nivel_acceso,
        permisos: permissionCodes
      }
    });

  } catch (error) {
    console.error('Error en /me:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor'
    });
  }
});

module.exports = router;
