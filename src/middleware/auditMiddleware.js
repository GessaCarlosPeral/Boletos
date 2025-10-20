const { registrarAuditoria } = require('../services/auditService');

/**
 * Middleware para auditar acciones automáticamente
 * Captura información de la request y la guarda en auditoría
 */

/**
 * Crear middleware de auditoría para una acción específica
 * @param {string} accion - Tipo de acción (CREATE, UPDATE, DELETE, etc.)
 * @param {string} tabla - Tabla afectada
 * @param {Function} getRegistroId - Función para extraer el ID del registro de req (opcional)
 * @param {Function} getDetalles - Función para extraer detalles adicionales de req (opcional)
 */
function auditAction(accion, tabla, getRegistroId = null, getDetalles = null) {
  return async (req, res, next) => {
    // Guardar el método send original
    const originalSend = res.send;

    // Sobrescribir res.send para capturar la respuesta
    res.send = function(data) {
      // Solo auditar si la respuesta es exitosa (status 2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Extraer información para auditoría
        const usuarioId = req.user ? req.user.id : null;
        const registroId = getRegistroId ? getRegistroId(req, data) : null;
        const detalles = getDetalles ? getDetalles(req, data) : {
          method: req.method,
          path: req.path,
          body: req.body,
          params: req.params,
          query: req.query
        };
        const ipAddress = req.ip || req.connection.remoteAddress;

        // Registrar en auditoría (sin esperar, async)
        if (usuarioId) {
          registrarAuditoria(usuarioId, accion, tabla, registroId, detalles, ipAddress)
            .catch(err => console.error('Error en auditoría automática:', err));
        }
      }

      // Llamar al send original
      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Middleware específico para auditar creación de lotes
 */
function auditLoteCreate() {
  return auditAction(
    'CREATE',
    'lotes',
    (req, data) => {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        return parsed.lote || null;
      } catch (e) {
        return null;
      }
    },
    (req, data) => {
      return {
        contratista: req.body.contratista,
        cantidad: req.body.cantidad,
        monto: req.body.monto,
        comedor_id: req.body.comedorId
      };
    }
  );
}

/**
 * Middleware específico para auditar autorizaciones
 */
function auditAutorizacion() {
  return auditAction(
    'AUTHORIZE',
    'autorizaciones_lotes',
    (req, data) => req.params.autorizacionId || req.params.loteId,
    (req, data) => {
      return {
        lote_id: req.params.loteId,
        autorizacion_id: req.params.autorizacionId,
        observaciones: req.body.observaciones,
        tipo: req.path.includes('aprobar') ? 'APROBACION' : 'RECHAZO'
      };
    }
  );
}

/**
 * Middleware específico para auditar descargas de PDFs
 */
function auditDescarga() {
  return auditAction(
    'DOWNLOAD',
    'lotes',
    (req, data) => req.params.loteId,
    (req, data) => {
      return {
        lote_id: req.params.loteId,
        razon: req.body.razon,
        usuario_solicitante: req.body.usuario
      };
    }
  );
}

/**
 * Middleware específico para auditar validación de boletos
 */
function auditValidacion() {
  return auditAction(
    'VALIDATE',
    'boletos',
    (req, data) => {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        return parsed.boleto ? parsed.boleto.id : null;
      } catch (e) {
        return null;
      }
    },
    (req, data) => {
      return {
        uuid: req.body.uuid,
        ubicacion: req.body.ubicacion,
        con_foto: !!req.file
      };
    }
  );
}

/**
 * Middleware específico para auditar gestión de usuarios
 */
function auditUsuario(accion) {
  return auditAction(
    accion,
    'usuarios',
    (req, data) => req.params.userId || req.body.userId,
    (req, data) => {
      const detalles = {
        username: req.body.username,
        nombre_completo: req.body.nombre_completo,
        rol_id: req.body.rol_id
      };

      if (accion === 'UPDATE') {
        detalles.campos_modificados = Object.keys(req.body);
      }

      return detalles;
    }
  );
}

/**
 * Middleware específico para auditar gestión de comedores
 */
function auditComedor(accion) {
  return auditAction(
    accion,
    'comedores',
    (req, data) => req.params.comedorId,
    (req, data) => {
      return {
        nombre: req.body.nombre,
        ubicacion: req.body.ubicacion,
        capacidad: req.body.capacidad
      };
    }
  );
}

/**
 * Middleware específico para auditar gestión de usuarios
 */
function auditUsuario(accion) {
  return auditAction(
    accion,
    'usuarios',
    (req, data) => req.params.id || (req.body && req.body.userId),
    (req, data) => {
      const detalles = {
        username: req.body.username,
        nombre_completo: req.body.nombre_completo,
        email: req.body.email,
        rol_id: req.body.rol_id
      };

      if (accion === 'UPDATE') {
        detalles.campos_modificados = Object.keys(req.body);
      }

      return detalles;
    }
  );
}

module.exports = {
  auditAction,
  auditLoteCreate,
  auditAutorizacion,
  auditDescarga,
  auditValidacion,
  auditUsuario,
  auditComedor
};
