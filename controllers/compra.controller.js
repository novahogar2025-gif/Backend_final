const CartModel = require('../models/CartModel');
const OrderModel = require('../models/OrderModel');
const ProductModel = require('../models/ProductModel');
const CouponModel = require('../models/CuponModel');
const UserModel = require('../models/UserModel');
const { generarNotaCompraPDF } = require('../utils/pdfGenerator');
const { enviarCorreoCompra } = require('../utils/emailService');
const pool = require('../db/conexion.js');

// Constantes de cálculo
const GASTOS_ENVIO = 150.00; // Asunción de un costo fijo
const IMPUESTOS_PORCENTAJE = 0.16; // 16% de IVA

// POST /api/purchase/process - Procesar compra (MANTENER)
exports.processPurchase = async (req, res) => {
    // Iniciar conexión y transacción
    const conn = await pool.getConnection();
    await conn.beginTransaction();

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
            await conn.rollback();
            return res.status(400).json({ error: 'Faltan datos obligatorios' });
        }

        const cartItems = await CartModel.getCartByUserId(userId);
        if (!cartItems || cartItems.length === 0) {
            await conn.rollback();
            return res.status(400).json({ error: 'El carrito está vacío' });
        }

        // 1. Verificar stock (dentro de la transacción para atomizar)
        for (const item of cartItems) {
            const disponible = await ProductModel.checkAvailability(item.producto_id);
            if (disponible < item.cantidad) {
                await conn.rollback();
                return res.status(400).json({ error: `Stock insuficiente para ${item.nombre}. Disponible: ${disponible}` });
            }
        }
        
        // 2. Manejo de Cupón
        let cupon = null;
        let descuento_porcentaje = 0;
        let cupon_id = null;

        if (codigo_cupon) {
            cupon = await CouponModel.validateCoupon(codigo_cupon);
            if (!cupon) {
                await conn.rollback();
                return res.status(400).json({ error: 'Cupón inválido o expirado' });
            }
            descuento_porcentaje = cupon.descuento_porcentaje;
            cupon_id = cupon.id;
        }

        // 3. Calcular totales (MEJORADO)
        let subtotal = cartItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
        let impuestos = subtotal * IMPUESTOS_PORCENTAJE;
        
        // Lógica de envío gratis
        let costo_envio_final = GASTOS_ENVIO;
        if (subtotal >= 2000) {
            costo_envio_final = 0; // Envío gratis
        }

        let totalAntesDescuento = subtotal + costo_envio_final + impuestos;
        
        let cupon_descuento_monto = 0;
        if (descuento_porcentaje > 0) {
            cupon_descuento_monto = totalAntesDescuento * (descuento_porcentaje / 100);
        }
        
        let total = totalAntesDescuento - cupon_descuento_monto;
        
        // 4. Crear la Orden (usando la conexión de la transacción)
        const orderData = {
            usuario_id: userId,
            nombre_cliente,
            direccion,
            ciudad,
            codigo_postal,
            telefono,
            pais,
            metodo_pago,
            subtotal,
            impuestos: impuestos.toFixed(2),
            gastos_envio: costo_envio_final.toFixed(2),
            cupon_descuento: cupon_descuento_monto.toFixed(2),
            total: total.toFixed(2),
            cupon_id // Puede ser null
        };
        const ordenId = await OrderModel.createOrder(conn, orderData);
        
        // 5. Agregar Detalles de la Orden (usando la conexión)
        await OrderModel.addOrderDetails(conn, ordenId, cartItems);
        
        // 6. Actualizar stock y registrar ventas (usando la conexión)
        for (const item of cartItems) {
            // Actualizar stock de producto (restar cantidad)
            await ProductModel.updateStock(conn, item.producto_id, -item.cantidad); 
            
            // Registrar en tabla de ventas para reportes
            await OrderModel.addSaleRecord(conn, ordenId, item);
        }

        // 7. Marcar cupón como usado (usando la conexión)
        if (cupon_id) {
            await CouponModel.markCouponAsUsed(cupon_id);
        }

        // 8. Vaciar carrito (usando la conexión)
        await CartModel.clearCart(conn, userId);
        
        // 9. Confirmar la transacción
        await conn.commit();
        
        // Retornar solo ID de orden (el envío de email se hace en otro endpoint)
        res.status(201).json({ 
            success: true,
            mensaje: 'Compra procesada. Finaliza para recibir tu factura.',
            ordenId
        });

    } catch (error) {
        // 10. Revertir la transacción en caso de error
        await conn.rollback();
        console.error('❌ Error crítico en processPurchase (Transaction Rollback):', error);
        res.status(500).json({ error: 'Error al procesar la compra', detalle: error.message });

    } finally {
        // 11. Liberar la conexión
        if (conn) conn.release();
    }
};

// POST /api/purchase/finalize - Finalizar compra (enviar PDF por correo)
exports.finalizePurchase = async (req, res) => {
    try {
        const userId = req.userId;
        const { ordenId } = req.body;

        if (!ordenId) {
            return res.status(400).json({ error: 'ID de orden requerido', success: false });
        }

        // Obtener la orden completa (con sus detalles)
        const orden = await OrderModel.getOrderById(ordenId); 

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
        
        // 1. Obtener datos del usuario para el correo
        const usuario = await UserModel.getUserById(userId);
        if (!usuario) {
             return res.status(404).json({ 
                error: 'No se encontró el usuario para enviar el correo',
                success: false 
            });
        }

        // 2. Generar el PDF
        const pdfBuffer = await generarNotaCompraPDF(orden);

        // 3. Enviar correo con el PDF adjunto
        await enviarCorreoCompra(
            usuario.correo, 
            orden.nombre_cliente, 
            pdfBuffer, 
            ordenId,
            {
                metodo_pago: orden.metodo_pago,
                fecha_creacion: orden.fecha_orden
            }
        );

        res.json({
            success: true,
            mensaje: 'Compra finalizada con éxito. Se envió factura por correo electrónico.',
            email: usuario.correo
        });

    } catch (error) {
        console.error('Error en finalizePurchase:', error);
        res.status(500).json({ 
            error: 'Error al finalizar la compra y enviar factura',
            detalle: error.message
        });
    }
};

// GET /api/purchase/orders - Obtener órdenes del usuario
exports.getUserOrders = async (req, res) => {
    try {
        const userId = req.userId;
        const orders = await OrderModel.getOrdersByUserId(userId);
        res.json({ success: true, orders });
    } catch (error) {
        console.error('Error en getUserOrders:', error);
        res.status(500).json({ error: 'Error al obtener órdenes' });
    }
};

// GET /api/purchase/orders/:id - Obtener detalles de una orden específica
exports.getOrderDetails = async (req, res) => {
    try {
        const userId = req.userId;
        const ordenId = req.params.id;

        const orden = await OrderModel.getOrderById(ordenId);

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

        res.json({ success: true, orden });
    } catch (error) {
        console.error('Error en getOrderDetails:', error);
        res.status(500).json({ error: 'Error al obtener detalles de la orden' });
    }
};

// POST /api/purchase/send-invoice/:id - Reenviar factura por email
exports.resendInvoice = async (req, res) => {
    try {
        const userId = req.userId;
        const ordenId = req.params.id;

        const orden = await OrderModel.getOrderById(ordenId);

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
            error: 'Error al procesar la solicitud de reenvío',
            detalle: error.message
        });
    }
};

