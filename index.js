// index.js 
 const express = require('express'); 
 const productosRoutes = require('./routes/productos.routes.js'); 
 const authRoutes = require('./routes/auth.routes.js');  
 const pedidosRoutes = require('./routes/pedidos.routes.js'); 
 const pagosRoutes = require('./routes/pagos.routes.js'); 

 const app = express(); 
 const PORT = process.env.PORT || 5000; 

 app.use(express.json()); // Middleware para parsear JSON bodies

 app.get('/', (req, res) => { 
   res.send('¡Hola Mundo desde mi API de Videojuegos!'); 
 }); 

 // Usar las rutas 
 app.use('/api/productos', productosRoutes); 
 app.use('/api/auth', authRoutes);  
 app.use('/api/pedidos', pedidosRoutes); 
 app.use('/api/pagos', pagosRoutes); 

 app.listen(PORT, () => { 
   console.log(`Servidor escuchando en el puerto ${PORT}`); 
   // ...
 });
