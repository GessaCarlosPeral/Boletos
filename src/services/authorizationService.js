const db = require('../database/db');

/**
 * Servicio para gestionar el flujo de autorizaciones de lotes
 * Manager genera → Solicita autorización → Finanzas autoriza → Descarga disponible
 */

/**
 * Solicitar autorización de descarga (usado por Gerente de Comedor)
 * @param {number} loteId - ID del lote
 * @param {number} solicitadoPorId - ID del usuario que solicita
 * @param {string} justificacion - Razón de la solicitud
 * @returns {Promise<object>}
 */
async function solicitarAutorizacion(loteId, solicitadoPorId, justificacion) {
  return new Promise((resolve, reject) => {
    // Verificar que el lote existe
    db.get('SELECT * FROM lotes WHERE id = ?', [loteId], (err, lote) => {
      if (err) return reject(err);
      if (!lote) return reject(new Error('Lote no encontrado'));

      // Verificar que no exista ya una solicitud pendiente
      db.get(
        `SELECT * FROM autorizaciones_lotes
         WHERE lote_id = ? AND estado = 'PENDIENTE'`,
        [loteId],
        (err, solicitudExistente) => {
          if (err) return reject(err);
          if (solicitudExistente) {
            return reject(new Error('Ya existe una solicitud de autorización pendiente para este lote'));
          }

          // Crear nueva solicitud
          db.run(
            `INSERT INTO autorizaciones_lotes (lote_id, solicitado_por, justificacion, estado)
             VALUES (?, ?, ?, 'PENDIENTE')`,
            [loteId, solicitadoPorId, justificacion],
            function(err) {
              if (err) return reject(err);

              resolve({
                exito: true,
                autorizacionId: this.lastID,
                mensaje: 'Solicitud de autorización enviada correctamente'
              });
            }
          );
        }
      );
    });
  });
}

/**
 * Obtener solicitudes de autorización pendientes
 * @param {string} estado - Estado de las solicitudes (PENDIENTE, APROBADA, RECHAZADA)
 * @returns {Promise<Array>}
 */
function obtenerSolicitudes(estado = 'PENDIENTE') {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        a.id,
        a.lote_id,
        a.justificacion,
        a.estado,
        a.fecha_solicitud,
        a.fecha_respuesta,
        a.observaciones,
        l.contratista,
        l.cantidad_boletos,
        l.monto_total,
        l.fecha_creacion as lote_fecha_creacion,
        u_solicitante.username as solicitante_username,
        u_solicitante.nombre_completo as solicitante_nombre,
        u_autorizador.username as autorizador_username,
        u_autorizador.nombre_completo as autorizador_nombre
      FROM autorizaciones_lotes a
      INNER JOIN lotes l ON a.lote_id = l.id
      INNER JOIN usuarios u_solicitante ON a.solicitado_por = u_solicitante.id
      LEFT JOIN usuarios u_autorizador ON a.autorizado_por = u_autorizador.id
      WHERE a.estado = ?
      ORDER BY a.fecha_solicitud DESC
    `;

    db.all(query, [estado], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

/**
 * Obtener todas las solicitudes (para administradores)
 * @returns {Promise<Array>}
 */
function obtenerTodasSolicitudes() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        a.id,
        a.lote_id,
        a.justificacion,
        a.estado,
        a.fecha_solicitud,
        a.fecha_respuesta,
        a.observaciones,
        l.contratista,
        l.cantidad_boletos,
        l.monto_total,
        l.fecha_creacion as lote_fecha_creacion,
        u_solicitante.username as solicitante_username,
        u_solicitante.nombre_completo as solicitante_nombre,
        u_autorizador.username as autorizador_username,
        u_autorizador.nombre_completo as autorizador_nombre
      FROM autorizaciones_lotes a
      INNER JOIN lotes l ON a.lote_id = l.id
      INNER JOIN usuarios u_solicitante ON a.solicitado_por = u_solicitante.id
      LEFT JOIN usuarios u_autorizador ON a.autorizado_por = u_autorizador.id
      ORDER BY a.fecha_solicitud DESC
    `;

    db.all(query, [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

/**
 * Aprobar solicitud de autorización (usado por Finanzas)
 * @param {number} autorizacionId - ID de la autorización
 * @param {number} autorizadoPorId - ID del usuario que autoriza
 * @param {string} observaciones - Observaciones opcionales
 * @returns {Promise<object>}
 */
async function aprobarAutorizacion(autorizacionId, autorizadoPorId, observaciones = null) {
  return new Promise((resolve, reject) => {
    // Verificar que la autorización existe y está pendiente
    db.get(
      'SELECT * FROM autorizaciones_lotes WHERE id = ? AND estado = ?',
      [autorizacionId, 'PENDIENTE'],
      (err, autorizacion) => {
        if (err) return reject(err);
        if (!autorizacion) {
          return reject(new Error('Solicitud de autorización no encontrada o ya procesada'));
        }

        // Actualizar estado a APROBADA
        db.run(
          `UPDATE autorizaciones_lotes
           SET estado = 'APROBADA',
               autorizado_por = ?,
               fecha_respuesta = CURRENT_TIMESTAMP,
               observaciones = ?
           WHERE id = ?`,
          [autorizadoPorId, observaciones, autorizacionId],
          (err) => {
            if (err) return reject(err);

            resolve({
              exito: true,
              loteId: autorizacion.lote_id,
              mensaje: 'Autorización aprobada correctamente. El lote ahora puede ser descargado.'
            });
          }
        );
      }
    );
  });
}

/**
 * Rechazar solicitud de autorización (usado por Finanzas)
 * @param {number} autorizacionId - ID de la autorización
 * @param {number} autorizadoPorId - ID del usuario que rechaza
 * @param {string} observaciones - Razón del rechazo
 * @returns {Promise<object>}
 */
async function rechazarAutorizacion(autorizacionId, autorizadoPorId, observaciones) {
  return new Promise((resolve, reject) => {
    if (!observaciones) {
      return reject(new Error('Las observaciones son requeridas para rechazar una autorización'));
    }

    // Verificar que la autorización existe y está pendiente
    db.get(
      'SELECT * FROM autorizaciones_lotes WHERE id = ? AND estado = ?',
      [autorizacionId, 'PENDIENTE'],
      (err, autorizacion) => {
        if (err) return reject(err);
        if (!autorizacion) {
          return reject(new Error('Solicitud de autorización no encontrada o ya procesada'));
        }

        // Actualizar estado a RECHAZADA
        db.run(
          `UPDATE autorizaciones_lotes
           SET estado = 'RECHAZADA',
               autorizado_por = ?,
               fecha_respuesta = CURRENT_TIMESTAMP,
               observaciones = ?
           WHERE id = ?`,
          [autorizadoPorId, observaciones, autorizacionId],
          (err) => {
            if (err) return reject(err);

            resolve({
              exito: true,
              loteId: autorizacion.lote_id,
              mensaje: 'Autorización rechazada correctamente'
            });
          }
        );
      }
    );
  });
}

/**
 * Verificar si un lote tiene autorización aprobada
 * @param {number} loteId - ID del lote
 * @returns {Promise<object>}
 */
function verificarAutorizacion(loteId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM autorizaciones_lotes
       WHERE lote_id = ? AND estado = 'APROBADA'
       ORDER BY fecha_respuesta DESC
       LIMIT 1`,
      [loteId],
      (err, autorizacion) => {
        if (err) return reject(err);

        resolve({
          autorizado: !!autorizacion,
          autorizacion: autorizacion || null
        });
      }
    );
  });
}

/**
 * Obtener historial de autorizaciones de un lote
 * @param {number} loteId - ID del lote
 * @returns {Promise<Array>}
 */
function obtenerHistorialAutorizaciones(loteId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT
        a.*,
        u_solicitante.username as solicitante_username,
        u_solicitante.nombre_completo as solicitante_nombre,
        u_autorizador.username as autorizador_username,
        u_autorizador.nombre_completo as autorizador_nombre
      FROM autorizaciones_lotes a
      INNER JOIN usuarios u_solicitante ON a.solicitado_por = u_solicitante.id
      LEFT JOIN usuarios u_autorizador ON a.autorizado_por = u_autorizador.id
      WHERE a.lote_id = ?
      ORDER BY a.fecha_solicitud DESC
    `;

    db.all(query, [loteId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

module.exports = {
  solicitarAutorizacion,
  obtenerSolicitudes,
  obtenerTodasSolicitudes,
  aprobarAutorizacion,
  rechazarAutorizacion,
  verificarAutorizacion,
  obtenerHistorialAutorizaciones
};
