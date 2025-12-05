const ProductModel = require('../models/ProductModel');
const { cloudinary, extractPublicId, deleteImage } = require('../utils/cloudinary'); 
// POST /api/admin/newProduct - Crear producto
exports.createProduct = async (req, res) => {
    try {
        const { nombre, precio, descripcion, categoria, stockIn } = req.body;

        if (!nombre || !precio || !descripcion || !categoria || !stockIn) {
            return res.status(400).json({ mensaje: 'Faltan datos obligatorios' });
        }

        const existente = await ProductModel.getProductByName(nombre);
        if (existente) {
            return res.status(409).json({ 
                mensaje: 'Ya existe un producto con el mismo nombre',
                id_insertado: null 
            });
        }

        const id_insertado = await ProductModel.createProd(nombre, precio, descripcion, categoria, stockIn);
        
        res.status(201).json({ 
            mensaje: 'Producto registrado', 
            id_insertado 
        });

    } catch (error) {
        console.error('Error al dar de alta el producto:', error);
        res.status(500).json({ mensaje: 'Error al dar de alta el producto' });
    }
};

// POST /api/admin/newProduct/uploadImages - Subir imágenes (IMPLEMENTACIÓN)
exports.upImages = async (req, res) => {
    try {
        const { id_producto } = req.body;
        const files = req.files; // Archivos subidos por multer.memoryStorage

        if (!id_producto || !files || files.length === 0) {
            return res.status(400).json({ mensaje: 'ID de producto e imágenes son requeridos' });
        }

        // 1. Convertir buffers a Data URI y subir a Cloudinary
        const uploadPromises = files.map(file => {
            const b64 = Buffer.from(file.buffer).toString("base64");
            let dataURI = "data:" + file.mimetype + ";base64," + b64;

            // Carpeta en Cloudinary: novaHogar/productos/[id_producto]
            return cloudinary.uploader.upload(dataURI, {
                folder: `novaHogar/productos/${id_producto}`
            });
        });

        const uploadResults = await Promise.all(uploadPromises);
        const urlPrincipal = uploadResults[0].secure_url; // El primero es la imagen principal
        const urlsAdicionales = uploadResults.slice(1).map(r => r.secure_url).join(';');

        // 2. Actualizar las URLs en la base de datos
        await ProductModel.updateProductImages(id_producto, urlPrincipal, urlsAdicionales);

        res.json({
            mensaje: `Imágenes subidas y registradas. Principal: ${urlPrincipal}`,
            urlPrincipal,
            success: true
        });

    } catch (error) {
        console.error('Error al subir imágenes:', error);
        res.status(500).json({ mensaje: 'Error al subir las imágenes a Cloudinary' });
    }
};

// PUT /api/admin/product/:id - Actualizar producto
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, precio, descripcion, categoria, stockIN } = req.body;

        if (!nombre || !precio || !descripcion || !categoria || stockIN === undefined) {
            return res.status(400).json({ mensaje: 'Faltan datos obligatorios' });
        }

        const producto = await ProductModel.getProductById(id);
        if (!producto) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }

        const affectedRows = await ProductModel.updateProduct(id, nombre, precio, descripcion, categoria, stockIN);

        if (affectedRows === 0) {
            return res.status(404).json({ mensaje: 'No se pudo actualizar el producto' });
        }

        res.json({ 
            mensaje: 'Producto actualizado correctamente',
            success: true
        });

    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ mensaje: 'Error al actualizar el producto' });
    }
};

// DELETE /api/admin/product/:id - Eliminar producto (CON ELIMINACIÓN DE IMAGEN)
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Obtener la imagen principal para eliminarla de Cloudinary
        const producto = await ProductModel.getProductById(id);
        if (producto && producto.url_imagen_principal) {
            const publicId = extractPublicId(producto.url_imagen_principal);
            if (publicId) {
                // No hace falta esperar/abortar si falla la eliminación en Cloudinary
                await deleteImage(publicId).catch(err => console.error(`Fallo la eliminación de imagen ${publicId}:`, err.message));
            }
        }

        // 2. Eliminar de la base de datos
        const affectedRows = await ProductModel.deleteProduct(id);

        if (affectedRows === 0) {
            return res.status(404).json({ mensaje: 'No se pudo eliminar' });
        }

        res.json({
            mensaje: 'Producto eliminado',
            success: true
        });

    } catch (error) {
        console.error('Error eliminando producto:', error);
        res.status(500).json({ mensaje: 'Error al eliminar' });
    }
};

// PUT /api/admin/product/:id/stock - Actualizar stock
exports.updateStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { stockIN } = req.body;

        if (stockIN === undefined || stockIN < 0) {
            return res.status(400).json({ mensaje: 'Stock inválido' });
        }

        const producto = await ProductModel.getProductById(id);
        if (!producto) {
            return res.status(404).json({ mensaje: 'Producto no encontrado' });
        }

        // Actualizar usando la función de update
        await ProductModel.updateProduct(
            id, 
            producto.nombre, 
            producto.precio, 
            producto.descripcion, 
            producto.cat, 
            stockIN
        );

        res.json({ 
            mensaje: 'Stock actualizado correctamente',
            success: true
        });

    } catch (error) {
        console.error('Error al actualizar stock:', error);
        res.status(500).json({ mensaje: 'Error al actualizar el stock' });
    }
};