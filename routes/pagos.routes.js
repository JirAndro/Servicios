// routes/pagos.routes.js
const { Router } = require('express');
const { 
    crearOrdenPayPal, 
    capturarOrdenPayPal,
    cancelarOrdenPayPal,
    webhookPayPal
} = require('../controllers/pagos.controller.js');
const { verifyToken } = require('../middlewares/authJwt.js'); // Para proteger la creación de la orden

const router = Router();

// Crear una orden de pago en PayPal
// El usuario debe estar autenticado para iniciar un pago
router.post('/paypal/crear-orden', [verifyToken], crearOrdenPayPal);

// PayPal redirige aquí después de que el usuario aprueba el pago
// Esta ruta no necesita verifyToken porque la seguridad la da el token de PayPal
router.get('/paypal/capturar-orden', capturarOrdenPayPal);

// PayPal redirige aquí si el usuario cancela el pago
router.get('/paypal/cancelar-orden', cancelarOrdenPayPal);

// Endpoint para recibir webhooks de PayPal
router.post('/paypal/webhook', webhookPayPal);


module.exports = router;

