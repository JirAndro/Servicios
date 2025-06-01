// Crear un nuevo archivo: routes/usuarios.routes.js
const { Router } = require('express');
const { obtenerTodosLosUsuarios } = require('../controllers/usuarios.controller.js'); // Ruta a tu nuevo controlador
const { verifyToken, isAdmin } = require('../middlewares/authJwt.js'); // Tus middlewares

const router = Router();

// RUTA PARA OBTENER TODOS LOS USUARIOS (Solo Admin)
// GET /api/usuarios  (o podrías usar /api/admin/usuarios si prefieres agrupar)
router.get('/', [verifyToken, isAdmin], obtenerTodosLosUsuarios);


// Aquí irán otras rutas para que el admin gestione usuarios 
// (ej. PUT /:id/rol, DELETE /:id, etc.)


// Log para confirmar que este archivo de rutas se cargó
console.log("[LOG BACKEND RUTAS] Router de Administración de Usuarios (usuarios.routes.js) configurado con ruta: GET /");

module.exports = router;
