// database.js
const mysql = require('mysql2/promise');
const dbConfig = require('./config/db.config.js');
const fs = require('fs'); // Necesitarás el módulo 'fs' para leer el archivo del certificado

// Crear un pool de conexiones
const pool = mysql.createPool({
    host: dbConfig.HOST,
    user: dbConfig.USER,
    password: dbConfig.PASSWORD,
    database: dbConfig.DB,
    port: dbConfig.PORT_DB || 4000,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        // Si descargaste el certificado CA y lo pusiste en, por ejemplo, la carpeta config:
        // ca: fs.readFileSync(__dirname + '/config/ca-bundle.pem'), // Ajusta la ruta si es necesario

        // Alternativamente, para TiDB Cloud, a menudo es suficiente con:
        rejectUnauthorized: true // O false para pruebas iniciales si tienes problemas, pero true es más seguro
                                 // TiDB Cloud recomienda usar el CA para producción.
                                 // Para empezar y si no tienes el CA a mano, prueba solo con rejectUnauthorized: true
                                 // Si TiDB Cloud usa certificados de una CA conocida, esto podría ser suficiente.
                                 // Si sigue fallando, necesitarás sí o sí el `ca` de TiDB Cloud.
    }
});

// Probar la conexión (opcional pero recomendado)
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log("Conexión SSL exitosa a la base de datos MySQL (TiDB Cloud) como usuario:", dbConfig.USER);
        connection.release();
    } catch (error) {
        console.error("Error al conectar con la base de datos MySQL (TiDB Cloud) vía SSL:", error.message);
        if (error.code === 'HANDSHAKE_SSL_ERROR' || error.message.includes('SSL')) {
            console.error("Detalle del error SSL:", error);
            console.log("Asegúrate de que la opción 'ssl' en database.js esté bien configurada.");
            console.log("Si descargaste un certificado CA de TiDB Cloud, asegúrate de que la ruta en fs.readFileSync sea correcta.");
        }
    }
}

testConnection(); // Descomenta esta línea para probar la conexión al iniciar la app

module.exports = pool;