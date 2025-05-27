// controllers/pedidos.controller.js
const dbPool = require('../database.js');

const crearPedido = async (req, res) => {
    // El usuarioId lo obtenemos del token JWT verificado por el middleware authJwt.verifyToken
    const usuarioId = req.usuarioId; 
    const { items, direccionEnvio, metodoPago } = req.body; // items: [{ productoId, cantidad }, ...]

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ mensaje: "Debe proporcionar al menos un item para el pedido." });
    }

    let connection; // Definimos la conexión fuera del try para poder usarla en el finally

    try {
        connection = await dbPool.getConnection();
        await connection.beginTransaction(); // Iniciar transacción

        let totalPedidoCalculado = 0;
        const detallesParaInsertar = [];
        const actualizacionesStock = [];

        for (const item of items) {
            if (!item.productoId || !item.cantidad || item.cantidad <= 0) {
                await connection.rollback(); // Revertir transacción
                connection.release();
                return res.status(400).json({ mensaje: `Item inválido en el pedido: ${JSON.stringify(item)}` });
            }

            // Obtener información del producto (precio y stock)
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

        // 1. Insertar en la tabla Pedidos
        const sqlPedido = "INSERT INTO Pedidos (usuarioId, totalPedido, direccionEnvio, metodoPago, estado) VALUES (?, ?, ?, ?, ?)";
        const [resultPedido] = await connection.query(sqlPedido, [
            usuarioId, 
            totalPedidoCalculado, 
            direccionEnvio ? JSON.stringify(direccionEnvio) : null, // Guardar como JSON string o NULL
            metodoPago || null,
            'pendiente_pago' // Estado inicial
        ]);
        const pedidoIdCreado = resultPedido.insertId;

        // 2. Insertar en la tabla DetallesPedido
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

        // 3. Actualizar stock en la tabla Productos
        for (const actualizacion of actualizacionesStock) {
            const sqlStock = "UPDATE Productos SET stock = ? WHERE id = ?";
            await connection.query(sqlStock, [actualizacion.nuevoStock, actualizacion.productoId]);
        }

        await connection.commit(); // Confirmar transacción si todo fue bien
        connection.release();

        res.status(201).json({
            mensaje: "Pedido creado exitosamente.",
            pedidoId: pedidoIdCreado,
            total: totalPedidoCalculado,
        });

    } catch (error) {
        console.error("Error al crear el pedido:", error);
        if (connection) {
            await connection.rollback(); // Revertir transacción en caso de error
            connection.release();
        }
        res.status(500).json({ mensaje: "Error interno al procesar el pedido. Intente más tarde." });
    }
};

// NUEVA FUNCIÓN para obtener los pedidos del usuario autenticado
const obtenerMisPedidos = async (req, res) => {
    const usuarioId = req.usuarioId; // Obtenido del token JWT por el middleware verifyToken

    try {
        const connection = await dbPool.getConnection();
        // Consulta para obtener los pedidos del usuario
        // Se puede hacer un JOIN con DetallesPedido y Productos si quieres devolver todos los detalles de una vez
        const [pedidos] = await connection.query(
            `SELECT p.id, p.fechaPedido, p.estado, p.totalPedido, p.metodoPago,
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

        res.json(pedidos);

    } catch (error) {
        console.error("Error al obtener los pedidos del usuario:", error);
        res.status(500).json({ mensaje: "Error al obtener los pedidos. Intente más tarde." });
    }
};

module.exports = {
    crearPedido,
    obtenerMisPedidos // Añadir la nueva función a las exportaciones
};

