// middlewares/authJwt.js
const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth.config.js");

const verifyToken = (req, res, next) => {
    // Obtener el token de la cabecera 'x-access-token' o 'authorization'
    // El formato común para 'authorization' es: Bearer <token>
    let token = req.headers["x-access-token"];

    if (!token && req.headers.authorization) {
        // Si se usa el formato 'Bearer <token>'
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7, authHeader.length); // Extraer solo el token
        }
    }

    if (!token) {
        return res.status(403).send({
            mensaje: "¡No se proporcionó ningún token!"
        });
    }

    jwt.verify(token, authConfig.secret, (err, decoded) => {
        if (err) {
            // Posibles errores: TokenExpiredError, JsonWebTokenError, NotBeforeError
            let mensajeError = "¡No autorizado! Token inválido.";
            if (err.name === 'TokenExpiredError') {
                mensajeError = "¡No autorizado! El token ha expirado.";
            }
            return res.status(401).send({
                mensaje: mensajeError
            });
        }
        // Si el token es válido, el payload decodificado (con id y rol) se guarda en req.usuarioId y req.usuarioRol
        req.usuarioId = decoded.id;
        req.usuarioRol = decoded.rol;
        next(); // Llama a la siguiente función (otro middleware o el controlador de la ruta)
    });
};

// (Opcional) Middleware para verificar roles específicos
const isAdmin = (req, res, next) => {
    // Asume que verifyToken ya se ejecutó y req.usuarioRol está disponible
    if (req.usuarioRol === "admin") {
        next();
        return;
    }
    res.status(403).send({
        mensaje: "¡Requiere rol de Administrador!"
    });
};

const isEmpleadoOrAdmin = (req, res, next) => {
    if (req.usuarioRol === "empleado" || req.usuarioRol === "admin") {
        next();
        return;
    }
    res.status(403).send({
        mensaje: "¡Requiere rol de Empleado o Administrador!"
    });
};


const authJwt = {
    verifyToken: verifyToken,
    isAdmin: isAdmin,
    isEmpleadoOrAdmin: isEmpleadoOrAdmin
    // Puedes añadir más funciones de verificación de roles aquí
};

module.exports = authJwt;
