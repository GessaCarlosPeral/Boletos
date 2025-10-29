const express = require('express');
const router = express.Router();
const precioService = require('../services/precioService');
const { requireAuth } = require('../middleware/authMiddleware');

// Obtener todos los precios
router.get('/', requireAuth, async (req, res) => {
  try {
    const precios = await precioService.obtenerPrecios();
    res.json({ precios });
  } catch (error) {
    console.error('Error obteniendo precios:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener precio activo
router.get('/activo', async (req, res) => {
  try {
    const precio = await precioService.obtenerPrecioActivo();
    res.json(precio);
  } catch (error) {
    console.error('Error obteniendo precio activo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener un precio por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const precio = await precioService.obtenerPrecioPorId(id);

    if (!precio) {
      return res.status(404).json({ error: 'Precio no encontrado' });
    }

    res.json(precio);
  } catch (error) {
    console.error('Error obteniendo precio:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear nuevo precio
router.post('/', async (req, res) => {
  try {
    const { nombre, precioUnitario, descripcion } = req.body;

    if (!nombre || !precioUnitario) {
      return res.status(400).json({
        error: 'Faltan datos requeridos: nombre, precioUnitario'
      });
    }

    const resultado = await precioService.crearPrecio(nombre, precioUnitario, descripcion);

    res.json({
      exito: true,
      mensaje: 'Precio creado exitosamente',
      id: resultado.id
    });
  } catch (error) {
    console.error('Error creando precio:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar precio
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, precioUnitario, descripcion } = req.body;

    if (!nombre || !precioUnitario) {
      return res.status(400).json({
        error: 'Faltan datos requeridos: nombre, precioUnitario'
      });
    }

    const resultado = await precioService.actualizarPrecio(id, nombre, precioUnitario, descripcion);

    res.json({
      exito: true,
      mensaje: 'Precio actualizado exitosamente',
      modificados: resultado.modificados
    });
  } catch (error) {
    console.error('Error actualizando precio:', error);
    res.status(500).json({ error: error.message });
  }
});

// Desactivar precio
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await precioService.desactivarPrecio(id);

    res.json({
      exito: true,
      mensaje: 'Precio desactivado exitosamente',
      modificados: resultado.modificados
    });
  } catch (error) {
    console.error('Error desactivando precio:', error);
    res.status(500).json({ error: error.message });
  }
});

// Activar precio
router.patch('/:id/activar', async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await precioService.activarPrecio(id);

    res.json({
      exito: true,
      mensaje: 'Precio activado exitosamente',
      modificados: resultado.modificados
    });
  } catch (error) {
    console.error('Error activando precio:', error);
    res.status(500).json({ error: error.message });
  }
});

// Calcular monto total
router.post('/calcular', async (req, res) => {
  try {
    const { cantidad, precioUnitario } = req.body;

    if (!cantidad) {
      return res.status(400).json({ error: 'Se requiere la cantidad' });
    }

    const resultado = await precioService.calcularMontoTotal(cantidad, precioUnitario);

    res.json(resultado);
  } catch (error) {
    console.error('Error calculando monto:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
