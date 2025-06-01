// routes/usuarios.routes.js
const { Router } = require('express');
const { 
    obtenerTodosLosUsuarios,
    actualizarUsuarioPorAdmin, // <<<--- IMPORTAR
    eliminarUsuarioPorAdmin    // <<<--- IMPORTAR
} = require('../controllers/usuarios.controller.js');
const { verifyToken, isAdmin } = require('../middlewares/authJwt.js');

const router = Router();

// GET /api/admin/usuarios - Obtener todos los usuarios (Solo Admin)
router.get('/', [verifyToken, isAdmin], obtenerTodosLosUsuarios);

// PUT /api/admin/usuarios/:id - Actualizar un usuario por Admin
router.put('/:id', [verifyToken, isAdmin], actualizarUsuarioPorAdmin); // <<<--- NUEVA RUTA

// DELETE /api/admin/usuarios/:id - Eliminar un usuario por Admin
router.delete('/:id', [verifyToken, isAdmin], eliminarUsuarioPorAdmin); // <<<--- NUEVA RUTA


console.log("[LOG BACKEND RUTAS] Router de Administración de Usuarios (usuarios.routes.js) configurado con rutas: GET /, PUT /:id, DELETE /:id");

module.exports = router;
