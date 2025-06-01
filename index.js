// index.js (o app.js/server.js, tu archivo principal de Express)
const express = require('express');
const cors = require('cors'); // Si usas CORS, asegúrate de que esté importado y configurado

// Importar tus módulos de rutas
const productosRoutes = require('./routes/productos.routes.js');
const authRoutes = require('./routes/auth.routes.js'); 
const pedidosRoutes = require('./routes/pedidos.routes.js'); // Desde el archivo actualizado arriba
const pagosRoutes = require('./routes/pagos.routes.js');

const app = express();
const PORT = process.env.PORT || 5000; // Render usa process.env.PORT

// Middlewares
app.use(cors()); // Configura CORS si es necesario para permitir peticiones desde tu frontend
app.use(express.json()); // Para parsear cuerpos de petición JSON

// Ruta raíz de prueba
app.get('/', (req, res) => {
  res.send('¡Hola Mundo desde mi API de Videojuegos GamersITOs!');
});

// Montar las rutas de la API
app.use('/api/productos', productosRoutes);
console.log("[LOG BACKEND INDEX] Rutas de Productos montadas en /api/productos");

app.use('/api/auth', authRoutes); 
console.log("[LOG BACKEND INDEX] Rutas de Autenticación montadas en /api/auth");

app.use('/api/pedidos', pedidosRoutes); // Usa el router de pedidos actualizado
console.log("[LOG BACKEND INDEX] Rutas de Pedidos montadas en /api/pedidos");

app.use('/api/pagos', pagosRoutes);
console.log("[LOG BACKEND INDEX] Rutas de Pagos montadas en /api/pagos");


app.listen(PORT, () => {
  console.log(`[LOG BACKEND INDEX] Servidor escuchando en el puerto ${PORT}`);
  // Las siguientes líneas son más para desarrollo local, en Render la URL será la de tu servicio.
  // console.log(`Puedes acceder en http://localhost:${PORT} (si estás en el servidor)`);
  // console.log(`O http://localhost:${PORT} desde tu navegador en Windows`);
});
