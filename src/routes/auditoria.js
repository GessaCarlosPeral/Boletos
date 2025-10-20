const express = require('express');
const router = express.Router();
const auditService = require('../services/auditService');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');

/**
 * Rutas para consultar auditoría del sistema
 * Solo accesible para administradores y usuarios con permiso reportes.auditoria
 */

// Obtener historial de auditoría con filtros
router.get('/historial', requireAuth, requirePermission('reportes.auditoria'), async (req, res) => {
  try {
    const { usuarioId, accion, tabla, desde, hasta, limite } = req.query;

    const filtros = {};
    if (usuarioId) filtros.usuarioId = parseInt(usuarioId);
    if (accion) filtros.accion = accion;
    if (tabla) filtros.tabla = tabla;
    if (desde) filtros.desde = desde;
    if (hasta) filtros.hasta = hasta;

    const historial = await auditService.obtenerHistorial(
      filtros,
      limite ? parseInt(limite) : 100
    );

    res.json({
      success: true,
      registros: historial.length,
      historial
    });

  } catch (error) {
    console.error('Error obteniendo historial de auditoría:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener historial de un registro específico
router.get('/registro/:tabla/:registroId', requireAuth, requirePermission('reportes.auditoria'), async (req, res) => {
  try {
    const { tabla, registroId } = req.params;

    const historial = await auditService.obtenerHistorialRegistro(tabla, parseInt(registroId));

    res.json({
      success: true,
      tabla,
      registroId: parseInt(registroId),
      cambios: historial.length,
      historial
    });

  } catch (error) {
    console.error('Error obteniendo historial del registro:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener estadísticas de auditoría
router.get('/estadisticas', requireAuth, requirePermission('reportes.auditoria'), async (req, res) => {
  try {
    const { usuarioId, desde, hasta } = req.query;

    const filtros = {};
    if (usuarioId) filtros.usuarioId = parseInt(usuarioId);
    if (desde) filtros.desde = desde;
    if (hasta) filtros.hasta = hasta;

    const estadisticas = await auditService.obtenerEstadisticas(filtros);

    res.json({
      success: true,
      estadisticas
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de auditoría:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener actividad reciente de un usuario
router.get('/usuario/:usuarioId', requireAuth, requirePermission('reportes.auditoria'), async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const { limite } = req.query;

    const actividad = await auditService.obtenerActividadUsuario(
      parseInt(usuarioId),
      limite ? parseInt(limite) : 20
    );

    res.json({
      success: true,
      usuarioId: parseInt(usuarioId),
      registros: actividad.length,
      actividad
    });

  } catch (error) {
    console.error('Error obteniendo actividad del usuario:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener actividad propia (cualquier usuario autenticado)
router.get('/mi-actividad', requireAuth, async (req, res) => {
  try {
    const { limite } = req.query;

    const actividad = await auditService.obtenerActividadUsuario(
      req.user.id,
      limite ? parseInt(limite) : 20
    );

    res.json({
      success: true,
      registros: actividad.length,
      actividad
    });

  } catch (error) {
    console.error('Error obteniendo actividad propia:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
