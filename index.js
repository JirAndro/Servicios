// index.js

const express = require('express');

const productosRoutes = require('./routes/productos.routes.js');

const authRoutes = require('./routes/auth.routes.js'); 

const pedidosRoutes = require('./routes/pedidos.routes.js');

const pagosRoutes = require('./routes/pagos.routes.js'); // <<< Nueva línea



const app = express();

const PORT = process.env.PORT || 5000;



// OJO: PayPal envía webhooks como application/json, pero a veces otros formatos.

// express.json() es para la mayoría de los casos. Si tienes problemas con webhooks,

// podrías necesitar body-parser para raw body si PayPal no lo envía como JSON estándar.

app.use(express.json()); 

// Para webhooks de PayPal, a veces es mejor parsear el cuerpo raw y luego verificar

// app.post('/api/pagos/paypal/webhook', express.raw({ type: 'application/json' }), webhookPayPalControllerFn);





app.get('/', (req, res) => {

  res.send('¡Hola Mundo desde mi API de Videojuegos!');

});



// Usar las rutas

app.use('/api/productos', productosRoutes);

app.use('/api/auth', authRoutes); 

app.use('/api/pedidos', pedidosRoutes);

app.use('/api/pagos', pagosRoutes); // <<< Nueva línea



app.listen(PORT, () => {

  console.log(`Servidor escuchando en el puerto ${PORT}`);

  console.log(`Puedes acceder en http://localhost:${PORT} (si estás en el servidor)`);

  console.log(`O http://localhost:${PORT} desde tu navegador en Windows`);

});
