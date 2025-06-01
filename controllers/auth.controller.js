// controllers/auth.controller.js
const dbPool = require('../database.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth.config.js'); // Asegúrate que esta ruta sea correcta

// Controlador para registrar un nuevo usuario
const registrarUsuario = async (req, res) => {
    const { nombre, email, password, rol } = req.body;
    console.log(`[LOG APP - registrarUsuario] Solicitud de registro para email: ${email}`);

    if (!nombre || !email || !password) {
        console.warn("[LOG APP - registrarUsuario] Campos obligatorios faltantes:", req.body);
        return res.status(400).json({ mensaje: "Nombre, email y contraseña son obligatorios." });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        console.log("[LOG APP - registrarUsuario] Conexión a BD obtenida.");

        const [usuariosExistentes] = await connection.query("SELECT email FROM Usuarios WHERE email = ?", [email]);
        if (usuariosExistentes.length > 0) {
            connection.release();
            console.warn(`[LOG APP - registrarUsuario] Email ${email} ya registrado.`);
            return res.status(409).json({ mensaje: "El email ya está registrado." });
        }

        const hashedPassword = await bcrypt.hash(password, 8);
        console.log(`[LOG APP - registrarUsuario] Contraseña hasheada para email: ${email}`);

        // Ajustamos el SQL para que coincida con tu tabla Usuarios
        // Asumimos que 'fechaRegistro' existe y se poblará con NOW()
        // Si 'fechaRegistro' tiene DEFAULT CURRENT_TIMESTAMP en la BD, no necesitas incluirla aquí.
        const sql = "INSERT INTO Usuarios (nombre, email, password, rol, fechaRegistro) VALUES (?, ?, ?, ?, NOW())";
        const [result] = await connection.query(sql, [nombre, email, hashedPassword, rol || 'cliente']);
        const nuevoUsuarioId = result.insertId;
        console.log(`[LOG APP - registrarUsuario] Usuario insertado con ID: ${nuevoUsuarioId}`);
        
        connection.release();
        res.status(201).json({ 
            mensaje: "Usuario registrado exitosamente.",
            usuarioId: nuevoUsuarioId 
        });

    } catch (error) {
        console.error("[LOG APP - registrarUsuario] Error al registrar el usuario:", error);
        if (connection) connection.release();
        res.status(500).json({ mensaje: "Error al registrar el usuario. Intente más tarde." });
    }
};

// Controlador para iniciar sesión
const loginUsuario = async (req, res) => {
    const { email, password } = req.body;
    console.log(`[LOG APP - loginUsuario] Intento de login para email: ${email}`);

    if (!email || !password) {
        console.warn("[LOG APP - loginUsuario] Email o contraseña no proporcionados.");
        return res.status(400).json({ mensaje: "Email y contraseña son obligatorios." });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        console.log(`[LOG APP - loginUsuario] Conexión a BD obtenida para email: ${email}`);
        // Quitamos 'activo' del SELECT ya que no existe en tu tabla
        const [users] = await connection.query("SELECT id, nombre, email, password, rol, fechaRegistro FROM Usuarios WHERE email = ?", [email]);
        
        if (users.length === 0) {
            connection.release(); // Liberar conexión aquí también
            console.warn(`[LOG APP - loginUsuario] Email no encontrado: ${email}`);
            return res.status(401).json({ mensaje: "Credenciales inválidas." });
        }

        const usuario = users[0];
        // Quitamos 'Activo: ${usuario.activo}' del log ya que no existe
        console.log(`[LOG APP - loginUsuario] Usuario encontrado: ID ${usuario.id}, Rol: ${usuario.rol}, FechaRegistro: ${usuario.fechaRegistro}`);
        connection.release(); // Liberar conexión después de usar 'usuario' y antes de operaciones async largas

        // La verificación de 'usuario.activo' se elimina porque la columna no existe
        // if (usuario.activo === 0 || usuario.activo === false) { ... }

        const passwordIsValid = await bcrypt.compare(password, usuario.password);
        if (!passwordIsValid) {
            console.warn(`[LOG APP - loginUsuario] Contraseña incorrecta para email: ${email}`);
            return res.status(401).json({ mensaje: "Credenciales inválidas." });
        }

        console.log(`[LOG APP - loginUsuario] Contraseña válida para email: ${email}. Generando token.`);
        const token = jwt.sign(
            { id: usuario.id, rol: usuario.rol },
            authConfig.secret,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            mensaje: "Login exitoso.",
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
                // fechaRegistro: usuario.fechaRegistro // Podrías añadirlo si la app lo necesita
            },
            accessToken: token
        });

    } catch (error) {
        console.error("[LOG APP - loginUsuario] Error al iniciar sesión:", error);
        if (connection) { // Solo intenta liberar si la conexión fue asignada
            try { connection.release(); } catch (e) { console.error("Error liberando conexión en catch de login:", e); }
        }
        res.status(500).json({ mensaje: "Error al iniciar sesión. Intente más tarde." });
    }
};

// Controlador para que un usuario actualice su propio perfil (ej. nombre)
const actualizarMiPerfil = async (req, res) => {
    const usuarioId = req.usuarioId; 
    const { nombre } = req.body; 
    console.log(`[LOG APP - actualizarMiPerfil] UsuarioId: ${usuarioId} solicita actualizar perfil. Datos recibidos:`, req.body);

    if (!nombre || nombre.trim() === "") {
        console.warn(`[LOG APP - actualizarMiPerfil] UsuarioId: ${usuarioId} - Nombre no proporcionado o vacío.`);
        return res.status(400).json({ mensaje: "El nombre no puede estar vacío." });
    }
    
    let connection;
    try {
        connection = await dbPool.getConnection();
        console.log(`[LOG APP - actualizarMiPerfil] UsuarioId: ${usuarioId} - Conexión a BD obtenida.`);
        
        const [result] = await connection.query(
            "UPDATE Usuarios SET nombre = ? WHERE id = ?",
            [nombre.trim(), usuarioId]
        );
        console.log(`[LOG APP - actualizarMiPerfil] UsuarioId: ${usuarioId} - Resultado de UPDATE: Filas afectadas: ${result.affectedRows}`);

        if (result.affectedRows > 0) {
            const [updatedUsers] = await connection.query("SELECT id, nombre, email, rol FROM Usuarios WHERE id = ?", [usuarioId]);
            connection.release();
            console.log(`[LOG APP - actualizarMiPerfil] UsuarioId: ${usuarioId} - Perfil actualizado exitosamente.`);
            res.status(200).json({
                mensaje: "Perfil actualizado exitosamente.",
                usuario: updatedUsers[0] 
            });
        } else {
            connection.release();
            console.warn(`[LOG APP - actualizarMiPerfil] UsuarioId: ${usuarioId} - No se encontró el usuario para actualizar o el nombre era el mismo.`);
            res.status(404).json({ mensaje: "Usuario no encontrado o sin cambios necesarios." });
        }
    } catch (error) {
        console.error(`[LOG APP - actualizarMiPerfil] UsuarioId: ${usuarioId} - Error CRÍTICO al actualizar perfil:`, error);
        if (connection) connection.release();
        res.status(500).json({ mensaje: "Error interno al actualizar el perfil." });
    }
};

// Controlador para que un usuario elimine FÍSICAMENTE su propia cuenta
const eliminarMiCuenta = async (req, res) => {
    const usuarioId = req.usuarioId;
    const { password } = req.body;
    console.log(`[LOG APP - eliminarMiCuenta] UsuarioId: ${usuarioId} solicita ELIMINAR FÍSICAMENTE su cuenta.`);

    if (!password) {
        console.warn(`[LOG APP - eliminarMiCuenta] UsuarioId: ${usuarioId} no proporcionó contraseña para confirmación.`);
        return res.status(400).json({ mensaje: "Se requiere la contraseña actual para eliminar la cuenta." });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        console.log(`[LOG APP - eliminarMiCuenta] UsuarioId: ${usuarioId} - Conexión a BD obtenida.`);
        
        const [users] = await connection.query("SELECT id, password FROM Usuarios WHERE id = ?", [usuarioId]);
        if (users.length === 0) {
            // connection.release(); // Se liberará en el finally
            console.error(`[LOG APP - eliminarMiCuenta] UsuarioId: ${usuarioId} del token no encontrado en BD (inesperado).`);
            // No es necesario hacer rollback si no se inició transacción aún
            if (connection) connection.release();
            return res.status(404).json({ mensaje: "Usuario no encontrado." });
        }
        const usuario = users[0];

        const passwordIsValid = await bcrypt.compare(password, usuario.password);
        if (!passwordIsValid) {
            // connection.release(); // Se liberará en el finally
            console.warn(`[LOG APP - eliminarMiCuenta] UsuarioId: ${usuarioId} - Contraseña incorrecta para eliminación.`);
            if (connection) connection.release();
            return res.status(401).json({ mensaje: "Contraseña incorrecta. No se puede eliminar la cuenta." });
        }

        console.log(`[LOG APP - eliminarMiCuenta] UsuarioId: ${usuarioId} - Contraseña verificada. Procediendo con eliminación FÍSICA.`);
        await connection.beginTransaction();
        console.log(`[LOG APP - eliminarMiCuenta] UsuarioId: ${usuarioId} - Transacción iniciada.`);
        
        const [result] = await connection.query("DELETE FROM Usuarios WHERE id = ?", [usuarioId]);
        console.log(`[LOG APP - eliminarMiCuenta] UsuarioId: ${usuarioId} - Resultado de DELETE: Filas afectadas: ${result.affectedRows}`);

        if (result.affectedRows > 0) {
            await connection.commit();
            console.log(`[LOG APP - eliminarMiCuenta] UsuarioId: ${usuarioId} - Cuenta ELIMINADA FÍSICAMENTE. Transacción commit.`);
            res.status(200).json({ mensaje: "Tu cuenta ha sido eliminada permanentemente." });
        } else {
            await connection.rollback();
            console.warn(`[LOG APP - eliminarMiCuenta] UsuarioId: ${usuarioId} - No se afectaron filas en DELETE (inesperado). Rollback.`);
            res.status(404).json({ mensaje: "No se pudo eliminar la cuenta, usuario no encontrado después de verificación." });
        }
    } catch (error) {
        console.error(`[LOG APP - eliminarMiCuenta] UsuarioId: ${usuarioId} - Error CRÍTICO al eliminar cuenta:`, error);
        if (connection) {
            try { await connection.rollback(); } catch (rbError) { console.error("[LOG APP - eliminarMiCuenta] Error en rollback:", rbError); }
        }
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || (error.sqlMessage && error.sqlMessage.toLowerCase().includes('foreign key constraint fails'))) {
             console.warn(`[LOG APP - eliminarMiCuenta] UsuarioId: ${usuarioId} - Intento de eliminar falló por restricción de FK (probablemente pedidos existentes).`);
             if (connection) connection.release(); // Asegurar liberación si se retorna aquí
             return res.status(409).json({ mensaje: "No se puede eliminar la cuenta porque tiene datos asociados (ej. pedidos). Contacta a soporte."});
        }
        res.status(500).json({ mensaje: "Error interno al procesar la eliminación de la cuenta." });
    } finally {
        if (connection) {
            console.log(`[LOG APP - eliminarMiCuenta] UsuarioId: ${usuarioId} - Liberando conexión a BD.`);
            connection.release();
        }
    }
};

module.exports = {
    registrarUsuario,
    loginUsuario,
    actualizarMiPerfil,
    eliminarMiCuenta 
};
