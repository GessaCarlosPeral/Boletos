const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');

// ==================== GESTIÓN DE ROLES ====================

// Obtener todos los roles
router.get('/', requireAuth, requirePermission('usuarios.leer'), async (req, res) => {
  try {
    const sql = `
      SELECT
        r.id,
        r.nombre,
        r.descripcion,
        r.nivel_acceso,
        r.fecha_creacion,
        COUNT(DISTINCT u.id) as total_usuarios,
        COUNT(DISTINCT rp.permiso_id) as total_permisos
      FROM roles r
      LEFT JOIN usuarios u ON r.id = u.rol_id AND u.activo = 1
      LEFT JOIN roles_permisos rp ON r.id = rp.rol_id
      GROUP BY r.id, r.nombre, r.descripcion, r.nivel_acceso, r.fecha_creacion
      ORDER BY r.nivel_acceso DESC
    `;

    db.all(sql, [], (err, roles) => {
      if (err) {
        console.error('Error obteniendo roles:', err);
        return res.status(500).json({ success: false, error: err.message });
      }

      res.json({ success: true, roles });
    });

  } catch (error) {
    console.error('Error en GET /roles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener un rol específico con sus permisos
router.get('/:id', requireAuth, requirePermission('usuarios.leer'), async (req, res) => {
  try {
    const { id } = req.params;

    const sqlRol = 'SELECT * FROM roles WHERE id = ?';

    db.get(sqlRol, [id], (err, rol) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      if (!rol) {
        return res.status(404).json({ success: false, error: 'Rol no encontrado' });
      }

      // Obtener permisos del rol
      const sqlPermisos = `
        SELECT p.id, p.codigo, p.nombre, p.descripcion, p.modulo
        FROM permisos p
        INNER JOIN roles_permisos rp ON p.id = rp.permiso_id
        WHERE rp.rol_id = ?
      `;

      db.all(sqlPermisos, [id], (err, permisos) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }

        res.json({ success: true, rol, permisos });
      });
    });

  } catch (error) {
    console.error('Error en GET /roles/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Crear nuevo rol
router.post('/', requireAuth, requirePermission('usuarios.crear'), async (req, res) => {
  try {
    const { nombre, descripcion, nivel_acceso, permisos } = req.body;

    if (!nombre || !nivel_acceso) {
      return res.status(400).json({
        success: false,
        error: 'Nombre y nivel de acceso son requeridos'
      });
    }

    // Verificar que el nombre no exista
    const sqlCheck = 'SELECT id FROM roles WHERE nombre = ?';

    db.get(sqlCheck, [nombre], (err, existente) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      if (existente) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un rol con ese nombre'
        });
      }

      // Insertar rol
      const sqlInsert = `
        INSERT INTO roles (nombre, descripcion, nivel_acceso)
        VALUES (?, ?, ?)
      `;

      db.run(sqlInsert, [nombre, descripcion || null, nivel_acceso], function(err) {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }

        const rolId = this.lastID;

        // Asignar permisos si se proporcionaron
        if (permisos && permisos.length > 0) {
          const sqlPermisos = 'INSERT INTO roles_permisos (rol_id, permiso_id) VALUES (?, ?)';
          const stmt = db.prepare(sqlPermisos);

          permisos.forEach(permisoId => {
            stmt.run([rolId, permisoId]);
          });

          stmt.finalize((err) => {
            if (err) {
              return res.status(500).json({ success: false, error: err.message });
            }

            res.json({
              success: true,
              message: 'Rol creado exitosamente',
              rol: { id: rolId, nombre, descripcion, nivel_acceso }
            });
          });
        } else {
          res.json({
            success: true,
            message: 'Rol creado exitosamente',
            rol: { id: rolId, nombre, descripcion, nivel_acceso }
          });
        }
      });
    });

  } catch (error) {
    console.error('Error en POST /roles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Actualizar rol
router.put('/:id', requireAuth, requirePermission('usuarios.actualizar'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, nivel_acceso, permisos } = req.body;

    if (!nombre || !nivel_acceso) {
      return res.status(400).json({
        success: false,
        error: 'Nombre y nivel de acceso son requeridos'
      });
    }

    // Verificar que el rol exista
    const sqlCheck = 'SELECT id FROM roles WHERE id = ?';

    db.get(sqlCheck, [id], (err, rol) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      if (!rol) {
        return res.status(404).json({ success: false, error: 'Rol no encontrado' });
      }

      // Verificar que el nombre no esté duplicado
      const sqlDuplicate = 'SELECT id FROM roles WHERE nombre = ? AND id != ?';

      db.get(sqlDuplicate, [nombre, id], (err, duplicado) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        if (duplicado) {
          return res.status(400).json({
            success: false,
            error: 'Ya existe otro rol con ese nombre'
          });
        }

        // Actualizar rol
        const sqlUpdate = `
          UPDATE roles
          SET nombre = ?, descripcion = ?, nivel_acceso = ?
          WHERE id = ?
        `;

        db.run(sqlUpdate, [nombre, descripcion || null, nivel_acceso, id], function(err) {
          if (err) {
            return res.status(500).json({ success: false, error: err.message });
          }

          // Actualizar permisos si se proporcionaron
          if (permisos !== undefined) {
            // Eliminar permisos actuales
            const sqlDelete = 'DELETE FROM roles_permisos WHERE rol_id = ?';

            db.run(sqlDelete, [id], (err) => {
              if (err) {
                return res.status(500).json({ success: false, error: err.message });
              }

              // Insertar nuevos permisos
              if (permisos.length > 0) {
                const sqlPermisos = 'INSERT INTO roles_permisos (rol_id, permiso_id) VALUES (?, ?)';
                const stmt = db.prepare(sqlPermisos);

                permisos.forEach(permisoId => {
                  stmt.run([id, permisoId]);
                });

                stmt.finalize((err) => {
                  if (err) {
                    return res.status(500).json({ success: false, error: err.message });
                  }

                  res.json({
                    success: true,
                    message: 'Rol actualizado exitosamente'
                  });
                });
              } else {
                res.json({
                  success: true,
                  message: 'Rol actualizado exitosamente'
                });
              }
            });
          } else {
            res.json({
              success: true,
              message: 'Rol actualizado exitosamente'
            });
          }
        });
      });
    });

  } catch (error) {
    console.error('Error en PUT /roles/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Eliminar rol
router.delete('/:id', requireAuth, requirePermission('usuarios.eliminar'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el rol exista
    const sqlCheck = 'SELECT id, nombre FROM roles WHERE id = ?';

    db.get(sqlCheck, [id], (err, rol) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      if (!rol) {
        return res.status(404).json({ success: false, error: 'Rol no encontrado' });
      }

      // Verificar que no haya usuarios con este rol
      const sqlUsuarios = 'SELECT COUNT(*) as total FROM usuarios WHERE rol_id = ? AND activo = 1';

      db.get(sqlUsuarios, [id], (err, result) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        if (result.total > 0) {
          return res.status(400).json({
            success: false,
            error: `No se puede eliminar el rol porque tiene ${result.total} usuario(s) activo(s) asignado(s)`
          });
        }

        // Eliminar permisos del rol
        const sqlDeletePermisos = 'DELETE FROM roles_permisos WHERE rol_id = ?';

        db.run(sqlDeletePermisos, [id], (err) => {
          if (err) {
            return res.status(500).json({ success: false, error: err.message });
          }

          // Eliminar rol
          const sqlDelete = 'DELETE FROM roles WHERE id = ?';

          db.run(sqlDelete, [id], function(err) {
            if (err) {
              return res.status(500).json({ success: false, error: err.message });
            }

            res.json({
              success: true,
              message: 'Rol eliminado exitosamente'
            });
          });
        });
      });
    });

  } catch (error) {
    console.error('Error en DELETE /roles/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener todos los permisos disponibles (para asignar a roles)
router.get('/permisos/disponibles', requireAuth, requirePermission('usuarios.leer'), async (req, res) => {
  try {
    const sql = `
      SELECT id, codigo, nombre, descripcion, modulo
      FROM permisos
      ORDER BY modulo, nombre
    `;

    db.all(sql, [], (err, permisos) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }

      // Agrupar permisos por módulo
      const permisosPorModulo = permisos.reduce((acc, permiso) => {
        if (!acc[permiso.modulo]) {
          acc[permiso.modulo] = [];
        }
        acc[permiso.modulo].push(permiso);
        return acc;
      }, {});

      res.json({ success: true, permisos, permisosPorModulo });
    });

  } catch (error) {
    console.error('Error en GET /permisos/disponibles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
