// index.js (CON LOGS DE DIAGNÓSTICO y NUEVAS RUTAS DE USUARIOS PARA ADMIN)
const express = require('express');
const cors = require('cors'); // Asumo que ya lo instalaste y está en tu package.json

// Importar tus módulos de rutas
const productosRoutes = require('./routes/productos.routes.js');
const authRoutes = require('./routes/auth.routes.js'); 
const pedidosRoutes = require('./routes/pedidos.routes.js');
const pagosRoutes = require('./routes/pagos.routes.js');
const usuariosAdminRoutes = require('./routes/usuarios.routes.js'); // <<<--- IMPORTA TUS NUEVAS RUTAS DE USUARIOS

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors()); // Habilita CORS para todas las rutas.
app.use(express.json()); // Para parsear cuerpos de petición JSON
console.log("[LOG BACKEND INDEX] Middlewares básicos (cors, express.json) configurados.");


// Ruta raíz de prueba
app.get('/', (req, res) => {
  res.send('¡API de Videojuegos GamersITOs funcionando!');
});
console.log("[LOG BACKEND INDEX] Ruta raíz GET / configurada.");


// Montar las rutas de la API
try {
    app.use('/api/productos', productosRoutes);
    console.log("[LOG BACKEND INDEX] Rutas de Productos montadas exitosamente en /api/productos");
} catch (e) {
    console.error("[LOG BACKEND INDEX] ERROR al montar Rutas de Productos:", e);
}

try {
    app.use('/api/auth', authRoutes); 
    console.log("[LOG BACKEND INDEX] Rutas de Autenticación montadas exitosamente en /api/auth");
} catch (e) {
    console.error("[LOG BACKEND INDEX] ERROR al montar Rutas de Autenticación:", e);
}

try {
    app.use('/api/pedidos', pedidosRoutes);
    console.log("[LOG BACKEND INDEX] Rutas de Pedidos montadas exitosamente en /api/pedidos");
} catch (e) {
    console.error("[LOG BACKEND INDEX] ERROR al montar Rutas de Pedidos:", e);
}

try {
    app.use('/api/pagos', pagosRoutes);
    console.log("[LOG BACKEND INDEX] Rutas de Pagos montadas exitosamente en /api/pagos");
} catch (e) {
    console.error("[LOG BACKEND INDEX] ERROR al montar Rutas de Pagos:", e);
}

try {
    // Usamos '/api/admin/usuarios' como prefijo para estas rutas de admin
    app.use('/api/admin/usuarios', usuariosAdminRoutes); // <<<--- MONTA LAS NUEVAS RUTAS DE USUARIOS
    console.log("[LOG BACKEND INDEX] Rutas de Administración de Usuarios montadas exitosamente en /api/admin/usuarios"); // <<<--- LOG DE DIAGNÓSTICO
} catch (e) { 
    console.error("[LOG BACKEND INDEX] ERROR al montar Rutas de Administración de Usuarios:", e); 
}


app.listen(PORT, () => {
  console.log(`[LOG BACKEND INDEX] Servidor escuchando en el puerto ${PORT}. Conexión a BD debería estar establecida o por establecerse.`);
});
