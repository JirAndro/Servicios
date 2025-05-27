// controllers/pagos.controller.js
const { client, paypal } = require('../config/paypal.config.js'); // Cliente PayPal configurado
const dbPool = require('../database.js');

// Crear una orden de pago en PayPal
const crearOrdenPayPal = async (req, res) => {
    const { pedidoId } = req.body; // Necesitamos el ID del pedido para obtener el total

    if (!pedidoId) {
        return res.status(400).json({ mensaje: "Se requiere el ID del pedido." });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        // Obtener el total del pedido desde la base de datos
        const [pedidos] = await connection.query("SELECT totalPedido, id FROM Pedidos WHERE id = ? AND estado = 'pendiente_pago'", [pedidoId]);
        connection.release();

        if (pedidos.length === 0) {
            return res.status(404).json({ mensaje: `Pedido con ID ${pedidoId} no encontrado o ya procesado.` });
        }

        const pedido = pedidos[0];
        const totalConDosDecimales = parseFloat(pedido.totalPedido).toFixed(2);

        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
            intent: "CAPTURE", // Intención de capturar el pago inmediatamente
            purchase_units: [{
                amount: {
                    currency_code: "MXN", // O la moneda que manejes, ej: "USD"
                    value: totalConDosDecimales, // El total del pedido
                },
                description: `Pedido #${pedido.id} - Tienda de Videojuegos`,
                // Puedes añadir más detalles como items si lo deseas
                // custom_id: pedido.id.toString() // Para identificar el pedido en PayPal
            }],
            application_context: {
application_context: {
    return_url: `https://servicios-601c.onrender.com/api/pagos/paypal/capturar-orden?pedidoId=${pedido.id}`,
    cancel_url: `https://servicios-601c.onrender.com/api/pagos/paypal/cancelar-orden?pedidoId=${pedido.id}`,
    brand_name: "Tienda de Videojuegos Andro",
    landing_page: "LOGIN", // O "GUEST_CHECKOUT" si quieres permitir pagos sin cuenta PayPal fácilmente
    user_action: "PAY_NOW",
    shipping_preference: "NO_SHIPPING" // <<<---- AÑADE ESTA LÍNEA
}
            }
        });

        const order = await client.execute(request);

        // Guardar el orderId de PayPal en tu pedido (opcional pero recomendado para futuras referencias)
        // await dbPool.query("UPDATE Pedidos SET idTransaccionPasarela = ? WHERE id = ?", [order.result.id, pedido.id]);

        res.status(201).json({
            orderID: order.result.id,
            approveUrl: order.result.links.find(link => link.rel === 'approve').href
        });

    } catch (error) {
        console.error("Error al crear la orden en PayPal:", error.response ? error.response.data : error.message);
        if (connection) connection.release();
        res.status(500).json({ mensaje: "Error al crear la orden de pago con PayPal.", detalle: error.message });
    }
};

// Capturar (ejecutar) una orden de pago en PayPal
const capturarOrdenPayPal = async (req, res) => {
    const { token, PayerID, pedidoId } = req.query; // PayPal envía 'token' (que es el orderID) y PayerID
    const orderID = token; 

    if (!orderID || !pedidoId) {
         return res.status(400).send("Petición inválida. Faltan parámetros.");
    }

    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});

    try {
        const capture = await client.execute(request);
        const captureId = capture.result.purchase_units[0].payments.captures[0].id;

        // Aquí es donde actualizas el estado de tu pedido en la base de datos a 'pagado'
        // y guardas el ID de la captura de PayPal.
        let connection = await dbPool.getConnection();
        await connection.query(
            "UPDATE Pedidos SET estado = 'pagado', idTransaccionPasarela = ? WHERE id = ?", 
            [captureId, pedidoId]
        );
        connection.release();

        // Redirigir al usuario a una página de éxito en tu frontend
        // Por ahora, solo enviamos un mensaje JSON
        res.status(200).json({ 
            mensaje: "¡Pago capturado exitosamente!",
            pedidoId: pedidoId,
            paypalCaptureId: captureId,
            detalle: capture.result 
        });
        // En una app real: res.redirect(`https://tufrontend.com/pago-exitoso?pedidoId=${pedidoId}`);

    } catch (error) {
        console.error("Error al capturar la orden en PayPal:", error.response ? error.response.data : error.message);
        // Redirigir a una página de error en tu frontend
        res.status(500).json({ mensaje: "Error al capturar el pago.", detalle: error.message });
        // En una app real: res.redirect(`https://tufrontend.com/pago-fallido?pedidoId=${pedidoId}`);
    }
};

// Manejar cancelación de orden por el usuario
const cancelarOrdenPayPal = (req, res) => {
    const { pedidoId } = req.query;
    // Aquí podrías actualizar el estado del pedido a 'cancelado_por_usuario' o similar
    // Por ahora, solo enviamos un mensaje
    res.status(200).json({
        mensaje: "El pago con PayPal fue cancelado por el usuario.",
        pedidoId: pedidoId
    });
    // En una app real: res.redirect(`https://tufrontend.com/pago-cancelado?pedidoId=${pedidoId}`);
};

// Endpoint para Webhooks de PayPal (Notificaciones Instantáneas de Pago - IPN)
// ¡ESTA ES UNA PARTE AVANZADA Y CRUCIAL PARA PRODUCCIÓN!
// Requiere verificación de la firma de PayPal para seguridad.
// Por ahora, solo un placeholder.
const webhookPayPal = async (req, res) => {
    console.log("Webhook de PayPal recibido:");
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);

    // TODO: Implementar la verificación de la firma del webhook de PayPal
    // const verify = paypal.webhooks.WebhookVerification();
    // const isVerified = verify.verify(req.headers, req.body, "ID_DE_TU_WEBHOOK_EN_PAYPAL_DASHBOARD");
    // if (!isVerified) {
    //     console.error("Fallo en la verificación del Webhook de PayPal");
    //     return res.sendStatus(400);
    // }

    const eventType = req.body.event_type;
    const resource = req.body.resource;

    // Ejemplo: Manejar el evento CHECKOUT.ORDER.APPROVED o PAYMENT.CAPTURE.COMPLETED
    if (eventType === "CHECKOUT.ORDER.APPROVED" || eventType === "PAYMENT.CAPTURE.COMPLETED") {
        const orderIdPayPal = resource.id; // ID de la orden o captura en PayPal
        const customPedidoId = resource.purchase_units[0].custom_id; // Si lo configuraste al crear la orden

        console.log(`Evento ${eventType} para la orden de PayPal ID: ${orderIdPayPal}`);
        // Aquí deberías:
        // 1. Verificar que no hayas procesado este evento antes (usando el ID del evento de PayPal).
        // 2. Obtener tu pedidoId interno (si usaste custom_id o tienes el orderIdPayPal guardado).
        // 3. Actualizar el estado de tu pedido a 'pagado' si aún no lo está.
        // Ejemplo:
        // if (customPedidoId) {
        //    await dbPool.query("UPDATE Pedidos SET estado = 'pagado', idTransaccionPasarela = ? WHERE id = ? AND estado != 'pagado'", [orderIdPayPal, customPedidoId]);
        //    console.log(`Pedido ${customPedidoId} actualizado a pagado vía webhook.`);
        // }
    }
    // Otros eventos que podrías manejar: PAYMENT.CAPTURE.DENIED, PAYMENT.CAPTURE.REFUNDED, etc.

    res.sendStatus(200); // Responder a PayPal que recibiste el evento
};


module.exports = {
    crearOrdenPayPal,
    capturarOrdenPayPal,
    cancelarOrdenPayPal,
    webhookPayPal
};

