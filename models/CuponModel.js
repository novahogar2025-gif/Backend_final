const pool = require('../db/conexion');

// Validar cupón
async function validateCoupon(codigo) {
    const [rows] = await pool.query(`
        SELECT id, codigo, descuento_porcentaje, activo
        FROM cupones
        WHERE codigo = ? AND activo = TRUE
    `, [codigo]);

    return rows.length > 0 ? rows[0] : null;
}

// Crear nuevo cupón
async function createCoupon(codigo, descuento) {
    const [result] = await pool.query(`
        INSERT INTO cupones (codigo, descuento_porcentaje, activo)
        VALUES (?, ?, TRUE)
    `, [codigo, descuento]);

    return result.insertId;
}
// NUEVA FUNCIÓN: Marcar cupón como usado (desactivándolo)
async function markCouponAsUsed(couponId) {
    const [result] = await pool.query(`
        UPDATE cupones SET activo = FALSE WHERE id = ?
    `, [couponId]);

    return result.affectedRows;
}

// Desactivar cupón (manteniendo por compatibilidad de la función original)
async function deactivateCoupon(codigo) {
    const [result] = await pool.query(`
        UPDATE cupones SET activo = FALSE WHERE codigo = ?
    `, [codigo]);

    return result.affectedRows;
}

// Eliminar cupón (uso único)
async function deleteCoupon(codigo) {
    const [result] = await pool.query(`
        DELETE FROM cupones WHERE codigo = ?
    `, [codigo]);

    return result.affectedRows;
}

// Obtener todos los cupones
async function getAllCoupons() {
    const [rows] = await pool.query('SELECT * FROM cupones');
    return rows;
}


module.exports = {
    validateCoupon,
    createCoupon,
    markCouponAsUsed, // Exportar nueva función
    deactivateCoupon,
    deleteCoupon,
    getAllCoupons
};
