const { verifyToken, extractToken } = require('../services/authService');
const { getUserById, userHasPermission } = require('../services/userService');
const db = require('../database/db');

/**
 * Middleware para verificar autenticación JWT
 * Verifica que el token sea válido y que la sesión esté activa
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado. Token no proporcionado.'
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

    // Obtener información del usuario
    const user = await getUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Adjuntar información del usuario al request
    req.user = {
      id: user.id,
      username: user.username,
      nombre: user.nombre_completo,
      email: user.email,
      rol: user.rol_nombre,
      nivelAcceso: user.nivel_acceso,
      rolId: user.rol_id
    };

    next();

  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor'
    });
  }
}

/**
 * Middleware para verificar permisos específicos
 * Uso: requirePermission('boletos.crear')
 * @param {string} permissionCode - Código del permiso requerido
 */
function requirePermission(permissionCode) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'No autenticado'
        });
      }

      const hasPermission = await userHasPermission(req.user.id, permissionCode);

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Permiso denegado. Se requiere: ${permissionCode}`
        });
      }

      next();

    } catch (error) {
      console.error('Error en middleware de permisos:', error);
      res.status(500).json({
        success: false,
        message: 'Error en el servidor'
      });
    }
  };
}

/**
 * Middleware para verificar múltiples permisos (requiere AL MENOS UNO)
 * Uso: requireAnyPermission(['boletos.crear', 'boletos.actualizar'])
 * @param {Array} permissionCodes - Array de códigos de permisos
 */
function requireAnyPermission(permissionCodes) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'No autenticado'
        });
      }

      for (const permissionCode of permissionCodes) {
        const hasPermission = await userHasPermission(req.user.id, permissionCode);
        if (hasPermission) {
          return next();
        }
      }

      return res.status(403).json({
        success: false,
        message: `Permiso denegado. Se requiere uno de: ${permissionCodes.join(', ')}`
      });

    } catch (error) {
      console.error('Error en middleware de permisos:', error);
      res.status(500).json({
        success: false,
        message: 'Error en el servidor'
      });
    }
  };
}

/**
 * Middleware para verificar múltiples permisos (requiere TODOS)
 * Uso: requireAllPermissions(['boletos.crear', 'boletos.autorizar'])
 * @param {Array} permissionCodes - Array de códigos de permisos
 */
function requireAllPermissions(permissionCodes) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'No autenticado'
        });
      }

      for (const permissionCode of permissionCodes) {
        const hasPermission = await userHasPermission(req.user.id, permissionCode);
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: `Permiso denegado. Se requiere: ${permissionCode}`
          });
        }
      }

      next();

    } catch (error) {
      console.error('Error en middleware de permisos:', error);
      res.status(500).json({
        success: false,
        message: 'Error en el servidor'
      });
    }
  };
}

/**
 * Middleware para verificar rol específico
 * Uso: requireRole('administrador')
 * @param {string} roleName - Nombre del rol requerido
 */
function requireRole(roleName) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'No autenticado'
        });
      }

      if (req.user.rol !== roleName) {
        return res.status(403).json({
          success: false,
          message: `Acceso denegado. Se requiere rol: ${roleName}`
        });
      }

      next();

    } catch (error) {
      console.error('Error en middleware de rol:', error);
      res.status(500).json({
        success: false,
        message: 'Error en el servidor'
      });
    }
  };
}

/**
 * Middleware para verificar nivel de acceso mínimo
 * Uso: requireAccessLevel(3) // Nivel 3 = Administrador
 * @param {number} minLevel - Nivel mínimo de acceso requerido
 */
function requireAccessLevel(minLevel) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'No autenticado'
        });
      }

      if (req.user.nivelAcceso < minLevel) {
        return res.status(403).json({
          success: false,
          message: `Acceso denegado. Nivel insuficiente.`
        });
      }

      next();

    } catch (error) {
      console.error('Error en middleware de nivel de acceso:', error);
      res.status(500).json({
        success: false,
        message: 'Error en el servidor'
      });
    }
  };
}

module.exports = {
  requireAuth,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  requireAccessLevel
};
