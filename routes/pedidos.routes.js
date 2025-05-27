// routes/pedidos.routes.js
const { Router } = require('express');
// Importar los controladores necesarios
const { crearPedido, obtenerMisPedidos } = require('../controllers/pedidos.controller.js'); 
const { verifyToken } = require('../middlewares/authJwt.js');

const router = Router();

// Ruta para crear un nuevo pedido
// POST /api/pedidos
// Solo usuarios autenticados pueden crear pedidos
router.post('/', [verifyToken], crearPedido);

// NUEVA RUTA para que un usuario obtenga sus propios pedidos
// GET /api/pedidos/mis-pedidos
// Solo usuarios autenticados pueden ver sus pedidos
router.get('/mis-pedidos', [verifyToken], obtenerMisPedidos);


// (Aquí irían más rutas para pedidos, como GET para ver un pedido específico por ID, etc.)

module.exports = router;

