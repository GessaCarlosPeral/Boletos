const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');

// ==================== GESTIÓN DE CONTRATISTAS ====================

// Obtener todos los contratistas
router.get('/', requireAuth, async (req, res) => {
  try {
    const sql = `
      SELECT
        c.id,
        c.nombre,
        c.codigo,
        c.fecha_creacion,
        c.activo,
        COUNT(DISTINCT co.id) as total_comedores,
        COUNT(DISTINCT l.id) as total_lotes
      FROM contratistas c
      LEFT JOIN comedores co ON c.id = co.contratista_id AND co.activo = 1
      LEFT JOIN lotes l ON c.nombre = l.contratista
      GROUP BY c.id, c.nombre, c.codigo, c.fecha_creacion, c.activo
      ORDER BY c.nombre ASC
    `;

    db.all(sql, [], (err, contratistas) => {
      if (err) {
        console.error('Error obteniendo contratistas:', err);
        return res.status(500).json({ success: false, error: err.message });
      }

      res.json({ success: true, contratistas });
    });

  } catch (error) {
    console.error('Error en GET /contratistas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener un contratista específico con sus comedores
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const sqlContratista = 'SELECT * FROM contratistas WHERE id = ?';

    db.get(sqlContratista, [id], (err, contratista) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      if (!contratista) {
        return res.status(404).json({ success: false, error: 'Contratista no encontrado' });
      }

      // Obtener comedores del contratista
      const sqlComedores = `
        SELECT * FROM comedores
        WHERE contratista_id = ? AND activo = 1
        ORDER BY nombre ASC
      `;

      db.all(sqlComedores, [id], (err, comedores) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }

        res.json({ success: true, contratista, comedores });
      });
    });

  } catch (error) {
    console.error('Error en GET /contratistas/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Crear nuevo contratista
router.post('/', requireAuth, requirePermission('boletos.crear'), async (req, res) => {
  try {
    const { nombre, codigo } = req.body;

    if (!nombre) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del contratista es requerido'
      });
    }

    // Generar código automático si no se proporciona
    const codigoFinal = codigo || generarCodigo(nombre);

    // Verificar que el nombre no exista
    const sqlCheck = 'SELECT id FROM contratistas WHERE nombre = ?';

    db.get(sqlCheck, [nombre], (err, existente) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      if (existente) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un contratista con ese nombre'
        });
      }

      // Verificar que el código no exista
      const sqlCheckCodigo = 'SELECT id FROM contratistas WHERE codigo = ?';

      db.get(sqlCheckCodigo, [codigoFinal], (err, existenteCodigo) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        if (existenteCodigo) {
          return res.status(400).json({
            success: false,
            error: 'Ya existe un contratista con ese código'
          });
        }

        // Insertar contratista
        const sqlInsert = `
          INSERT INTO contratistas (nombre, codigo)
          VALUES (?, ?)
        `;

        db.run(sqlInsert, [nombre, codigoFinal], function(err) {
          if (err) {
            return res.status(500).json({ success: false, error: err.message });
          }

          res.json({
            success: true,
            message: 'Contratista creado exitosamente',
            contratista: {
              id: this.lastID,
              nombre,
              codigo: codigoFinal,
              activo: 1
            }
          });
        });
      });
    });

  } catch (error) {
    console.error('Error en POST /contratistas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Actualizar contratista
router.put('/:id', requireAuth, requirePermission('boletos.crear'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, codigo } = req.body;

    if (!nombre) {
      return res.status(400).json({
        success: false,
        error: 'El nombre del contratista es requerido'
      });
    }

    // Verificar que el contratista exista
    const sqlCheck = 'SELECT id FROM contratistas WHERE id = ?';

    db.get(sqlCheck, [id], (err, contratista) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      if (!contratista) {
        return res.status(404).json({ success: false, error: 'Contratista no encontrado' });
      }

      // Verificar que el nombre no esté duplicado
      const sqlDuplicate = 'SELECT id FROM contratistas WHERE nombre = ? AND id != ?';

      db.get(sqlDuplicate, [nombre, id], (err, duplicado) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        if (duplicado) {
          return res.status(400).json({
            success: false,
            error: 'Ya existe otro contratista con ese nombre'
          });
        }

        // Verificar que el código no esté duplicado
        if (codigo) {
          const sqlDuplicateCodigo = 'SELECT id FROM contratistas WHERE codigo = ? AND id != ?';

          db.get(sqlDuplicateCodigo, [codigo, id], (err, duplicadoCodigo) => {
            if (err) {
              return res.status(500).json({ success: false, error: err.message });
            }
            if (duplicadoCodigo) {
              return res.status(400).json({
                success: false,
                error: 'Ya existe otro contratista con ese código'
              });
            }

            actualizarContratista(id, nombre, codigo, res);
          });
        } else {
          actualizarContratista(id, nombre, null, res);
        }
      });
    });

  } catch (error) {
    console.error('Error en PUT /contratistas/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Función auxiliar para actualizar contratista
function actualizarContratista(id, nombre, codigo, res) {
  const sqlUpdate = codigo
    ? 'UPDATE contratistas SET nombre = ?, codigo = ? WHERE id = ?'
    : 'UPDATE contratistas SET nombre = ? WHERE id = ?';

  const params = codigo ? [nombre, codigo, id] : [nombre, id];

  db.run(sqlUpdate, params, function(err) {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }

    res.json({
      success: true,
      message: 'Contratista actualizado exitosamente'
    });
  });
}

// Desactivar/Activar contratista
router.patch('/:id/toggle', requireAuth, requirePermission('boletos.crear'), async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener estado actual
    const sqlGet = 'SELECT activo FROM contratistas WHERE id = ?';

    db.get(sqlGet, [id], (err, contratista) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      if (!contratista) {
        return res.status(404).json({ success: false, error: 'Contratista no encontrado' });
      }

      const nuevoEstado = contratista.activo === 1 ? 0 : 1;

      const sqlUpdate = 'UPDATE contratistas SET activo = ? WHERE id = ?';

      db.run(sqlUpdate, [nuevoEstado, id], function(err) {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }

        res.json({
          success: true,
          message: `Contratista ${nuevoEstado === 1 ? 'activado' : 'desactivado'} exitosamente`,
          activo: nuevoEstado
        });
      });
    });

  } catch (error) {
    console.error('Error en PATCH /contratistas/:id/toggle:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Eliminar contratista (solo si no tiene comedores ni lotes)
router.delete('/:id', requireAuth, requirePermission('usuarios.eliminar'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el contratista exista
    const sqlCheck = 'SELECT id, nombre FROM contratistas WHERE id = ?';

    db.get(sqlCheck, [id], (err, contratista) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      if (!contratista) {
        return res.status(404).json({ success: false, error: 'Contratista no encontrado' });
      }

      // Verificar que no tenga comedores activos
      const sqlComedores = 'SELECT COUNT(*) as total FROM comedores WHERE contratista_id = ? AND activo = 1';

      db.get(sqlComedores, [id], (err, result) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }
        if (result.total > 0) {
          return res.status(400).json({
            success: false,
            error: `No se puede eliminar el contratista porque tiene ${result.total} comedor(es) activo(s)`
          });
        }

        // Verificar que no tenga lotes
        const sqlLotes = 'SELECT COUNT(*) as total FROM lotes WHERE contratista = ?';

        db.get(sqlLotes, [contratista.nombre], (err, result) => {
          if (err) {
            return res.status(500).json({ success: false, error: err.message });
          }
          if (result.total > 0) {
            return res.status(400).json({
              success: false,
              error: `No se puede eliminar el contratista porque tiene ${result.total} lote(s) registrado(s)`
            });
          }

          // Eliminar contratista
          const sqlDelete = 'DELETE FROM contratistas WHERE id = ?';

          db.run(sqlDelete, [id], function(err) {
            if (err) {
              return res.status(500).json({ success: false, error: err.message });
            }

            res.json({
              success: true,
              message: 'Contratista eliminado exitosamente'
            });
          });
        });
      });
    });

  } catch (error) {
    console.error('Error en DELETE /contratistas/:id:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Función auxiliar para generar código
function generarCodigo(nombre) {
  // Tomar las primeras letras de cada palabra
  const palabras = nombre.toUpperCase().split(' ');
  let codigo = '';

  if (palabras.length === 1) {
    // Si es una sola palabra, tomar las primeras 4 letras
    codigo = palabras[0].substring(0, 4);
  } else {
    // Si son varias palabras, tomar inicial de cada una (máximo 6)
    codigo = palabras.slice(0, 6).map(p => p[0]).join('');
  }

  return codigo;
}

module.exports = router;
