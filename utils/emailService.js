// utils/emailService.js (VERSIÓN CORREGIDA FINAL)
const sgMail = require('@sendgrid/mail');

// Usa tu API Key de SendGrid
sgMail.setApiKey(process.env.EMAIL_PASS);

const logoUrl = 'https://res.cloudinary.com/dngutwxha/image/upload/v1765005760/logoNovaHogar_v0jgk1.png';
const empresaNombre = process.env.EMPRESA_NOMBRE || 'Nova Hogar';
const empresaLema = process.env.EMPRESA_LEMA || 'DECORA TU VIDA, DECORA TU HOGAR';

// Plantilla base CORREGIDA
function getBaseTemplate(titulo, contenido, esHtml = true) {
    if (!esHtml) {
        return contenido; // Para texto plano
    }
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titulo}</title>
    <style>
        /* RESET BÁSICO */
        body, html {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8f9fa;
        }
        
        /* CONTENEDOR PRINCIPAL */
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        /* ENCABEZADO CON LOGO */
        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #4a6fa5 100%);
            padding: 30px 20px;
            text-align: center;
        }
        
        .logo {
            max-width: 180px;
            height: auto;
            margin-bottom: 15px;
        }
        
        .company-name {
            color: white;
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0 5px 0;
            letter-spacing: 1px;
        }
        
        .company-slogan {
            color: #ecf0f1;
            font-size: 14px;
            font-style: italic;
            margin-top: 5px;
        }
        
        /* CONTENIDO */
        .content {
            padding: 35px 30px;
        }
        
        .greeting {
            font-size: 18px;
            color: #2c3e50;
            margin-bottom: 25px;
            font-weight: 600;
        }
        
        .message {
            font-size: 16px;
            color: #555555;
            margin-bottom: 20px;
            line-height: 1.7;
        }
        
        /* BOTÓN */
        .button-container {
            text-align: center;
            margin: 35px 0;
        }
        
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #4a6fa5 0%, #2c3e50 100%);
            color: white !important;
            padding: 15px 35px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            font-size: 16px;
            text-align: center;
            min-width: 200px;
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .button:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 20px rgba(74, 111, 165, 0.4);
            background: linear-gradient(135deg, #3a5f95 0%, #1c2e40 100%);
        }
        
        /* DETALLES */
        .details-box {
            background: #f8f9fa;
            border-left: 4px solid #4a6fa5;
            padding: 18px;
            margin: 25px 0;
            border-radius: 0 6px 6px 0;
            font-size: 15px;
        }
        
        .details-box strong {
            color: #2c3e50;
        }
        
        /* CUPÓN */
        .coupon-box {
            background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
            border: 2px dashed #4caf50;
            padding: 25px;
            text-align: center;
            margin: 25px 0;
            border-radius: 8px;
        }
        
        .coupon-code {
            font-size: 32px;
            font-weight: bold;
            color: #2e7d32;
            letter-spacing: 3px;
            margin: 15px 0;
            font-family: 'Courier New', monospace;
        }
        
        /* NOTA DE ADJUNTO */
        .attachment-note {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            font-size: 15px;
            color: #1565c0;
            border-left: 4px solid #2196f3;
        }
        
        .attachment-note strong {
            color: #0d47a1;
        }
        
        /* URL DE RESPALDO */
        .backup-url {
            background: #f5f5f5;
            padding: 12px;
            border-radius: 5px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            word-break: break-all;
            color: #666;
            border: 1px solid #ddd;
        }
        
        /* PIE DE PÁGINA */
        .footer {
            background: #2c3e50;
            color: white;
            padding: 25px 20px;
            text-align: center;
            font-size: 13px;
        }
        
        .footer p {
            margin: 8px 0;
            color: #ecf0f1;
        }
        
        .footer a {
            color: #4a9fff;
            text-decoration: none;
        }
        
        .footer a:hover {
            text-decoration: underline;
        }
        
        /* RESPONSIVE */
        @media (max-width: 600px) {
            .content {
                padding: 25px 20px;
            }
            
            .button {
                padding: 14px 25px;
                font-size: 15px;
                min-width: 180px;
            }
            
            .coupon-code {
                font-size: 24px;
                letter-spacing: 2px;
            }
            
            .company-name {
                font-size: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <img src="${logoUrl}" alt="${empresaNombre}" class="logo">
            <div class="company-name">${empresaNombre}</div>
            <div class="company-slogan">${empresaLema}</div>
        </div>
        
        <div class="content">
            ${contenido}
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${empresaNombre}. Todos los derechos reservados.</p>
            <p>Este es un correo automático, por favor no responda directamente.</p>
            <p>
                <a href="mailto:soporte@novahogar.com">📧 soporte@novahogar.com</a> | 
                <a href="tel:+524491234567">📞 +52 449 123 4567</a>
            </p>
            <p style="margin-top: 15px; font-size: 12px; color: #bdc3c7;">
                Si tienes problemas con el botón, copia y pega la URL en tu navegador.
            </p>
        </div>
    </div>
</body>
</html>
    `;
}

// CORREGIDO: Función para reset de contraseña
async function enviarCorreoReset(destino, nombre, resetToken) {
    const subject = `${empresaNombre} - Restablecimiento de Contraseña`;
    
    // CORRECCIÓN: Asegurar que el nombre no sea undefined
    const nombreSaludo = nombre && nombre !== 'undefined' ? nombre : 'Usuario';
    
    // CORRECCIÓN: Codificar el token para URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${encodeURIComponent(resetToken)}`;
    
    console.log('🔐 DEBUG - Token generado:', resetToken);
    console.log('🔗 DEBUG - URL generada:', resetUrl);
    console.log('👤 DEBUG - Nombre usuario:', nombreSaludo);
    
    const contenido = `
        <div class="greeting">Hola ${nombreSaludo},</div>
        
        <div class="message">
            Hemos recibido una solicitud para restablecer tu contraseña en <strong>${empresaNombre}</strong>.
        </div>
        
        <div class="message">
            Si <strong>no realizaste</strong> esta solicitud, puedes ignorar este correo de manera segura.
            Tu cuenta permanecerá protegida.
        </div>
        
        <div class="message">
            Para crear una nueva contraseña, haz clic en el siguiente botón:
        </div>
        
        <div class="button-container">
            <a href="${resetUrl}" class="button" target="_blank">
                🔐 Restablecer mi Contraseña
            </a>
        </div>
        
        <div class="message" style="text-align: center;">
            <strong>¿Problemas con el botón?</strong><br>
            Copia y pega este enlace en tu navegador:
        </div>
        
        <div class="backup-url">
            ${resetUrl}
        </div>
        
        <div class="details-box">
            <strong>⚠️ Información importante:</strong><br>
            • Este enlace es válido por <strong>1 hora</strong><br>
            • Después de ese tiempo, deberás solicitar un nuevo enlace<br>
            • Por seguridad, nunca compartas este enlace con nadie<br>
            • Nuestro equipo nunca te pedirá tu contraseña
        </div>
        
        <div class="message">
            Si necesitas ayuda adicional, no dudes en contactar a nuestro equipo de soporte.
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
            html: getBaseTemplate(subject, contenido),
            text: `Hola ${nombreSaludo},\n\nPara restablecer tu contraseña, visita: ${resetUrl}\n\nEste enlace expira en 1 hora.\n\n${empresaNombre} - ${empresaLema}`,
            trackingSettings: {
                clickTracking: {
                    enable: true
                }
            }
        };

        const response = await sgMail.send(msg);
        console.log('✅ Email de reset enviado a:', destino);
        console.log('📧 Response SendGrid:', response[0].statusCode);
        
        return response;
    } catch (error) {
        console.error('❌ Error enviando email de reset:', error);
        console.error('❌ Detalle error:', error.response?.body || error.message);
        throw error;
    }
}

// CORREGIDO: Función para compra (versión mejorada)
async function enviarCorreoCompra(destino, nombre, pdfBuffer, orderId, ordenData = {}) {
    const subject = `${empresaNombre} - Confirmación de Compra #${orderId}`;
    
    // CORRECCIÓN: Evitar undefined en nombre
    const nombreSaludo = nombre && nombre !== 'undefined' ? nombre : 'Cliente';
    
    const contenido = `
        <div class="greeting">¡Hola ${nombreSaludo}!</div>
        
        <div class="message">
            Queremos agradecerte por tu compra en <strong>${empresaNombre}</strong>. 
            Tu pedido ha sido confirmado exitosamente.
        </div>
        
        <div class="details-box">
            <strong>📋 Detalles de la orden:</strong><br>
            • <strong>Número de Orden:</strong> #${orderId}<br>
            • <strong>Fecha de compra:</strong> ${new Date().toLocaleDateString('es-MX', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })}<br>
            • <strong>Estado:</strong> ✅ Confirmado<br>
            • <strong>Método de pago:</strong> ${ordenData.metodo_pago || 'Tarjeta de crédito'}
        </div>
        
        <div class="attachment-note">
            📎 <strong>Adjunto:</strong> Encontrarás la factura oficial en formato PDF con todos los detalles de tu compra.
        </div>
        
        <div class="message">
            <strong>📦 Información de envío:</strong><br>
            Hemos comenzado a procesar tu pedido. Recibirás una actualización cuando sea enviado.
        </div>
        
        <div class="message">
            <strong>⏱️ Tiempo estimado de entrega:</strong> 3-5 días hábiles (dependiendo de tu ubicación).
        </div>
        
        <div class="button-container">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/mis-ordenes" class="button">
                📊 Ver Estado de mi Pedido
            </a>
        </div>
        
        <div class="message">
            Si tienes alguna pregunta sobre tu pedido, nuestro equipo de soporte está disponible para ayudarte.
        </div>
    `;

    const msg = {
        to: destino,
        from: {
            email: process.env.EMAIL_FROM,
            name: empresaNombre
        },
        subject,
        html: getBaseTemplate(subject, contenido),
        text: `Hola ${nombreSaludo},\n\nGracias por tu compra #${orderId}. Adjunto encontrarás tu factura.\n\n${empresaNombre} - ${empresaLema}`,
        attachments: []
    };

    if (pdfBuffer) {
        msg.attachments.push({
            content: pdfBuffer.toString("base64"),
            filename: `Factura_${orderId}_${empresaNombre.replace(/\s+/g, '_')}.pdf`,
            type: "application/pdf",
            disposition: "attachment",
            content_id: `factura_${orderId}`
        });
    }

    try {
        const response = await sgMail.send(msg);
        console.log('✅ Email de compra enviado a:', destino);
        return response;
    } catch (error) {
        console.error('❌ Error enviando email de compra:', error);
        throw error;
    }
}

// Mantén las otras funciones actualizadas igual (pero con getBaseTemplate)
async function enviarCorreoContacto(destino, nombre, mensaje) {
  const subject = `${empresaNombre} - Confirmación de contacto`;
  
  // CORRECCIÓN: Evitar undefined
  const nombreSaludo = nombre && nombre !== 'undefined' ? nombre : 'Cliente';
  
  const contenido = `
    <div class="greeting">Hola ${nombreSaludo},</div>
    <div class="message">
      Hemos recibido tu mensaje de contacto y queremos agradecerte por ponerte en contacto con nosotros.
    </div>
    <div class="details-box">
      <strong>Tu mensaje:</strong><br>
      <em>"${mensaje}"</em>
    </div>
    <div class="message">
      Nuestro equipo revisará tu consulta y te responderá a la brevedad posible, generalmente dentro de las próximas 24-48 horas.
    </div>
    <div class="message">
      Si tu consulta es urgente, no dudes en contactarnos directamente al teléfono de atención al cliente.
    </div>
  `;

  return sgMail.send({
    to: destino,
    from: {
        email: process.env.EMAIL_FROM,
        name: empresaNombre
    },
    subject,
    html: getBaseTemplate(subject, contenido),
    text: `Hola ${nombreSaludo},\n\nHemos recibido tu mensaje: "${mensaje}"\n\nTe responderemos pronto.\n\n${empresaNombre} - ${empresaLema}`
  });
}

async function enviarCorreoSuscripcion(destino, nombre, codigoCupon) {
  const subject = `${empresaNombre} - ¡Bienvenido a nuestra comunidad!`;
  
  // CORRECCIÓN: Evitar undefined
  const nombreSaludo = nombre && nombre !== 'undefined' ? nombre : 'Amigo';
  
  const contenido = `
    <div class="greeting">¡Hola ${nombreSaludo}!</div>
    <div class="message">
      Te damos la más cordial bienvenida a nuestra comunidad. Estamos emocionados de tenerte con nosotros.
    </div>
    <div class="message">
      Como agradecimiento por tu suscripción, aquí tienes un cupón de descuento especial para tu primera compra:
    </div>
    <div class="coupon-box">
      <div style="font-size: 16px; color: #2e7d32; margin-bottom: 5px;">TU CUPÓN DE DESCUENTO</div>
      <div class="coupon-code">${codigoCupon}</div>
      <div style="font-size: 14px; color: #555;">
        Válido por 30 días | Aplicable en toda la tienda
      </div>
    </div>
    <div class="message">
      Para usar tu cupón, simplemente ingresa el código al finalizar tu compra en nuestro sitio web.
    </div>
    <div class="button-container">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button">
        ¡Comenzar a Comprar!
      </a>
    </div>
    <div class="message">
      También recibirás nuestras ofertas exclusivas y novedades antes que nadie.
    </div>
  `;

  return sgMail.send({
    to: destino,
    from: {
        email: process.env.EMAIL_FROM,
        name: empresaNombre
    },
    subject,
    html: getBaseTemplate(subject, contenido),
    text: `¡Hola ${nombreSaludo}!\n\nBienvenido a ${empresaNombre}. Tu cupón de descuento: ${codigoCupon}\n\nVálido por 30 días.\n\n${empresaNombre} - ${empresaLema}`
  });
}

async function enviarMensajeInterno(nombre, correo, mensaje) {
  const businessEmail = process.env.EMAIL_FROM;
  const subject = `📩 [CONTACTO WEB] Nuevo Mensaje de ${nombre}`;
  
  const contenido = `
    <div class="greeting">Nuevo mensaje recibido desde el formulario de contacto</div>
    <div class="details-box">
      <strong>👤 Nombre:</strong> ${nombre}<br>
      <strong>📧 Correo:</strong> ${correo}<br>
      <strong>🕐 Fecha:</strong> ${new Date().toLocaleString('es-MX')}
    </div>
    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 0 5px 5px 0;">
      <strong>📝 Mensaje:</strong><br>
      ${mensaje}
    </div>
    <div class="message">
      <strong>⚠️ Acción requerida:</strong> Por favor responder en un plazo máximo de 24 horas.
    </div>
    <div class="button-container">
      <a href="mailto:${correo}" class="button" style="background: #28a745;">
        Responder al Cliente
      </a>
    </div>
  `;

  return sgMail.send({
    to: businessEmail,
    from: {
        email: process.env.EMAIL_FROM,
        name: `${empresaNombre} - Contacto Web`
    },
    subject,
    html: getBaseTemplate(subject, contenido),
    text: `Nuevo mensaje de contacto:\n\nNombre: ${nombre}\nCorreo: ${correo}\nMensaje: ${mensaje}\n\nResponder antes de 24 horas.`
  });
}

module.exports = {
  enviarCorreoContacto,
  enviarCorreoSuscripcion,
  enviarCorreoCompra,
  enviarCorreoReset,
  enviarMensajeInterno
};
