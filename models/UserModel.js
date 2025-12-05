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
async function createUser(nombre, correo, contraseñaHash, pais) {
    const [result] = await pool.query(
        'INSERT INTO usuarios (nombre, correo, passwd, tipo, pais) VALUES (?, ?, ?, ?, ?)',
        [nombre, correo, contraseñaHash, "cliente", pais]
    );
    return result.insertId;
}

// Obtener usuario completo para login (AHORA INCLUYE campos de seguridad)
async function getUserForLogin(nombre) {
    const [rows] = await pool.query(
        // ⚠️ Incluimos intentos_fallidos y bloqueo_hasta
        'SELECT id, nombre, passwd, tipo, correo, intentos_fallidos, bloqueo_hasta FROM usuarios WHERE nombre = ?', 
        [nombre]
    );
    return rows.length > 0 ? rows[0] : null;
}

// Obtener usuario por ID (sin password)
async function getUserById(id) {
    const [rows] = await pool.query(
        'SELECT id, nombre, correo, tipo, pais FROM usuarios WHERE id = ?', 
        [id]
    );
    return rows.length > 0 ? rows[0] : null;
}

// Actualizar la contraseña de un usuario por id
async function updatePassword(id, contraseñaHash) {
    const [result] = await pool.query(
        'UPDATE usuarios SET passwd = ? WHERE id = ?',
        [contraseñaHash, id]
    );
    return result.affectedRows;
}

// =======================================================
// ✅ NUEVAS FUNCIONES PARA CONTROL DE INTENTOS DE LOGIN
// =======================================================

// Registrar un intento fallido y gestionar bloqueo
async function incrementLoginAttempts(nombre) {
    // 1. Obtener datos de login (incluyendo intentos y bloqueo)
    const [rows] = await pool.query(
        'SELECT id, intentos_fallidos, bloqueo_hasta FROM usuarios WHERE nombre = ?',
        [nombre]
    );

    if (rows.length === 0) return; // Usuario no existe
    
    const user = rows[0];
    let newAttempts = user.intentos_fallidos + 1;
    let lockoutUntil = user.bloqueo_hasta;
    let now = Date.now();

    // Si ya está bloqueado y el tiempo no ha expirado, no hacemos nada
    if (user.bloqueo_hasta && new Date(user.bloqueo_hasta).getTime() > now) {
        return; 
    }

    if (newAttempts >= MAX_ATTEMPTS) {
        // Bloquear al usuario y reiniciar intentos
        lockoutUntil = new Date(now + LOCKOUT_TIME_MS);
        newAttempts = 0; 
    } else {
        // Si no se bloquea, asegurar que el campo de bloqueo es NULL
        lockoutUntil = null; 
    }

    // 2. Actualizar la DB
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

// Exportar las funciones
module.exports = {
    getUserByCorreo,
    setSuscritoByCorreo,
    createUser,
    getUserForLogin,
    getUserById,
    updatePassword,
    // Exportaciones de seguridad
    incrementLoginAttempts,
    resetLoginAttempts,
};