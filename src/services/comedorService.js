const db = require('../database/db');

class ComedorService {
  // Crear nuevo comedor
  async crearComedor(nombre, contratistaId, ubicacion = null, codigo = null) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO comedores (nombre, contratista_id, ubicacion, codigo)
         VALUES (?, ?, ?, ?)`,
        [nombre, contratistaId, ubicacion, codigo],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              nombre,
              contratista_id: contratistaId,
              ubicacion,
              codigo
            });
          }
        }
      );
    });
  }

  // Obtener comedores de un contratista
  async obtenerComedoresPorContratista(contratistaId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT c.*, con.nombre as contratista_nombre, con.codigo as contratista_codigo
         FROM comedores c
         INNER JOIN contratistas con ON c.contratista_id = con.id
         WHERE c.contratista_id = ? AND c.activo = 1
         ORDER BY c.nombre`,
        [contratistaId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Obtener comedores por nombre de contratista
  async obtenerComedoresPorNombreContratista(nombreContratista) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT c.*, con.nombre as contratista_nombre, con.codigo as contratista_codigo
         FROM comedores c
         INNER JOIN contratistas con ON c.contratista_id = con.id
         WHERE con.nombre = ? AND c.activo = 1
         ORDER BY c.nombre`,
        [nombreContratista],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Obtener todos los comedores
  async obtenerTodosComedores() {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT c.*, con.nombre as contratista_nombre, con.codigo as contratista_codigo
         FROM comedores c
         INNER JOIN contratistas con ON c.contratista_id = con.id
         WHERE c.activo = 1
         ORDER BY con.nombre, c.nombre`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Obtener comedor por ID
  async obtenerComedorPorId(id) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT c.*, con.nombre as contratista_nombre, con.codigo as contratista_codigo
         FROM comedores c
         INNER JOIN contratistas con ON c.contratista_id = con.id
         WHERE c.id = ?`,
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  // Actualizar comedor
  async actualizarComedor(id, nombre, ubicacion, codigo) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE comedores
         SET nombre = ?, ubicacion = ?, codigo = ?
         WHERE id = ?`,
        [nombre, ubicacion, codigo, id],
        function(err) {
          if (err) reject(err);
          else resolve({ exito: this.changes > 0 });
        }
      );
    });
  }

  // Desactivar comedor (soft delete)
  async desactivarComedor(id) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE comedores SET activo = 0 WHERE id = ?`,
        [id],
        function(err) {
          if (err) reject(err);
          else resolve({ exito: this.changes > 0 });
        }
      );
    });
  }

  // Obtener o crear comedor por nombre y contratista
  async obtenerOCrearComedor(nombre, contratistaId, ubicacion = null) {
    return new Promise((resolve, reject) => {
      // Primero intentar obtener
      db.get(
        'SELECT * FROM comedores WHERE nombre = ? AND contratista_id = ?',
        [nombre, contratistaId],
        async (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (row) {
            resolve(row);
          } else {
            // Si no existe, crear uno nuevo
            try {
              const nuevoComedor = await this.crearComedor(nombre, contratistaId, ubicacion);
              resolve(nuevoComedor);
            } catch (error) {
              reject(error);
            }
          }
        }
      );
    });
  }
}

module.exports = new ComedorService();
