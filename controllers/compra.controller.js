const CartModel = require('../models/CartModel');
const OrderModel = require('../models/OrderModel');
const ProductModel = require('../models/ProductModel');
const CouponModel = require('../models/CuponModel');
const UserModel = require('../models/UserModel');
const { generarNotaCompraPDF } = require('../utils/pdfGenerator');
const { enviarCorreoCompra } = require('../utils/emailService');
const pool = require('../db/conexion.js');

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

        if (!nombre_cliente || !direccion || !ciudad || !codigo_postal || !telefono || !pais || !metodo_pago) {
            return res.status(400).json({ error: 'Faltan datos obligatorios' });
        }

        const cartItems = await CartModel.getCartByUserId(userId);
        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({ error: 'El carrito está vacío' });
        }

        // Verificar stock
        for (const item of cartItems) {
            const disponible = await ProductModel.checkAvailability(item.producto_id, item.cantidad);
            if (!disponible) {
                return res.status(409).json({ error: 'Stock insuficiente para uno o más productos' });
            }
        }

        // Calcular totales
        let subtotal = cartItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
        let cupon_descuento = 0;
        const gastos_envio = 150.00;
        const impuestos_tasa = 0.16;

        if (codigo_cupon) {
            const cupon = await CouponModel.validateCoupon(codigo_cupon);
            if (cupon && cupon.descuento_porcentaje) {
                cupon_descuento = subtotal * (cupon.descuento_porcentaje / 100);
            }
        }

        let subtotal_despues_cupon = Math.max(subtotal - cupon_descuento, 0);
        const impuestos = subtotal_despues_cupon * impuestos_tasa;
        const total = subtotal_despues_cupon + impuestos + gastos_envio;

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
            total: total.toFixed(2),
            cupon_id: codigo_cupon || null
        };

        const ordenId = await OrderModel.createOrder(pool, orderData);
        await OrderModel.addOrderDetails(pool, ordenId, cartItems);

        for (const item of cartItems) {
            await ProductModel.updateStock(item.producto_id, item.cantidad);
            const productoInfo = await ProductModel.getProductById(item.producto_id);
            if (productoInfo) {
                await OrderModel.registerSale(pool, ordenId, productoInfo.cat, item.subtotal);
            }
        }

        if (codigo_cupon && cupon_descuento > 0) {
            await CouponModel.deactivateCoupon(codigo_cupon);
        }

        await CartModel.clearCart(pool, userId);

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

// POST /api/purchase/finalize - Finalizar compra
exports.finalizePurchase = async (req, res) => {
    const { orderId } = req.body;

    if (!orderId) {
        return res.status(400).json({ error: 'Falta el ID de la orden' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const orden = await OrderModel.getOrderById(orderId);
        const cartItems = await OrderModel.getOrderDetails(orderId);

        if (!orden || !cartItems || cartItems.length === 0 || orden.usuario_id !== req.userId) {
            return res.status(400).json({ error: 'Orden inválida o carrito vacío' });
        }

        for (const item of cartItems) {
            await OrderModel.registerSale(conn, orderId, item.cat || 'General', item.subtotal);
        }

        if (orden.cupon_id) {
            await CouponModel.markCouponAsUsed(orden.cupon_id);
        }

        await CartModel.clearCart(conn, orden.usuario_id);
        await conn.commit();

        const pdfBuffer = await generarNotaCompraPDF(orden);
        const usuario = await UserModel.getUserById(orden.usuario_id);

        try {
            const info = await enviarCorreoCompra(usuario.correo, orden.nombre_cliente, pdfBuffer, orden.id);
            return res.json({
                mensaje: 'Compra finalizada. La nota se envió a tu correo electrónico.',
                success: true,
                mailInfo: {
                    messageId: info && info.messageId,
                    accepted: info && info.accepted,
                    rejected: info && info.rejected
                }
            });
        } catch (mailErr) {
            console.error('Error enviando correo con PDF:', mailErr);
            return res.status(202).json({
                mensaje: 'Compra finalizada con éxito, pero falló el envío del correo.',
                success: true,
                mailError: String(mailErr)
            });
        }

    } catch (error) {
        if (conn) await conn.rollback();
        console.error('Error al finalizar compra:', error);
        res.status(500).json({ error: 'Error al procesar la compra', success: false });
    } finally {
        if (conn) conn.release();
    }
};
