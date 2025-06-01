// controllers/pagos.controller.js
const { client, paypal } = require('../config/paypal.config.js'); // Cliente PayPal configurado
const dbPool = require('../database.js');

// Crear una orden de pago en PayPal
const crearOrdenPayPal = async (req, res) => {
    const { pedidoId } = req.body;
    console.log(`[LOG APP - crearOrdenPayPal] Solicitud para crear orden de PayPal para pedidoId: ${pedidoId}`);

    if (!pedidoId) {
        console.error("[LOG APP - crearOrdenPayPal] Error: Se requiere el ID del pedido.");
        return res.status(400).json({ mensaje: "Se requiere el ID del pedido." });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        console.log(`[LOG APP - crearOrdenPayPal] Conexión a BD obtenida para pedidoId: ${pedidoId}`);
        const [pedidos] = await connection.query("SELECT totalPedido, id FROM Pedidos WHERE id = ? AND estado = 'pendiente_pago'", [pedidoId]);
        // No es necesario liberar la conexión aquí si solo haces una consulta y luego la usas de nuevo.
        // Se liberará en el finally o después de la segunda consulta si la hubiera.
        // Si la liberas aquí y luego la necesitas, tendrías que obtenerla de nuevo.
        // Por ahora, la mantendremos hasta el final del bloque try o en el finally.

        if (pedidos.length === 0) {
            if (connection) connection.release(); // Liberar antes de retornar
            console.warn(`[LOG APP - crearOrdenPayPal] Pedido con ID ${pedidoId} no encontrado o ya procesado.`);
            return res.status(404).json({ mensaje: `Pedido con ID ${pedidoId} no encontrado o ya procesado.` });
        }

        const pedido = pedidos[0];
        const totalConDosDecimales = parseFloat(pedido.totalPedido).toFixed(2);
        console.log(`[LOG APP - crearOrdenPayPal] Pedido encontrado. ID: ${pedido.id}, Total: ${totalConDosDecimales}`);

        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
            intent: "CAPTURE",
            purchase_units: [{
                amount: {
                    currency_code: "MXN",
                    value: totalConDosDecimales,
                },
                description: `Pedido #${pedido.id} - Tienda de Videojuegos`,
                // custom_id: pedido.id.toString(), // Considera usar esto para facilitar la reconciliación con webhooks
            }],
            application_context: {
                return_url: `${process.env.BACKEND_URL || 'https://servicios-601c.onrender.com'}/api/pagos/paypal/capturar-orden?pedidoId=${pedido.id}`,
                cancel_url: `${process.env.BACKEND_URL || 'https://servicios-601c.onrender.com'}/api/pagos/paypal/cancelar-orden?pedidoId=${pedido.id}`,
                brand_name: "Tienda de Videojuegos Andro",
                landing_page: "LOGIN",
                user_action: "PAY_NOW",
                shipping_preference: "NO_SHIPPING"
            }
        });

        console.log(`[LOG APP - crearOrdenPayPal] Enviando petición a PayPal para crear orden para pedidoId: ${pedido.id}`);
        const order = await client.execute(request);
        console.log(`[LOG APP - crearOrdenPayPal] Orden de PayPal creada exitosamente. PayPal OrderID: ${order.result.id}`);
        
        // Opcional: Guardar el order.result.id (PayPal Order ID) en tu tabla Pedidos aquí si quieres
        // await connection.query("UPDATE Pedidos SET idReferenciaPasarela = ? WHERE id = ?", [order.result.id, pedido.id]);
        // 'idReferenciaPasarela' sería una nueva columna para guardar el ID de la orden de PayPal antes de la captura.

        if (connection) connection.release(); // Liberar conexión

        res.status(201).json({
            orderID: order.result.id,
            approveUrl: order.result.links.find(link => link.rel === 'approve').href
        });

    } catch (error) {
        console.error(`[LOG APP - crearOrdenPayPal] Error al crear la orden en PayPal para pedidoId: ${pedidoId}. Error: ${error.message}`);
        if (error.response && error.response.data) {
            console.error("[LOG APP - crearOrdenPayPal] Detalle del error de PayPal:", error.response.data);
        }
        if (connection) connection.release();
        res.status(500).json({ mensaje: "Error al crear la orden de pago con PayPal.", detalle: error.message });
    }
};

// Capturar (ejecutar) una orden de pago en PayPal
const capturarOrdenPayPal = async (req, res) => {
    const { token, PayerID, pedidoId } = req.query;
    const orderID = token; 
    console.log(`[LOG APP - CAPTURA INICIADA] PedidoID Sistema: ${pedidoId}, PayPal OrderID (token): ${orderID}, PayerID: ${PayerID}`);

    if (!orderID || !pedidoId) {
        console.error("[LOG APP - CAPTURA ERROR] Faltan orderID o pedidoId en query params.");
        return res.status(400).json({ mensaje: "Petición inválida. Faltan parámetros para capturar orden."} );
    }

    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});
    let connection;

    try {
        console.log(`[LOG APP - CAPTURA PAYPAL] Intentando capturar orden de PayPal ID: ${orderID} para PedidoID Sistema: ${pedidoId}`);
        const capture = await client.execute(request);
        const captureId = capture.result.purchase_units[0].payments.captures[0].id;
        console.log(`[LOG APP - CAPTURA PAYPAL ÉXITO] PayPal CaptureID: ${captureId} para PedidoID Sistema: ${pedidoId}. Estado PayPal: ${capture.result.status}`);

        // Solo proceder a actualizar DB si la captura fue COMPLETED por PayPal
        if (capture.result.status === 'COMPLETED') {
            console.log(`[LOG APP - DB UPDATE] Intentando actualizar PedidoID Sistema: ${pedidoId} a 'pagado' con TransaccionID: ${captureId}`);
            connection = await dbPool.getConnection();
            console.log("[LOG APP - DB UPDATE] Conexión a BD obtenida.");

            const [updateResult] = await connection.query(
                "UPDATE Pedidos SET estado = 'pagado', idTransaccionPasarela = ? WHERE id = ? AND estado = 'pendiente_pago'",
                [captureId, pedidoId]
            );
            
            console.log("[LOG APP - DB UPDATE RESULTADO] Filas afectadas:", updateResult.affectedRows);
            if (updateResult.affectedRows === 0) {
                console.warn(`[LOG APP - DB UPDATE ALERTA] No se actualizó ninguna fila para PedidoID Sistema: ${pedidoId}. ¿Ya estaba 'pagado' o no se encontró con estado 'pendiente_pago'?`);
                // Aquí podrías considerar si esto es un error o un caso aceptable (ej. webhook ya lo procesó)
            }
        } else {
            // La captura de PayPal no fue 'COMPLETED', no actualizamos nuestra DB a 'pagado'.
            console.warn(`[LOG APP - CAPTURA PAYPAL NO COMPLETADA] Estado de PayPal: ${capture.result.status} para PayPal OrderID: ${orderID}. No se actualiza DB a 'pagado'.`);
            // Podrías querer actualizar tu pedido a un estado como 'fallo_paypal' o similar.
            // Y responder un error diferente al cliente.
            // Por ahora, se irá al catch si esto es considerado un error, o continuará y enviará un JSON de éxito si no lo es.
            // Es mejor lanzar un error si el status no es COMPLETED para que no parezca un éxito.
            throw new Error(`La captura de PayPal no fue completada. Estado: ${capture.result.status}`);
        }
        
        if (connection) connection.release();
        console.log(`[LOG APP - CAPTURA FINALIZADA] Enviando respuesta de éxito para PedidoID Sistema: ${pedidoId}`);
        res.status(200).json({ 
            mensaje: "¡Pago capturado exitosamente!",
            pedidoId: pedidoId,
            paypalCaptureId: captureId,
            detalle: capture.result 
        });

    } catch (error) {
        console.error(`[LOG APP - CAPTURA ERROR GENERAL] PedidoID Sistema: ${pedidoId}, PayPal OrderID: ${orderID}. Error: ${error.message}`);
        if (error.response && error.response.data) { // Si es un error de la API de PayPal
            console.error("[LOG APP - CAPTURA ERROR PAYPAL DETALLE]:", JSON.stringify(error.response.data, null, 2));
        }
        if (connection) connection.release();
        res.status(500).json({ mensaje: "Error al capturar el pago.", detalle: error.message });
    }
};

// Manejar cancelación de orden por el usuario
const cancelarOrdenPayPal = (req, res) => {
    const { pedidoId } = req.query;
    console.log(`[LOG APP - cancelarOrdenPayPal] Pago cancelado por usuario para pedidoId: ${pedidoId}`);
    // Aquí podrías actualizar el estado del pedido a 'cancelado_por_usuario' o similar
    // let connection;
    // try {
    //    connection = await dbPool.getConnection();
    //    await connection.query("UPDATE Pedidos SET estado = 'cancelado_usuario' WHERE id = ? AND estado = 'pendiente_pago'", [pedidoId]);
    // } catch (dbError) {
    //    console.error(`[LOG APP - cancelarOrdenPayPal] Error al actualizar BD para pedidoId ${pedidoId}: ${dbError.message}`);
    // } finally {
    //    if (connection) connection.release();
    // }
    res.status(200).json({
        mensaje: "El pago con PayPal fue cancelado por el usuario.",
        pedidoId: pedidoId
    });
};

// Endpoint para Webhooks de PayPal (PLACEHOLDER - ¡IMPLEMENTAR VERIFICACIÓN!)
const webhookPayPal = async (req, res) => {
    console.log("[LOG APP - webhookPayPal] Webhook de PayPal RECIBIDO:");
    // ¡¡¡MUY IMPORTANTE: Implementar la verificación de la firma del webhook de PayPal en producción!!!
    // const webhookId = process.env.PAYPAL_WEBHOOK_ID; // Configura esto en tus variables de entorno
    // const valid = paypal.webhooks.PayPalWebhookSignatureVerifier.verify(req, webhookId);
    // if(!valid) {
    //   console.error("[LOG APP - webhookPayPal] Verificación de Webhook FALLIDA");
    //   return res.sendStatus(401);
    // }
    // console.log("[LOG APP - webhookPayPal] Verificación de Webhook EXITOSA");

    const eventType = req.body.event_type;
    const resource = req.body.resource;
    console.log(`[LOG APP - webhookPayPal] Evento: ${eventType}, Recurso ID: ${resource ? resource.id : 'N/A'}`);

    // Ejemplo de manejo de evento (necesitarás lógica más robusta aquí)
    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
        const captureId = resource.id; // ID de la captura de PayPal
        // Debes tener una forma de relacionar 'resource' con tu 'pedidoId' interno.
        // Si configuraste 'custom_id' en purchase_units al crear la orden de PayPal:
        // const customPedidoId = resource.purchase_units[0].custom_id; 
        // O si guardaste el PayPal order ID (resource.id si el evento es CHECKOUT.ORDER.APPROVED o similar)
        // y puedes buscar tu pedido por ese ID de referencia.
        // Por ahora, solo logueamos:
        console.log(`[LOG APP - webhookPayPal] Captura completada: ${captureId}. Necesitarás lógica para actualizar tu DB aquí si el flujo síncrono falló.`);
        // Lógica para actualizar la DB si es necesario, verificando que no se haya procesado antes.
    }
    res.sendStatus(200);
};

module.exports = {
    crearOrdenPayPal,
    capturarOrdenPayPal,
    cancelarOrdenPayPal,
    webhookPayPal
};

