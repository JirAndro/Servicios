// controllers/pedidos.controller.js
const dbPool = require('../database.js'); // Asegúrate que la ruta a tu configuración de DB sea correcta

const crearPedido = async (req, res) => {
    // El usuarioId lo obtenemos del token JWT verificado por el middleware authJwt.verifyToken
    const usuarioId = req.usuarioId; 
    const { items, direccionEnvio, metodoPago } = req.body; // items: [{ productoId, cantidad }, ...]

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ mensaje: "Debe proporcionar al menos un item para el pedido." });
    }

    let connection; 

    try {
        connection = await dbPool.getConnection();
        await connection.beginTransaction(); // Iniciar transacción

        let totalPedidoCalculado = 0;
        const detallesParaInsertar = [];
        const actualizacionesStock = [];

        for (const item of items) {
            if (!item.productoId || !item.cantidad || item.cantidad <= 0) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({ mensaje: `Item inválido en el pedido: ${JSON.stringify(item)}` });
            }

            const [productos] = await connection.query("SELECT titulo, precio, stock FROM Productos WHERE id = ? AND activo = TRUE", [item.productoId]);
            
            if (productos.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({ mensaje: `Producto con ID ${item.productoId} no encontrado o no disponible.` });
            }

            const producto = productos[0];

            if (producto.stock < item.cantidad) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({ mensaje: `Stock insuficiente para el producto '${producto.titulo}' (ID: ${item.productoId}). Solicitado: ${item.cantidad}, Disponible: ${producto.stock}` });
            }

            const precioUnitario = parseFloat(producto.precio);
            const subtotalItem = precioUnitario * item.cantidad;
            totalPedidoCalculado += subtotalItem;

            detallesParaInsertar.push({
                productoId: item.productoId,
                cantidad: item.cantidad,
                precioUnitario: precioUnitario,
                subtotal: subtotalItem
            });

            actualizacionesStock.push({
                productoId: item.productoId,
                nuevoStock: producto.stock - item.cantidad
            });
        }

        const sqlPedido = "INSERT INTO Pedidos (usuarioId, totalPedido, direccionEnvio, metodoPago, estado, fechaPedido) VALUES (?, ?, ?, ?, ?, NOW())";
        const [resultPedido] = await connection.query(sqlPedido, [
            usuarioId, 
            totalPedidoCalculado, 
            direccionEnvio ? JSON.stringify(direccionEnvio) : null,
            metodoPago || null,
            'pendiente_pago'
        ]);
        const pedidoIdCreado = resultPedido.insertId;
        console.log(`[LOG APP - crearPedido] Pedido ${pedidoIdCreado} creado para usuario ${usuarioId}`);


        for (const detalle of detallesParaInsertar) {
            const sqlDetalle = "INSERT INTO DetallesPedido (pedidoId, productoId, cantidad, precioUnitario, subtotal) VALUES (?, ?, ?, ?, ?)";
            await connection.query(sqlDetalle, [
                pedidoIdCreado, 
                detalle.productoId, 
                detalle.cantidad, 
                detalle.precioUnitario, 
                detalle.subtotal
            ]);
        }
        console.log(`[LOG APP - crearPedido] Detalles insertados para pedido ${pedidoIdCreado}`);


        for (const actualizacion of actualizacionesStock) {
            const sqlStock = "UPDATE Productos SET stock = ? WHERE id = ?";
            await connection.query(sqlStock, [actualizacion.nuevoStock, actualizacion.productoId]);
        }
        console.log(`[LOG APP - crearPedido] Stock actualizado para pedido ${pedidoIdCreado}`);


        await connection.commit();
        console.log(`[LOG APP - crearPedido] Transacción completada (commit) para pedido ${pedidoIdCreado}`);
        connection.release();

        res.status(201).json({
            mensaje: "Pedido creado exitosamente.",
            pedidoId: pedidoIdCreado,
            total: totalPedidoCalculado,
        });

    } catch (error) {
        console.error(`[LOG APP - crearPedido] Error al crear el pedido para usuario ${usuarioId}:`, error);
        if (connection) {
            await connection.rollback();
            connection.release();
            console.log("[LOG APP - crearPedido] Transacción revertida (rollback).");
        }
        res.status(500).json({ mensaje: "Error interno al procesar el pedido. Intente más tarde." });
    }
};

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
        res.status(500).json({ mensaje: "Error al obtener los pedidos. Intente más tarde." });
    }
};

// NUEVA FUNCIÓN para cancelar un pedido
const cancelarPedido = async (req, res) => {
    const usuarioId = req.usuarioId; // Obtenido del token JWT
    const { pedidoId } = req.params; // Obtenido de la URL, ej: /api/pedidos/123/cancelar
    console.log(`[LOG APP - cancelarPedido] Solicitud para cancelar pedidoId: ${pedidoId} por usuarioId: ${usuarioId}`);


    if (!pedidoId) {
        console.warn("[LOG APP - cancelarPedido] Intento de cancelar sin pedidoId.");
        return res.status(400).json({ mensaje: "Se requiere el ID del pedido a cancelar." });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.beginTransaction();
        console.log(`[LOG APP - cancelarPedido] Transacción iniciada para pedidoId: ${pedidoId}`);

        // 1. Verificar el pedido y su propietario
        const [pedidos] = await connection.query(
            "SELECT id, usuarioId, estado FROM Pedidos WHERE id = ? FOR UPDATE",
            [pedidoId]
        );

        if (pedidos.length === 0) {
            await connection.rollback();
            connection.release();
            console.warn(`[LOG APP - cancelarPedido] PedidoId ${pedidoId} no encontrado.`);
            return res.status(404).json({ mensaje: `Pedido con ID ${pedidoId} no encontrado.` });
        }

        const pedido = pedidos[0];
        console.log(`[LOG APP - cancelarPedido] PedidoId ${pedidoId} encontrado. Usuario: ${pedido.usuarioId}, Estado: ${pedido.estado}`);


        if (pedido.usuarioId !== usuarioId) {
            await connection.rollback();
            connection.release();
            console.warn(`[LOG APP - cancelarPedido] Usuario ${usuarioId} no autorizado para cancelar pedidoId ${pedidoId} (pertenece a ${pedido.usuarioId}).`);
            return res.status(403).json({ mensaje: "No autorizado para cancelar este pedido." });
        }

        if (pedido.estado !== 'pendiente_pago') {
            await connection.rollback();
            connection.release();
            console.warn(`[LOG APP - cancelarPedido] PedidoId ${pedidoId} no se puede cancelar. Estado actual: ${pedido.estado}`);
            return res.status(400).json({ mensaje: `El pedido ya no se puede cancelar (Estado actual: ${pedido.estado}).` });
        }

        const [detalles] = await connection.query(
            "SELECT productoId, cantidad FROM DetallesPedido WHERE pedidoId = ?",
            [pedidoId]
        );
        console.log(`[LOG APP - cancelarPedido] Obtenidos ${detalles.length} detalles para pedidoId: ${pedidoId}`);


        for (const detalle of detalles) {
            await connection.query(
                "UPDATE Productos SET stock = stock + ? WHERE id = ?",
                [detalle.cantidad, detalle.productoId]
            );
            console.log(`[LOG APP - cancelarPedido] Stock reintegrado para productoId ${detalle.productoId}: +${detalle.cantidad} (PedidoId: ${pedidoId})`);
        }

        await connection.query(
            "UPDATE Pedidos SET estado = 'cancelado_usuario' WHERE id = ?",
            [pedidoId]
        );
        console.log(`[LOG APP - cancelarPedido] PedidoId ${pedidoId} actualizado a 'cancelado_usuario'`);

        await connection.commit();
        console.log(`[LOG APP - cancelarPedido] Transacción completada (commit) para pedidoId: ${pedidoId}`);
        connection.release();

        res.status(200).json({ mensaje: `Pedido ${pedidoId} cancelado exitosamente.` });

    } catch (error) {
        console.error(`[LOG APP - cancelarPedido] Error al cancelar el pedido ${pedidoId}:`, error);
        if (connection) {
            await connection.rollback();
            connection.release();
            console.log(`[LOG APP - cancelarPedido] Transacción revertida (rollback) para pedidoId: ${pedidoId}`);
        }
        res.status(500).json({ mensaje: "Error interno al cancelar el pedido. Intente más tarde." });
    }
};

module.exports = {
    crearPedido,
    obtenerMisPedidos,
    cancelarPedido // <<<--- AÑADIDA LA NUEVA FUNCIÓN
};
