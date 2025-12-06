const pool = require('../db/conexion');

// Crear nueva orden (MANTENER)
async function createOrder(conn, orderData) {
    const {
        usuario_id,
        nombre_cliente,
        direccion,
        ciudad,
        codigo_postal,
        telefono,
        pais,
        metodo_pago,
        subtotal,
        impuestos,
        gastos_envio,
        cupon_descuento,
        total,
        cupon_id
    } = orderData;

    const [result] = await conn.query(`
        INSERT INTO ordenes (
            usuario_id, nombre_cliente, direccion, ciudad, codigo_postal,
            telefono, pais, metodo_pago, subtotal, impuestos, gastos_envio,
            cupon_descuento, total, cupon_id, estado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completada')
    `, [
        usuario_id, nombre_cliente, direccion, ciudad, codigo_postal,
        telefono, pais, metodo_pago, subtotal, impuestos, gastos_envio,
        cupon_descuento, total, cupon_id
    ]);

    return result.insertId;
}

// Agregar detalles de la orden (MANTENER)
async function addOrderDetails(conn, ordenId, items) {
    const values = items.map(item => [
        ordenId,
        item.producto_id,
        item.nombre,
        item.cantidad,
        item.precio,
        item.subtotal
    ]);

    const [result] = await conn.query(`
        INSERT INTO detalles_orden (
            orden_id, producto_id, nombre_producto, cantidad, precio_unitario, subtotal
        ) VALUES ?
    `, [values]);

    return result.affectedRows;
}

// Registrar venta para estadísticas (MANTENER)
async function registerSale(conn, ordenId, categoria, monto) {
    const [result] = await conn.query(`
        INSERT INTO ventas (orden_id, categoria, monto) VALUES (?, ?, ?)
    `, [ordenId, categoria, monto]);

    return result.insertId;
}

// Obtener orden por ID con detalles (MANTENER)
async function getOrderById(ordenId) {
    const [orden] = await pool.query(`
        SELECT * FROM ordenes WHERE id = ?
    `, [ordenId]);

    if (orden.length === 0) return null;

    const [detalles] = await pool.query(`
        SELECT 
            d.id,
            d.producto_id,
            d.nombre_producto,
            d.cantidad,
            d.precio_unitario,
            d.subtotal,
            p.cat,
            p.url_imagen_principal
        FROM detalles_orden d
        LEFT JOIN productos p ON d.producto_id = p.id
        WHERE d.orden_id = ?
    `, [ordenId]);

    return {
        ...orden[0],
        detalles
    };
}

// Obtener detalles de orden (MANTENER)
async function getOrderDetails(ordenId) {
    const [detalles] = await pool.query(`
        SELECT 
            d.id,
            d.producto_id,
            d.nombre_producto,
            d.cantidad,
            d.precio_unitario,
            d.subtotal,
            p.cat,
            p.url_imagen_principal
        FROM detalles_orden d
        LEFT JOIN productos p ON d.producto_id = p.id
        WHERE d.orden_id = ?
    `, [ordenId]);

    return detalles;
}

// Obtener órdenes de un usuario (MEJORADA)
async function getOrdersByUserId(userId) {
    const [rows] = await pool.query(`
        SELECT 
            o.*,
            COUNT(d.id) as total_items,
            SUM(d.subtotal) as monto_total
        FROM ordenes o
        LEFT JOIN detalles_orden d ON o.id = d.orden_id
        WHERE o.usuario_id = ? 
        GROUP BY o.id
        ORDER BY o.fecha_orden DESC
    `, [userId]);
    
    return rows;
}

// Obtener orden con conexión específica (PARA TRANSACCIONES)
async function getOrderByIdWithConnection(conn, ordenId) {
    const [orden] = await conn.query(`
        SELECT * FROM ordenes WHERE id = ?
    `, [ordenId]);

    if (orden.length === 0) return null;

    const [detalles] = await conn.query(`
        SELECT 
            d.id,
            d.producto_id,
            d.nombre_producto,
            d.cantidad,
            d.precio_unitario,
            d.subtotal,
            p.cat
        FROM detalles_orden d
        LEFT JOIN productos p ON d.producto_id = p.id
        WHERE d.orden_id = ?
    `, [ordenId]);

    return {
        ...orden[0],
        detalles
    };
}

// NUEVA: Obtener resumen de órdenes para dashboard
async function getUserOrdersSummary(userId) {
    const [summary] = await pool.query(`
        SELECT 
            COUNT(*) as total_ordenes,
            SUM(total) as total_gastado,
            MAX(fecha_orden) as ultima_compra
        FROM ordenes 
        WHERE usuario_id = ?
    `, [userId]);
    
    return summary[0] || { total_ordenes: 0, total_gastado: 0, ultima_compra: null };
}

module.exports = {
    createOrder,
    addOrderDetails,
    registerSale,
    getOrderById,
    getOrdersByUserId,
    getOrderDetails,
    getOrderByIdWithConnection,
    getUserOrdersSummary
};
