const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const contratistaService = require('./contratistaService');
const comedorService = require('./comedorService');

class BoletoService {
  // Generar lote de boletos
  async generarLote(contratista, cantidad, fechaVencimiento, monto = null, comedorId = null, nombreComedor = null, tipoPago = 'CONTADO', precioId = null) {
    // Obtener o crear contratista para obtener su código
    const contratistaData = await contratistaService.obtenerOCrearContratista(contratista);
    const codigoContratista = contratistaData.codigo;

    // Si se especificó comedor por nombre, obtener o crear
    let comedorFinal = null;
    if (comedorId) {
      comedorFinal = await comedorService.obtenerComedorPorId(comedorId);
    } else if (nombreComedor) {
      comedorFinal = await comedorService.obtenerOCrearComedor(nombreComedor, contratistaData.id);
      comedorId = comedorFinal.id;
    }

    // Obtener información del precio si se especificó
    let precioData = null;
    if (precioId) {
      precioData = await new Promise((resolve, reject) => {
        db.get('SELECT id, nombre, precio_unitario FROM precios WHERE id = ? AND activo = 1', [precioId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    }

    const lote = `LOTE_${Date.now()}`;
    const boletos = [];

    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Primero registrar el lote en la tabla de lotes
        db.run(`
          INSERT INTO lotes (lote_id, contratista, cantidad, fecha_vencimiento, estado_pago, monto, comedor_id, tipo_pago, precio_id, precio_nombre, precio_unitario)
          VALUES (?, ?, ?, ?, 'PENDIENTE', ?, ?, ?, ?, ?, ?)
        `, [lote, contratista, cantidad, fechaVencimiento, monto, comedorId, tipoPago, precioData ? precioData.id : null, precioData ? precioData.nombre : null, precioData ? precioData.precio_unitario : null], (err) => {
          if (err) {
            reject(err);
            return;
          }
        });

        // Luego generar los boletos
        const stmt = db.prepare(`
          INSERT INTO boletos (uuid, contratista, fecha_vencimiento, lote, comedor_id)
          VALUES (?, ?, ?, ?, ?)
        `);

        for (let i = 0; i < cantidad; i++) {
          const uuid = uuidv4();
          stmt.run(uuid, contratista, fechaVencimiento, lote, comedorId);
          boletos.push({
            uuid,
            contratista,
            codigoContratista,
            fechaVencimiento,
            lote,
            numero: i + 1,
            total: cantidad,
            comedor: comedorFinal ? comedorFinal.nombre : null,
            comedorId
          });
        }

        stmt.finalize((err) => {
          if (err) {
            reject(err);
          } else {
            resolve({ lote, boletos, comedor: comedorFinal });
          }
        });
      });
    });
  }

  // Actualizar información del lote (PDF generado)
  async actualizarLotePDF(loteId, pdfPath, pdfUrl) {
    return new Promise((resolve, reject) => {
      db.run(`
        UPDATE lotes
        SET pdf_path = ?, pdf_url = ?
        WHERE lote_id = ?
      `, [pdfPath, pdfUrl, loteId], function(err) {
        if (err) reject(err);
        else resolve({ exito: this.changes > 0 });
      });
    });
  }

  // Autorizar descarga de boletos
  async autorizarLote(loteId, codigoAutorizacion, comprobantePago, autorizadoPor, fechaPago, notas = null) {
    return new Promise((resolve, reject) => {
      // Primero verificar que el lote existe
      db.get('SELECT lote_id FROM lotes WHERE lote_id = ?', [loteId], (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          resolve({ exito: false, mensaje: 'Lote no encontrado' });
          return;
        }

        // Si existe, actualizar
        db.run(`
          UPDATE lotes
          SET estado_pago = 'AUTORIZADO',
              codigo_autorizacion = ?,
              comprobante_pago = ?,
              autorizado_por = ?,
              fecha_pago = ?,
              notas = ?
          WHERE lote_id = ?
        `, [codigoAutorizacion, comprobantePago, autorizadoPor, fechaPago, notas, loteId], function(err) {
          if (err) reject(err);
          else resolve({ exito: this.changes > 0 });
        });
      });
    });
  }

  // Obtener información de pago de un lote
  async obtenerInfoPagoLote(loteId) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM lotes WHERE lote_id = ?', [loteId], (err, lote) => {
        if (err) reject(err);
        else resolve(lote);
      });
    });
  }

  // Validar boleto (solo valida, NO registra - el registro se hace en el endpoint con foto)
  async validarBoleto(uuid) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM boletos WHERE uuid = ?',
        [uuid],
        (err, boleto) => {
          if (err) {
            reject(err);
          } else if (!boleto) {
            // No registrar aquí - el endpoint lo hará con la foto
            resolve({
              valido: false,
              mensaje: 'Boleto no existe',
              lote: null
            });
          } else if (boleto.redimido) {
            // No registrar aquí - el endpoint lo hará con la foto
            resolve({
              valido: false,
              mensaje: 'Boleto ya fue usado',
              fechaUso: boleto.fecha_uso,
              lote: boleto.lote,
              boleto
            });
          } else {
            const hoy = new Date();
            const vencimiento = new Date(boleto.fecha_vencimiento);

            if (hoy > vencimiento) {
              // No registrar aquí - el endpoint lo hará con la foto
              resolve({
                valido: false,
                mensaje: 'Boleto vencido',
                fechaVencimiento: boleto.fecha_vencimiento,
                lote: boleto.lote,
                boleto
              });
            } else {
              resolve({
                valido: true,
                boleto,
                mensaje: 'Boleto válido'
              });
            }
          }
        }
      );
    });
  }

  // Marcar boleto como usado
  async marcarUsado(uuid, ubicacion = 'Comedor principal', fotoPath = null) {
    const self = this;
    return new Promise((resolve, reject) => {
      const ahora = new Date().toISOString();

      // Primero obtener el lote del boleto
      db.get('SELECT lote FROM boletos WHERE uuid = ?', [uuid], (err, boleto) => {
        if (err) {
          reject(err);
          return;
        }

        db.run(
          `UPDATE boletos
           SET redimido = 1, fecha_uso = ?, ubicacion = ?
           WHERE uuid = ?`,
          [ahora, ubicacion, uuid],
          function(err) {
            if (err) {
              reject(err);
            } else {
              // Registrar escaneo exitoso con foto
              if (boleto && boleto.lote) {
                self.registrarEscaneo(uuid, boleto.lote, 'EXITOSO', null, ubicacion, fotoPath).catch(console.error);
              }

              resolve({
                exito: this.changes > 0,
                fechaUso: ahora,
                ubicacion
              });
            }
          }
        );
      });
    });
  }

  // Obtener estadísticas
  async obtenerEstadisticas(contratista = null, comedorId = null) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT
          contratista,
          COUNT(*) as total,
          SUM(redimido) as usados,
          COUNT(*) - SUM(redimido) as disponibles
        FROM boletos
      `;

      const params = [];
      const conditions = [];

      if (contratista) {
        conditions.push('contratista = ?');
        params.push(contratista);
      }

      if (comedorId) {
        conditions.push('comedor_id = ?');
        params.push(parseInt(comedorId));
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' GROUP BY contratista';

      db.all(query, params, (err, stats) => {
        if (err) {
          reject(err);
        } else {
          resolve(stats);
        }
      });
    });
  }

  // Obtener lista de lotes
  async obtenerLotes(contratista = null) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT
          b.lote,
          b.contratista,
          MIN(b.fecha_creacion) as fecha_creacion,
          MIN(b.fecha_vencimiento) as fecha_vencimiento,
          COUNT(*) as total_boletos,
          SUM(b.redimido) as boletos_usados,
          COUNT(*) - SUM(b.redimido) as boletos_disponibles,
          l.estado_pago,
          l.codigo_autorizacion,
          l.pdf_url,
          l.monto,
          l.tipo_pago,
          l.precio_nombre,
          l.precio_unitario,
          (SELECT COUNT(*) FROM historial_escaneos WHERE lote_id = b.lote AND tipo = 'RECHAZADO') as total_rechazos
        FROM boletos b
        LEFT JOIN lotes l ON b.lote = l.lote_id
      `;

      const params = [];

      if (contratista) {
        query += ' WHERE b.contratista = ?';
        params.push(contratista);
      }

      query += ' GROUP BY b.lote, b.contratista, l.estado_pago, l.codigo_autorizacion, l.pdf_url, l.monto, l.tipo_pago, l.precio_nombre, l.precio_unitario ORDER BY fecha_creacion DESC';

      db.all(query, params, (err, lotes) => {
        if (err) {
          reject(err);
        } else {
          resolve(lotes);
        }
      });
    });
  }

  // Obtener detalle de un lote específico
  async obtenerDetalleLote(loteId) {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT
          b.uuid,
          b.contratista,
          b.fecha_creacion,
          b.fecha_vencimiento,
          b.redimido,
          b.fecha_uso,
          b.ubicacion,
          l.precio_nombre
        FROM boletos b
        LEFT JOIN lotes l ON b.lote = l.lote_id
        WHERE b.lote = ?
        ORDER BY b.fecha_creacion
      `, [loteId], (err, boletos) => {
        if (err) {
          reject(err);
        } else if (boletos.length === 0) {
          reject(new Error('Lote no encontrado'));
        } else {
          // Obtener total de rechazos del lote
          db.get(`
            SELECT COUNT(*) as total_rechazos
            FROM historial_escaneos
            WHERE lote_id = ? AND tipo = 'RECHAZADO'
          `, [loteId], (err, rechazoResult) => {
            if (err) {
              reject(err);
              return;
            }

            // Calcular estadísticas del lote
            const stats = {
              lote: loteId,
              contratista: boletos[0].contratista,
              fecha_creacion: boletos[0].fecha_creacion,
              fecha_vencimiento: boletos[0].fecha_vencimiento,
              precio_nombre: boletos[0].precio_nombre,
              total: boletos.length,
              usados: boletos.filter(b => b.redimido).length,
              disponibles: boletos.filter(b => !b.redimido).length,
              rechazados: rechazoResult ? rechazoResult.total_rechazos : 0,
              boletos: boletos.map(b => ({
                uuid: b.uuid,
                redimido: Boolean(b.redimido),
                fecha_uso: b.fecha_uso,
                ubicacion: b.ubicacion,
                estado: b.redimido ? 'USADO' :
                        (new Date() > new Date(b.fecha_vencimiento) ? 'VENCIDO' : 'DISPONIBLE')
              }))
            };
            resolve(stats);
          });
        }
      });
    });
  }

  // Obtener lista de contratistas únicos
  async obtenerContratistas() {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT DISTINCT contratista
        FROM boletos
        ORDER BY contratista
      `, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map(r => r.contratista));
        }
      });
    });
  }

  // Registrar descarga de PDF
  async registrarDescarga(loteId, usuario, razon, ipAddress = null) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Verificar intentos actuales
        db.get(
          'SELECT intentos_descarga, max_descargas, estado_pago FROM lotes WHERE lote_id = ?',
          [loteId],
          (err, lote) => {
            if (err) {
              reject(err);
              return;
            }

            if (!lote) {
              reject(new Error('Lote no encontrado'));
              return;
            }

            if (lote.estado_pago !== 'AUTORIZADO') {
              reject(new Error('Lote no autorizado para descarga'));
              return;
            }

            if (lote.intentos_descarga >= lote.max_descargas) {
              reject(new Error(`Límite de descargas alcanzado (${lote.max_descargas})`));
              return;
            }

            // Incrementar contador
            db.run(
              'UPDATE lotes SET intentos_descarga = intentos_descarga + 1 WHERE lote_id = ?',
              [loteId],
              (err) => {
                if (err) {
                  reject(err);
                  return;
                }

                // Registrar en historial
                db.run(
                  'INSERT INTO historial_descargas (lote_id, usuario, razon, ip_address) VALUES (?, ?, ?, ?)',
                  [loteId, usuario, razon, ipAddress],
                  function(err) {
                    if (err) {
                      reject(err);
                    } else {
                      resolve({
                        exito: true,
                        intentosRestantes: lote.max_descargas - (lote.intentos_descarga + 1)
                      });
                    }
                  }
                );
              }
            );
          }
        );
      });
    });
  }

  // Obtener historial de descargas
  async obtenerHistorialDescargas(loteId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM historial_descargas WHERE lote_id = ? ORDER BY fecha DESC',
        [loteId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Verificar si puede descargar
  async puedeDescargar(loteId) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT intentos_descarga, max_descargas, estado_pago, pdf_url FROM lotes WHERE lote_id = ?',
        [loteId],
        (err, lote) => {
          if (err) {
            reject(err);
          } else if (!lote) {
            resolve({ puede: false, razon: 'Lote no encontrado' });
          } else if (lote.estado_pago !== 'AUTORIZADO') {
            resolve({ puede: false, razon: 'Lote no autorizado' });
          } else if (lote.intentos_descarga >= lote.max_descargas) {
            resolve({
              puede: false,
              razon: `Límite de descargas alcanzado (${lote.max_descargas}/${lote.max_descargas})`
            });
          } else {
            resolve({
              puede: true,
              intentosRestantes: lote.max_descargas - lote.intentos_descarga,
              pdfUrl: lote.pdf_url
            });
          }
        }
      );
    });
  }

  // Registrar escaneo en historial
  async registrarEscaneo(boletoUuid, loteId, tipo, motivoRechazo = null, ubicacion = null, fotoEscaneo = null) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO historial_escaneos (boleto_uuid, lote_id, tipo, motivo_rechazo, ubicacion, foto_escaneo)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [boletoUuid, loteId, tipo, motivoRechazo, ubicacion, fotoEscaneo],
        function(err) {
          if (err) {
            console.error('Error registrando escaneo:', err);
            reject(err);
          } else {
            resolve({ id: this.lastID });
          }
        }
      );
    });
  }

  // Obtener historial de rechazos de un boleto
  async obtenerHistorialRechazos(uuid) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT tipo, motivo_rechazo, ubicacion, fecha
         FROM historial_escaneos
         WHERE boleto_uuid = ? AND tipo = 'RECHAZADO'
         ORDER BY fecha DESC`,
        [uuid],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              total_rechazos: rows.length,
              rechazos: rows
            });
          }
        }
      );
    });
  }

  // Obtener fecha de último movimiento por lote
  async obtenerUltimoMovimientoLote(loteId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT MAX(fecha) as ultimo_movimiento
         FROM historial_escaneos
         WHERE lote_id = ?`,
        [loteId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row ? row.ultimo_movimiento : null);
          }
        }
      );
    });
  }

  // Obtener historial completo de escaneos (exitosos y rechazados) con fotos
  async obtenerHistorialEscaneos(loteId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT boleto_uuid, tipo, motivo_rechazo, ubicacion, foto_escaneo, fecha
         FROM historial_escaneos
         WHERE lote_id = ?
         ORDER BY fecha DESC`,
        [loteId],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              total: rows.length,
              escaneos: rows
            });
          }
        }
      );
    });
  }

  // Obtener TODAS las fotos de un boleto
  async obtenerUltimaFotoBoleto(uuid) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT foto_escaneo, tipo, fecha, ubicacion, motivo_rechazo
         FROM historial_escaneos
         WHERE boleto_uuid = ? AND foto_escaneo IS NOT NULL
         ORDER BY fecha DESC`,
        [uuid],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  }

  // Obtener datos para gráficas
  async obtenerDatosGraficas(contratista = null, comedorId = null, dias = 30) {
    return new Promise((resolve, reject) => {
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - dias);
      const fechaInicioStr = fechaInicio.toISOString();

      const resultado = {};

      // Query 1: Boletos generados por fecha
      let query1 = `
        SELECT
          DATE(l.fecha_creacion) as fecha,
          SUM(l.cantidad) as cantidad
        FROM lotes l
        WHERE l.fecha_creacion >= ?
      `;
      let params1 = [fechaInicioStr];

      if (contratista) {
        query1 += ' AND l.contratista = ?';
        params1.push(contratista);
      }
      if (comedorId) {
        query1 += ' AND l.comedor_id = ?';
        params1.push(parseInt(comedorId));
      }

      query1 += ' GROUP BY DATE(l.fecha_creacion) ORDER BY fecha';

      // Query 2: Ingresos por fecha
      let query2 = `
        SELECT
          DATE(l.fecha_creacion) as fecha,
          SUM(l.monto) as ingresos
        FROM lotes l
        WHERE l.fecha_creacion >= ?
        AND l.monto IS NOT NULL
      `;
      let params2 = [fechaInicioStr];

      if (contratista) {
        query2 += ' AND l.contratista = ?';
        params2.push(contratista);
      }
      if (comedorId) {
        query2 += ' AND l.comedor_id = ?';
        params2.push(parseInt(comedorId));
      }

      query2 += ' GROUP BY DATE(l.fecha_creacion) ORDER BY fecha';

      // Query 3: Uso vs Generación por fecha
      let query3 = `
        SELECT
          DATE(b.fecha_creacion) as fecha,
          COUNT(*) as generados,
          SUM(b.redimido) as usados
        FROM boletos b
        INNER JOIN lotes l ON b.lote = l.lote_id
        WHERE b.fecha_creacion >= ?
      `;
      let params3 = [fechaInicioStr];

      if (contratista) {
        query3 += ' AND l.contratista = ?';
        params3.push(contratista);
      }
      if (comedorId) {
        query3 += ' AND l.comedor_id = ?';
        params3.push(parseInt(comedorId));
      }

      query3 += ' GROUP BY DATE(b.fecha_creacion) ORDER BY fecha';

      // Query 4: Top contratistas
      let query4 = `
        SELECT
          l.contratista,
          SUM(l.cantidad) as total_boletos,
          SUM(l.monto) as total_ingresos
        FROM lotes l
        WHERE 1=1
      `;
      let params4 = [];

      if (contratista) {
        query4 += ' AND l.contratista = ?';
        params4.push(contratista);
      }
      if (comedorId) {
        query4 += ' AND l.comedor_id = ?';
        params4.push(parseInt(comedorId));
      }

      query4 += ' GROUP BY l.contratista ORDER BY total_boletos DESC LIMIT 5';

      // Query 5: Distribución por comedor
      let query5 = `
        SELECT
          c.nombre as comedor,
          con.nombre as contratista,
          COUNT(b.id) as total_boletos
        FROM boletos b
        INNER JOIN lotes l ON b.lote = l.lote_id
        LEFT JOIN comedores c ON b.comedor_id = c.id
        LEFT JOIN contratistas con ON c.contratista_id = con.id
        WHERE b.comedor_id IS NOT NULL
      `;
      let params5 = [];

      if (contratista) {
        query5 += ' AND l.contratista = ?';
        params5.push(contratista);
      }
      if (comedorId) {
        query5 += ' AND b.comedor_id = ?';
        params5.push(parseInt(comedorId));
      }

      query5 += ' GROUP BY b.comedor_id, c.nombre, con.nombre ORDER BY total_boletos DESC';

      // Query 6: Estado de pagos
      let query6 = `
        SELECT
          l.estado_pago,
          COUNT(*) as cantidad,
          SUM(l.monto) as total_monto
        FROM lotes l
        WHERE 1=1
      `;
      let params6 = [];

      if (contratista) {
        query6 += ' AND l.contratista = ?';
        params6.push(contratista);
      }
      if (comedorId) {
        query6 += ' AND l.comedor_id = ?';
        params6.push(parseInt(comedorId));
      }

      query6 += ' GROUP BY l.estado_pago';

      // Query 7: Rechazos por fecha
      let query7 = `
        SELECT
          DATE(he.fecha) as fecha,
          COUNT(*) as rechazados
        FROM historial_escaneos he
        INNER JOIN lotes l ON he.lote_id = l.lote_id
        WHERE he.tipo = 'RECHAZADO'
        AND he.fecha >= ?
      `;
      let params7 = [fechaInicioStr];

      if (contratista) {
        query7 += ' AND l.contratista = ?';
        params7.push(contratista);
      }
      if (comedorId) {
        query7 += ' AND l.comedor_id = ?';
        params7.push(parseInt(comedorId));
      }

      query7 += ' GROUP BY DATE(he.fecha) ORDER BY fecha';

      // Query 8: Distribución por tipo de platillo
      let query8 = `
        SELECT
          l.precio_nombre,
          COUNT(b.id) as cantidad
        FROM boletos b
        INNER JOIN lotes l ON b.lote = l.lote_id
        WHERE l.precio_nombre IS NOT NULL
      `;
      let params8 = [];

      if (contratista) {
        query8 += ' AND l.contratista = ?';
        params8.push(contratista);
      }
      if (comedorId) {
        query8 += ' AND l.comedor_id = ?';
        params8.push(parseInt(comedorId));
      }

      query8 += ' GROUP BY l.precio_nombre ORDER BY cantidad DESC';

      // Ejecutar queries
      db.all(query1, params1, (err, rows) => {
        if (err) return reject(err);
        resultado.boletosTime = rows;

        db.all(query2, params2, (err, rows) => {
          if (err) return reject(err);
          resultado.ingresosTime = rows;

          db.all(query3, params3, (err, rows) => {
            if (err) return reject(err);
            resultado.usoTime = rows;

            db.all(query4, params4, (err, rows) => {
              if (err) return reject(err);
              resultado.topContratistas = rows;

              db.all(query5, params5, (err, rows) => {
                if (err) return reject(err);
                resultado.comedores = rows;

                db.all(query6, params6, (err, rows) => {
                  if (err) return reject(err);
                  resultado.estadoPagos = rows;

                  db.all(query7, params7, (err, rows) => {
                    if (err) return reject(err);
                    resultado.rechazosTime = rows;

                    db.all(query8, params8, (err, rows) => {
                      if (err) return reject(err);
                      resultado.platillos = rows;

                      resolve(resultado);
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  }
}

module.exports = new BoletoService();
