const db = require('../database/db');

class ContratistaService {
  // Generar código único a partir del nombre
  generarCodigo(nombre) {
    // Eliminar caracteres especiales y convertir a mayúsculas
    let codigo = nombre
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^A-Z0-9\s]/g, '') // Solo letras, números y espacios
      .trim();

    // Estrategia de generación de código:
    // 1. Si tiene varias palabras, tomar iniciales
    // 2. Si es una palabra, tomar primeras 3-4 letras

    const palabras = codigo.split(/\s+/).filter(p => p.length > 0);

    if (palabras.length >= 2) {
      // Tomar iniciales de cada palabra (máximo 4)
      codigo = palabras.slice(0, 4).map(p => p[0]).join('');
    } else if (palabras.length === 1) {
      // Tomar primeras 3-4 letras
      codigo = palabras[0].substring(0, Math.min(4, palabras[0].length));
    }

    return codigo;
  }

  // Obtener o crear contratista
  async obtenerOCrearContratista(nombre) {
    return new Promise((resolve, reject) => {
      // Primero buscar si existe
      db.get(
        'SELECT * FROM contratistas WHERE nombre = ?',
        [nombre],
        async (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          if (row) {
            // Ya existe, devolver
            resolve(row);
          } else {
            // No existe, crear con código auto-generado
            try {
              const nuevoContratista = await this.crearContratista(nombre);
              resolve(nuevoContratista);
            } catch (error) {
              reject(error);
            }
          }
        }
      );
    });
  }

  // Crear nuevo contratista
  async crearContratista(nombre, codigoManual = null) {
    return new Promise((resolve, reject) => {
      // Generar código si no se provee uno manual
      let codigo = codigoManual || this.generarCodigo(nombre);

      // Verificar si el código ya existe
      db.get(
        'SELECT codigo FROM contratistas WHERE codigo = ?',
        [codigo],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }

          // Si ya existe, agregar número secuencial
          if (row) {
            let contador = 2;
            const codigoBase = codigo;

            const verificarCodigo = () => {
              const codigoConNumero = `${codigoBase}${contador}`;

              db.get(
                'SELECT codigo FROM contratistas WHERE codigo = ?',
                [codigoConNumero],
                (err, exists) => {
                  if (err) {
                    reject(err);
                    return;
                  }

                  if (exists) {
                    contador++;
                    verificarCodigo();
                  } else {
                    insertarContratista(codigoConNumero);
                  }
                }
              );
            };

            verificarCodigo();
          } else {
            insertarContratista(codigo);
          }
        }
      );

      const insertarContratista = (codigoFinal) => {
        db.run(
          'INSERT INTO contratistas (nombre, codigo) VALUES (?, ?)',
          [nombre, codigoFinal],
          function(err) {
            if (err) {
              reject(err);
            } else {
              resolve({
                id: this.lastID,
                nombre,
                codigo: codigoFinal
              });
            }
          }
        );
      };
    });
  }

  // Obtener todos los contratistas
  async obtenerContratistas() {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM contratistas WHERE activo = 1 ORDER BY nombre',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Obtener contratista por código
  async obtenerPorCodigo(codigo) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM contratistas WHERE codigo = ?',
        [codigo],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  // Actualizar código de contratista
  async actualizarCodigo(nombre, nuevoCodigo) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE contratistas SET codigo = ? WHERE nombre = ?',
        [nuevoCodigo, nombre],
        function(err) {
          if (err) reject(err);
          else resolve({ exito: this.changes > 0 });
        }
      );
    });
  }
}

module.exports = new ContratistaService();
