const db = require('../database/db');

/**
 * Servicio para registrar auditoría de acciones en el sistema
 * Registra automáticamente todas las operaciones críticas
 */

/**
 * Registrar un evento de auditoría
 * @param {number} usuarioId - ID del usuario que ejecuta la acción
 * @param {string} accion - Tipo de acción (CREATE, UPDATE, DELETE, READ, AUTHORIZE, etc.)
 * @param {string} tabla - Tabla afectada
 * @param {number} registroId - ID del registro afectado (opcional)
 * @param {object} detalles - Detalles adicionales de la acción
 * @param {string} ipAddress - IP del usuario
 * @returns {Promise<number>} ID del registro de auditoría
 */
function registrarAuditoria(usuarioId, accion, tabla, registroId = null, detalles = null, ipAddress = null, modulo = 'sistema') {
  return new Promise((resolve, reject) => {
    const detallesJSON = detalles ? JSON.stringify(detalles) : null;

    db.run(
      `INSERT INTO auditoria (usuario_id, accion, modulo, tabla_afectada, registro_id, detalles, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [usuarioId, accion, modulo, tabla, registroId, detallesJSON, ipAddress],
      function(err) {
        if (err) {
          console.error('Error registrando auditoría:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

/**
 * Obtener historial de auditoría con filtros
 * @param {object} filtros - Filtros opcionales (usuarioId, accion, tabla, desde, hasta)
 * @param {number} limite - Número máximo de registros (default: 100)
 * @returns {Promise<Array>}
 */
function obtenerHistorial(filtros = {}, limite = 100) {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT
        a.*,
        u.username,
        u.nombre_completo as usuario_nombre
      FROM auditoria a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      WHERE 1=1
    `;

    const params = [];

    if (filtros.usuarioId) {
      query += ' AND a.usuario_id = ?';
      params.push(filtros.usuarioId);
    }

    if (filtros.accion) {
      query += ' AND a.accion = ?';
      params.push(filtros.accion);
    }

    if (filtros.tabla) {
      query += ' AND a.tabla_afectada = ?';
      params.push(filtros.tabla);
    }

    if (filtros.desde) {
      query += ' AND a.fecha_hora >= ?';
      params.push(filtros.desde);
    }

    if (filtros.hasta) {
      query += ' AND a.fecha_hora <= ?';
      params.push(filtros.hasta);
    }

    query += ' ORDER BY a.fecha_hora DESC LIMIT ?';
    params.push(limite);

    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        // Parsear detalles JSON
        const rowsParsed = rows.map(row => ({
          ...row,
          detalles: row.detalles ? JSON.parse(row.detalles) : null
        }));
        resolve(rowsParsed);
      }
    });
  });
}

/**
 * Obtener historial de un registro específico
 * @param {string} tabla - Nombre de la tabla
 * @param {number} registroId - ID del registro
 * @returns {Promise<Array>}
 */
function obtenerHistorialRegistro(tabla, registroId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        a.*,
        u.username,
        u.nombre_completo as usuario_nombre
      FROM auditoria a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.tabla_afectada = ? AND a.registro_id = ?
      ORDER BY a.fecha_hora DESC
    `;

    db.all(query, [tabla, registroId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const rowsParsed = rows.map(row => ({
          ...row,
          detalles: row.detalles ? JSON.parse(row.detalles) : null
        }));
        resolve(rowsParsed);
      }
    });
  });
}

/**
 * Obtener estadísticas de auditoría
 * @param {object} filtros - Filtros opcionales (usuarioId, desde, hasta)
 * @returns {Promise<object>}
 */
function obtenerEstadisticas(filtros = {}) {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT
        COUNT(*) as total_acciones,
        COUNT(DISTINCT usuario_id) as usuarios_activos,
        COUNT(CASE WHEN accion = 'CREATE' THEN 1 END) as creaciones,
        COUNT(CASE WHEN accion = 'UPDATE' THEN 1 END) as actualizaciones,
        COUNT(CASE WHEN accion = 'DELETE' THEN 1 END) as eliminaciones,
        COUNT(CASE WHEN accion = 'AUTHORIZE' THEN 1 END) as autorizaciones,
        COUNT(CASE WHEN accion = 'DOWNLOAD' THEN 1 END) as descargas
      FROM auditoria
      WHERE 1=1
    `;

    const params = [];

    if (filtros.usuarioId) {
      query += ' AND usuario_id = ?';
      params.push(filtros.usuarioId);
    }

    if (filtros.desde) {
      query += ' AND fecha_hora >= ?';
      params.push(filtros.desde);
    }

    if (filtros.hasta) {
      query += ' AND fecha_hora <= ?';
      params.push(filtros.hasta);
    }

    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

/**
 * Obtener actividad reciente de un usuario
 * @param {number} usuarioId - ID del usuario
 * @param {number} limite - Número máximo de registros (default: 20)
 * @returns {Promise<Array>}
 */
function obtenerActividadUsuario(usuarioId, limite = 20) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        a.*
      FROM auditoria a
      WHERE a.usuario_id = ?
      ORDER BY a.fecha_hora DESC
      LIMIT ?
    `;

    db.all(query, [usuarioId, limite], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const rowsParsed = rows.map(row => ({
          ...row,
          detalles: row.detalles ? JSON.parse(row.detalles) : null
        }));
        resolve(rowsParsed);
      }
    });
  });
}

module.exports = {
  registrarAuditoria,
  obtenerHistorial,
  obtenerHistorialRegistro,
  obtenerEstadisticas,
  obtenerActividadUsuario
};
