const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');
const { auditUsuario } = require('../middleware/auditMiddleware');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  changePassword
} = require('../services/userService');
const { registrarAuditoria } = require('../services/auditService');
const db = require('../database/db');

/**
 * GET /api/usuarios
 * Listar todos los usuarios con filtros opcionales
 */
router.get('/', requireAuth, requirePermission('usuarios.leer'), async (req, res) => {
  try {
    const { rol, estado } = req.query;

    let query = `
      SELECT u.id, u.username, u.nombre_completo, u.email, u.activo,
             u.fecha_creacion, u.ultimo_acceso,
             r.id as rol_id, r.nombre as rol_nombre,
             creador.nombre_completo as creado_por_nombre
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id
      LEFT JOIN usuarios creador ON u.creado_por = creador.id
    `;

    const params = [];
    const conditions = [];

    if (rol) {
      conditions.push('r.id = ?');
      params.push(parseInt(rol));
    }

    if (estado !== undefined) {
      conditions.push('u.activo = ?');
      params.push(estado === 'activo' ? 1 : 0);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY u.fecha_creacion DESC';

    db.all(query, params, (err, usuarios) => {
      if (err) {
        console.error('Error obteniendo usuarios:', err);
        return res.status(500).json({
          success: false,
          error: 'Error al obtener usuarios'
        });
      }

      res.json({
        success: true,
        usuarios
      });
    });

  } catch (error) {
    console.error('Error en GET /usuarios:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/usuarios/:id
 * Obtener detalles de un usuario específico
 */
router.get('/:id', requireAuth, requirePermission('usuarios.leer'), async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await getUserById(parseInt(id));

    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // No devolver el hash de la contraseña
    delete usuario.password_hash;

    res.json({
      success: true,
      usuario
    });

  } catch (error) {
    console.error('Error en GET /usuarios/:id:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/usuarios
 * Crear nuevo usuario
 */
router.post('/', requireAuth, requirePermission('usuarios.crear'), auditUsuario('CREATE'), async (req, res) => {
  try {
    const { username, password, nombre_completo, email, rol_id, contratista_id } = req.body;

    // Validar datos requeridos
    if (!username || !password || !nombre_completo || !email || !rol_id) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos son requeridos'
      });
    }

    // Validar longitud de contraseña
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Email inválido'
      });
    }

    // Crear usuario
    const datosUsuario = {
      username,
      password,
      nombre_completo,
      email,
      rol_id: parseInt(rol_id),
      creado_por: req.user.id
    };

    // Agregar contratista_id solo si se proporciona
    if (contratista_id) {
      datosUsuario.contratista_id = parseInt(contratista_id);
    }

    const userId = await createUser(datosUsuario);

    res.json({
      success: true,
      mensaje: 'Usuario creado exitosamente',
      userId
    });

  } catch (error) {
    console.error('Error en POST /usuarios:', error);

    // Manejar errores de duplicados
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      if (error.message.includes('username')) {
        return res.status(400).json({
          success: false,
          error: 'El username ya está en uso'
        });
      }
      if (error.message.includes('email')) {
        return res.status(400).json({
          success: false,
          error: 'El email ya está en uso'
        });
      }
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/usuarios/:id
 * Actualizar datos del usuario
 */
router.put('/:id', requireAuth, requirePermission('usuarios.actualizar'), auditUsuario('UPDATE'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_completo, email, rol_id, activo, contratista_id } = req.body;

    const userId = parseInt(id);

    // No permitir modificar el usuario admin principal (ID 1)
    if (userId === 1 && req.user.id !== 1) {
      return res.status(403).json({
        success: false,
        error: 'No puedes modificar el usuario administrador principal'
      });
    }

    // No permitir auto-desactivación
    if (req.user.id === userId && activo === 0) {
      return res.status(400).json({
        success: false,
        error: 'No puedes desactivar tu propia cuenta'
      });
    }

    const datosActualizar = { nombre_completo, email, rol_id, activo };

    // Agregar contratista_id solo si se proporciona
    if (contratista_id !== undefined) {
      datosActualizar.contratista_id = contratista_id ? parseInt(contratista_id) : null;
    }

    await updateUser(userId, datosActualizar);

    res.json({
      success: true,
      mensaje: 'Usuario actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error en PUT /usuarios/:id:', error);

    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      if (error.message.includes('email')) {
        return res.status(400).json({
          success: false,
          error: 'El email ya está en uso'
        });
      }
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/usuarios/:id/toggle-status
 * Activar/Desactivar usuario
 */
router.patch('/:id/toggle-status', requireAuth, requirePermission('usuarios.actualizar'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    // No permitir desactivar el usuario admin principal
    if (userId === 1) {
      return res.status(403).json({
        success: false,
        error: 'No puedes desactivar el usuario administrador principal'
      });
    }

    // No permitir auto-desactivación
    if (req.user.id === userId) {
      return res.status(400).json({
        success: false,
        error: 'No puedes desactivar tu propia cuenta'
      });
    }

    // Obtener estado actual
    const usuario = await getUserById(userId);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const nuevoEstado = usuario.activo === 1 ? 0 : 1;

    await updateUser(userId, { activo: nuevoEstado });

    // Registrar en auditoría
    await registrarAuditoria(
      req.user.id,
      nuevoEstado === 1 ? 'ACTIVATE' : 'DEACTIVATE',
      'usuarios',
      userId,
      { accion: nuevoEstado === 1 ? 'Activado' : 'Desactivado', usuario: usuario.username },
      req.ip
    );

    res.json({
      success: true,
      mensaje: `Usuario ${nuevoEstado === 1 ? 'activado' : 'desactivado'} exitosamente`,
      activo: nuevoEstado
    });

  } catch (error) {
    console.error('Error en PATCH /usuarios/:id/toggle-status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/usuarios/:id/reset-password
 * Cambiar contraseña de usuario
 */
router.patch('/:id/reset-password', requireAuth, requirePermission('usuarios.actualizar'), async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: 'La nueva contraseña es requerida'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const userId = parseInt(id);
    const usuario = await getUserById(userId);

    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    await changePassword(userId, newPassword);

    // Registrar en auditoría
    await registrarAuditoria(
      req.user.id,
      'PASSWORD_RESET',
      'usuarios',
      userId,
      { accion: 'Contraseña restablecida', usuario: usuario.username },
      req.ip
    );

    res.json({
      success: true,
      mensaje: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error en PATCH /usuarios/:id/reset-password:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/usuarios/:id/actividad
 * Obtener historial de actividad de un usuario
 */
router.get('/:id/actividad', requireAuth, requirePermission('usuarios.leer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { limite, accion } = req.query;

    let query = `
      SELECT a.*, u.username, u.nombre_completo
      FROM auditoria a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.usuario_id = ?
    `;

    const params = [parseInt(id)];

    if (accion) {
      query += ' AND a.accion = ?';
      params.push(accion);
    }

    query += ' ORDER BY a.fecha DESC';

    if (limite) {
      query += ' LIMIT ?';
      params.push(parseInt(limite));
    } else {
      query += ' LIMIT 100';
    }

    db.all(query, params, (err, actividad) => {
      if (err) {
        console.error('Error obteniendo actividad:', err);
        return res.status(500).json({
          success: false,
          error: 'Error al obtener actividad'
        });
      }

      // Parse detalles JSON
      const actividadParsed = actividad.map(a => ({
        ...a,
        detalles: a.detalles ? JSON.parse(a.detalles) : null
      }));

      res.json({
        success: true,
        actividad: actividadParsed
      });
    });

  } catch (error) {
    console.error('Error en GET /usuarios/:id/actividad:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/usuarios/roles/lista
 * Obtener lista de roles disponibles
 */
router.get('/roles/lista', requireAuth, requirePermission('usuarios.leer'), async (req, res) => {
  try {
    db.all('SELECT * FROM roles ORDER BY nivel_acceso DESC', [], (err, roles) => {
      if (err) {
        console.error('Error obteniendo roles:', err);
        return res.status(500).json({
          success: false,
          error: 'Error al obtener roles'
        });
      }

      res.json({
        success: true,
        roles
      });
    });

  } catch (error) {
    console.error('Error en GET /usuarios/roles/lista:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
