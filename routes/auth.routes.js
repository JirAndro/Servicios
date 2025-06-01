// routes/auth.routes.js
const { Router } = require('express');
const { 
    registrarUsuario, 
    loginUsuario,
    actualizarMiPerfil, // <<<--- IMPORTA LA NUEVA FUNCIÓN DEL CONTROLADOR
    eliminarMiCuenta    // <<<--- IMPORTA LA NUEVA FUNCIÓN DEL CONTROLADOR
} = require('../controllers/auth.controller.js'); 
const { verifyToken } = require('../middlewares/authJwt.js'); // Necesitas verifyToken para proteger las nuevas rutas

const router = Router();

// Ruta para registrar un nuevo usuario
// POST /api/auth/registro
router.post('/registro', registrarUsuario);

// Ruta para iniciar sesión
// POST /api/auth/login
router.post('/login', loginUsuario);

// --- NUEVAS RUTAS PARA GESTIÓN DE CUENTA DEL PROPIO USUARIO ---

// Ruta para que un usuario actualice su propio perfil (ej. nombre)
// PUT /api/auth/me
router.put('/me', [verifyToken], actualizarMiPerfil); // <<<--- NUEVA RUTA

// Ruta para que un usuario elimine su propia cuenta
// DELETE /api/auth/me/delete-account (o la ruta que prefieras, como /me)
router.delete('/me/delete-account', [verifyToken], eliminarMiCuenta); // <<<--- NUEVA RUTA


// Log para confirmar que este archivo de rutas se cargó y configuró
console.log("[LOG BACKEND RUTAS] Router de Autenticación (auth.routes.js) configurado con rutas: POST /registro, POST /login, PUT /me, DELETE /me/delete-account");

module.exports = router;
