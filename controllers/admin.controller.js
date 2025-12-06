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

// POST /api/admin/newProduct/uploadImages - Subir imágenes
exports.upImages = async (req, res) => {
    try {
        const { id_producto } = req.body;
        let files = req.files;

        if (!id_producto) {
            return res.status(400).json({ mensaje: 'ID de producto (id_producto) es requerido en el body' });
        }

        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            return res.status(500).json({ mensaje: 'Configuración de Cloudinary faltante en variables de entorno' });
        }

        if (!files || (Array.isArray(files) && files.length === 0)) {
            return res.status(400).json({ mensaje: 'Se requieren al menos una imagen (campo multipart/form-data: imagenes)' });
        }

        if (!Array.isArray(files)) files = [files];

        const uploadPromises = files.map(file => {
            const b64 = Buffer.from(file.buffer).toString("base64");
            let dataURI = "data:" + file.mimetype + ";base64," + b64;

            return cloudinary.uploader.upload(dataURI, {
                folder: `novaHogar/productos/${id_producto}`
            });
        });

        const uploadResults = await Promise.all(uploadPromises);
        const urlPrincipal = uploadResults[0] && uploadResults[0].secure_url ? uploadResults[0].secure_url : null;
        const adicionalArr = uploadResults.slice(1).map(r => r.secure_url).filter(Boolean);
        const urlsAdicionales = adicionalArr.length > 0 ? adicionalArr.join(';') : null;

        await ProductModel.updateProductImages(id_producto, urlPrincipal, urlsAdicionales);

        res.json({
            mensaje: `Imágenes subidas y registradas.`,
            urlPrincipal,
            urlsAdicionales,
            success: true
        });

    } catch (error) {
        console.error('Error al subir imágenes:', error);
        res.status(500).json({ mensaje: 'Error al subir las imágenes a Cloudinary', detail: String(error) });
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

        const producto = await ProductModel.getProductById(id);
        if (producto && producto.url_imagen_principal) {
            const publicId = extractPublicId(producto.url_imagen_principal);
            if (publicId) {
                await deleteImage(publicId).catch(err => console.error(`Fallo la eliminación de imagen ${publicId}:`, err.message));
            }
        }

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
