// utils/emailService.js (VERSIÓN CORREGIDA CON LOGO Y DISEÑO MEJORADO)
const sgMail = require('@sendgrid/mail');
const axios = require('axios');

sgMail.setApiKey(process.env.EMAIL_PASS);

const empresaNombre = process.env.EMPRESA_NOMBRE || 'Nova Hogar';
const empresaLema = process.env.EMPRESA_LEMA || 'DECORA TU VIDA, DECORA TU HOGAR';
const businessEmail = process.env.BUSINESS_EMAIL || 'novahogar2025@gmail.com';

// Cache para el logo
let cachedLogoBase64 = null;
let logoCacheTime = null;

// --- Helpers de Logo y Plantilla Base ---

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
        
        // Convertir el buffer a base64
        cachedLogoBase64 = Buffer.from(response.data).toString('base64');
        logoCacheTime = Date.now();
        console.log('✅ Logo descargado exitosamente');
        return cachedLogoBase64;

    } catch (error) {
        console.error('❌ Error cargando logo. Usando fallback:', error.message);
        // Fallback: usar una imagen por defecto o simplemente omitirla si falla
        return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; // 1x1 pixel transparente
    }
}


const estilos = {
    contenedor: "max-width: 600px; margin: auto; padding: 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px;",
    header: "text-align: center; padding: 10px 0; border-bottom: 2px solid #343a40;",
    titulo: "color: #343a40; font-size: 24px; margin: 5px 0 0 0; font-weight: 700;",
    lema: "color: #6c757d; font-size: 14px; margin: 0 0 10px 0;",
    contenido: "padding: 20px 0; color: #495057; line-height: 1.6;",
    footer: "text-align: center; padding: 10px 0; border-top: 1px solid #dee2e6; margin-top: 20px; font-size: 12px; color: #adb5bd;",
    boton: "display: inline-block; padding: 12px 25px; margin: 15px 0; border-radius: 5px; background-color: #007bff; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 16px; border: none;"
};

async function getBaseTemplate(subject, contentHtml) {
    const logoBase64 = await getLogoBase64();
    
    return `
        <div style="${estilos.contenedor}">
            <div style="${estilos.header}">
                <img src="data:image/png;base64,${logoBase64}" alt="${empresaNombre} Logo" style="max-height: 60px; margin-bottom: 5px;">
                <h1 style="${estilos.titulo}">${empresaNombre}</h1>
                <p style="${estilos.lema}">${empresaLema}</p>
            </div>
            
            <div style="${estilos.contenido}">
                <h2 style="color: #007bff; font-size: 20px; margin-bottom: 20px; text-align: center;">${subject}</h2>
                ${contentHtml}
            </div>
            
            <div style="${estilos.footer}">
                <p>&copy; ${new Date().getFullYear()} ${empresaNombre}. Todos los derechos reservados.</p>
                <p>Si tienes preguntas, contáctanos en <a href="mailto:${businessEmail}" style="color: #007bff;">${businessEmail}</a>.</p>
            </div>
        </div>
    `;
}

// --- Funciones de envío específicas ---

// 1. Correo de confirmación de contacto al USUARIO
async function enviarCorreoContacto(correo, nombre, mensaje) {
    const subject = `✅ Mensaje Recibido | ${empresaNombre}`;
    
    const contenido = `
        <p>Hola **${nombre}**, </p>
        <p>Hemos recibido tu mensaje y queremos agradecerte por contactarnos. Nuestro equipo revisará tu consulta y te responderemos a la brevedad posible.</p>
        
        <div style="background: #e9f7fe; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="font-weight: bold; margin-bottom: 5px; color: #007bff;">Tu Mensaje:</p>
            <p style="font-size: 14px; color: #555; line-height: 1.6; white-space: pre-wrap;">${mensaje}</p>
        </div>
        
        <p>Mientras esperas, puedes explorar nuestras últimas colecciones en nuestro sitio web.</p>
        <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || '#'}" style="${estilos.boton}">Visitar Tienda</a>
        </div>
    `;

    return sgMail.send({
        to: correo,
        from: {
            email: process.env.EMAIL_FROM,
            name: empresaNombre
        },
        subject,
        html: await getBaseTemplate(subject, contenido)
    });
}

// 2. Correo interno para la EMPRESA con un nuevo mensaje de contacto
async function enviarMensajeInterno(nombre, correo, mensaje) {
    const subject = `🔔 NUEVO CONTACTO de ${nombre} | ${empresaNombre}`;
    
    const contenido = `
        <p style="font-size: 16px; font-weight: 600;">Se ha recibido un nuevo mensaje de contacto desde el sitio web.</p>
        
        <div style="border: 1px solid #ced4da; border-radius: 8px; padding: 20px; background-color: #ffffff; margin: 25px 0;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #343a40; width: 30%;">👤 Nombre:</td>
                    <td style="padding: 8px 0; color: #495057; width: 70%;">${nombre}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #343a40;">📧 Correo:</td>
                    <td style="padding: 8px 0; color: #007bff;"><a href="mailto:${correo}" style="color: #007bff; text-decoration: none;">${correo}</a></td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #343a40;">🕐 Fecha:</td>
                    <td style="padding: 8px 0; color: #495057;">
                        ${new Date().toLocaleDateString('es-MX', {
                            year: 'numeric', month: 'long', day: 'numeric', 
                            hour: '2-digit', minute: '2-digit'
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
        text: `Nuevo mensaje de contacto\n\nNombre: ${nombre}\nCorreo: ${correo}\nMensaje:\n${mensaje}`
    });
}

// 3. Correo de confirmación de SUSCRIPCIÓN con cupón
async function enviarCorreoSuscripcion(correo, nombre, codigoCupon) {
    const subject = `🎉 ¡Bienvenido/a a ${empresaNombre}! Tu cupón de regalo`;
    
    const contenido = `
        <p>Hola **${nombre}**, </p>
        <p>¡Gracias por unirte a nuestra comunidad! Nos emociona tenerte a bordo. Como agradecimiento por tu suscripción, te regalamos un cupón de descuento para tu primera compra.</p>
        
        <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #e6ffed; border: 2px dashed #28a745; border-radius: 8px;">
            <p style="font-size: 14px; color: #28a745; margin: 0;">Tu código de cupón:</p>
            <p style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 2px; margin: 10px 0;">${codigoCupon}</p>
            <p style="font-size: 14px; color: #555; margin: 0;">Válido para un 10% de descuento en tu próxima compra.</p>
        </div>
        
        <p>¡Te esperamos!</p>
        <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || '#'}" style="${estilos.boton}">Comprar Ahora</a>
        </div>
    `;

    return sgMail.send({
        to: correo,
        from: {
            email: process.env.EMAIL_FROM,
            name: empresaNombre
        },
        subject,
        html: await getBaseTemplate(subject, contenido),
        text: `¡Bienvenido/a! Tu cupón de descuento es: ${codigoCupon}`
    });
}

// 4. Correo de COMPRA/FACTURA con PDF adjunto
async function enviarCorreoCompra(correo, nombre, pdfBuffer, ordenId, detalles) {
    const subject = `📦 Tu Orden #${ordenId} de ${empresaNombre}`;
    
    const contenido = `
        <p>Hola **${nombre}**, </p>
        <p>¡Tu compra ha sido procesada con éxito! Adjunto encontrarás la nota de tu pedido (**Orden #${ordenId}**) en formato PDF.</p>
        
        <div style="border: 1px solid #ced4da; border-radius: 8px; padding: 20px; background-color: #ffffff; margin: 25px 0;">
            <p style="font-weight: 600; color: #343a40; margin-bottom: 10px;">Resumen del Pedido:</p>
            <table style="width: 100%; font-size: 14px; color: #495057;">
                <tr>
                    <td style="padding: 5px 0;">**ID de Orden:**</td>
                    <td style="padding: 5px 0; text-align: right;">#${ordenId}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 0;">**Fecha:**</td>
                    <td style="padding: 5px 0; text-align: right;">${new Date(detalles.fecha_creacion).toLocaleDateString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 0;">**Método de Pago:**</td>
                    <td style="padding: 5px 0; text-align: right;">${detalles.metodo_pago}</td>
                </tr>
            </table>
        </div>
        
        <p>Agradecemos tu confianza. Si tienes alguna duda, no dudes en contactarnos.</p>
        
        <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/orders/${ordenId}" style="${estilos.boton} background-color: #28a745;">Ver Estado de la Orden</a>
        </div>
    `;

    return sgMail.send({
        to: correo,
        from: {
            email: process.env.EMAIL_FROM,
            name: empresaNombre
        },
        subject,
        html: await getBaseTemplate(subject, contenido),
        attachments: [
            {
                content: pdfBuffer.toString('base64'),
                filename: `Factura_NovaHogar_Orden_${ordenId}.pdf`,
                type: 'application/pdf',
                disposition: 'attachment'
            }
        ]
    });
}

// 5. Correo de Recuperación de Contraseña
async function enviarCorreoReset(correo, nombre, resetURL) {
    const subject = `🔒 Solicitud de Restablecimiento de Contraseña | ${empresaNombre}`;
    
    const contenido = `
        <p>Hola **${nombre}**, </p>
        <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en ${empresaNombre}.</p>
        
        <p style="font-weight: bold; color: #dc3545;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
        
        <p>Para crear una nueva contraseña, haz clic en el siguiente enlace. Este enlace es válido por **1 hora**.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${resetURL}" 
               style="${estilos.boton} background-color: #dc3545;">
                Restablecer Contraseña
            </a>
        </div>
        
        <p>Si tienes problemas para hacer clic, copia y pega esta URL en tu navegador:</p>
        <p style="font-size: 12px; word-break: break-all;"><a href="${resetURL}">${resetURL}</a></p>
    `;

    return sgMail.send({
        to: correo,
        from: {
            email: process.env.EMAIL_FROM,
            name: empresaNombre
        },
        subject,
        html: await getBaseTemplate(subject, contenido),
        text: `Restablece tu contraseña haciendo clic en el siguiente enlace (válido por 1 hora): ${resetURL}`
    });
}


module.exports = {
    enviarCorreoContacto,
    enviarMensajeInterno, // Nueva función
    enviarCorreoSuscripcion, // Nueva función
    enviarCorreoCompra, // Nueva función
    enviarCorreoReset // Nueva función
};
