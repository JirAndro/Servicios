// controllers/usuarios.controller.js
const dbPool = require('../database.js');
const bcrypt = require('bcryptjs'); // Necesario si permites actualizar contraseña

const obtenerTodosLosUsuarios = async (req, res) => {
    // req.usuarioId y req.usuarioRol son establecidos por los middlewares verifyToken e isAdmin
    console.log(`[LOG APP - Admin - obtenerTodosLosUsuarios] Solicitud del adminId: ${req.usuarioId} para obtener todos los usuarios.`);
    try {
        const connection = await dbPool.getConnection();
        console.log("[LOG APP - Admin - obtenerTodosLosUsuarios] Conexión a BD obtenida.");
        const [usuarios] = await connection.query(
            "SELECT id, nombre, email, rol, fechaRegistro FROM Usuarios ORDER BY id ASC"
        );
        connection.release();
        console.log(`[LOG APP - Admin - obtenerTodosLosUsuarios] ${usuarios.length} usuarios encontrados.`);
        res.json(usuarios);
    } catch (error) {
        console.error("[LOG APP - Admin - obtenerTodosLosUsuarios] Error al obtener usuarios de la BD:", error);
        res.status(500).json({ mensaje: "Error al obtener la lista de usuarios. Intente más tarde." });
    }
};

// NUEVA FUNCIÓN: Actualizar datos de un usuario por un Administrador
const actualizarUsuarioPorAdmin = async (req, res) => {
    const adminIdSolicitante = req.usuarioId;
    const usuarioIdAModificar = req.params.id;
    const { nombre, email, rol /*, nuevaPassword, activo (si tuvieras estas columnas) */ } = req.body;

    console.log(`[LOG APP - Admin - actualizarUsuarioPorAdmin] AdminId: ${adminIdSolicitante} solicita actualizar usuarioId: ${usuarioIdAModificar} con datos:`, req.body);

    if (Object.keys(req.body).length === 0) {
        return res.status(400).json({ mensaje: "Debe proporcionar al menos un campo para actualizar." });
    }
    // No permitir que un admin se modifique su propio rol o estado activo por esta vía para evitar auto-bloqueos.
    // Podrías tener una ruta separada para auto-modificación de perfil del admin.
    if (parseInt(adminIdSolicitante, 10) === parseInt(usuarioIdAModificar, 10) && (req.body.rol !== undefined /*|| req.body.activo !== undefined*/)) {
        console.warn(`[LOG APP - Admin - actualizarUsuarioPorAdmin] AdminId: ${adminIdSolicitante} intentó modificar su propio rol/estado.`);
        return res.status(403).json({ mensaje: "Un administrador no puede modificar su propio rol o estado directamente por esta vía." });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.beginTransaction();
        console.log(`[LOG APP - Admin - actualizarUsuarioPorAdmin] Transacción iniciada para usuarioId: ${usuarioIdAModificar}`);

        // Verificar si el usuario a modificar existe
        const [usuariosExistentes] = await connection.query("SELECT id, email, rol FROM Usuarios WHERE id = ?", [usuarioIdAModificar]);
        if (usuariosExistentes.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ mensaje: `Usuario con ID ${usuarioIdAModificar} no encontrado.` });
        }
        const usuarioActual = usuariosExistentes[0];

        // Si se intenta cambiar el email, verificar que el nuevo email no esté ya en uso por OTRO usuario
        if (email && email !== usuarioActual.email) {
            const [emailEnUso] = await connection.query("SELECT id FROM Usuarios WHERE email = ? AND id != ?", [email, usuarioIdAModificar]);
            if (emailEnUso.length > 0) {
                await connection.rollback();
                connection.release();
                return res.status(409).json({ mensaje: `El nuevo email '${email}' ya está registrado por otro usuario.` });
            }
        }
        
        let setClauses = [];
        let values = [];

        if (nombre !== undefined) { setClauses.push("nombre = ?"); values.push(nombre); }
        if (email !== undefined) { setClauses.push("email = ?"); values.push(email); }
        if (rol !== undefined) { setClauses.push("rol = ?"); values.push(rol); }
        // if (activo !== undefined) { setClauses.push("activo = ?"); values.push(activo); } // Si tuvieras columna 'activo'
        // Para cambiar contraseña por un admin, se requeriría un flujo diferente o no almacenar nuevaPassword directamente
        // if (nuevaPassword) { 
        //    const hashedPassword = await bcrypt.hash(nuevaPassword, 8);
        //    setClauses.push("password = ?"); values.push(hashedPassword);
        // }


        if (setClauses.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ mensaje: "Ningún campo válido proporcionado para actualizar." });
        }

        values.push(usuarioIdAModificar); // Para el WHERE id = ?
        const sql = `UPDATE Usuarios SET ${setClauses.join(", ")} WHERE id = ?`;
        console.log(`[LOG APP - Admin - actualizarUsuarioPorAdmin] Ejecutando UPDATE para usuarioId: ${usuarioIdAModificar}. SQL: ${sql}. Valores: ${JSON.stringify(values)}`);
        
        const [result] = await connection.query(sql, values);
        console.log(`[LOG APP - Admin - actualizarUsuarioPorAdmin] Resultado de UPDATE para usuarioId ${usuarioIdAModificar}: Filas afectadas: ${result.affectedRows}`);

        await connection.commit();
        connection.release();

        if (result.affectedRows > 0) {
            // Devolver el usuario actualizado (sin la contraseña)
            const [updatedUsers] = await connection.query("SELECT id, nombre, email, rol, fechaRegistro FROM Usuarios WHERE id = ?", [usuarioIdAModificar]);
            res.json({ mensaje: `Usuario con ID ${usuarioIdAModificar} actualizado exitosamente.`, usuario: updatedUsers[0] });
        } else {
            res.status(404).json({ mensaje: `Usuario con ID ${usuarioIdAModificar} no encontrado o sin cambios necesarios.` });
        }
    } catch (error) {
        console.error(`[LOG APP - Admin - actualizarUsuarioPorAdmin] Error al actualizar usuarioId ${usuarioIdAModificar}:`, error);
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        res.status(500).json({ mensaje: "Error interno al actualizar el usuario." });
    }
};


// NUEVA FUNCIÓN: Eliminar un usuario por un Administrador (Eliminación Física)
const eliminarUsuarioPorAdmin = async (req, res) => {
    const adminIdSolicitante = req.usuarioId;
    const usuarioIdAEliminar = req.params.id;

    console.log(`[LOG APP - Admin - eliminarUsuarioPorAdmin] AdminId: ${adminIdSolicitante} solicita ELIMINAR FÍSICAMENTE usuarioId: ${usuarioIdAEliminar}`);

    if (!usuarioIdAEliminar) {
        return res.status(400).json({ mensaje: "Se requiere el ID del usuario a eliminar." });
    }

    // IMPORTANTE: Un admin NO debería poder eliminarse a sí mismo por esta vía.
    if (parseInt(adminIdSolicitante, 10) === parseInt(usuarioIdAEliminar, 10)) {
        console.warn(`[LOG APP - Admin - eliminarUsuarioPorAdmin] AdminId: ${adminIdSolicitante} intentó eliminarse a sí mismo.`);
        return res.status(403).json({ mensaje: "Un administrador no puede eliminarse a sí mismo." });
    }
    // Opcional: Lógica para no eliminar otros admins, o el último admin.

    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.beginTransaction();
        console.log(`[LOG APP - Admin - eliminarUsuarioPorAdmin] Transacción iniciada para eliminar usuarioId: ${usuarioIdAEliminar}`);

        // Verificar si el usuario a eliminar existe
        const [usuariosExistentes] = await connection.query("SELECT id FROM Usuarios WHERE id = ?", [usuarioIdAEliminar]);
        if (usuariosExistentes.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ mensaje: `Usuario con ID ${usuarioIdAEliminar} no encontrado.` });
        }

        // ADVERTENCIA: Eliminación Física y Llaves Foráneas (ej. Pedidos)
        // Si Pedidos.usuarioId apunta a Usuarios.id con ON DELETE RESTRICT, este DELETE fallará si hay pedidos.
        // Considera:
        // 1. Configurar ON DELETE SET NULL en la FK de Pedidos.usuarioId (y permitir NULLs).
        // 2. O desvincular pedidos manualmente: await connection.query("UPDATE Pedidos SET usuarioId = NULL WHERE usuarioId = ?", [usuarioIdAEliminar]);
        
        const [result] = await connection.query("DELETE FROM Usuarios WHERE id = ?", [usuarioIdAEliminar]);
        console.log(`[LOG APP - Admin - eliminarUsuarioPorAdmin] Resultado de DELETE para usuarioId ${usuarioIdAEliminar}: Filas afectadas: ${result.affectedRows}`);

        if (result.affectedRows > 0) {
            await connection.commit();
            console.log(`[LOG APP - Admin - eliminarUsuarioPorAdmin] UsuarioId ${usuarioIdAEliminar} ELIMINADO FÍSICAMENTE. Commit.`);
            res.status(200).json({ mensaje: `Usuario con ID ${usuarioIdAEliminar} eliminado exitosamente.` });
        } else {
            await connection.rollback(); // No debería llegar aquí si la verificación de existencia funcionó
            res.status(404).json({ mensaje: `Usuario con ID ${usuarioIdAEliminar} no encontrado (inesperado tras verificación).` });
        }
    } catch (error) {
        console.error(`[LOG APP - Admin - eliminarUsuarioPorAdmin] Error CRÍTICO al eliminar usuarioId ${usuarioIdAEliminar}:`, error);
        if (connection) await connection.rollback();
        
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || (error.sqlMessage && error.sqlMessage.toLowerCase().includes('foreign key constraint fails'))) {
             if (connection) connection.release(); // Asegurar liberación antes de retornar
             return res.status(409).json({ mensaje: "No se puede eliminar el usuario porque tiene datos asociados (ej. pedidos)."});
        }
        if (connection) connection.release(); // Asegurar liberación en otros errores
        res.status(500).json({ mensaje: "Error interno al eliminar el usuario." });
    } finally {
        if (connection && connection.connection ) { // Comprobación más segura
            try { connection.release(); } catch(e) { console.error("Error al liberar conexión en finally de eliminarUsuarioPorAdmin", e); }
        }
    }
};

module.exports = {
    obtenerTodosLosUsuarios,
    actualizarUsuarioPorAdmin, // <<<--- AÑADIDA
    eliminarUsuarioPorAdmin    // <<<--- AÑADIDA
};
