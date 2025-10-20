const db = require('../database/db');

/**
 * Servicio para gestión de precios estándar
 */

// Obtener todos los precios
function obtenerPrecios() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM precios WHERE activo = 1 ORDER BY nombre', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Obtener precio activo (el que se usará por defecto)
function obtenerPrecioActivo() {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM precios WHERE activo = 1 LIMIT 1', (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row || { precio_unitario: 0 });
      }
    });
  });
}

// Obtener un precio por ID
function obtenerPrecioPorId(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM precios WHERE id = ?', [id], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Crear nuevo precio
function crearPrecio(nombre, precioUnitario, descripcion = '') {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO precios (nombre, precio_unitario, descripcion)
       VALUES (?, ?, ?)`,
      [nombre, precioUnitario, descripcion],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      }
    );
  });
}

// Actualizar precio
function actualizarPrecio(id, nombre, precioUnitario, descripcion = '') {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE precios
       SET nombre = ?, precio_unitario = ?, descripcion = ?,
           fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [nombre, precioUnitario, descripcion, id],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ modificados: this.changes });
        }
      }
    );
  });
}

// Desactivar precio
function desactivarPrecio(id) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE precios SET activo = 0 WHERE id = ?',
      [id],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ modificados: this.changes });
        }
      }
    );
  });
}

// Activar precio
function activarPrecio(id) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE precios SET activo = 1 WHERE id = ?',
      [id],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ modificados: this.changes });
        }
      }
    );
  });
}

// Calcular monto total
function calcularMontoTotal(cantidad, precioUnitario = null) {
  return new Promise(async (resolve, reject) => {
    try {
      let precio = precioUnitario;

      if (!precio) {
        const precioActivo = await obtenerPrecioActivo();
        precio = precioActivo.precio_unitario;
      }

      const total = cantidad * precio;
      resolve({
        cantidad,
        precioUnitario: precio,
        total: parseFloat(total.toFixed(2))
      });
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  obtenerPrecios,
  obtenerPrecioActivo,
  obtenerPrecioPorId,
  crearPrecio,
  actualizarPrecio,
  desactivarPrecio,
  activarPrecio,
  calcularMontoTotal
};
