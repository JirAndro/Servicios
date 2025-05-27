// routes/productos.routes.js
const { Router } = require('express');
const { 
    obtenerProductos, 
    obtenerProductoPorId,
    crearProducto,
    actualizarProducto,
    eliminarProducto
} = require('../controllers/productos.controller.js');
const { verifyToken, isAdmin } = require("../middlewares/authJwt.js"); // Importamos los middlewares

const router = Router();

// Rutas Públicas (no requieren token)
// GET /api/productos - Obtener todos los productos
router.get('/', obtenerProductos);

// GET /api/productos/:id - Obtener un producto por ID
router.get('/:id', obtenerProductoPorId);


// Rutas Protegidas (requieren token y, opcionalmente, un rol específico)

// POST /api/productos - Crear un nuevo producto
// Solo usuarios autenticados y que sean administradores pueden crear productos
router.post('/', [verifyToken, isAdmin], crearProducto);

// PUT /api/productos/:id - Actualizar un producto existente
// Solo usuarios autenticados y que sean administradores pueden actualizar
router.put('/:id', [verifyToken, isAdmin], actualizarProducto);

// DELETE /api/productos/:id - Eliminar un producto (baja lógica)
// Solo usuarios autenticados y que sean administradores pueden eliminar
router.delete('/:id', [verifyToken, isAdmin], eliminarProducto);

module.exports = router;

