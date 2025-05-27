// controllers/auth.controller.js
const dbPool = require('../database.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth.config.js');

// Controlador para registrar un nuevo usuario
const registrarUsuario = async (req, res) => {
    const { nombre, email, password, rol } = req.body;

    // Validación básica
    if (!nombre || !email || !password) {
        return res.status(400).json({ mensaje: "Nombre, email y contraseña son obligatorios." });
    }

    try {
        const connection = await dbPool.getConnection();

        // Verificar si el email ya existe
        const [usuariosExistentes] = await connection.query("SELECT email FROM Usuarios WHERE email = ?", [email]);
        if (usuariosExistentes.length > 0) {
            connection.release();
            return res.status(409).json({ mensaje: "El email ya está registrado." }); // 409 Conflict
        }

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 8); // El 8 es el "salt rounds"

        // Insertar el nuevo usuario
        const sql = "INSERT INTO Usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)";
        const [result] = await connection.query(sql, [nombre, email, hashedPassword, rol || 'cliente']);
        connection.release();

        res.status(201).json({ 
            mensaje: "Usuario registrado exitosamente.",
            usuarioId: result.insertId 
        });

    } catch (error) {
        console.error("Error al registrar el usuario:", error);
        res.status(500).json({ mensaje: "Error al registrar el usuario. Intente más tarde." });
    }
};

// Controlador para iniciar sesión
const loginUsuario = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ mensaje: "Email y contraseña son obligatorios." });
    }

    try {
        const connection = await dbPool.getConnection();
        const [users] = await connection.query("SELECT * FROM Usuarios WHERE email = ?", [email]);
        connection.release();

        if (users.length === 0) {
            return res.status(401).json({ mensaje: "Credenciales inválidas (email no encontrado)." }); // Unauthorized
        }

        const usuario = users[0];

        // Comparar la contraseña proporcionada con la hasheada en la BD
        const passwordIsValid = await bcrypt.compare(password, usuario.password);

        if (!passwordIsValid) {
            return res.status(401).json({ mensaje: "Credenciales inválidas (contraseña incorrecta)." }); // Unauthorized
        }

        // Si las credenciales son válidas, generar un token JWT
        const token = jwt.sign(
            { id: usuario.id, rol: usuario.rol }, // Payload del token
            authConfig.secret, // Secreto para firmar el token
            { expiresIn: '24h' } // El token expira en 24 horas (puedes ajustarlo)
        );

        // Devolver el token y la información básica del usuario (sin la contraseña)
        res.status(200).json({
            mensaje: "Login exitoso.",
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol
            },
            accessToken: token
        });

    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        res.status(500).json({ mensaje: "Error al iniciar sesión. Intente más tarde." });
    }
};

module.exports = {
    registrarUsuario,
    loginUsuario
};

