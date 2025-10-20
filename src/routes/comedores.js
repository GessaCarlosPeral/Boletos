const express = require('express');
const router = express.Router();
const comedorService = require('../services/comedorService');
const contratistaService = require('../services/contratistaService');

// Obtener todos los comedores
router.get('/', async (req, res) => {
  try {
    const comedores = await comedorService.obtenerTodosComedores();
    res.json(comedores);
  } catch (error) {
    console.error('Error obteniendo comedores:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener comedores por nombre de contratista
router.get('/contratista/:nombreContratista', async (req, res) => {
  try {
    const { nombreContratista } = req.params;
    const comedores = await comedorService.obtenerComedoresPorNombreContratista(nombreContratista);
    res.json(comedores);
  } catch (error) {
    console.error('Error obteniendo comedores del contratista:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener comedor por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const comedor = await comedorService.obtenerComedorPorId(id);

    if (!comedor) {
      return res.status(404).json({ error: 'Comedor no encontrado' });
    }

    res.json(comedor);
  } catch (error) {
    console.error('Error obteniendo comedor:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear nuevo comedor
router.post('/', async (req, res) => {
  try {
    const { nombre, nombreContratista, ubicacion, codigo } = req.body;

    if (!nombre || !nombreContratista) {
      return res.status(400).json({
        error: 'Faltan datos requeridos: nombre, nombreContratista'
      });
    }

    // Obtener o crear contratista
    const contratista = await contratistaService.obtenerOCrearContratista(nombreContratista);

    // Crear comedor
    const comedor = await comedorService.crearComedor(
      nombre,
      contratista.id,
      ubicacion,
      codigo
    );

    res.json({
      exito: true,
      comedor
    });

  } catch (error) {
    console.error('Error creando comedor:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar comedor
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, ubicacion, codigo } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const resultado = await comedorService.actualizarComedor(id, nombre, ubicacion, codigo);

    if (resultado.exito) {
      res.json({
        exito: true,
        mensaje: 'Comedor actualizado exitosamente'
      });
    } else {
      res.status(404).json({
        exito: false,
        error: 'Comedor no encontrado'
      });
    }

  } catch (error) {
    console.error('Error actualizando comedor:', error);
    res.status(500).json({ error: error.message });
  }
});

// Desactivar comedor
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await comedorService.desactivarComedor(id);

    if (resultado.exito) {
      res.json({
        exito: true,
        mensaje: 'Comedor desactivado exitosamente'
      });
    } else {
      res.status(404).json({
        exito: false,
        error: 'Comedor no encontrado'
      });
    }

  } catch (error) {
    console.error('Error desactivando comedor:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
