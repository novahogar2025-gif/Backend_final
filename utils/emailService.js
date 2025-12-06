// utils/emailService.js (CON LOGO EMBEBIDO REAL)
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.EMAIL_PASS);

const empresaNombre = process.env.EMPRESA_NOMBRE || 'Nova Hogar';
const empresaLema = process.env.EMPRESA_LEMA || 'DECORA TU VIDA, DECORA TU HOGAR';

// Logo como Base64 (descargado automáticamente)
let cachedLogoBase64 = null;
let logoCacheTime = null;

async function getLogoBase64() {
    // Cache por 1 hora
    if (cachedLogoBase64 && logoCacheTime && (Date.now() - logoCacheTime) < 3600000) {
        return cachedLogoBase64;
    }
    
    try {
        const logoUrl = 'https://res.cloudinary.com/dngutwxha/image/upload/v1765005760/logoNovaHogar_v0jgk1.png';
        console.log('📥 Descargando logo para email...');
        
        const response = await axios.get(logoUrl, {
            responseType: 'arraybuffer',
            timeout: 10000
        });
        
        // Convertir a Base64
        cachedLogoBase64 = Buffer.from(response.data).toString('base64');
        logoCacheTime = Date.now();
        
        console.log('✅ Logo convertido a Base64');
        return cachedLogoBase64;
        
    } catch (error) {
        console.warn('⚠️ No se pudo descargar el logo para email:', error.message);
        
        // Crear un logo simple como texto HTML como fallback
        return null;
    }
}

// Plantilla con logo EMBEBIDO
async function getBaseTemplate(titulo, contenido, esHtml = true) {
    if (!esHtml) {
        return contenido;
    }
    
    // Obtener logo como Base64
    const logoBase64 = await getLogoBase64();
    
    let logoHtml;
    
    if (logoBase64) {
        // Logo como Base64 (siempre visible)
        logoHtml = `
            <img src="data:image/png;base64,${logoBase64}" 
                 alt="${empresaNombre}" 
                 style="max-width: 180px; height: auto; margin-bottom: 15px; border: 0; outline: none; display: block;"
                 width="180">
        `;
    } else {
        // Fallback: solo texto
        logoHtml = `
            <div style="color: white; font-size: 24px; font-weight: bold; margin: 15px 0; text-align: center;">
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
    <title>${titulo}</title>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8f9fa;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #4a6fa5 100%);
            padding: 25px 20px;
            text-align: center;
        }
        
        .company-name {
            color: white;
            font-size: 22px;
            font-weight: bold;
            margin: 10px 0 5px 0;
        }
        
        .company-slogan {
            color: #ecf0f1;
            font-size: 13px;
            font-style: italic;
            margin-top: 5px;
        }
        
        .content {
            padding: 30px;
        }
        
        .greeting {
            font-size: 18px;
            color: #2c3e50;
            margin-bottom: 20px;
            font-weight: 600;
        }
        
        .message {
            font-size: 15px;
            color: #555555;
            margin-bottom: 15px;
            line-height: 1.6;
        }
        
        .button-container {
            text-align: center;
            margin: 25px 0;
        }
        
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #4a6fa5 0%, #2c3e50 100%);
            color: white !important;
            padding: 12px 25px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            font-size: 15px;
        }
        
        @media (max-width: 600px) {
            .content {
                padding: 20px;
            }
            
            .header {
                padding: 20px 15px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            ${logoHtml}
            <div class="company-name">${empresaNombre}</div>
            <div class="company-slogan">${empresaLema}</div>
        </div>
        
        <div class="content">
            ${contenido}
        </div>
        
        <div style="background: #2c3e50; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 5px 0;">© ${new Date().getFullYear()} ${empresaNombre}</p>
            <p style="margin: 5px 0;">soporte@novahogar.com | +52 449 123 4567</p>
        </div>
    </div>
</body>
</html>
    `;
}

// CORREGIDO: Función para reset de contraseña
async function enviarCorreoReset(destino, nombre, resetToken) {
    const subject = `${empresaNombre} - Restablecimiento de Contraseña`;
    
    const nombreSaludo = nombre && nombre !== 'undefined' ? nombre : 'Usuario';
    
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${encodeURIComponent(resetToken)}`;
    
    console.log('📧 Preparando email de reset para:', destino);
    console.log('🔗 URL generada:', resetUrl);
    
    const contenido = `
        <div class="greeting">Hola ${nombreSaludo},</div>
        
        <div class="message">
            Hemos recibido una solicitud para restablecer tu contraseña en <strong>${empresaNombre}</strong>.
        </div>
        
        <div class="message">
            Si <strong>no realizaste</strong> esta solicitud, puedes ignorar este correo de manera segura.
        </div>
        
        <div class="button-container">
            <a href="${resetUrl}" class="button" style="color: white !important; text-decoration: none;">
                🔐 Restablecer mi Contraseña
            </a>
        </div>
        
        <div style="text-align: center; margin: 20px 0; font-size: 14px;">
            <strong>¿Problemas con el botón?</strong><br>
            Copia y pega este enlace en tu navegador:
        </div>
        
        <div style="
            background: #f5f5f5;
            padding: 12px;
            border-radius: 5px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            word-break: break-all;
            color: #666;
            border: 1px solid #ddd;
            text-align: center;">
            ${resetUrl}
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
            text: `Hola ${nombreSaludo},\n\nPara restablecer tu contraseña, visita: ${resetUrl}\n\n${empresaNombre} - ${empresaLema}`,
            trackingSettings: {
                clickTracking: { enable: false } // Deshabilitado por privacidad
            }
        };

        const response = await sgMail.send(msg);
        console.log('✅ Email de reset enviado a:', destino);
        
        return response;
    } catch (error) {
        console.error('❌ Error enviando email de reset:', error);
        console.error('❌ Detalle error:', error.response?.body || error.message);
        throw error;
    }
}

// CORREGIDO: Función para compra
async function enviarCorreoCompra(destino, nombre, pdfBuffer, orderId, ordenData = {}) {
    const subject = `${empresaNombre} - Confirmación de Compra #${orderId}`;
    
    const nombreSaludo = nombre && nombre !== 'undefined' ? nombre : 'Cliente';
    
    const contenido = `
        <div class="greeting">¡Hola ${nombreSaludo}!</div>
        
        <div class="message">
            Queremos agradecerte por tu compra en <strong>${empresaNombre}</strong>. 
            Tu pedido ha sido confirmado exitosamente.
        </div>
        
        <div style="
            background: #f8f9fa;
            border-left: 4px solid #4a6fa5;
            padding: 18px;
            margin: 25px 0;
            border-radius: 0 6px 6px 0;
            font-size: 15px;">
            <strong>📋 Detalles de la orden:</strong><br>
            • <strong>Número de Orden:</strong> #${orderId}<br>
            • <strong>Fecha de compra:</strong> ${new Date().toLocaleDateString('es-MX', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })}<br>
            • <strong>Estado:</strong> ✅ Confirmado
        </div>
        
        <div style="
            background: #e3f2fd;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            font-size: 15px;
            color: #1565c0;
            border-left: 4px solid #2196f3;">
            📎 <strong>Adjunto:</strong> Encontrarás la factura oficial en formato PDF.
        </div>
        
        <div class="button-container">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/mis-ordenes" 
               class="button" 
               style="color: white !important; text-decoration: none;">
                📊 Ver Estado de mi Pedido
            </a>
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
            filename: `Factura_${orderId}_Nova_Hogar.pdf`,
            type: "application/pdf",
            disposition: "attachment"
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

// Mantén las otras funciones (solo necesitan usar getBaseTemplate)
async function enviarCorreoContacto(destino, nombre, mensaje) {
  const subject = `${empresaNombre} - Confirmación de contacto`;
  const nombreSaludo = nombre && nombre !== 'undefined' ? nombre : 'Cliente';
  
  const contenido = `
    <div class="greeting">Hola ${nombreSaludo},</div>
    <div class="message">
      Hemos recibido tu mensaje y te responderemos pronto.
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
    text: `Hola ${nombreSaludo},\n\nHemos recibido tu mensaje.\n\n${empresaNombre} - ${empresaLema}`
  });
}

async function enviarCorreoSuscripcion(destino, nombre, codigoCupon) {
  const subject = `${empresaNombre} - ¡Bienvenido a nuestra comunidad!`;
  const nombreSaludo = nombre && nombre !== 'undefined' ? nombre : 'Amigo';
  
  const contenido = `
    <div class="greeting">¡Hola ${nombreSaludo}!</div>
    <div class="message">
      Te damos la más cordial bienvenida a nuestra comunidad.
    </div>
    <div style="
        background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
        border: 2px dashed #4caf50;
        padding: 25px;
        text-align: center;
        margin: 25px 0;
        border-radius: 8px;">
      <div style="font-size: 16px; color: #2e7d32; margin-bottom: 5px;">TU CUPÓN DE DESCUENTO</div>
      <div style="font-size: 32px; font-weight: bold; color: #2e7d32; letter-spacing: 3px; margin: 15px 0; font-family: 'Courier New', monospace;">
        ${codigoCupon}
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
    html: getBaseTemplate(subject, contenido),
    text: `¡Hola ${nombreSaludo}!\n\nBienvenido a ${empresaNombre}. Tu cupón: ${codigoCupon}\n\n${empresaNombre} - ${empresaLema}`
  });
}

async function enviarMensajeInterno(nombre, correo, mensaje) {
  const businessEmail = process.env.EMAIL_FROM;
  const subject = `📩 [CONTACTO WEB] Nuevo Mensaje de ${nombre}`;
  
  const contenido = `
    <div class="greeting">Nuevo mensaje recibido</div>
    <div style="
        background: #f8f9fa;
        border-left: 4px solid #4a6fa5;
        padding: 15px;
        margin: 20px 0;
        border-radius: 0 5px 5px 0;">
      <strong>👤 Nombre:</strong> ${nombre}<br>
      <strong>📧 Correo:</strong> ${correo}<br>
      <strong>🕐 Fecha:</strong> ${new Date().toLocaleString('es-MX')}
    </div>
    <div style="
        background: #fff3cd; 
        border-left: 4px solid #ffc107; 
        padding: 15px; 
        margin: 20px 0; 
        border-radius: 0 5px 5px 0;">
      <strong>📝 Mensaje:</strong><br>
      ${mensaje}
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
    text: `Nuevo mensaje de ${nombre} (${correo}): ${mensaje}`
  });
}

module.exports = {
  enviarCorreoContacto,
  enviarCorreoSuscripcion,
  enviarCorreoCompra,
  enviarCorreoReset,
  enviarMensajeInterno
};

