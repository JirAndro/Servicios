// database.js
const mysql = require('mysql2/promise'); // Usamos la versión con promesas de mysql2
const dbConfig = require('./config/db.config.js');

// Crear un pool de conexiones
const pool = mysql.createPool({
    host: dbConfig.HOST,
    user: dbConfig.USER,         // Usará 'Andro' de tu config
    password: dbConfig.PASSWORD, // Usará la contraseña de 'Andro' de tu config
    database: dbConfig.DB,       // Usará 'videojuegos' de tu config
    waitForConnections: true,
    connectionLimit: 10, 
    queueLimit: 0        
});

// Probar la conexión (opcional)
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log("Conexión exitosa a la base de datos MySQL como usuario:", dbConfig.USER);
        connection.release(); 
    } catch (error) {
        console.error("Error al conectar con la base de datos MySQL:", error.message);
    }
}

// testConnection(); // Descomenta para probar al inicio de la app

module.exports = pool;

