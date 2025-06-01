// controllers/productos.controller.js
const dbPool = require('../database.js');

// Controlador para obtener todos los productos
const obtenerProductos = async (req, res) => {
    console.log("[LOG APP - obtenerProductos] Solicitud para obtener todos los productos.");
    try {
        const connection = await dbPool.getConnection();
        console.log("[LOG APP - obtenerProductos] Conexión a BD obtenida.");
        // Asegúrate de que esta consulta devuelva todos los campos que necesitas en Flutter,
        // especialmente para la vista de administrador (stock, activo, etc.)
        const [rows] = await connection.query(
            "SELECT id, titulo, plataforma, precio, genero, imagenUrl, stock, activo, descripcion, fechaLanzamiento, desarrollador, clasificacion, categoriaId FROM Productos"
            // Si solo quieres los activos para esta ruta general (y tienes otra para admin_todos_los_productos):
            // "SELECT id, titulo, plataforma, precio, genero, imagenUrl, stock, activo FROM Productos WHERE activo = TRUE"
        );
        connection.release();
        console.log(`[LOG APP - obtenerProductos] ${rows.length} productos encontrados.`);
        res.json(rows);
    } catch (error) {
        console.error("[LOG APP - obtenerProductos] Error al obtener productos de la BD:", error);
        res.status(500).json({ mensaje: "Error al obtener los productos. Intente más tarde." });
    }
};

// Controlador para obtener un producto por ID
const obtenerProductoPorId = async (req, res) => {
    const productoId = req.params.id;
    console.log(`[LOG APP - obtenerProductoPorId] Solicitud para productoId: ${productoId}`);
    try {
        const connection = await dbPool.getConnection();
        console.log(`[LOG APP - obtenerProductoPorId] Conexión a BD obtenida para productoId: ${productoId}`);
        // Esta consulta trae todos los campos para un producto activo
        const [rows] = await connection.query("SELECT * FROM Productos WHERE id = ? AND activo = TRUE", [productoId]);
        connection.release();

        if (rows.length > 0) {
            console.log(`[LOG APP - obtenerProductoPorId] ProductoId: ${productoId} encontrado.`);
            res.json(rows[0]);
        } else {
            console.warn(`[LOG APP - obtenerProductoPorId] ProductoId: ${productoId} no encontrado o no activo.`);
            res.status(404).json({ mensaje: `Producto con ID ${productoId} no encontrado o no activo.` });
        }
    } catch (error) {
        console.error(`[LOG APP - obtenerProductoPorId] Error al obtener productoId ${productoId}:`, error);
        res.status(500).json({ mensaje: "Error al obtener el producto. Intente más tarde." });
    }
};

// Controlador para crear un nuevo producto (Admin)
const crearProducto = async (req, res) => {
    const adminId = req.usuarioId; // Asumimos que verifyToken/isAdmin ya pusieron esto
    console.log(`[LOG APP - crearProducto] Solicitud de adminId: ${adminId} para crear producto.`);
    const { 
        titulo, descripcion, precio, stock, plataforma, 
        genero, fechaLanzamiento, desarrollador, 
        clasificacion, imagenUrl, categoriaId 
    } = req.body;

    if (!titulo || !precio || !plataforma || !genero) {
        console.warn("[LOG APP - crearProducto] Campos obligatorios faltantes:", req.body);
        return res.status(400).json({ mensaje: "Los campos titulo, precio, plataforma y genero son obligatorios." });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.beginTransaction();
        console.log("[LOG APP - crearProducto] Transacción iniciada.");

        const sql = `INSERT INTO Productos (
                        titulo, descripcion, precio, stock, plataforma, 
                        genero, fechaLanzamiento, desarrollador, 
                        clasificacion, imagenUrl, categoriaId, activo
                     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`;
        const [result] = await connection.query(sql, [
            titulo, descripcion || null, precio, stock || 0, plataforma, 
            genero, fechaLanzamiento || null, desarrollador || null, 
            clasificacion || null, imagenUrl || null, categoriaId || null
        ]);
        const idProductoCreado = result.insertId;
        console.log(`[LOG APP - crearProducto] Producto insertado con ID: ${idProductoCreado}. Filas afectadas: ${result.affectedRows}`);
        
        await connection.commit();
        console.log("[LOG APP - crearProducto] Transacción completada (commit).");
        connection.release();

        res.status(201).json({ 
            mensaje: "Producto creado exitosamente", 
            idProductoCreado: idProductoCreado 
        });

    } catch (error) {
        console.error("[LOG APP - crearProducto] Error al crear el producto en la BD:", error);
        if (connection) {
            await connection.rollback();
            console.log("[LOG APP - crearProducto] Transacción revertida (rollback).");
            connection.release();
        }
        res.status(500).json({ mensaje: "Error al crear el producto. Intente más tarde." });
    }
};

// Controlador para actualizar un producto existente (Admin)
const actualizarProducto = async (req, res) => {
    const productoId = req.params.id;
    const adminId = req.usuarioId;
    console.log(`[LOG APP - actualizarProducto] Solicitud de adminId: ${adminId} para actualizar productoId: ${productoId}`);
    const { 
        titulo, descripcion, precio, stock, plataforma, 
        genero, fechaLanzamiento, desarrollador, 
        clasificacion, imagenUrl, categoriaId, activo 
    } = req.body;

    if (Object.keys(req.body).length === 0) { // Verifica si el cuerpo está vacío
         return res.status(400).json({ mensaje: "Debe proporcionar al menos un campo para actualizar." });
    }
    
    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.beginTransaction(); // Es buena práctica usar transacciones también para updates complejos
        console.log(`[LOG APP - actualizarProducto] Transacción iniciada para productoId: ${productoId}`);
        
        let setClauses = [];
        let values = [];

        // Validar y construir dinámicamente las cláusulas SET
        if (titulo !== undefined) { setClauses.push("titulo = ?"); values.push(titulo); }
        if (descripcion !== undefined) { setClauses.push("descripcion = ?"); values.push(descripcion); }
        if (precio !== undefined) { setClauses.push("precio = ?"); values.push(precio); }
        if (stock !== undefined) { setClauses.push("stock = ?"); values.push(stock); }
        if (plataforma !== undefined) { setClauses.push("plataforma = ?"); values.push(plataforma); }
        if (genero !== undefined) { setClauses.push("genero = ?"); values.push(genero); }
        if (fechaLanzamiento !== undefined) { setClauses.push("fechaLanzamiento = ?"); values.push(fechaLanzamiento); }
        if (desarrollador !== undefined) { setClauses.push("desarrollador = ?"); values.push(desarrollador); }
        if (clasificacion !== undefined) { setClauses.push("clasificacion = ?"); values.push(clasificacion); }
        if (imagenUrl !== undefined) { setClauses.push("imagenUrl = ?"); values.push(imagenUrl); }
        if (categoriaId !== undefined) { setClauses.push("categoriaId = ?"); values.push(categoriaId); }
        if (activo !== undefined) { setClauses.push("activo = ?"); values.push(activo); } // Para poder reactivar/desactivar
        
        if (setClauses.length === 0) {
            await connection.rollback(); // No hay nada que hacer, rollback y release
            connection.release();
            console.warn(`[LOG APP - actualizarProducto] Ningún campo válido para actualizar productoId: ${productoId}`);
            return res.status(400).json({ mensaje: "Ningún campo válido proporcionado para actualizar." });
        }

        values.push(productoId); // Para el WHERE id = ?
        const sql = `UPDATE Productos SET ${setClauses.join(", ")} WHERE id = ?`;
        console.log(`[LOG APP - actualizarProducto] Ejecutando UPDATE para productoId: ${productoId}. SQL: ${sql}. Valores: ${JSON.stringify(values)}`);
        
        const [result] = await connection.query(sql, values);
        console.log(`[LOG APP - actualizarProducto] Resultado de UPDATE para productoId ${productoId}: Filas afectadas: ${result.affectedRows}`);

        await connection.commit();
        console.log(`[LOG APP - actualizarProducto] Transacción completada (commit) para productoId: ${productoId}`);
        connection.release();

        if (result.affectedRows > 0) {
            res.json({ mensaje: `Producto con ID ${productoId} actualizado exitosamente.` });
        } else {
            res.status(404).json({ mensaje: `Producto con ID ${productoId} no encontrado o sin cambios necesarios.` });
        }

    } catch (error) {
        console.error(`[LOG APP - actualizarProducto] Error al actualizar productoId ${productoId}:`, error);
        if (connection) {
            await connection.rollback();
            connection.release();
            console.log(`[LOG APP - actualizarProducto] Transacción revertida (rollback) para productoId ${productoId}`);
        }
        res.status(500).json({ mensaje: "Error al actualizar el producto. Intente más tarde." });
    }
};

// Controlador para eliminar un producto (baja lógica - marcar como inactivo)
const eliminarProducto = async (req, res) => {
    const productoId = req.params.id;
    const adminId = req.usuarioId; // Asumimos que verifyToken/isAdmin ya pusieron esto

    console.log(`[LOG APP - eliminarProducto FISICO] Solicitud de adminId: ${adminId} para ELIMINAR FÍSICAMENTE productoId: ${productoId}`);

    if (!productoId) {
        console.warn("[LOG APP - eliminarProducto FISICO] Intento de eliminar sin productoId.");
        return res.status(400).json({ mensaje: "Se requiere el ID del producto." });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        console.log(`[LOG APP - eliminarProducto FISICO] Conexión a BD obtenida para productoId: ${productoId}`);
        await connection.beginTransaction(); // Iniciar transacción
        console.log(`[LOG APP - eliminarProducto FISICO] Transacción iniciada para productoId: ${productoId}`);

        // (Opcional) Verificar si el producto existe antes de intentar eliminarlo
        const [productosExistentes] = await connection.query("SELECT id FROM Productos WHERE id = ?", [productoId]);
        if (productosExistentes.length === 0) {
            await connection.rollback();
            connection.release();
            console.warn(`[LOG APP - eliminarProducto FISICO] ProductoId ${productoId} no encontrado para eliminar. Rollback.`);
            return res.status(404).json({ mensaje: `Producto con ID ${productoId} no encontrado.` });
        }
        
        console.log(`[LOG APP - eliminarProducto FISICO] ProductoId ${productoId} encontrado. Procediendo con DELETE.`);

        // --- ESTA ES LA CONSULTA CLAVE PARA ELIMINACIÓN FÍSICA ---
        const [result] = await connection.query(
            "DELETE FROM Productos WHERE id = ?", 
            [productoId]
        );
        // --- FIN DE LA CONSULTA CLAVE ---
        
        console.log(`[LOG APP - eliminarProducto FISICO] Resultado de DELETE para productoId ${productoId}: Filas afectadas: ${result.affectedRows}`);

        if (result.affectedRows > 0) {
            await connection.commit();
            console.log(`[LOG APP - eliminarProducto FISICO] ProductoId ${productoId} ELIMINADO FÍSICAMENTE de la BD. Transacción commit.`);
            res.json({ mensaje: `Producto con ID ${productoId} eliminado exitosamente de la base de datos.` });
        } else {
            // Esto no debería pasar si la verificación anterior encontró el producto,
            // a menos que se eliminara concurrentemente.
            await connection.rollback();
            console.warn(`[LOG APP - eliminarProducto FISICO] No se afectaron filas al intentar DELETE para productoId ${productoId}. Rollback.`);
            res.status(404).json({ mensaje: `Producto con ID ${productoId} no encontrado o no se pudo eliminar.` });
        }
    } catch (error) {
        console.error(`[LOG APP - eliminarProducto FISICO] Error CRÍTICO al eliminar físicamente productoId ${productoId}:`, error);
        // Considerar si el error es por una restricción de llave foránea (FK constraint)
        // si este producto está referenciado en DetallesPedido.
        // Si es así, necesitarías borrar primero los DetallesPedido o configurar ON DELETE CASCADE en tu FK.
        if (connection) {
            try {
                await connection.rollback();
                console.log(`[LOG APP - eliminarProducto FISICO] Transacción revertida (rollback) debido a error para productoId ${productoId}`);
            } catch (rollbackError) {
                console.error(`[LOG APP - eliminarProducto FISICO] Error al hacer rollback para productoId ${productoId}:`, rollbackError);
            }
        }
        res.status(500).json({ mensaje: "Error interno al eliminar el producto. Intente más tarde.", detalle: error.message });
    } finally {
        if (connection) {
            console.log(`[LOG APP - eliminarProducto FISICO] Liberando conexión a BD para productoId: ${productoId}`);
            connection.release();
        }
    }
};

// Exportar todas las funciones controladoras
module.exports = {
    obtenerProductos,
    obtenerProductoPorId,
    crearProducto,
    actualizarProducto,
    eliminarProducto
};
