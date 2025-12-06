// utils/emailService.js (VERSIÓN CORREGIDA CON LOGO Y DISEÑO MEJORADO)
const sgMail = require('@sendgrid/mail');
const axios = require('axios');

sgMail.setApiKey(process.env.EMAIL_PASS);

const empresaNombre = process.env.EMPRESA_NOMBRE || 'Nova Hogar';
const empresaLema = process.env.EMPRESA_LEMA || 'DECORA TU VIDA, DECORA TU HOGAR';

// Cache para el logo
let cachedLogoBase64 = null;
let logoCacheTime = null;

async function getLogoBase64() {
    // Cache por 1 hora
    if (cachedLogoBase64 && logoCacheTime && (Date.now() - logoCacheTime) < 3600000) {
        console.log('✅ Usando logo desde cache');
        return cachedLogoBase64;
    }
    
    try {
        const logoUrl = 'https://res.cloudinary.com/dngutwxha/image/upload/v1765005760/logoNovaHogar_v0jgk1.png';
        console.log('📥 Descargando logo para email desde:', logoUrl);
        
        const response = await axios.get(logoUrl, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: {
                'Accept': 'image/png, image/jpeg, image/*',
                'User-Agent': 'EmailService/1.0'
            }
        });
        
        if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        // Convertir a Base64
        cachedLogoBase64 = Buffer.from(response.data).toString('base64');
        logoCacheTime = Date.now();
        
        console.log('✅ Logo convertido a Base64 exitosamente');
        console.log(`📊 Tamaño Base64: ${cachedLogoBase64.length} caracteres`);
        return cachedLogoBase64;
        
    } catch (error) {
        console.error('❌ Error descargando logo:', error.message);
        console.log('🔄 Intentando URL de fallback...');
        
        // Intentar con un logo alternativo
        try {
            const fallbackUrl = 'https://via.placeholder.com/180x80/2c3e50/FFFFFF?text=Nova+Hogar';
            const fallbackResponse = await axios.get(fallbackUrl, {
                responseType: 'arraybuffer',
                timeout: 5000
            });
            
            cachedLogoBase64 = Buffer.from(fallbackResponse.data).toString('base64');
            logoCacheTime = Date.now();
            console.log('✅ Logo de fallback cargado');
            return cachedLogoBase64;
            
        } catch (fallbackError) {
            console.warn('⚠️ No se pudo cargar ningún logo');
            return null;
        }
    }
}

// Plantilla base con diseño mejorado
async function getBaseTemplate(titulo, contenido) {
    // Obtener logo como Base64
    const logoBase64 = await getLogoBase64();
    
    let logoHtml;
    
    if (logoBase64) {
        // Logo embebido como data URI
        logoHtml = `
            <img src="data:image/png;base64,${logoBase64}" 
                 alt="${empresaNombre}" 
                 style="max-width: 160px; height: auto; display: block; margin: 0 auto 12px auto; border: 0;"
                 width="160">
        `;
    } else {
        // Fallback solo texto
        logoHtml = `
            <div style="font-size: 28px; font-weight: bold; color: white; margin: 0 0 8px 0; text-align: center; letter-spacing: 1px;">
                ${empresaNombre}
            </div>
        `;
    }
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${titulo}</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td {font-family: Arial, sans-serif !important;}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f6f9;">
    
    <!-- Tabla principal para compatibilidad con clientes de email -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f6f9; padding: 20px 0;">
        <tr>
            <td align="center">
                
                <!-- Container principal -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    
                    <!-- ENCABEZADO -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #2c3e50 0%, #4a6fa5 100%); padding: 35px 25px; text-align: center;">
                            ${logoHtml}
                            <div style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: 0.5px;">
                                ${empresaNombre}
                            </div>
                            <div style="color: #e8eef3; font-size: 13px; font-style: italic; margin: 0; letter-spacing: 0.3px;">
                                ${empresaLema}
                            </div>
                        </td>
                    </tr>
                    
                    <!-- CONTENIDO -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            ${contenido}
                        </td>
                    </tr>
                    
                    <!-- SEPARADOR -->
                    <tr>
                        <td style="padding: 0 30px;">
                            <div style="border-top: 1px solid #e1e8ed; margin: 0;"></div>
                        </td>
                    </tr>
                    
                    <!-- PIE DE PÁGINA -->
                    <tr>
                        <td style="background-color: #2c3e50; padding: 25px 30px; text-align: center;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td style="color: #ecf0f1; font-size: 14px; padding-bottom: 12px; font-weight: 600;">
                                        ${empresaNombre}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="color: #bdc3c7; font-size: 12px; line-height: 1.6;">
                                        📧 soporte@novahogar.com
                                        <br>
                                        📞 +52 449 123 4567
                                    </td>
                                </tr>
                                <tr>
                                    <td style="color: #95a5a6; font-size: 11px; padding-top: 15px;">
                                        © ${new Date().getFullYear()} ${empresaNombre}. Todos los derechos reservados.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                </table>
                
            </td>
        </tr>
    </table>
    
</body>
</html>
    `;
}

// Estilos reutilizables para contenido
const estilos = {
    saludo: `font-size: 22px; color: #2c3e50; margin: 0 0 20px 0; font-weight: 600; line-height: 1.3;`,
    
    mensaje: `font-size: 15px; color: #34495e; margin: 0 0 18px 0; line-height: 1.7;`,
    
    cajaInfo: `background: #f8f9fa; border-left: 4px solid #4a6fa5; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;`,
    
    cajaDestacada: `background: linear-gradient(135deg, #e8f4f8 0%, #d4e9f7 100%); border: 2px solid #4a90e2; padding: 25px; text-align: center; margin: 25px 0; border-radius: 10px;`,
    
    boton: `display: inline-block; background: linear-gradient(135deg, #4a6fa5 0%, #2c3e50 100%); color: #ffffff !important; padding: 14px 32px; text-decoration: none !important; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 20px 0; box-shadow: 0 3px 10px rgba(74, 111, 165, 0.3);`,
    
    urlBox: `background: #f5f7fa; padding: 15px; border-radius: 6px; margin: 20px 0; font-family: 'Courier New', Courier, monospace; font-size: 13px; word-break: break-all; color: #555; border: 1px solid #e1e8ed; text-align: center;`
};

// ==================== FUNCIÓN: RESET DE CONTRASEÑA ====================
async function enviarCorreoReset(destino, nombre, resetToken) {
    const subject = `${empresaNombre} - Restablecimiento de Contraseña`;
    const nombreSaludo = nombre && nombre !== 'undefined' ? nombre : 'Usuario';
    
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${encodeURIComponent(resetToken)}`;
    
    console.log('📧 Preparando email de reset para:', destino);
    console.log('🔗 URL generada:', resetUrl);
    
    const contenido = `
        <div style="${estilos.saludo}">🔐 Hola ${nombreSaludo}</div>
        
        <div style="${estilos.mensaje}">
            Hemos recibido una solicitud para restablecer tu contraseña en <strong>${empresaNombre}</strong>.
        </div>
        
        <div style="${estilos.mensaje}">
            Haz clic en el siguiente botón para crear una nueva contraseña:
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="${estilos.boton}">
                Restablecer mi Contraseña
            </a>
        </div>
        
        <div style="${estilos.cajaInfo}">
            <div style="font-size: 14px; color: #555; margin-bottom: 10px;">
                <strong>⚠️ ¿Problemas con el botón?</strong>
            </div>
            <div style="font-size: 13px; color: #666;">
                Copia y pega este enlace en tu navegador:
            </div>
            <div style="${estilos.urlBox}">
                ${resetUrl}
            </div>
        </div>
        
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <div style="font-size: 14px; color: #856404;">
                <strong>⚡ Importante:</strong> Si no solicitaste este cambio, ignora este correo. Tu cuenta está segura.
            </div>
        </div>
    `;

    try {
        const msg = {
            to: destino,
            from: {
                email: process.env.EMAIL_FROM,
                name: empresaNombre
            },
            subject,
            html: await getBaseTemplate(subject, contenido),
            text: `Hola ${nombreSaludo},\n\nPara restablecer tu contraseña, visita: ${resetUrl}\n\nSi no solicitaste este cambio, ignora este correo.\n\n${empresaNombre} - ${empresaLema}`,
            trackingSettings: {
                clickTracking: { enable: false },
                openTracking: { enable: false }
            }
        };

        const response = await sgMail.send(msg);
        console.log('✅ Email de reset enviado correctamente a:', destino);
        return response;
        
    } catch (error) {
        console.error('❌ Error enviando email de reset:', error);
        if (error.response) {
            console.error('❌ Detalle:', error.response.body);
        }
        throw error;
    }
}

// ==================== FUNCIÓN: CONFIRMACIÓN DE COMPRA ====================
async function enviarCorreoCompra(destino, nombre, pdfBuffer, orderId, ordenData = {}) {
    const subject = `${empresaNombre} - Confirmación de Compra #${orderId}`;
    const nombreSaludo = nombre && nombre !== 'undefined' ? nombre : 'Cliente';
    
    const fechaFormateada = new Date().toLocaleDateString('es-MX', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const contenido = `
        <div style="${estilos.saludo}">¡Hola ${nombreSaludo}! 🎉</div>
        
        <div style="${estilos.mensaje}">
            ¡Gracias por tu confianza! Tu pedido ha sido <strong style="color: #27ae60;">confirmado exitosamente</strong> y estamos preparándolo con mucho cuidado.
        </div>
        
        <div style="${estilos.cajaDestacada}">
            <div style="font-size: 16px; color: #2c3e50; font-weight: 600; margin-bottom: 15px;">
                📋 Detalles de tu orden
            </div>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="text-align: left;">
                <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: #555;">
                        <strong>Número de Orden:</strong>
                    </td>
                    <td style="padding: 6px 0; font-size: 14px; color: #2c3e50; font-weight: 600; text-align: right;">
                        #${orderId}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: #555;">
                        <strong>Fecha:</strong>
                    </td>
                    <td style="padding: 6px 0; font-size: 14px; color: #2c3e50; text-align: right;">
                        ${fechaFormateada}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: #555;">
                        <strong>Estado:</strong>
                    </td>
                    <td style="padding: 6px 0; font-size: 14px; color: #27ae60; font-weight: 600; text-align: right;">
                        ✅ Confirmado
                    </td>
                </tr>
            </table>
        </div>
        
        <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 18px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <div style="font-size: 14px; color: #2e7d32;">
                📎 <strong>Factura adjunta:</strong> Hemos incluido tu factura oficial en formato PDF.
            </div>
        </div>
        
        <div style="${estilos.mensaje}">
            Recibirás actualizaciones sobre el estado de tu pedido. Puedes consultarlo en cualquier momento desde tu cuenta.
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/mis-ordenes" 
               style="${estilos.boton}">
                📊 Ver Estado de mi Pedido
            </a>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;">
            <div style="font-size: 15px; color: #2c3e50; margin-bottom: 8px;">
                <strong>¿Necesitas ayuda?</strong>
            </div>
            <div style="font-size: 14px; color: #666;">
                Estamos aquí para ti. Contáctanos en cualquier momento.
            </div>
        </div>
    `;

    const msg = {
        to: destino,
        from: {
            email: process.env.EMAIL_FROM,
            name: empresaNombre
        },
        subject,
        html: await getBaseTemplate(subject, contenido),
        text: `¡Hola ${nombreSaludo}!\n\nGracias por tu compra #${orderId}. Tu pedido ha sido confirmado exitosamente.\n\nEncontrarás tu factura adjunta en este correo.\n\n${empresaNombre} - ${empresaLema}`,
        attachments: []
    };

    if (pdfBuffer) {
        msg.attachments.push({
            content: pdfBuffer.toString("base64"),
            filename: `Factura_${orderId}_Nova_Hogar.pdf`,
            type: "application/pdf",
            disposition: "attachment"
        });
    }

    try {
        const response = await sgMail.send(msg);
        console.log('✅ Email de compra enviado correctamente a:', destino);
        return response;
    } catch (error) {
        console.error('❌ Error enviando email de compra:', error);
        throw error;
    }
}

// ==================== FUNCIÓN: CONFIRMACIÓN CONTACTO ====================
async function enviarCorreoContacto(destino, nombre, mensaje) {
    const subject = `${empresaNombre} - Confirmación de Contacto`;
    const nombreSaludo = nombre && nombre !== 'undefined' ? nombre : 'Cliente';
    
    const contenido = `
        <div style="${estilos.saludo}">Hola ${nombreSaludo} 👋</div>
        
        <div style="${estilos.mensaje}">
            Hemos recibido tu mensaje y queremos agradecerte por ponerte en contacto con nosotros.
        </div>
        
        <div style="${estilos.cajaInfo}">
            <div style="font-size: 14px; color: #2c3e50; margin-bottom: 10px;">
                <strong>📨 Tu mensaje:</strong>
            </div>
            <div style="font-size: 14px; color: #555; line-height: 1.6; font-style: italic;">
                "${mensaje}"
            </div>
        </div>
        
        <div style="${estilos.mensaje}">
            Nuestro equipo revisará tu consulta y te responderemos lo antes posible, normalmente en <strong>24-48 horas</strong>.
        </div>
        
        <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 18px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <div style="font-size: 14px; color: #1565c0;">
                💡 <strong>Consejo:</strong> Revisa tu bandeja de entrada regularmente para no perderte nuestra respuesta.
            </div>
        </div>
    `;

    return sgMail.send({
        to: destino,
        from: {
            email: process.env.EMAIL_FROM,
            name: empresaNombre
        },
        subject,
        html: await getBaseTemplate(subject, contenido),
        text: `Hola ${nombreSaludo},\n\nHemos recibido tu mensaje: "${mensaje}"\n\nTe responderemos pronto.\n\n${empresaNombre} - ${empresaLema}`
    });
}

// ==================== FUNCIÓN: BIENVENIDA SUSCRIPCIÓN ====================
async function enviarCorreoSuscripcion(destino, nombre, codigoCupon) {
    const subject = `${empresaNombre} - ¡Bienvenido a nuestra comunidad! 🎁`;
    const nombreSaludo = nombre && nombre !== 'undefined' ? nombre : 'Amigo';
    
    const contenido = `
        <div style="${estilos.saludo}">¡Hola ${nombreSaludo}! 🎉</div>
        
        <div style="${estilos.mensaje}">
            Te damos la más cordial <strong>bienvenida</strong> a la familia ${empresaNombre}. Estamos emocionados de tenerte con nosotros.
        </div>
        
        <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border: 3px dashed #4caf50; padding: 30px; text-align: center; margin: 30px 0; border-radius: 12px;">
            <div style="font-size: 16px; color: #2e7d32; font-weight: 600; margin-bottom: 8px;">
                🎁 TU REGALO DE BIENVENIDA
            </div>
            <div style="font-size: 14px; color: #388e3c; margin-bottom: 20px;">
                Cupón de descuento exclusivo
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="font-size: 36px; font-weight: bold; color: #2e7d32; letter-spacing: 3px; font-family: 'Courier New', Courier, monospace;">
                    ${codigoCupon}
                </div>
            </div>
            <div style="font-size: 13px; color: #555; margin-top: 15px;">
                Usa este código en tu próxima compra
            </div>
        </div>
        
        <div style="${estilos.mensaje}">
            Como miembro de nuestra comunidad, serás el primero en conocer:
        </div>
        
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
            <tr>
                <td style="padding: 10px 0; font-size: 14px; color: #555;">
                    ✨ Nuevos productos y colecciones
                </td>
            </tr>
            <tr>
                <td style="padding: 10px 0; font-size: 14px; color: #555;">
                    🎯 Ofertas y descuentos exclusivos
                </td>
            </tr>
            <tr>
                <td style="padding: 10px 0; font-size: 14px; color: #555;">
                    💡 Tips y consejos de decoración
                </td>
            </tr>
        </table>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/productos" 
               style="${estilos.boton}">
                🛍️ Explorar Productos
            </a>
        </div>
    `;

    return sgMail.send({
        to: destino,
        from: {
            email: process.env.EMAIL_FROM,
            name: empresaNombre
        },
        subject,
        html: await getBaseTemplate(subject, contenido),
        text: `¡Hola ${nombreSaludo}!\n\nBienvenido a ${empresaNombre}.\n\nTu cupón de descuento: ${codigoCupon}\n\nÚsalo en tu próxima compra.\n\n${empresaNombre} - ${empresaLema}`
    });
}

// ==================== FUNCIÓN: MENSAJE INTERNO ====================
async function enviarMensajeInterno(nombre, correo, mensaje) {
    const businessEmail = process.env.EMAIL_FROM;
    const subject = `📩 [CONTACTO WEB] Nuevo Mensaje de ${nombre}`;
    
    const contenido = `
        <div style="${estilos.saludo}">📬 Nuevo mensaje recibido</div>
        
        <div style="${estilos.cajaDestacada}">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="text-align: left;">
                <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #555; width: 100px;">
                        <strong>👤 Nombre:</strong>
                    </td>
                    <td style="padding: 8px 0; font-size: 14px; color: #2c3e50;">
                        ${nombre}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #555;">
                        <strong>📧 Correo:</strong>
                    </td>
                    <td style="padding: 8px 0; font-size: 14px; color: #2c3e50;">
                        <a href="mailto:${correo}" style="color: #4a6fa5; text-decoration: none;">
                            ${correo}
                        </a>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #555;">
                        <strong>🕐 Fecha:</strong>
                    </td>
                    <td style="padding: 8px 0; font-size: 14px; color: #2c3e50;">
                        ${new Date().toLocaleString('es-MX', { 
                            dateStyle: 'full', 
                            timeStyle: 'short' 
                        })}
                    </td>
                </tr>
            </table>
        </div>
        
        <div style="background: #fff8e1; border-left: 4px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <div style="font-size: 14px; color: #f57c00; font-weight: 600; margin-bottom: 10px;">
                📝 MENSAJE:
            </div>
            <div style="font-size: 14px; color: #555; line-height: 1.7; white-space: pre-wrap;">
                ${mensaje}
            </div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="mailto:${correo}" 
               style="${estilos.boton}">
                Responder a ${nombre}
            </a>
        </div>
    `;

    return sgMail.send({
        to: businessEmail,
        from: {
            email: process.env.EMAIL_FROM,
            name: `${empresaNombre} - Sistema`
        },
        replyTo: correo,
        subject,
        html: await getBaseTemplate(subject, contenido),
        text: `Nuevo mensaje de contacto\n\nNombre: ${nombre}\nCorreo: ${correo}\nFecha: ${new Date().toLocaleString('es-MX')}\n\nMensaje:\n${mensaje}`
    });
}

module.exports = {
    enviarCorreoContacto,
    enviarCorreoSuscripcion,
    enviarCorreoCompra,
    enviarCorreoReset,
    enviarMensajeInterno
};
