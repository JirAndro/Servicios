// routes/pedidos.routes.js
const { Router } = require('express');
const { 
    crearPedido, 
    obtenerMisPedidos,
    cancelarPedido,
    modificarDireccionPedido // <<<--- IMPORTA LA NUEVA FUNCIÓN DEL CONTROLADOR
} = require('../controllers/pedidos.controller.js'); // Asegúrate que la ruta al controlador sea correcta
const { verifyToken } = require('../middlewares/authJwt.js'); // Tu middleware de autenticación

const router = Router();

// Ruta para crear un nuevo pedido
// POST /api/pedidos
router.post('/', [verifyToken], crearPedido);

// Ruta para que un usuario obtenga sus propios pedidos
// GET /api/pedidos/mis-pedidos
router.get('/mis-pedidos', [verifyToken], obtenerMisPedidos);

// Ruta para cancelar un pedido (puede ser pendiente_pago o pagado con reembolso manual)
// PUT /api/pedidos/:pedidoId/cancelar
router.put('/:pedidoId/cancelar', [verifyToken], cancelarPedido);

// NUEVA RUTA para modificar la dirección de envío de un pedido existente
// PUT /api/pedidos/:pedidoId/direccion
router.put('/:pedidoId/direccion', [verifyToken], modificarDireccionPedido); // <<<--- NUEVA RUTA AÑADIDA

// Log para confirmar que este archivo de rutas se cargó y configuró (actualizado)
console.log("[LOG BACKEND RUTAS] Router de Pedidos (pedidos.routes.js) configurado con rutas: POST /, GET /mis-pedidos, PUT /:pedidoId/cancelar, PUT /:pedidoId/direccion");

module.exports = router;
