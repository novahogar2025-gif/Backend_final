// controllers/compra.controller.js (MODIFICADO)
const CartModel = require('../models/CartModel');
const OrderModel = require('../models/OrderModel');
const ProductModel = require('../models/ProductModel');
const CouponModel = require('../models/CuponModel');
const UserModel = require('../models/UserModel');
const { generarNotaCompraPDF } = require('../utils/pdfGenerator');
const { enviarCorreoCompra } = require('../utils/emailService');

// POST /api/purchase/process - Procesar compra
exports.processPurchase = async (req, res) => {
    try {
        const userId = req.userId;
        const {
            nombre_cliente,
            direccion,
            ciudad,
            codigo_postal,
            telefono,
            pais,
            metodo_pago,
            codigo_cupon
        } = req.body;

        // Validar datos obligatorios
        if (!nombre_cliente || !direccion || !ciudad || !codigo_postal || !telefono || !pais || !metodo_pago) {
            return res.status(400).json({ error: 'Faltan datos obligatorios' });
        }

        // Obtener carrito
        const cartItems = await CartModel.getCartByUserId(userId);

        if (cartItems.length === 0) {
            return res.status(400).json({ error: 'El carrito está vacío' });
        }

        // Verificar stock de todos los productos
        let hayStock = true;
        for (const item of cartItems) {
            const disponible = await ProductModel.checkAvailability(item.producto_id, item.cantidad);
            if (!disponible) {
                hayStock = false;
                break;
            }
        }

        if (!hayStock) {
            return res.status(409).json({ error: 'Stock insuficiente para uno o más productos' });
        }

        // Calcular totales
        let subtotal = cartItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
        let cupon_descuento = 0;
        const gastos_envio = 150.00; // Valor fijo, podría ser variable de entorno
        const impuestos_tasa = 0.16; // 16% de IVA

        // Aplicar cupón si existe
        if (codigo_cupon) {
            const cupon = await CouponModel.validateCoupon(codigo_cupon);
            if (cupon && cupon.descuento_porcentaje) {
                cupon_descuento = subtotal * (cupon.descuento_porcentaje / 100);
            }
        }
        
        let subtotal_despues_cupon = subtotal - cupon_descuento;
        if (subtotal_despues_cupon < 0) subtotal_despues_cupon = 0;

        // El IVA se calcula sobre el subtotal después del cupón
        const impuestos = subtotal_despues_cupon * impuestos_tasa;

        // El total incluye el subtotal (después de cupón), impuestos y envío
        const total = subtotal_despues_cupon + impuestos + gastos_envio;

        // Preparar datos de la orden
        const orderData = {
            usuario_id: userId,
            nombre_cliente,
            direccion,
            ciudad,
            codigo_postal,
            telefono,
            pais,
            metodo_pago,
            subtotal: subtotal.toFixed(2),
            impuestos: impuestos.toFixed(2),
            gastos_envio: gastos_envio.toFixed(2),
            cupon_descuento: cupon_descuento.toFixed(2),
            total: total.toFixed(2)
        };
        
        // Guardar orden y obtener ID
        const ordenId = await OrderModel.createOrder(orderData);

        // Guardar detalles de la orden
        await OrderModel.addOrderDetails(ordenId, cartItems);

        // Actualizar stock y registrar ventas (asumiendo que las ventas se registran por detalle para estadísticas)
        for (const item of cartItems) {
            await ProductModel.updateStock(item.producto_id, item.cantidad);
            // Asumiendo que el modelo de producto tiene el campo 'cat' (categoría)
            const productoInfo = await ProductModel.getProductById(item.producto_id); 
            if (productoInfo) {
                await OrderModel.registerSale(ordenId, productoInfo.cat, item.subtotal);
            }
        }

        // Desactivar cupón si fue usado (asumiendo cupones de un solo uso o que se desactiven al final)
        if (codigo_cupon && cupon_descuento > 0) {
            await CouponModel.deactivateCoupon(codigo_cupon);
        }

        // Vaciar carrito
        await CartModel.clearCart(userId);

        // Devolver el ID de la orden. La finalización (email/PDF) se hace en /finalize
        res.json({
            mensaje: 'Proceso de compra exitoso. Orden creada.',
            success: true,
            orderId: ordenId
        });

    } catch (error) {
        console.error('Error al procesar compra:', error);
        res.status(500).json({ error: 'Error al procesar la compra', detail: String(error) });
    }
};

// POST /api/purchase/finalize - Finalizar compra (USO DE TRANSACCIONES)
exports.finalizePurchase = async (req, res) => {
    const {
        orden, // Datos de la orden (incluye cupon_id, subtotal, total, etc.)
        cartItems // El carrito, validado previamente en processPurchase
    } = req.body;

    // Validar datos mínimos y token
    if (!orden || !cartItems || cartItems.length === 0 || orden.usuario_id !== req.userId) {
        return res.status(400).json({ error: 'Datos de orden o carrito inválidos' });
    }

    let conn; // Variable para almacenar la conexión de la transacción
    try {
        // 1. Obtener una conexión del pool e iniciar la transacción
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const usuario = await UserModel.getUserById(orden.usuario_id);

        // 2. Crear la orden principal (pasando la conexión y el cupon_id)
        const orderData = { ...orden, cupon_id: orden.cupon_id || null };
        const ordenId = await OrderModel.createOrder(conn, orderData);

        // 3. Crear los detalles de la orden (pasando la conexión)
        await OrderModel.addOrderDetails(conn, ordenId, cartItems);

        // NOTA: El TRIGGER de la DB (`trg_actualizar_stock_orden`) se ejecuta aquí
        // y resta el stock de los productos. Si el stock es insuficiente,
        // el TRIGGER lanzará un error y forzará el ROLLBACK de la transacción.

        // 4. Registrar la venta por categoría (para estadísticas, pasando la conexión)
        for (const item of cartItems) {
            // Se asume que `item` ahora incluye `cat` (categoría)
            await OrderModel.registerSale(conn, ordenId, item.cat || 'General', item.subtotal);
        }

        // 5. Desactivar cupón (si se usó, por su ID)
        if (orden.cupon_id) {
            await CouponModel.markCouponAsUsed(orden.cupon_id);
        }

        // 6. Vaciar el carrito del usuario (pasando la conexión)
        await CartModel.clearCart(conn, orden.usuario_id);

        // 7. Si todo es exitoso, CONFIRMAR la transacción
        await conn.commit();

        // 8. Recuperar la orden finalizada (para el PDF)
        const ordenFinalizada = await OrderModel.getOrderById(ordenId);
        if (!ordenFinalizada) {
            console.error(`ERROR CRÍTICO: Orden ${ordenId} no encontrada después de COMMIT.`);
            throw new Error('No se pudo recuperar la orden.');
        }

        // 9. Generar PDF y enviar correo (se ejecuta fuera de la transacción)
        const pdfBuffer = await generarNotaCompraPDF(ordenFinalizada);

        let info = null;
        try {
            info = await enviarCorreoCompra(usuario.correo, ordenFinalizada.nombre_cliente, pdfBuffer, ordenFinalizada.id);
        } catch (mailErr) {
            // La compra se registró, pero el correo falló. Devolver éxito con advertencia.
            console.error('Error enviando correo con PDF (la compra está registrada):', mailErr);
            return res.status(202).json({
                mensaje: 'Compra finalizada con éxito, pero falló el envío del correo de confirmación.',
                success: true,
                mailError: String(mailErr)
            });
        }

        return res.json({
            mensaje: 'Compra finalizada. La nota se envió a tu correo electrónico.',
            success: true,
            mailInfo: {
                messageId: info && info.messageId,
                accepted: info && info.accepted,
                rejected: info && info.rejected
            }
        });

    } catch (error) {
        // Si hay un error, deshacer todos los cambios
        if (conn) {
            try {
                await conn.rollback();
            } catch (rbErr) {
                console.error('Error haciendo ROLLBACK:', rbErr);
            }
        }

        console.error('Error al finalizar compra:', error);

        // Mensaje de error más descriptivo para el usuario (especialmente si es de stock)
        let userMessage = 'Error al procesar la compra. Intente nuevamente o contacte a soporte.';
        if (error.sqlState === '45000') {
            userMessage = 'Stock insuficiente en uno o más productos. El carrito ha sido restaurado.';
        }

        res.status(500).json({
            error: userMessage,
            success: false,
            // Solo exponer detalles en desarrollo/pruebas
            detail: process.env.NODE_ENV !== 'production' ? String(error) : undefined
        });
    } finally {
        // 10. Liberar la conexión
        if (conn) conn.release();
    }
};