const CartModel = require('../models/CartModel');
const OrderModel = require('../models/OrderModel');
const ProductModel = require('../models/ProductModel');
const CouponModel = require('../models/CuponModel');
const UserModel = require('../models/UserModel');
const { generarNotaCompraPDF } = require('../utils/pdfGenerator');
const { enviarCorreoCompra } = require('../utils/emailService');
const pool = require('../db/conexion.js');

// NUEVO: Función para eliminar orden completa
async function eliminarOrdenCompleta(conn, orderId) {
    try {
        // 1. Eliminar detalles de la orden
        await conn.query('DELETE FROM detalles_orden WHERE orden_id = ?', [orderId]);
        
        // 2. Eliminar ventas asociadas (si existen)
        try {
            await conn.query('DELETE FROM ventas WHERE orden_id = ?', [orderId]);
        } catch (error) {
            console.log('⚠️ Tabla ventas no existe o error:', error.message);
        }
        
        // 3. Eliminar la orden principal
        const [result] = await conn.query('DELETE FROM ordenes WHERE id = ?', [orderId]);
        
        return result.affectedRows > 0;
    } catch (error) {
        console.error('❌ Error eliminando orden:', error);
        throw error;
    }
}

// POST /api/purchase/complete - COMPRETA TODO EN UN SOLO PASO
exports.completePurchase = async (req, res) => {
    let conn;
    
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

        // Validación de datos
        if (!nombre_cliente || !direccion || !ciudad || !codigo_postal || !telefono || !pais || !metodo_pago) {
            return res.status(400).json({ 
                error: 'Faltan datos obligatorios para la compra' 
            });
        }

        // Obtener conexión y comenzar transacción
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Obtener carrito del usuario
        const cartItems = await CartModel.getCartByUserId(userId);
        if (!cartItems || cartItems.length === 0) {
            await conn.rollback();
            conn.release();
            return res.status(400).json({ 
                error: 'El carrito está vacío' 
            });
        }

        // 2. Verificar stock de todos los productos
        for (const item of cartItems) {
            const disponible = await ProductModel.checkAvailability(item.producto_id, item.cantidad);
            if (!disponible) {
                await conn.rollback();
                conn.release();
                return res.status(409).json({ 
                    error: `Producto "${item.nombre}" sin stock suficiente` 
                });
            }
        }

        // 3. Calcular totales
        let subtotal = cartItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
        let cupon_descuento = 0;
        const gastos_envio = 150.00;
        const impuestos_tasa = 0.16;

        // Validar cupón si se proporciona
        let cupon_id = null;
        if (codigo_cupon) {
            const cupon = await CouponModel.validateCoupon(codigo_cupon);
            if (cupon && cupon.descuento_porcentaje) {
                cupon_descuento = subtotal * (cupon.descuento_porcentaje / 100);
                cupon_id = codigo_cupon;
            }
        }

        let subtotal_despues_cupon = Math.max(subtotal - cupon_descuento, 0);
        const impuestos = subtotal_despues_cupon * impuestos_tasa;
        const total = subtotal_despues_cupon + impuestos + gastos_envio;

        // 4. Crear datos de la orden
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
            cupon_id
        };

        // 5. Crear orden en base de datos
        const orderId = await OrderModel.createOrder(conn, orderData);
        
        // 6. Agregar detalles de la orden
        await OrderModel.addOrderDetails(conn, orderId, cartItems);
        
        // 7. Actualizar stock de productos
        for (const item of cartItems) {
            await ProductModel.updateStock(item.producto_id, item.cantidad);
            
            // Registrar venta para estadísticas
            try {
                const productoInfo = await ProductModel.getProductById(item.producto_id);
                if (productoInfo && productoInfo.cat) {
                    await OrderModel.registerSale(conn, orderId, productoInfo.cat, item.subtotal);
                }
            } catch (error) {
                console.log('⚠️ No se pudo registrar venta para estadísticas:', error.message);
            }
        }

        // 8. Desactivar cupón si se usó
        if (codigo_cupon && cupon_descuento > 0) {
            try {
                await CouponModel.deactivateCoupon(codigo_cupon);
            } catch (error) {
                console.log('⚠️ No se pudo desactivar cupón:', error.message);
            }
        }

        // 9. Limpiar carrito
        await CartModel.clearCart(conn, userId);

        // 10. Obtener datos completos de la orden para el PDF
        const ordenCompleta = await OrderModel.getOrderById(orderId);
        
        if (!ordenCompleta) {
            await conn.rollback();
            conn.release();
            return res.status(500).json({ 
                error: 'Error al obtener datos de la orden' 
            });
        }

        // 11. Generar PDF
        const pdfBuffer = await generarNotaCompraPDF(ordenCompleta);
        
        // 12. Obtener datos del usuario para el email
        const usuario = await UserModel.getUserById(userId);
        const correoDestino = usuario?.correo || null;
        const nombreUsuario = nombre_cliente || usuario?.nombre || 'Cliente';

        // 13. Enviar email con PDF
        let emailEnviado = false;
        let emailError = null;
        
        if (correoDestino) {
            try {
                await enviarCorreoCompra(correoDestino, nombreUsuario, pdfBuffer, orderId, {
                    metodo_pago,
                    fecha_creacion: new Date().toISOString()
                });
                emailEnviado = true;
            } catch (mailErr) {
                console.error('❌ Error enviando email:', mailErr.message);
                emailError = mailErr.message;
            }
        }

        // 14. 🔴 IMPORTANTE: Eliminar la orden de la base de datos
        const ordenEliminada = await eliminarOrdenCompleta(conn, orderId);
        
        if (!ordenEliminada) {
            console.error('⚠️ No se pudo eliminar la orden de la base de datos');
        }

        // 15. Confirmar transacción
        await conn.commit();

        // 16. Responder al cliente
        const respuesta = {
            mensaje: 'Compra completada exitosamente',
            success: true,
            orderId,
            datosCompra: {
                subtotal: orderData.subtotal,
                impuestos: orderData.impuestos,
                envio: orderData.gastos_envio,
                descuento: orderData.cupon_descuento,
                total: orderData.total,
                metodoPago: metodo_pago
            }
        };

        // Agregar info del email
        if (emailEnviado) {
            respuesta.email = {
                enviado: true,
                mensaje: 'Factura enviada a tu correo electrónico'
            };
        } else {
            respuesta.email = {
                enviado: false,
                mensaje: 'No se pudo enviar el email',
                error: emailError
            };
        }

        res.json(respuesta);

    } catch (error) {
        // Rollback en caso de error
        if (conn) {
            try {
                await conn.rollback();
            } catch (rollbackError) {
                console.error('❌ Error en rollback:', rollbackError);
            }
        }
        
        console.error('❌ Error en completePurchase:', error);
        
        res.status(500).json({ 
            error: 'Error al procesar la compra',
            mensaje: error.message || 'Error interno del servidor',
            success: false
        });
        
    } finally {
        // Liberar conexión
        if (conn) {
            try {
                conn.release();
            } catch (releaseError) {
                console.error('❌ Error liberando conexión:', releaseError);
            }
        }
    }
};
