// routes/auth.routes.js
const { Router } = require('express');
const { registrarUsuario, loginUsuario } = require('../controllers/auth.controller.js');

const router = Router();

// Ruta para registrar un nuevo usuario
// POST /api/auth/registro
router.post('/registro', registrarUsuario);

// Ruta para iniciar sesión
// POST /api/auth/login
router.post('/login', loginUsuario);

module.exports = router;

