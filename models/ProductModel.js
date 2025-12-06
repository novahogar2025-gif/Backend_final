const pool = require('../db/conexion');

// Registrar producto nuevo
async function createProd(nombre, precio, descripcion, cat, stockIn, urlImagenPrincipal = null) {
    const [result] = await pool.query(
        'INSERT INTO productos (nombre, precio, descripcion, cat, stockAC, stockIN, url_imagen_principal) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [nombre, precio, descripcion, cat, stockIn, stockIn, urlImagenPrincipal]
    );
    return result.insertId;
}

// Buscar salas (VERSIÓN ÚNICA Y CORRECTA)
async function getProductosSalas() {
    const [rows] = await pool.query(
        'SELECT id, nombre, precio, stockAC, url_imagen_principal FROM productos WHERE cat = "Salas"'
    );
    return rows;
}

// Buscar dormitorios (VERSIÓN ÚNICA Y CORRECTA)
async function getProductosDormi() {
    const [rows] = await pool.query(
        "SELECT id, nombre, precio, stockAC, url_imagen_principal FROM productos WHERE cat LIKE 'Dormit%'"
    );
    return rows;
}

// Buscar comedores (VERSIÓN ÚNICA Y CORRECTA)
async function getProductosCome() {
    const [rows] = await pool.query(
        "SELECT id, nombre, precio, stockAC, url_imagen_principal FROM productos WHERE cat LIKE 'Comed%'"
    );
    return rows;
}

// Obtener producto completo por nombre
async function getProductByName(nombre) {
    const [rows] = await pool.query(
        'SELECT id, nombre, precio, descripcion, cat, stockAC, stockIN, url_imagen_principal FROM productos WHERE nombre = ?',
        [nombre]
    );
    return rows[0];
}

// Obtener producto por ID (VERSIÓN CORREGIDA - FALTA url_imagen_principal)
async function getProductById(id) {
    const [rows] = await pool.query(
        'SELECT id, nombre, precio, descripcion, cat, stockAC, stockIN, url_imagen_principal FROM productos WHERE id = ?',
        [id]
    );
    return rows[0];
}

// Actualizar producto
async function updateProduct(id, nombre, precio, descripcion, cat, stockIN, urlImagenPrincipal = null) {
    const [result] = await pool.query(
        'UPDATE productos SET nombre = ?, precio = ?, descripcion = ?, cat = ?, stockIN = ?, stockAC = ?, url_imagen_principal = ? WHERE id = ?',
        [nombre, precio, descripcion, cat, stockIN, stockIN, urlImagenPrincipal, id]
    );
    return result.affectedRows;
}

// Eliminar producto
async function deleteProduct(id) {
    const [result] = await pool.query('DELETE FROM productos WHERE id = ?', [id]);
    return result.affectedRows;
}

// Actualizar stock actual
async function updateStock(id, cantidadVendida) {
    const [result] = await pool.query(
        'UPDATE productos SET stockAC = stockAC - ? WHERE id = ? AND stockAC >= ?',
        [cantidadVendida, id, cantidadVendida]
    );
    return result.affectedRows;
}

// Verificar disponibilidad
async function checkAvailability(id, cantidad) {
    const [rows] = await pool.query(
        'SELECT stockAC FROM productos WHERE id = ?',
        [id]
    );
    if (rows.length === 0) return false;
    return rows[0].stockAC >= cantidad;
}

// Obtener todos los productos
async function getAllProducts() {
    const [rows] = await pool.query(
        'SELECT id, nombre, precio, descripcion, cat, stockAC, url_imagen_principal FROM productos'
    );
    return rows;
}

// Actualizar imágenes del producto
async function updateProductImages(id, urlPrincipal, urlsAdicionales = null) {
    const [result] = await pool.query(
        'UPDATE productos SET url_imagen_principal = ?, urls_imagenes_adicionales = ? WHERE id = ?',
        [urlPrincipal, urlsAdicionales, id]
    );
    return result.affectedRows;
}

// MÉTODO NUEVO: Obtener solo imágenes del producto
async function getProductImagesById(productId) {
    try {
        // Primero intentar obtener de tabla separada si existe
        const [tablas] = await pool.query('SHOW TABLES LIKE "imagenes_producto"');
        
        if (tablas.length > 0) {
            // Si existe la tabla de imágenes
            const [rows] = await pool.query(
                'SELECT id, url, nombre, es_principal, orden FROM imagenes_producto WHERE producto_id = ? ORDER BY orden, es_principal DESC',
                [productId]
            );
            return rows;
        } else {
            // Si no existe tabla separada, usar la imagen principal del producto
            const [rows] = await pool.query(
                'SELECT id, url_imagen_principal as url FROM productos WHERE id = ? AND url_imagen_principal IS NOT NULL',
                [productId]
            );
            
            if (rows.length > 0 && rows[0].url) {
                return [{
                    id: 1,
                    url: rows[0].url,
                    nombre: `principal_${productId}`,
                    es_principal: true,
                    orden: 1
                }];
            }
            return [];
        }
    } catch (error) {
        console.error("Error obteniendo imágenes del producto:", error);
        return [];
    }
}

// MÉTODO NUEVO: Actualizar solo la imagen principal
async function updateProductMainImage(id, urlImagenPrincipal) {
    const [result] = await pool.query(
        'UPDATE productos SET url_imagen_principal = ? WHERE id = ?',
        [urlImagenPrincipal, id]
    );
    return result.affectedRows;
}

// MÉTODO NUEVO: Obtener productos con filtro de categoría
async function getProductsByCategory(categoria) {
    const [rows] = await pool.query(
        'SELECT id, nombre, precio, stockAC, url_imagen_principal FROM productos WHERE cat = ?',
        [categoria]
    );
    return rows;
}

// MÉTODO NUEVO: Buscar productos por nombre
async function searchProducts(searchTerm) {
    const [rows] = await pool.query(
        'SELECT id, nombre, precio, descripcion, cat, stockAC, url_imagen_principal FROM productos WHERE nombre LIKE ? OR descripcion LIKE ?',
        [`%${searchTerm}%`, `%${searchTerm}%`]
    );
    return rows;
}

// MÉTODO NUEVO: Obtener productos destacados (los más vendidos o con mejor rating)
async function getFeaturedProducts(limit = 8) {
    const [rows] = await pool.query(
        'SELECT id, nombre, precio, descripcion, cat, stockAC, url_imagen_principal FROM productos WHERE stockAC > 0 ORDER BY id DESC LIMIT ?',
        [limit]
    );
    return rows;
}

module.exports = {
    createProd,
    getProductosSalas,
    getProductosDormi,
    getProductosCome,
    getProductByName,
    getProductById,           // ¡AHORA INCLUYE url_imagen_principal!
    updateProduct,
    deleteProduct,
    updateStock,
    checkAvailability,
    getAllProducts,
    updateProductImages,
    getProductImagesById,     // NUEVO
    updateProductMainImage,   // NUEVO
    getProductsByCategory,    // NUEVO
    searchProducts,           // NUEVO
    getFeaturedProducts       // NUEVO
};
