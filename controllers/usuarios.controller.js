// Crear un nuevo archivo: controllers/usuarios.controller.js
const dbPool = require('../database.js'); // Ajusta la ruta a tu database.js

const obtenerTodosLosUsuarios = async (req, res) => {
    // req.usuarioId y req.usuarioRol son establecidos por los middlewares verifyToken e isAdmin
    console.log(`[LOG APP - Admin - obtenerTodosLosUsuarios] Solicitud del adminId: ${req.usuarioId} para obtener todos los usuarios.`);

    try {
        const connection = await dbPool.getConnection();
        console.log("[LOG APP - Admin - obtenerTodosLosUsuarios] Conexión a BD obtenida.");

        // Selecciona los campos que quieres que el admin vea.
        // ¡MUY IMPORTANTE: NUNCA SELECCIONES EL CAMPO 'password'!
        const [usuarios] = await connection.query(
            "SELECT id, nombre, email, rol, fechaRegistro FROM Usuarios ORDER BY id ASC"
            // El campo 'fechaRegistro' lo obtuvimos de tu captura de pantalla de la tabla Usuarios
        );
        connection.release();

        console.log(`[LOG APP - Admin - obtenerTodosLosUsuarios] ${usuarios.length} usuarios encontrados.`);
        res.json(usuarios);

    } catch (error) {
        console.error("[LOG APP - Admin - obtenerTodosLosUsuarios] Error al obtener usuarios de la BD:", error);
        res.status(500).json({ mensaje: "Error al obtener la lista de usuarios. Intente más tarde." });
    }
};

// Aquí añadiremos más funciones de admin para usuarios después 
// (ej. actualizarRolUsuarioAdmin, eliminarUsuarioAdmin, etc.)

module.exports = {
    obtenerTodosLosUsuarios,
};
