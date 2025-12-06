const CartModel = require('../models/CartModel');
const OrderModel = require('../models/OrderModel');
const ProductModel = require('../models/ProductModel');
const CouponModel = require('../models/CuponModel');
const UserModel = require('../models/UserModel');
const { generarNotaCompraPDF } = require('../utils/pdfGenerator');
const { enviarCorreoCompra } = require('../utils/emailService');
const pool = require('../db/conexion.js');

// POST /api/purchase/process - Procesar compra (MANTENER)
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
                return res.status(409).json({ 
                    error: `Stock insuficiente para "${item.nombre}"` 
                });
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
            mensaje: 'Compra procesada exitosamente',
            success: true,
            orderId: ordenId,
            datos: {
                ordenId,
                total: orderData.total,
                fecha: new Date().toISOString(),
                items: cartItems.length
            }
        });

    } catch (error) {
        console.error('Error al procesar compra:', error);
        res.status(500).json({ 
            error: 'Error al procesar la compra', 
            detalle: error.message 
        });
    }
};

// POST /api/purchase/finalize - Finalizar compra y enviar PDF
exports.finalizePurchase = async (req, res) => {
    const { orderId } = req.body;

    if (!orderId) {
        return res.status(400).json({ error: 'Falta el ID de la orden' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Verificar que la orden existe y pertenece al usuario
        const orden = await OrderModel.getOrderById(orderId);
        
        if (!orden) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ error: 'Orden no encontrada' });
        }

        if (orden.usuario_id !== req.userId) {
            await conn.rollback();
            conn.release();
            return res.status(403).json({ error: 'No tienes permiso para ver esta orden' });
        }

        // Actualizar estado de la orden a "completada"
        await conn.query(
            'UPDATE ordenes SET estado = "completada" WHERE id = ?',
            [orderId]
        );

        // Obtener usuario para el email
        const usuario = await UserModel.getUserById(orden.usuario_id);
        
        if (!usuario) {
            await conn.rollback();
            conn.release();
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Generar PDF
        const pdfBuffer = await generarNotaCompraPDF(orden);

        // Enviar email con PDF
        try {
            await enviarCorreoCompra(
                usuario.correo, 
                orden.nombre_cliente, 
                pdfBuffer, 
                orden.id,
                {
                    metodo_pago: orden.metodo_pago,
                    fecha_creacion: orden.fecha_orden || new Date().toISOString()
                }
            );

            await conn.commit();

            res.json({
                mensaje: 'Compra finalizada. Factura enviada a tu correo electrónico.',
                success: true,
                orderId: orden.id,
                email: usuario.correo,
                datosOrden: {
                    fecha: orden.fecha_orden,
                    total: orden.total,
                    estado: 'completada'
                }
            });

        } catch (mailErr) {
            console.error('Error enviando correo con PDF:', mailErr);
            
            // IMPORTANTE: Aún así completamos la orden
            await conn.commit();
            
            res.status(202).json({
                mensaje: 'Compra finalizada, pero no se pudo enviar el correo.',
                success: true,
                orderId: orden.id,
                advertencia: 'Guarda este número de orden: ' + orden.id,
                emailError: mailErr.message
            });
        }

    } catch (error) {
        if (conn) await conn.rollback();
        console.error('Error al finalizar compra:', error);
        res.status(500).json({ 
            error: 'Error al procesar la compra', 
            success: false 
        });
    } finally {
        if (conn) conn.release && conn.release();
    }
};

// GET /api/purchase/orders - Obtener órdenes del usuario
exports.getUserOrders = async (req, res) => {
    try {
        const userId = req.userId;
        
        const ordenes = await OrderModel.getOrdersByUserId(userId);
        
        // Formatear respuesta
        const ordenesFormateadas = ordenes.map(orden => ({
            id: orden.id,
            fecha: orden.fecha_orden,
            total: parseFloat(orden.total),
            estado: orden.estado || 'completada',
            metodo_pago: orden.metodo_pago,
            items: orden.total_items || 0,
            direccion: {
                calle: orden.direccion,
                ciudad: orden.ciudad,
                codigo_postal: orden.codigo_postal,
                pais: orden.pais
            }
        }));

        const summary = await OrderModel.getUserOrdersSummary(userId);

        res.json({
            success: true,
            total: ordenes.length,
            summary: {
                total_ordenes: summary.total_ordenes,
                total_gastado: parseFloat(summary.total_gastado) || 0,
                ultima_compra: summary.ultima_compra
            },
            ordenes: ordenesFormateadas
        });

    } catch (error) {
        console.error('Error obteniendo órdenes:', error);
        res.status(500).json({ 
            error: 'Error al obtener las órdenes',
            success: false 
        });
    }
};

// GET /api/purchase/orders/:id - Obtener detalles de una orden específica
exports.getOrderDetails = async (req, res) => {
    try {
        const userId = req.userId;
        const orderId = req.params.id;

        const orden = await OrderModel.getOrderById(orderId);
        
        if (!orden) {
            return res.status(404).json({ 
                error: 'Orden no encontrada',
                success: false 
            });
        }

        // Verificar que la orden pertenece al usuario
        if (orden.usuario_id !== userId) {
            return res.status(403).json({ 
                error: 'No tienes permiso para ver esta orden',
                success: false 
            });
        }

        // Formatear respuesta
        const ordenDetallada = {
            id: orden.id,
            fecha: orden.fecha_orden,
            cliente: {
                nombre: orden.nombre_cliente,
                telefono: orden.telefono,
                direccion: {
                    calle: orden.direccion,
                    ciudad: orden.ciudad,
                    codigo_postal: orden.codigo_postal,
                    pais: orden.pais
                }
            },
            pago: {
                metodo: orden.metodo_pago,
                subtotal: parseFloat(orden.subtotal),
                impuestos: parseFloat(orden.impuestos),
                envio: parseFloat(orden.gastos_envio),
                descuento: parseFloat(orden.cupon_descuento),
                total: parseFloat(orden.total)
            },
            estado: orden.estado || 'completada',
            cupon_usado: orden.cupon_id || null,
            items: orden.detalles.map(item => ({
                id: item.producto_id,
                nombre: item.nombre_producto,
                cantidad: item.cantidad,
                precio_unitario: parseFloat(item.precio_unitario),
                subtotal: parseFloat(item.subtotal),
                categoria: item.cat,
                imagen: item.url_imagen_principal
            }))
        };

        res.json({
            success: true,
            orden: ordenDetallada
        });

    } catch (error) {
        console.error('Error obteniendo detalles de orden:', error);
        res.status(500).json({ 
            error: 'Error al obtener los detalles de la orden',
            success: false 
        });
    }
};

// POST /api/purchase/send-invoice/:id - Reenviar factura por email
exports.resendInvoice = async (req, res) => {
    try {
        const userId = req.userId;
        const orderId = req.params.id;

        const orden = await OrderModel.getOrderById(orderId);
        
        if (!orden) {
            return res.status(404).json({ 
                error: 'Orden no encontrada',
                success: false 
            });
        }

        if (orden.usuario_id !== userId) {
            return res.status(403).json({ 
                error: 'No tienes permiso para esta orden',
                success: false 
            });
        }

        const usuario = await UserModel.getUserById(userId);
        const pdfBuffer = await generarNotaCompraPDF(orden);

        try {
            await enviarCorreoCompra(
                usuario.correo, 
                orden.nombre_cliente, 
                pdfBuffer, 
                orden.id,
                {
                    metodo_pago: orden.metodo_pago,
                    fecha_creacion: orden.fecha_orden
                }
            );

            res.json({
                success: true,
                mensaje: 'Factura reenviada a tu correo electrónico',
                email: usuario.correo
            });

        } catch (mailErr) {
            console.error('Error reenviando email:', mailErr);
            res.status(500).json({
                success: false,
                error: 'No se pudo reenviar la factura',
                detalle: mailErr.message
            });
        }

    } catch (error) {
        console.error('Error en resendInvoice:', error);
        res.status(500).json({ 
            error: 'Error al procesar la solicitud',
            success: false 
        });
    }
};
