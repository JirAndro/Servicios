// routes/auth.routes.js
const { Router } = require('express');
const { registrarUsuario, loginUsuario } = require('../controllers/auth.controller.js'); // Verifica esta ruta
// Aquí podrían ir otros middlewares si los usas para estas rutas específicas

const router = Router();

// Ruta para registrar un nuevo usuario
// POST /api/auth/registro
router.post('/registro', registrarUsuario);

// Ruta para iniciar sesión
// POST /api/auth/login
router.post('/login', loginUsuario); // <<<--- ESTA ES LA RUTA CLAVE PARA EL LOGIN

module.exports = router;
