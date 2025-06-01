// routes/pedidos.routes.js
const { Router } = require('express');
const { 
    crearPedido, 
    obtenerMisPedidos,
    cancelarPedido // <<<--- IMPORTAR LA NUEVA FUNCIÓN
} = require('../controllers/pedidos.controller.js'); 
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
// (Usamos PUT ya que estamos actualizando el estado de un pedido existente)
router.put('/:pedidoId/cancelar', [verifyToken], cancelarPedido); // <<<--- NUEVA RUTA

// Aquí podrían ir otras rutas como:
// router.get('/:pedidoId', [verifyToken], obtenerDetallePedidoPorId); // Para ver un pedido específico

module.exports = router;
