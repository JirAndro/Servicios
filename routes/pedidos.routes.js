// routes/pedidos.routes.js
const { Router } = require('express');
const { 
    crearPedido, 
    obtenerMisPedidos,
    cancelarPedido 
} = require('../controllers/pedidos.controller.js'); // Asegúrate que la ruta al controlador sea correcta
const { verifyToken } = require('../middlewares/authJwt.js'); // Tu middleware de autenticación

const router = Router();

// Ruta para crear un nuevo pedido
// POST /api/pedidos
router.post('/', [verifyToken], crearPedido);

// Ruta para que un usuario obtenga sus propios pedidos
// GET /api/pedidos/mis-pedidos
router.get('/mis-pedidos', [verifyToken], obtenerMisPedidos);

// NUEVA RUTA para cancelar un pedido
// PUT /api/pedidos/:pedidoId/cancelar
router.put('/:pedidoId/cancelar', [verifyToken], cancelarPedido);

// Log para confirmar que este archivo de rutas se cargó y configuró
console.log("[LOG BACKEND RUTAS] Router de Pedidos (pedidos.routes.js) configurado con rutas: POST /, GET /mis-pedidos, PUT /:pedidoId/cancelar");

module.exports = router;
