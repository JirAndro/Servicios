// controllers/pedidos.controller.js
const dbPool = require('../database.js');

// --- crearPedido (sin cambios respecto a tu última versión, ya es robusta) ---
const crearPedido = async (req, res) => {
    const usuarioId = req.usuarioId; 
    const { items, direccionEnvio, metodoPago } = req.body;
    console.log(`[LOG APP - crearPedido] UsuarioId: ${usuarioId}, Items: ${items.length}, MetodoPago: ${metodoPago}`);

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ mensaje: "Debe proporcionar al menos un item para el pedido." });
    }
    let connection; 
    try {
        connection = await dbPool.getConnection();
        await connection.beginTransaction();
        let totalPedidoCalculado = 0;
        const detallesParaInsertar = [];
        const actualizacionesStock = [];

        for (const item of items) {
            if (!item.productoId || !item.cantidad || item.cantidad <= 0) {
                await connection.rollback(); connection.release();
                return res.status(400).json({ mensaje: `Item inválido: ${JSON.stringify(item)}` });
            }
            const [productos] = await connection.query("SELECT titulo, precio, stock FROM Productos WHERE id = ? AND activo = TRUE", [item.productoId]);
            if (productos.length === 0) {
                await connection.rollback(); connection.release();
                return res.status(404).json({ mensaje: `Producto ID ${item.productoId} no encontrado/disponible.` });
            }
            const producto = productos[0];
            if (producto.stock < item.cantidad) {
                await connection.rollback(); connection.release();
                return res.status(400).json({ mensaje: `Stock insuficiente para '${producto.titulo}'. Solicitado: ${item.cantidad}, Disponible: ${producto.stock}` });
            }
            const precioUnitario = parseFloat(producto.precio);
            const subtotalItem = precioUnitario * item.cantidad;
            totalPedidoCalculado += subtotalItem;
            detallesParaInsertar.push({
                productoId: item.productoId, cantidad: item.cantidad,
                precioUnitario: precioUnitario, subtotal: subtotalItem
            });
            actualizacionesStock.push({
                productoId: item.productoId, nuevoStock: producto.stock - item.cantidad
            });
        }

        const sqlPedido = "INSERT INTO Pedidos (usuarioId, totalPedido, direccionEnvio, metodoPago, estado, fechaPedido) VALUES (?, ?, ?, ?, ?, NOW())";
        const [resultPedido] = await connection.query(sqlPedido, [
            usuarioId, totalPedidoCalculado, 
            direccionEnvio ? JSON.stringify(direccionEnvio) : null,
            metodoPago || null, 'pendiente_pago'
        ]);
        const pedidoIdCreado = resultPedido.insertId;
        console.log(`[LOG APP - crearPedido] Pedido ${pedidoIdCreado} creado para usuario ${usuarioId}`);

        for (const detalle of detallesParaInsertar) {
            const sqlDetalle = "INSERT INTO DetallesPedido (pedidoId, productoId, cantidad, precioUnitario, subtotal) VALUES (?, ?, ?, ?, ?)";
            await connection.query(sqlDetalle, [pedidoIdCreado, detalle.productoId, detalle.cantidad, detalle.precioUnitario, detalle.subtotal]);
        }
        console.log(`[LOG APP - crearPedido] Detalles insertados para pedido ${pedidoIdCreado}`);

        for (const actualizacion of actualizacionesStock) {
            await connection.query("UPDATE Productos SET stock = ? WHERE id = ?", [actualizacion.nuevoStock, actualizacion.productoId]);
        }
        console.log(`[LOG APP - crearPedido] Stock actualizado para pedido ${pedidoIdCreado}`);

        await connection.commit();
        console.log(`[LOG APP - crearPedido] Transacción commit para pedido ${pedidoIdCreado}`);
        connection.release();
        res.status(201).json({
            mensaje: "Pedido creado exitosamente.",
            pedidoId: pedidoIdCreado, total: totalPedidoCalculado,
        });
    } catch (error) {
        console.error(`[LOG APP - crearPedido] Error para usuario ${usuarioId}:`, error);
        if (connection) {
            try { await connection.rollback(); } catch (rbError) { console.error("Error en rollback de crearPedido:", rbError); }
            try { connection.release(); } catch (relError) { console.error("Error liberando conexión en catch de crearPedido:", relError); }
        }
        res.status(500).json({ mensaje: "Error interno al procesar el pedido." });
    }
};

// --- obtenerMisPedidos (sin cambios respecto a tu última versión, ya es robusta) ---
const obtenerMisPedidos = async (req, res) => {
    const usuarioId = req.usuarioId;
    console.log(`[LOG APP - obtenerMisPedidos] Solicitud para obtener pedidos del usuarioId: ${usuarioId}`);
    try {
        const connection = await dbPool.getConnection();
        const [pedidos] = await connection.query(
            `SELECT p.id, p.fechaPedido, p.estado, p.totalPedido, p.metodoPago, p.direccionEnvio,
                    (SELECT JSON_ARRAYAGG(JSON_OBJECT('productoId', dp.productoId, 'titulo', pr.titulo, 'cantidad', dp.cantidad, 'precioUnitario', dp.precioUnitario, 'subtotal', dp.subtotal, 'imagenUrl', pr.imagenUrl)) 
                     FROM DetallesPedido dp 
                     JOIN Productos pr ON dp.productoId = pr.id 
                     WHERE dp.pedidoId = p.id) AS items
             FROM Pedidos p
             WHERE p.usuarioId = ?
             ORDER BY p.fechaPedido DESC`, 
            [usuarioId]
        );
        connection.release();
        console.log(`[LOG APP - obtenerMisPedidos] ${pedidos.length} pedidos encontrados para usuarioId: ${usuarioId}`);
        res.json(pedidos);
    } catch (error) {
        console.error(`[LOG APP - obtenerMisPedidos] Error al obtener los pedidos del usuarioId ${usuarioId}:`, error);
        res.status(500).json({ mensaje: "Error al obtener los pedidos." });
    }
};

// --- cancelarPedido (ACTUALIZADA para manejar también pedidos 'pagado') ---
const cancelarPedido = async (req, res) => {
    const usuarioId = req.usuarioId;
    const { pedidoId } = req.params;
    console.log(`[LOG APP - cancelarPedido] UsuarioId: ${usuarioId} solicita cancelar pedidoId: ${pedidoId}`);

    if (!pedidoId) {
        return res.status(400).json({ mensaje: "Se requiere el ID del pedido a cancelar." });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.beginTransaction();
        console.log(`[LOG APP - cancelarPedido] Transacción iniciada para pedidoId: ${pedidoId}`);

        const [pedidos] = await connection.query("SELECT id, usuarioId, estado, metodoPago, idTransaccionPasarela FROM Pedidos WHERE id = ? FOR UPDATE", [pedidoId]);
        if (pedidos.length === 0) {
            await connection.rollback(); connection.release();
            return res.status(404).json({ mensaje: `Pedido con ID ${pedidoId} no encontrado.` });
        }
        const pedido = pedidos[0];
        console.log(`[LOG APP - cancelarPedido] Pedido ${pedidoId} encontrado. Usuario: ${pedido.usuarioId}, Estado: ${pedido.estado}`);

        if (pedido.usuarioId !== usuarioId) {
            await connection.rollback(); connection.release();
            return res.status(403).json({ mensaje: "No autorizado para cancelar este pedido." });
        }

        // Estados permitidos para cancelación por el usuario
        const estadosCancelables = ['pendiente_pago', 'pagado']; 
        // Podrías añadir más lógica aquí, ej. no cancelar si ya está 'enviado'

        if (!estadosCancelables.includes(pedido.estado)) {
            await connection.rollback(); connection.release();
            return res.status(400).json({ mensaje: `El pedido no se puede cancelar (Estado actual: ${pedido.estado}).` });
        }

        // Si el pedido estaba 'pagado', el reembolso se manejaría externamente (manual o con API de PayPal)
        // Aquí solo actualizamos el estado y reintegramos stock.
        if (pedido.estado === 'pagado') {
            console.log(`[LOG APP - cancelarPedido] Pedido ${pedidoId} estaba PAGADO. Se procederá a cancelar y reintegrar stock. REEMBOLSO DEBE SER MANUAL/EXTERNO.`);
            // Aquí iría la lógica para llamar a la API de PayPal para un reembolso si la tuvieras.
            // Por ahora, solo cambiamos el estado.
        }
        
        const [detalles] = await connection.query("SELECT productoId, cantidad FROM DetallesPedido WHERE pedidoId = ?", [pedidoId]);
        console.log(`[LOG APP - cancelarPedido] Obtenidos ${detalles.length} detalles para reintegrar stock del pedidoId: ${pedidoId}`);
        for (const detalle of detalles) {
            await connection.query("UPDATE Productos SET stock = stock + ? WHERE id = ?", [detalle.cantidad, detalle.productoId]);
            console.log(`[LOG APP - cancelarPedido] Stock reintegrado para productoId ${detalle.productoId}: +${detalle.cantidad}`);
        }

        const nuevoEstado = `cancelado_por_usuario`; // O 'cancelado_reembolso_pendiente' si estaba pagado
        await connection.query("UPDATE Pedidos SET estado = ? WHERE id = ?", [nuevoEstado, pedidoId]);
        console.log(`[LOG APP - cancelarPedido] PedidoId ${pedidoId} actualizado a '${nuevoEstado}'`);

        await connection.commit();
        console.log(`[LOG APP - cancelarPedido] Transacción commit para pedidoId: ${pedidoId}`);
        connection.release();
        res.status(200).json({ mensaje: `Pedido ${pedidoId} cancelado exitosamente. Si estaba pagado, el reembolso se procesará por separado.` });

    } catch (error) {
        console.error(`[LOG APP - cancelarPedido] Error al cancelar pedido ${pedidoId}:`, error);
        if (connection) {
            try { await connection.rollback(); } catch (rbError) { console.error("Error en rollback:", rbError); }
            try { connection.release(); } catch (relError) { console.error("Error liberando conexión:", relError); }
        }
        res.status(500).json({ mensaje: "Error interno al cancelar el pedido." });
    }
};

// --- NUEVA FUNCIÓN: Modificar Dirección de un Pedido Pagado (por el usuario) ---
const modificarDireccionPedido = async (req, res) => {
    const usuarioId = req.usuarioId;
    const { pedidoId } = req.params;
    const { direccionEnvio } = req.body; // Espera un objeto como { nombreCompleto: "...", direccion: "...", ... }

    console.log(`[LOG APP - modificarDireccionPedido] UsuarioId: ${usuarioId} solicita modificar dirección para pedidoId: ${pedidoId}. Nueva dirección:`, direccionEnvio);

    if (!pedidoId) {
        return res.status(400).json({ mensaje: "Se requiere el ID del pedido." });
    }
    if (!direccionEnvio || typeof direccionEnvio !== 'object' || Object.keys(direccionEnvio).length === 0) {
        return res.status(400).json({ mensaje: "Se requiere la nueva información de dirección de envío." });
    }
    // Aquí podrías añadir validación más específica para los campos de direccionEnvio

    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.beginTransaction();
        console.log(`[LOG APP - modificarDireccionPedido] Transacción iniciada para pedidoId: ${pedidoId}`);

        const [pedidos] = await connection.query("SELECT id, usuarioId, estado FROM Pedidos WHERE id = ? FOR UPDATE", [pedidoId]);
        if (pedidos.length === 0) {
            await connection.rollback(); connection.release();
            return res.status(404).json({ mensaje: `Pedido con ID ${pedidoId} no encontrado.` });
        }
        const pedido = pedidos[0];
        console.log(`[LOG APP - modificarDireccionPedido] Pedido ${pedidoId} encontrado. Usuario: ${pedido.usuarioId}, Estado: ${pedido.estado}`);

        if (pedido.usuarioId !== usuarioId) {
            await connection.rollback(); connection.release();
            return res.status(403).json({ mensaje: "No autorizado para modificar este pedido." });
        }

        // Regla de negocio: Solo se puede modificar la dirección si el pedido está 'pagado'
        // y aún no ha sido 'enviado' o 'entregado'. Ajusta según tus estados.
        if (pedido.estado !== 'pagado') {
            await connection.rollback(); connection.release();
            return res.status(400).json({ mensaje: `La dirección de este pedido no se puede modificar (Estado actual: ${pedido.estado}).` });
        }

        const [result] = await connection.query(
            "UPDATE Pedidos SET direccionEnvio = ? WHERE id = ?",
            [JSON.stringify(direccionEnvio), pedidoId]
        );
        console.log(`[LOG APP - modificarDireccionPedido] Resultado de UPDATE para pedidoId ${pedidoId}: Filas afectadas: ${result.affectedRows}`);
        
        await connection.commit();
        connection.release();

        if (result.affectedRows > 0) {
            // Devolver el pedido actualizado (o al menos un mensaje de éxito)
            const [updatedPedidos] = await dbPool.getConnection().then(conn => {
                 const res = conn.query(`SELECT p.id, p.fechaPedido, p.estado, p.totalPedido, p.metodoPago, p.direccionEnvio, (SELECT JSON_ARRAYAGG(JSON_OBJECT('productoId', dp.productoId, 'titulo', pr.titulo, 'cantidad', dp.cantidad, 'precioUnitario', dp.precioUnitario, 'subtotal', dp.subtotal, 'imagenUrl', pr.imagenUrl)) FROM DetallesPedido dp JOIN Productos pr ON dp.productoId = pr.id WHERE dp.pedidoId = p.id) AS items FROM Pedidos p WHERE p.id = ?`, [pedidoId]);
                 conn.release();
                 return res;
            });
            res.status(200).json({ mensaje: "Dirección del pedido actualizada exitosamente.", pedido: updatedPedidos[0] });
        } else {
            // Podría ser que la dirección enviada sea idéntica a la existente
            res.status(200).json({ mensaje: "No se realizaron cambios en la dirección (datos iguales o pedido no encontrado).", pedido: pedido });
        }

    } catch (error) {
        console.error(`[LOG APP - modificarDireccionPedido] Error al modificar dirección para pedidoId ${pedidoId}:`, error);
        if (connection) {
            try { await connection.rollback(); } catch (rbError) { console.error("Error en rollback:", rbError); }
            try { connection.release(); } catch (relError) { console.error("Error liberando conexión:", relError); }
        }
        res.status(500).json({ mensaje: "Error interno al modificar la dirección del pedido." });
    }
};


module.exports = {
    crearPedido,
    obtenerMisPedidos,
    cancelarPedido,
    modificarDireccionPedido // <<<--- AÑADIDA LA NUEVA FUNCIÓN
};
