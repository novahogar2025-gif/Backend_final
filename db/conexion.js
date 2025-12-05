const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: { rejectUnauthorized: false }, // ✅ OBLIGATORIO para Railway
    charset: 'utf8mb4',
    connectTimeout: 10000,
    acquireTimeout: 10000
});

// Manejo de errores
pool.on('error', (err) => {
    console.error('Error MySQL:', err.message);
});

module.exports = pool;