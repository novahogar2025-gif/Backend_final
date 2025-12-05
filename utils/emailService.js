// utils/emailService.js (versión SendGrid API)
const sgMail = require('@sendgrid/mail');

// Usa tu API Key de SendGrid (EMAIL_PASS en .env)
sgMail.setApiKey(process.env.EMAIL_PASS);

async function enviarCorreoContacto(destino, nombre, mensaje) {
  const subject = `${process.env.EMPRESA_NOMBRE || 'Nova Hogar'} - Confirmación de contacto`;
  const html = `<p>Hola ${nombre},</p>
    <p>Hemos recibido tu mensaje: <i>${mensaje}</i></p>
    <p>Pronto nos pondremos en contacto contigo.</p>
    <p><strong>${process.env.EMPRESA_NOMBRE || 'Nova Hogar'}</strong><br/>${process.env.EMPRESA_LEMA || ''}</p>`;

  return sgMail.send({
    to: destino,
    from: process.env.EMAIL_FROM,
    subject,
    html
  });
}

async function enviarCorreoSuscripcion(destino, nombre, codigoCupon) {
  const subject = `${process.env.EMPRESA_NOMBRE || 'Nova Hogar'} - ¡Bienvenido!`;
  const html = `<p>Hola ${nombre},</p>
    <p>¡Gracias por suscribirte! Aquí está tu cupón de descuento:</p>
    <h2>CÓDIGO: <strong>${codigoCupon}</strong></h2>
    <p>${process.env.EMPRESA_NOMBRE || 'Nova Hogar'} - ${process.env.EMPRESA_LEMA || ''}</p>`;

  return sgMail.send({
    to: destino,
    from: process.env.EMAIL_FROM,
    subject,
    html
  });
}

async function enviarCorreoCompra(destino, nombre, pdfBuffer, orderId) {
  const subject = `${process.env.EMPRESA_NOMBRE || 'Nova Hogar'} - Confirmación de Compra #${orderId}`;
  const html = `<p>Hola ${nombre},</p>
    <p>¡Gracias por tu compra! Adjuntamos la nota de tu orden con ID <strong>#${orderId}</strong>.</p>
    <p>${process.env.EMPRESA_NOMBRE || 'Nova Hogar'} - ${process.env.EMPRESA_LEMA || ''}</p>`;

  const msg = {
    to: destino,
    from: process.env.EMAIL_FROM,
    subject,
    html,
    attachments: []
  };

  if (pdfBuffer) {
    msg.attachments.push({
      content: pdfBuffer.toString("base64"),
      filename: `nota_compra_${orderId}.pdf`,
      type: "application/pdf",
      disposition: "attachment"
    });
  }

  return sgMail.send(msg);
}

async function enviarCorreoReset(destino, nombre, resetToken) {
  const subject = `${process.env.EMPRESA_NOMBRE || 'Nova Hogar'} - Recuperación de contraseña`;
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  const html = `<p>Hola ${nombre},</p>
    <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
    <p><a href="${resetUrl}">Restablecer contraseña</a></p>
    <p>${process.env.EMPRESA_NOMBRE || 'Nova Hogar'} - ${process.env.EMPRESA_LEMA || ''}</p>`;

  return sgMail.send({
    to: destino,
    from: process.env.EMAIL_FROM,
    subject,
    html
  });
}

module.exports = {
  enviarCorreoContacto,
  enviarCorreoSuscripcion,
  enviarCorreoCompra,
  enviarCorreoReset
};
