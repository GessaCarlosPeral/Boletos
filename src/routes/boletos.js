const express = require('express');
const router = express.Router();
const multer = require('multer');
const boletoService = require('../services/boletoService');
const pdfService = require('../services/pdfService');
const authorizationService = require('../services/authorizationService');
const { requireAuth, requirePermission, requireAnyPermission } = require('../middleware/authMiddleware');
const { auditLoteCreate, auditAutorizacion, auditDescarga, auditValidacion } = require('../middleware/auditMiddleware');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');

// Configurar multer para subida de comprobantes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../comprobantes');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'comprobante-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  }
});

// Configurar multer para fotos de escaneos
const escaneoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../escaneos');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'escaneo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadEscaneo = multer({
  storage: escaneoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max para fotos de escaneos
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  }
});

// Generar nuevo lote de boletos (requiere permiso boletos.crear)
router.post('/generar', requireAuth, requirePermission('boletos.crear'), auditLoteCreate(), async (req, res) => {
  try {
    const { contratista, cantidad, monto, comedorId, nombreComedor, tipoPago, precioId, fechaVencimiento: fechaVencimientoParam } = req.body;

    if (!contratista || !cantidad) {
      return res.status(400).json({
        error: 'Faltan datos requeridos: contratista, cantidad'
      });
    }

    // Calcular fecha de vencimiento:
    // - Si viene del frontend (admin), usar esa fecha
    // - Si no viene (contratista), calcular automáticamente 3 meses
    let fechaVencimientoStr;
    if (fechaVencimientoParam) {
      fechaVencimientoStr = fechaVencimientoParam;
    } else {
      const fechaVencimiento = new Date();
      fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 3);
      fechaVencimientoStr = fechaVencimiento.toISOString().split('T')[0];
    }

    // Generar boletos (ahora con soporte para comedores, tipo de pago y precio)
    const resultado = await boletoService.generarLote(
      contratista,
      parseInt(cantidad),
      fechaVencimientoStr,
      monto ? parseFloat(monto) : null,
      comedorId ? parseInt(comedorId) : null,
      nombreComedor,
      tipoPago || 'CONTADO',
      precioId ? parseInt(precioId) : null,
      req.user.id // Agregar el usuario que crea el lote
    );

    // Generar PDF (pasando el lote ID y comedor)
    const nombrePDF = `${contratista.replace(/\s+/g, '_')}_${cantidad}boletos_${Date.now()}.pdf`;
    const pdfPath = await pdfService.generarPDF(resultado.boletos, nombrePDF, resultado.lote, resultado.comedor);
    const pdfUrl = `/pdfs/${nombrePDF}`;

    // Actualizar lote con info del PDF
    await boletoService.actualizarLotePDF(resultado.lote, pdfPath, pdfUrl);

    res.json({
      exito: true,
      lote: resultado.lote,
      cantidad: resultado.boletos.length,
      contratista,
      comedor: resultado.comedor ? resultado.comedor.nombre : null,
      pdfUrl,
      pdfPath,
      estadoPago: 'PENDIENTE',
      tipoPago: tipoPago || 'CONTADO',
      mensaje: 'Lote generado. Pendiente de autorización de pago para descargar PDF.'
    });

  } catch (error) {
    console.error('Error generando lote:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validar boleto
router.post('/validar', async (req, res) => {
  try {
    const { uuid } = req.body;

    if (!uuid) {
      return res.status(400).json({ error: 'UUID requerido' });
    }

    const resultado = await boletoService.validarBoleto(uuid);

    res.json(resultado);

  } catch (error) {
    console.error('Error validando boleto:', error);
    res.status(500).json({ error: error.message });
  }
});

// Marcar boleto como usado
router.post('/usar', async (req, res) => {
  try {
    const { uuid, ubicacion } = req.body;

    if (!uuid) {
      return res.status(400).json({ error: 'UUID requerido' });
    }

    // Primero validar
    const validacion = await boletoService.validarBoleto(uuid);

    if (!validacion.valido) {
      return res.status(400).json(validacion);
    }

    // Marcar como usado
    const resultado = await boletoService.marcarUsado(uuid, ubicacion);

    res.json({
      exito: true,
      mensaje: 'Boleto registrado exitosamente',
      ...resultado
    });

  } catch (error) {
    console.error('Error marcando boleto:', error);
    res.status(500).json({ error: error.message });
  }
});

// Marcar boleto como usado CON FOTO (SIEMPRE guarda foto, sea éxito o rechazo)
router.post('/usar-con-foto', uploadEscaneo.single('foto'), async (req, res) => {
  try {
    const { uuid, ubicacion } = req.body;

    if (!uuid) {
      return res.status(400).json({ error: 'UUID requerido' });
    }

    // Obtener ruta de la foto PRIMERO (antes de validar)
    const fotoPath = req.file ? `/escaneos/${req.file.filename}` : null;

    // LOG para debugging
    console.log('📸 /usar-con-foto recibido:', {
      uuid: uuid.substring(0, 8) + '...',
      fotoRecibida: !!req.file,
      fotoPath,
      ubicacion
    });

    // Validar boleto (solo valida, NO registra)
    const validacion = await boletoService.validarBoleto(uuid);

    if (validacion.valido) {
      // BOLETO VÁLIDO: Marcar como usado CON foto
      const resultado = await boletoService.marcarUsado(uuid, ubicacion, fotoPath);

      res.json({
        exito: true,
        mensaje: 'Boleto registrado exitosamente',
        fotoCapturada: !!fotoPath,
        boleto: validacion.boleto,
        ...resultado
      });
    } else {
      // BOLETO RECHAZADO: Registrar rechazo CON foto (anti-fraude)
      await boletoService.registrarEscaneo(
        uuid,
        validacion.lote,
        'RECHAZADO',
        validacion.mensaje,
        ubicacion,
        fotoPath
      );

      // Retornar rechazo pero indicar que la foto SÍ se guardó
      res.status(400).json({
        ...validacion,
        fotoCapturada: !!fotoPath,
        mensaje: validacion.mensaje
      });
    }

  } catch (error) {
    console.error('Error procesando boleto con foto:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener estadísticas
router.get('/estadisticas', async (req, res) => {
  try {
    const { contratista, comedorId, loteId } = req.query;
    const stats = await boletoService.obtenerEstadisticas(contratista, comedorId, loteId);
    res.json(stats);
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener lista de lotes
router.get('/lotes', requireAuth, async (req, res) => {
  try {
    let { contratista } = req.query;
    let usuarioId = null;

    // Si el usuario es contratista, solo puede ver sus propios lotes
    if (req.user.rol === 'contratista') {
      contratista = req.user.contratista; // Forzar filtrado por el nombre de su empresa
      usuarioId = req.user.id; // Filtrar solo por los lotes creados por este usuario
    }

    console.log('Obteniendo lotes para contratista:', contratista, 'usuarioId:', usuarioId);
    const lotes = await boletoService.obtenerLotes(contratista, usuarioId);
    console.log('Lotes encontrados:', lotes.length);

    res.json({ lotes });
  } catch (error) {
    console.error('Error obteniendo lotes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener detalle de un lote específico
router.get('/lotes/:loteId', async (req, res) => {
  try {
    const { loteId } = req.params;
    const detalle = await boletoService.obtenerDetalleLote(loteId);
    res.json(detalle);
  } catch (error) {
    console.error('Error obteniendo detalle de lote:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener número de descargas de un lote
router.get('/lotes/:loteId/descargas', requireAuth, async (req, res) => {
  try {
    const { loteId } = req.params;
    const result = await boletoService.contarDescargasLote(loteId);
    res.json(result);
  } catch (error) {
    console.error('Error contando descargas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener lista de contratistas
router.get('/contratistas', async (req, res) => {
  try {
    const contratistas = await boletoService.obtenerContratistas();
    res.json(contratistas);
  } catch (error) {
    console.error('Error obteniendo contratistas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Autorizar lote (con subida de comprobante)
router.post('/autorizar/:loteId', upload.single('comprobante'), async (req, res) => {
  try {
    const { loteId } = req.params;
    const { codigoAutorizacion, autorizadoPor, fechaPago, notas } = req.body;

    if (!codigoAutorizacion || !autorizadoPor || !fechaPago) {
      return res.status(400).json({
        error: 'Faltan datos requeridos: codigoAutorizacion, autorizadoPor, fechaPago'
      });
    }

    // Consultar el tipo de pago del lote
    const lote = await new Promise((resolve, reject) => {
      db.get('SELECT tipo_pago FROM lotes WHERE lote_id = ?', [loteId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Validar comprobante solo si es tipo CONTADO
    if (lote && lote.tipo_pago === 'CONTADO' && !req.file) {
      return res.status(400).json({ error: 'Se requiere un comprobante de pago para lotes de tipo CONTADO' });
    }

    const comprobantePath = req.file ? `/comprobantes/${req.file.filename}` : null;

    const resultado = await boletoService.autorizarLote(
      loteId,
      codigoAutorizacion,
      comprobantePath,
      autorizadoPor,
      fechaPago,
      notas
    );

    if (resultado.exito) {
      res.json({
        exito: true,
        mensaje: 'Lote autorizado exitosamente',
        loteId,
        comprobante: comprobantePath
      });
    } else {
      res.status(404).json({
        exito: false,
        error: resultado.mensaje || 'No se pudo autorizar el lote'
      });
    }

  } catch (error) {
    console.error('Error autorizando lote:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener información de pago de un lote
router.get('/pago/:loteId', async (req, res) => {
  try {
    const { loteId } = req.params;
    const infoPago = await boletoService.obtenerInfoPagoLote(loteId);

    if (!infoPago) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }

    res.json(infoPago);
  } catch (error) {
    console.error('Error obteniendo info de pago:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verificar si un lote está autorizado para descarga
router.get('/verificar-descarga/:loteId', async (req, res) => {
  try {
    const { loteId } = req.params;
    const resultado = await boletoService.puedeDescargar(loteId);

    res.json(resultado);
  } catch (error) {
    console.error('Error verificando descarga:', error);
    res.status(500).json({ error: error.message });
  }
});

// Registrar descarga de PDF
router.post('/descargar/:loteId', requireAuth, auditDescarga(), async (req, res) => {
  try {
    const { loteId } = req.params;
    const { usuario, razon } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!usuario || !razon) {
      return res.status(400).json({
        error: 'Se requiere usuario y razón de descarga'
      });
    }

    const resultado = await boletoService.registrarDescarga(loteId, usuario, razon, ipAddress);

    res.json({
      exito: true,
      mensaje: 'Descarga registrada',
      intentosRestantes: resultado.intentosRestantes
    });

  } catch (error) {
    console.error('Error registrando descarga:', error);
    res.status(400).json({ error: error.message });
  }
});

// Obtener historial de descargas
router.get('/historial-descargas/:loteId', requireAuth, async (req, res) => {
  try {
    const { loteId } = req.params;
    const historial = await boletoService.obtenerHistorialDescargas(loteId);

    res.json(historial);
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener datos para gráficas
router.get('/graficas', async (req, res) => {
  try {
    const { contratista, comedorId, loteId, dias } = req.query;
    const datos = await boletoService.obtenerDatosGraficas(
      contratista,
      comedorId,
      dias ? parseInt(dias) : 30,
      loteId
    );

    res.json(datos);
  } catch (error) {
    console.error('Error obteniendo datos de gráficas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener historial de rechazos de un boleto
router.get('/rechazos/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    const historial = await boletoService.obtenerHistorialRechazos(uuid);
    res.json(historial);
  } catch (error) {
    console.error('Error obteniendo historial de rechazos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener último movimiento de un lote
router.get('/ultimo-movimiento/:loteId', async (req, res) => {
  try {
    const { loteId } = req.params;
    const ultimoMovimiento = await boletoService.obtenerUltimoMovimientoLote(loteId);
    res.json({ ultimo_movimiento: ultimoMovimiento });
  } catch (error) {
    console.error('Error obteniendo último movimiento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener historial completo de escaneos con fotos
router.get('/historial-escaneos/:loteId', async (req, res) => {
  try {
    const { loteId } = req.params;
    const historial = await boletoService.obtenerHistorialEscaneos(loteId);
    res.json(historial);
  } catch (error) {
    console.error('Error obteniendo historial de escaneos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener última foto de un boleto específico
router.get('/foto/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    const foto = await boletoService.obtenerUltimaFotoBoleto(uuid);
    res.json(foto);
  } catch (error) {
    console.error('Error obteniendo foto del boleto:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== RUTAS DE AUTORIZACIONES ====================

// Solicitar autorización de descarga (usado por Gerente de Comedor)
router.post('/solicitar-autorizacion/:loteId', requireAuth, requirePermission('boletos.solicitar_autorizacion'), async (req, res) => {
  try {
    const { loteId } = req.params;
    const { justificacion } = req.body;

    if (!justificacion) {
      return res.status(400).json({
        success: false,
        error: 'La justificación es requerida'
      });
    }

    const resultado = await authorizationService.solicitarAutorizacion(
      loteId,
      req.user.id,
      justificacion
    );

    res.json({
      success: true,
      ...resultado
    });

  } catch (error) {
    console.error('Error solicitando autorización:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener solicitudes de autorización pendientes (Finanzas y Admin)
router.get('/autorizaciones/pendientes', requireAuth, requireAnyPermission(['boletos.autorizar', 'boletos.leer']), async (req, res) => {
  try {
    const solicitudes = await authorizationService.obtenerSolicitudes('PENDIENTE');

    res.json({
      success: true,
      solicitudes
    });

  } catch (error) {
    console.error('Error obteniendo solicitudes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener todas las solicitudes de autorización (Admin)
router.get('/autorizaciones/todas', requireAuth, requirePermission('boletos.leer'), async (req, res) => {
  try {
    const solicitudes = await authorizationService.obtenerTodasSolicitudes();

    res.json({
      success: true,
      solicitudes
    });

  } catch (error) {
    console.error('Error obteniendo todas las solicitudes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Aprobar autorización de descarga (usado por Finanzas)
router.post('/autorizaciones/:autorizacionId/aprobar', requireAuth, requirePermission('boletos.autorizar'), auditAutorizacion(), async (req, res) => {
  try {
    const { autorizacionId } = req.params;
    const { observaciones } = req.body;

    const resultado = await authorizationService.aprobarAutorizacion(
      autorizacionId,
      req.user.id,
      observaciones
    );

    res.json({
      success: true,
      ...resultado
    });

  } catch (error) {
    console.error('Error aprobando autorización:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Rechazar autorización de descarga (usado por Finanzas)
router.post('/autorizaciones/:autorizacionId/rechazar', requireAuth, requirePermission('boletos.autorizar'), auditAutorizacion(), async (req, res) => {
  try {
    const { autorizacionId } = req.params;
    const { observaciones } = req.body;

    if (!observaciones) {
      return res.status(400).json({
        success: false,
        error: 'Las observaciones son requeridas para rechazar'
      });
    }

    const resultado = await authorizationService.rechazarAutorizacion(
      autorizacionId,
      req.user.id,
      observaciones
    );

    res.json({
      success: true,
      ...resultado
    });

  } catch (error) {
    console.error('Error rechazando autorización:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener historial de autorizaciones de un lote
router.get('/autorizaciones/lote/:loteId', requireAuth, requirePermission('boletos.leer'), async (req, res) => {
  try {
    const { loteId } = req.params;
    const historial = await authorizationService.obtenerHistorialAutorizaciones(loteId);

    res.json({
      success: true,
      historial
    });

  } catch (error) {
    console.error('Error obteniendo historial de autorizaciones:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Verificar si un lote tiene autorización aprobada
router.get('/autorizaciones/verificar/:loteId', requireAuth, requirePermission('boletos.leer'), async (req, res) => {
  try {
    const { loteId } = req.params;
    const resultado = await authorizationService.verificarAutorizacion(loteId);

    res.json({
      success: true,
      ...resultado
    });

  } catch (error) {
    console.error('Error verificando autorización:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener últimos movimientos para el validador (sin autenticación para que funcione en PWA)
router.get('/ultimos-movimientos', async (req, res) => {
  try {
    const limite = parseInt(req.query.limite) || 10;

    const sql = `
      SELECT
        h.id,
        h.boleto_uuid,
        h.lote_id,
        h.tipo,
        h.motivo_rechazo,
        h.ubicacion,
        h.foto_escaneo,
        h.fecha,
        b.contratista,
        CASE
          WHEN h.tipo = 'EXITOSO' THEN '✅'
          WHEN h.tipo = 'RECHAZADO' THEN '❌'
          ELSE '⚠️'
        END as icono
      FROM historial_escaneos h
      LEFT JOIN boletos b ON h.boleto_uuid = b.uuid
      ORDER BY h.fecha DESC
      LIMIT ?
    `;

    db.all(sql, [limite], (err, rows) => {
      if (err) {
        console.error('Error obteniendo últimos movimientos:', err);
        return res.status(500).json({ error: err.message });
      }

      res.json({
        success: true,
        movimientos: rows || []
      });
    });

  } catch (error) {
    console.error('Error obteniendo últimos movimientos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
