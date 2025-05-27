// controllers/productos.controller.js
const dbPool = require('../database.js');

// ... (las funciones obtenerProductos y obtenerProductoPorId ya existentes van aquí) ...

// Controlador para obtener todos los productos
const obtenerProductos = async (req, res) => {
    try {
        const connection = await dbPool.getConnection();
        const [rows] = await connection.query("SELECT id, titulo, plataforma, precio, genero, imagenUrl FROM Productos WHERE activo = TRUE");
        connection.release();
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener productos de la BD:", error);
        res.status(500).json({ mensaje: "Error al obtener los productos. Intente más tarde." });
    }
};

// Controlador para obtener un producto por ID
const obtenerProductoPorId = async (req, res) => {
    const productoId = req.params.id;
    try {
        const connection = await dbPool.getConnection();
        const [rows] = await connection.query("SELECT * FROM Productos WHERE id = ? AND activo = TRUE", [productoId]);
        connection.release();
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ mensaje: `Producto con ID ${productoId} no encontrado.` });
        }
    } catch (error) {
        console.error(`Error al obtener producto con ID ${productoId} de la BD:`, error);
        res.status(500).json({ mensaje: "Error al obtener el producto. Intente más tarde." });
    }
};

// NUEVAS FUNCIONES:

// Controlador para crear un nuevo producto
const crearProducto = async (req, res) => {
    // Extraer los datos del cuerpo de la petición
    const { 
        titulo, descripcion, precio, stock, plataforma, 
        genero, fechaLanzamiento, desarrollador, 
        clasificacion, imagenUrl, categoriaId 
    } = req.body;

    // Validación simple (puedes expandirla mucho más)
    if (!titulo || !precio || !plataforma || !genero) {
        return res.status(400).json({ mensaje: "Los campos titulo, precio, plataforma y genero son obligatorios." });
    }

    try {
        const connection = await dbPool.getConnection();
        const sql = `INSERT INTO Productos (
                        titulo, descripcion, precio, stock, plataforma, 
                        genero, fechaLanzamiento, desarrollador, 
                        clasificacion, imagenUrl, categoriaId, activo
                     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`;
        const [result] = await connection.query(sql, [
            titulo, descripcion, precio, stock || 0, plataforma, 
            genero, fechaLanzamiento || null, desarrollador || null, 
            clasificacion || null, imagenUrl || null, categoriaId || null
        ]);
        connection.release();

        res.status(201).json({ 
            mensaje: "Producto creado exitosamente", 
            idProductoCreado: result.insertId 
        });

    } catch (error) {
        console.error("Error al crear el producto en la BD:", error);
        res.status(500).json({ mensaje: "Error al crear el producto. Intente más tarde." });
    }
};

// Controlador para actualizar un producto existente
const actualizarProducto = async (req, res) => {
    const productoId = req.params.id;
    const { 
        titulo, descripcion, precio, stock, plataforma, 
        genero, fechaLanzamiento, desarrollador, 
        clasificacion, imagenUrl, categoriaId, activo 
    } = req.body;

    if (!titulo && !descripcion && precio === undefined && stock === undefined && !plataforma && 
        !genero && fechaLanzamiento === undefined && !desarrollador && !clasificacion && 
        imagenUrl === undefined && categoriaId === undefined && activo === undefined) {
        return res.status(400).json({ mensaje: "Debe proporcionar al menos un campo para actualizar." });
    }

    try {
        const connection = await dbPool.getConnection();
        
        // Construir la consulta dinámicamente (cuidado con la inyección SQL si no se usan placeholders)
        // Esta es una forma simplificada. Para muchos campos opcionales, se pueden usar librerías o construir el SET clause más robustamente.
        let setClauses = [];
        let values = [];

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
        if (activo !== undefined) { setClauses.push("activo = ?"); values.push(activo); }
        
        if (setClauses.length === 0) {
             connection.release();
             return res.status(400).json({ mensaje: "Ningún campo válido proporcionado para actualizar." });
        }

        values.push(productoId); // Para el WHERE id = ?

        const sql = `UPDATE Productos SET ${setClauses.join(", ")} WHERE id = ?`;
        const [result] = await connection.query(sql, values);
        connection.release();

        if (result.affectedRows > 0) {
            res.json({ mensaje: `Producto con ID ${productoId} actualizado exitosamente.` });
        } else {
            res.status(404).json({ mensaje: `Producto con ID ${productoId} no encontrado o sin cambios.` });
        }

    } catch (error) {
        console.error(`Error al actualizar producto con ID ${productoId} en la BD:`, error);
        res.status(500).json({ mensaje: "Error al actualizar el producto. Intente más tarde." });
    }
};

// Controlador para eliminar un producto (baja lógica)
const eliminarProducto = async (req, res) => {
    const productoId = req.params.id;

    try {
        const connection = await dbPool.getConnection();
        // En lugar de DELETE, hacemos una baja lógica actualizando el campo 'activo'
        const [result] = await connection.query("UPDATE Productos SET activo = FALSE WHERE id = ?", [productoId]);
        connection.release();

        if (result.affectedRows > 0) {
            res.json({ mensaje: `Producto con ID ${productoId} marcado como inactivo (eliminado lógicamente).` });
        } else {
            res.status(404).json({ mensaje: `Producto con ID ${productoId} no encontrado.` });
        }
    } catch (error) {
        console.error(`Error al eliminar (lógicamente) producto con ID ${productoId} de la BD:`, error);
        res.status(500).json({ mensaje: "Error al eliminar el producto. Intente más tarde." });
    }
};


// Exportar todas las funciones controladoras
module.exports = {
    obtenerProductos,
    obtenerProductoPorId,
    crearProducto,         // Nueva
    actualizarProducto,    // Nueva
    eliminarProducto       // Nueva
};

