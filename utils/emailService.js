// utils/emailService.js (VERSIÓN MEJORADA)
const sgMail = require('@sendgrid/mail');

// Usa tu API Key de SendGrid (EMAIL_PASS en .env)
sgMail.setApiKey(process.env.EMAIL_PASS);

const logoUrl = 'https://res.cloudinary.com/dngutwxha/image/upload/v1765005760/logoNovaHogar_v0jgk1.png';
const empresaNombre = process.env.EMPRESA_NOMBRE || 'Nova Hogar';
const empresaLema = process.env.EMPRESA_LEMA || 'DECORA TU VIDA, DECORA TU HOGAR';

// Plantilla base con estilos comunes
const getBaseTemplate = (titulo, contenido) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titulo}</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #4a6fa5 0%, #2c3e50 100%);
            padding: 30px 20px;
            text-align: center;
        }
        .logo {
            max-width: 200px;
            height: auto;
            margin-bottom: 15px;
        }
        .company-name {
            color: white;
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0 5px 0;
        }
        .company-slogan {
            color: #ecf0f1;
            font-size: 14px;
            font-style: italic;
        }
        .content {
            padding: 30px;
        }
        .greeting {
            font-size: 18px;
            color: #2c3e50;
            margin-bottom: 20px;
        }
        .message {
            font-size: 16px;
            color: #555;
            margin-bottom: 25px;
        }
        .button-container {
            text-align: center;
            margin: 30px 0;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #4a6fa5 0%, #2c3e50 100%);
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            font-size: 16px;
            transition: transform 0.3s, box-shadow 0.3s;
        }
        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(74, 111, 165, 0.3);
        }
        .details {
            background: #f8f9fa;
            border-left: 4px solid #4a6fa5;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 5px 5px 0;
        }
        .footer {
            background: #f1f1f1;
            padding: 20px;
            text-align: center;
            color: #7f8c8d;
            font-size: 12px;
            border-top: 1px solid #ddd;
        }
        .footer a {
            color: #4a6fa5;
            text-decoration: none;
        }
        .coupon-code {
            background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
            border: 2px dashed #4caf50;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
            border-radius: 8px;
        }
        .code {
            font-size: 28px;
            font-weight: bold;
            color: #2e7d32;
            letter-spacing: 2px;
            margin: 10px 0;
        }
        .attachment-note {
            background: #e3f2fd;
            padding: 10px;
            border-radius: 5px;
            margin: 15px 0;
            font-size: 14px;
            color: #1565c0;
        }
    </style>
</head>
<body>
    <div class="container">
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
            <p>Este es un correo automático, por favor no responda a este mensaje.</p>
            <p>Para asistencia, contacte a: <a href="mailto:soporte@novahogar.com">soporte@novahogar.com</a></p>
        </div>
    </div>
</body>
</html>
`;

async function enviarCorreoContacto(destino, nombre, mensaje) {
  const subject = `${empresaNombre} - Confirmación de contacto`;
  
  const contenido = `
    <div class="greeting">Hola ${nombre},</div>
    <div class="message">
      Hemos recibido tu mensaje de contacto y queremos agradecerte por ponerte en contacto con nosotros.
    </div>
    <div class="details">
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
    from: process.env.EMAIL_FROM,
    subject,
    html: getBaseTemplate(subject, contenido)
  });
}

async function enviarCorreoSuscripcion(destino, nombre, codigoCupon) {
  const subject = `${empresaNombre} - ¡Bienvenido a nuestra comunidad!`;
  
  const contenido = `
    <div class="greeting">¡Hola ${nombre}!</div>
    <div class="message">
      Te damos la más cordial bienvenida a nuestra comunidad. Estamos emocionados de tenerte con nosotros.
    </div>
    <div class="message">
      Como agradecimiento por tu suscripción, aquí tienes un cupón de descuento especial para tu primera compra:
    </div>
    <div class="coupon-code">
      <div style="font-size: 16px; color: #2e7d32; margin-bottom: 5px;">TU CUPÓN DE DESCUENTO</div>
      <div class="code">${codigoCupon}</div>
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
    from: process.env.EMAIL_FROM,
    subject,
    html: getBaseTemplate(subject, contenido)
  });
}

async function enviarCorreoCompra(destino, nombre, pdfBuffer, orderId) {
  const subject = `${empresaNombre} - Confirmación de Compra #${orderId}`;
  
  const contenido = `
    <div class="greeting">¡Hola ${nombre}!</div>
    <div class="message">
      Queremos agradecerte por tu compra en <strong>${empresaNombre}</strong>. Tu pedido ha sido confirmado exitosamente.
    </div>
    <div class="details">
      <strong>Número de Orden:</strong> #${orderId}<br>
      <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-MX')}<br>
      <strong>Estado:</strong> Confirmado
    </div>
    <div class="attachment-note">
      📎 <strong>Adjunto:</strong> Encontrarás la factura/nota de compra en formato PDF.
    </div>
    <div class="message">
      Hemos comenzado a procesar tu pedido. Recibirás una actualización cuando sea enviado.
    </div>
    <div class="message">
      <strong>Tiempo estimado de entrega:</strong> 3-5 días hábiles (dependiendo de tu ubicación).
    </div>
    <div class="button-container">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/mis-ordenes" class="button">
        Ver Estado de mi Pedido
      </a>
    </div>
    <div class="message">
      Si tienes alguna pregunta sobre tu pedido, no dudes en contactar a nuestro servicio al cliente.
    </div>
  `;

  const msg = {
    to: destino,
    from: process.env.EMAIL_FROM,
    subject,
    html: getBaseTemplate(subject, contenido),
    attachments: []
  };

  if (pdfBuffer) {
    msg.attachments.push({
      content: pdfBuffer.toString("base64"),
      filename: `factura_${orderId}_${empresaNombre.replace(/\s+/g, '_')}.pdf`,
      type: "application/pdf",
      disposition: "attachment"
    });
  }

  return sgMail.send(msg);
}

async function enviarCorreoReset(destino, nombre, resetToken) {
  const subject = `${empresaNombre} - Restablecimiento de Contraseña`;
  
  // IMPORTANTE: Asegúrate que el token esté en la URL
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${encodeURIComponent(resetToken)}`;
  
  console.log('DEBUG - Token generado:', resetToken);
  console.log('DEBUG - URL generada:', resetUrl);
  
  const contenido = `
    <div class="greeting">Hola ${nombre},</div>
    <div class="message">
      Hemos recibido una solicitud para restablecer tu contraseña en <strong>${empresaNombre}</strong>.
    </div>
    <div class="message">
      Si no realizaste esta solicitud, puedes ignorar este correo de manera segura.
    </div>
    <div class="message">
      Para crear una nueva contraseña, haz clic en el siguiente botón:
    </div>
    <div class="button-container">
      <a href="${resetUrl}" class="button">
        Restablecer mi Contraseña
      </a>
    </div>
    <div class="message" style="font-size: 14px; color: #666; text-align: center;">
      O copia y pega este enlace en tu navegador:<br>
      <code style="background: #f1f1f1; padding: 5px 10px; border-radius: 3px; word-break: break-all;">
        ${resetUrl}
      </code>
    </div>
    <div class="message">
      <strong>Importante:</strong> Este enlace es válido por <strong>1 hora</strong>. 
      Después de ese tiempo, deberás solicitar un nuevo enlace de restablecimiento.
    </div>
    <div class="details">
      <strong>🔒 Seguridad:</strong> Por tu seguridad, nunca compartas este enlace con nadie. 
      Nuestro equipo nunca te pedirá tu contraseña por correo o teléfono.
    </div>
  `;

  return sgMail.send({
    to: destino,
    from: process.env.EMAIL_FROM,
    subject,
    html: getBaseTemplate(subject, contenido)
  });
}

async function enviarMensajeInterno(nombre, correo, mensaje) {
  const businessEmail = process.env.EMAIL_FROM;
  const subject = `📩 [CONTACTO WEB] Nuevo Mensaje de ${nombre}`;
  
  const contenido = `
    <div class="greeting">Nuevo mensaje recibido desde el formulario de contacto</div>
    <div class="details">
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
    from: process.env.EMAIL_FROM,
    subject,
    html: getBaseTemplate(subject, contenido)
  });
}

module.exports = {
  enviarCorreoContacto,
  enviarCorreoSuscripcion,
  enviarCorreoCompra,
  enviarCorreoReset,
  enviarMensajeInterno
};
