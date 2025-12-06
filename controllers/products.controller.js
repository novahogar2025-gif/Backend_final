// controllers/products.controller.js (VERSIÓN SIMPLIFICADA Y FUNCIONAL)
const ProductModel = require('../models/ProductModel'); 

// Función auxiliar mejorada
const mapProduct = (prod) => ({
    id: prod.id,
    nombre: prod.nombre,
    precio: prod.precio,
    descripcion: prod.descripcion,
    categoria: prod.cat,
    stock: prod.stockAC,
    url_imagen: prod.url_imagen_principal || null
});

// GET /api/products/:id/images - Obtener imágenes por producto
exports.getImagenesPorProducto = async (req, res) => {
    try {
        const idProducto = req.params.id;
        console.log('🔍 Solicitando imágenes para producto ID:', idProducto);
        
        // Usar el método específico para imágenes
        const imagenes = await ProductModel.getProductImagesById(idProducto);
        
        console.log('📸 Imágenes encontradas:', imagenes.length);
        
        // Si no hay imágenes, devolver array vacío
        if (imagenes.length === 0) {
            console.log('⚠️ No se encontraron imágenes para el producto', idProducto);
            return res.json([]);
        }
        
        // Asegurar que las URLs sean válidas
        const imagenesProcesadas = imagenes.map(img => ({
            ...img,
            url: img.url ? (img.url.startsWith('http') ? img.url : `https://${img.url}`) : null
        }));
        
        res.json(imagenesProcesadas);

    } catch (error) {
        console.error("❌ Error en getImagenesPorProducto:", error);
        res.status(500).json({ 
            error: "Error al obtener imágenes del producto",
            detalle: error.message 
        });
    }
};

// GET /api/products/salas - Obtener productos de Salas
exports.getProductosSalas = async (req, res) => {
    try {
        const productos = await ProductModel.getProductosSalas();
        const respuesta = productos.map(mapProduct);
        res.json(respuesta);
    } catch (error) {
        console.error("❌ Error en getProductosSalas:", error);
        res.status(500).json({ mensaje: "Error al obtener salas" });
    }
};

// GET /api/products/dormitorios - Obtener productos de Dormitorios
exports.getProductosDormi = async (req, res) => {
    try {
        const productos = await ProductModel.getProductosDormi();
        const respuesta = productos.map(mapProduct);
        res.json(respuesta);
    } catch (error) {
        console.error("❌ Error en getProductosDormi:", error);
        res.status(500).json({ mensaje: "Error al obtener dormitorios" });
    }
};

// GET /api/products/comedores - Obtener productos de Comedores
exports.getProductosCome = async (req, res) => {
    try {
        const productos = await ProductModel.getProductosCome();
        const respuesta = productos.map(mapProduct);
        res.json(respuesta);
    } catch (error) {
        console.error("❌ Error en getProductosCome:", error);
        res.status(500).json({ mensaje: "Error al obtener comedores" });
    }
};

// GET /api/products/producto/:prod - Obtener un producto por ID
exports.getProduct = async (req, res) => {
    try {
        const id = req.params.prod;
        console.log('🔍 Obteniendo producto ID:', id);
        
        const producto = await ProductModel.getProductById(id);

        if (!producto) {
            console.log('⚠️ Producto no encontrado:', id);
            return res.status(404).json({ 
                mensaje: "Producto no encontrado",
                id: id 
            });
        }

        console.log('✅ Producto encontrado:', producto.nombre);
        
        // Formatear el producto con la imagen
        const productoFormateado = {
            ...mapProduct(producto),
            precio_formateado: `$${Number(producto.precio || 0).toFixed(2)}`,
            categoria_formateada: (producto.cat || '').toUpperCase(),
            disponible: (producto.stockAC || 0) > 0
        };
        
        res.json(productoFormateado);
        
    } catch (error) {
        console.error("❌ Error en getProduct:", error);
        res.status(500).json({ 
            mensaje: "Error al obtener el producto",
            error: error.message
        });
    }
};

// GET /api/products/all - Obtener todos los productos
exports.getAllProducts = async (req, res) => {
    try {
        const productos = await ProductModel.getAllProducts();
        const respuesta = productos.map(mapProduct);
        
        res.json({
            total: respuesta.length,
            productos: respuesta
        });

    } catch (error) {
        console.error("❌ Error en getAllProducts:", error);
        res.status(500).json({ mensaje: "Error al obtener todos los productos" });
    }
};

// GET /api/products/categoria/:categoria - Nuevo endpoint para categorías dinámicas
exports.getProductsByCategory = async (req, res) => {
    try {
        const categoria = req.params.categoria;
        const productos = await ProductModel.getProductsByCategory(categoria);
        const respuesta = productos.map(mapProduct);
        
        res.json({
            categoria: categoria,
            total: respuesta.length,
            productos: respuesta
        });
    } catch (error) {
        console.error("❌ Error en getProductsByCategory:", error);
        res.status(500).json({ 
            mensaje: "Error al obtener productos por categoría",
            error: error.message 
        });
    }
};

// GET /api/products/buscar/:termino - Nuevo endpoint para búsqueda
exports.searchProducts = async (req, res) => {
    try {
        const termino = req.params.termino;
        const productos = await ProductModel.searchProducts(termino);
        const respuesta = productos.map(mapProduct);
        
        res.json({
            termino: termino,
            total: respuesta.length,
            productos: respuesta
        });
    } catch (error) {
        console.error("❌ Error en searchProducts:", error);
        res.status(500).json({ 
            mensaje: "Error al buscar productos",
            error: error.message 
        });
    }
};
