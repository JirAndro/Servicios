// index.js (SIN el paquete 'cors')
const express = require('express');

// Importar tus módulos de rutas
const productosRoutes = require('./routes/productos.routes.js');
const authRoutes = require('./routes/auth.routes.js'); 
const pedidosRoutes = require('./routes/pedidos.routes.js');
const pagosRoutes = require('./routes/pagos.routes.js');

const app = express();
const PORT = process.env.PORT || 5000; // Render usa process.env.PORT

// Middlewares
app.use(express.json()); // Para parsear cuerpos de petición JSON
console.log("[LOG BACKEND INDEX] Middleware express.json configurado.");


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


app.listen(PORT, () => {
  console.log(`[LOG BACKEND INDEX] Servidor escuchando en el puerto ${PORT}.`);
  console.log(`[LOG BACKEND INDEX] Conexión a BD debería estar establecida o por establecerse.`);
});
