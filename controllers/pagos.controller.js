// controllers/pagos.controller.js
const { client, paypal } = require('../config/paypal.config.js');
const dbPool = require('../database.js');
const webhookConfig = require('../config/webhook.config.js'); // Para el Webhook ID
const crypto = require('crypto'); // Módulo nativo de Node.js para criptografía

// ... (funciones crearOrdenPayPal, capturarOrdenPayPal, cancelarOrdenPayPal sin cambios) ...
const crearOrdenPayPal = async (req, res) => { /* ...tu código existente ... */ };
const capturarOrdenPayPal = async (req, res) => { /* ...tu código existente ... */ };
const cancelarOrdenPayPal = (req, res) => { /* ...tu código existente ... */ };

// Endpoint para Webhooks de PayPal con Verificación
const webhookPayPal = async (req, res) => {
    console.log("Webhook de PayPal recibido:");
    // Estas son las cabeceras que PayPal envía y que necesitas para la verificación
    const transmissionId = req.headers['paypal-transmission-id'];
    const transmissionTime = req.headers['paypal-transmission-time'];
    const signature = req.headers['paypal-transmission-sig']; // La firma que hay que verificar
    const authAlgo = req.headers['paypal-auth-algo'];
    const certUrl = req.headers['paypal-cert-url'];
    const webhookId = webhookConfig.id; // El ID de tu webhook desde tu config
    const requestBody = req.body; // El cuerpo del webhook tal como lo recibes

    console.log("Headers para verificación:", { transmissionId, transmissionTime, signature, authAlgo, certUrl, webhookId });
    console.log("Body del webhook:", requestBody);

    // PASO 1: Verificar la autenticidad del Webhook
    // La implementación exacta de la verificación depende del SDK de PayPal que uses
    // o si lo haces manualmente. El SDK @paypal/paypal-server-sdk (más nuevo)
    // debería tener funciones para esto. Con @paypal/checkout-server-sdk es más complejo.
    // A continuación, un ESQUEMA de lo que implicaría la verificación.
    // DEBERÁS CONSULTAR LA DOCUMENTACIÓN OFICIAL DE PAYPAL PARA LA IMPLEMENTACIÓN PRECISA
    // CON EL SDK QUE ESTÉS USANDO.

    let isVerified = false;
    try {
        // Ejemplo conceptual de cómo podría ser con un SDK que tenga una función de verificación:
        // isVerified = await paypal.notification.webhookEvent.verify(
        //     transmissionId,
        //     transmissionTime,
        //     webhookId,
        //     JSON.stringify(requestBody), // El cuerpo original como string
        //     certUrl,
        //     signature,
        //     authAlgo // O el SDK podría determinar el algo de la cabecera
        // );
        
        // NOTA: El SDK @paypal/checkout-server-sdk NO parece tener una utilidad directa
        // para la verificación de webhooks. La verificación manual es compleja e implica:
        // 1. Obtener el certificado de PayPal desde certUrl.
        // 2. Construir la cadena firmada: transmissionId|transmissionTime|webhookId|CRC32delCuerpoOriginal.
        // 3. Usar el certificado público para verificar la 'signature' contra la cadena firmada usando el 'authAlgo'.
        // Esto está fuera del alcance de una simple modificación aquí.
        // Se recomienda encarecidamente usar un SDK que facilite esto o una librería especializada.

        // --- INICIO: Placeholder para simular verificación (SOLO PARA DESARROLLO INICIAL) ---
        // ¡¡¡ATENCIÓN!!! ESTO NO ES SEGURO PARA PRODUCCIÓN. SOLO PARA PRUEBAS LOCALES INICIALES.
        // DEBES IMPLEMENTAR LA VERIFICACIÓN REAL.
        if (process.env.NODE_ENV !== 'production' && transmissionId && signature) {
            console.warn("ADVERTENCIA: Verificación de Webhook SIMULADA como exitosa para desarrollo. IMPLEMENTAR VERIFICACIÓN REAL.");
            isVerified = true; 
        } else if (process.env.NODE_ENV === 'production') {
             console.error("ERROR CRÍTICO: Intento de procesar webhook en producción SIN VERIFICACIÓN REAL.");
             // En producción, si no hay verificación real, no deberías procesar.
        }
        // --- FIN: Placeholder para simular verificación ---


        if (!isVerified && process.env.NODE_ENV === 'production') { // En producción, si no se verifica, es un error
            console.error("Fallo en la verificación del Webhook de PayPal o no implementada para producción.");
            return res.status(401).send("Fallo en la verificación del webhook.");
        } else if (!isVerified && process.env.NODE_ENV !== 'production'){
            console.warn("Fallo en la verificación del Webhook de PayPal (o no implementada), pero continuando en desarrollo.");
            // Puedes decidir si continuar o no en desarrollo sin verificación. Por ahora, continuaremos.
        }


        // PASO 2: Procesar el evento si la verificación fue exitosa (o si estamos en desarrollo y la omitimos)
        const eventType = requestBody.event_type;
        const resource = requestBody.resource;

        console.log(`Procesando evento verificado (o simulado como verificado): ${eventType}`);

        if (eventType === "CHECKOUT.ORDER.APPROVED" || eventType === "PAYMENT.CAPTURE.COMPLETED") {
            const orderIdPayPal = resource.id;
            // Intenta obtener tu pedidoId interno.
            // Si configuraste 'custom_id' al crear la orden en PayPal con tu pedidoId:
            const customPedidoId = resource.purchase_units && resource.purchase_units[0] ? resource.purchase_units[0].custom_id : null;
            // O si guardaste el orderIdPayPal en tu tabla Pedidos al crear la orden:
            // const [pedidoInterno] = await dbPool.query("SELECT id FROM Pedidos WHERE idTransaccionPasarela = ?", [orderIdPayPal]);
            // const pedidoIdParaActualizar = customPedidoId || (pedidoInterno.length > 0 ? pedidoInterno[0].id : null);

            // --- Lógica para actualizar tu BD ---
            // Aquí es importante que tu lógica sea IDEMPOTENTE.
            // Es decir, si recibes el mismo evento varias veces, no actualices el pedido múltiples veces.
            // Una forma es verificar el estado actual del pedido antes de actualizar.
            // Por ejemplo, si el evento es PAYMENT.CAPTURE.COMPLETED:
            if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
                const paypalTransactionId = resource.id; // ID de la captura de PayPal
                const pedidoIdAsociado = customPedidoId; // Asumiendo que usaste custom_id

                if (pedidoIdAsociado) {
                    let connection;
                    try {
                        connection = await dbPool.getConnection();
                        await connection.beginTransaction();
                        // Solo actualiza si el estado no es ya 'pagado' para evitar doble procesamiento
                        const [result] = await connection.query(
                            "UPDATE Pedidos SET estado = 'pagado', idTransaccionPasarela = ? WHERE id = ? AND estado != 'pagado'", 
                            [paypalTransactionId, pedidoIdAsociado]
                        );
                        if (result.affectedRows > 0) {
                            console.log(`Pedido ${pedidoIdAsociado} actualizado a 'pagado' vía webhook (${eventType}). ID Transacción PayPal: ${paypalTransactionId}`);
                            // Aquí podrías añadir lógica adicional, como enviar un email de confirmación al cliente.
                        } else {
                            console.log(`Webhook ${eventType} recibido para Pedido ${pedidoIdAsociado}, pero ya estaba pagado o no se encontró.`);
                        }
                        await connection.commit();
                        connection.release();
                    } catch (dbError) {
                        if (connection) {
                            await connection.rollback();
                            connection.release();
                        }
                        console.error(`Error de BD al procesar webhook ${eventType} para Pedido ${pedidoIdAsociado}:`, dbError);
                        // No devuelvas un 500 a PayPal aquí a menos que sea un error que PayPal deba reintentar.
                        // Si es un error de tu lógica que no se resolverá con un reintento, igual responde 200.
                    }
                } else {
                    console.warn(`Webhook ${eventType} recibido, pero no se pudo determinar el pedidoId interno. OrderID PayPal: ${orderIdPayPal}`);
                }
            } else if (eventType === "CHECKOUT.ORDER.APPROVED") {
                // Para CHECKOUT.ORDER.APPROVED, usualmente la captura se maneja por la redirección del return_url.
                // Podrías usar este evento para una doble verificación o logging, pero la actualización a 'pagado'
                // suele hacerse tras la captura exitosa.
                 console.log(`Evento CHECKOUT.ORDER.APPROVED para la orden de PayPal ID: ${orderIdPayPal}. El estado se actualizará tras la captura.`);
            }
        }
        // Considera manejar otros tipos de eventos como cancelaciones, reembolsos, etc.

        res.sendStatus(200); // Siempre responde 200 OK a PayPal para que sepa que recibiste el webhook.
                            // Si devuelves error, PayPal seguirá intentando enviar el webhook.
    } catch (verificationError) {
        console.error("Error en el proceso de verificación del webhook:", verificationError);
        res.status(400).send("Error en la verificación del webhook."); // O 500 si es un error interno tuyo
    }
};

module.exports = {
    crearOrdenPayPal,
    capturarOrdenPayPal,
    cancelarOrdenPayPal,
    webhookPayPal // Asegúrate que esté exportado
};

