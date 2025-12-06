// models/UserModel.js

const pool = require('../db/conexion');

// Configuración de la política de seguridad
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 15 * 60 * 1000; // 15 minutos en milisegundos

// Verificar si existe usuario por correo
async function getUserByCorreo(correo) {
    const [rows] = await pool.query(
        'SELECT id FROM usuarios WHERE correo = ?', 
        [correo]
    );
    return rows.length > 0 ? rows[0] : null;
}

// Marcar/desmarcar suscripción para un usuario por correo
async function setSuscritoByCorreo(correo, valor) {
    const [result] = await pool.query(
        'UPDATE usuarios SET suscrito = ? WHERE correo = ?',
        [valor ? 1 : 0, correo]
    );
    return result.affectedRows;
}

// Insertar nuevo usuario (con contraseña ya hasheada)
async function createUser(nombre, correo, contraseñaHash, pais, tipo = 'cliente') {
    const [result] = await pool.query(
        'INSERT INTO usuarios (nombre, correo, passwd, tipo, pais) VALUES (?, ?, ?, ?, ?)',
        [nombre, correo, contraseñaHash, tipo, pais]
    );
    return result.insertId;
}

// Obtener usuario completo para login (incluye intentos y bloqueo)
async function getUserForLogin(nombre) {
    const [rows] = await pool.query(
        'SELECT id, nombre, correo, passwd, tipo, intentos_fallidos, bloqueo_hasta FROM usuarios WHERE nombre = ? LIMIT 1',
        [nombre]
    );
    return rows.length > 0 ? rows[0] : null;
}

// Actualizar la contraseña del usuario
async function updatePassword(userId, newPasswordHash) {
    const [result] = await pool.query(
        'UPDATE usuarios SET passwd = ?, intentos_fallidos = 0, bloqueo_hasta = NULL WHERE id = ?',
        [newPasswordHash, userId]
    );
    return result.affectedRows;
}

// Registrar un intento fallido y gestionar bloqueo
async function incrementLoginAttempts(nombre) {
    const [rows] = await pool.query(
        'SELECT id, intentos_fallidos, bloqueo_hasta FROM usuarios WHERE nombre = ?',
        [nombre]
    );

    if (rows.length === 0) return;
    
    const user = rows[0];
    let newAttempts = (user.intentos_fallidos || 0) + 1;
    let lockoutUntil = user.bloqueo_hasta;
    let now = Date.now();

    if (user.bloqueo_hasta && new Date(user.bloqueo_hasta).getTime() > now) {
        return; 
    }

    if (newAttempts >= MAX_ATTEMPTS) {
        lockoutUntil = new Date(now + LOCKOUT_TIME_MS);
        newAttempts = 0; 
    } else {
        lockoutUntil = null; 
    }

    await pool.query(
        'UPDATE usuarios SET intentos_fallidos = ?, bloqueo_hasta = ? WHERE id = ?',
        [newAttempts, lockoutUntil, user.id]
    );
}

// Restablecer intentos al iniciar sesión correctamente
async function resetLoginAttempts(nombre) {
    await pool.query(
        'UPDATE usuarios SET intentos_fallidos = 0, bloqueo_hasta = NULL WHERE nombre = ?',
        [nombre]
    );
}

// Métodos CRUD (Asumiendo que existen para ser usados por users.Controller.js)
async function getAllUsers() {
    const [rows] = await pool.query('SELECT id, nombre, correo, tipo, pais, suscrito FROM usuarios');
    return rows;
}

async function getUserById(id) {
    const [rows] = await pool.query('SELECT id, nombre, correo, tipo, pais, suscrito FROM usuarios WHERE id = ?', [id]);
    return rows.length > 0 ? rows[0] : null;
}

async function updateUserDetails(id, nombre, correo, pais) {
    const [result] = await pool.query(
        'UPDATE usuarios SET nombre = ?, correo = ?, pais = ? WHERE id = ?',
        [nombre, correo, pais, id]
    );
    return result.affectedRows;
}

async function deleteUser(id) {
    const [result] = await pool.query(
        'DELETE FROM usuarios WHERE id = ?',
        [id]
    );
    return result.affectedRows;
}


module.exports = {
    getUserByCorreo,
    setSuscritoByCorreo,
    createUser,
    getUserForLogin,
    updatePassword,
    incrementLoginAttempts,
    resetLoginAttempts,
    getAllUsers,
    getUserById,
    updateUserDetails,
    deleteUser
};
