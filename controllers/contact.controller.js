// controllers/contact.controller.js

// 1. Importar AMBAS funciones del servicio de correo
const { enviarCorreoContacto, enviarMensajeInterno } = require('../utils/emailService');

exports.sendContactMessage = async (req, res) => {
  try {
    const { nombre, correo, mensaje } = req.body;
    if (!nombre || !correo || !mensaje) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    // 📬 PASO NUEVO: Enviar el mensaje real a la EMPRESA (novahogar2025@gmail.com)
    await enviarMensajeInterno(nombre, correo, mensaje); 

    // ✅ PASO EXISTENTE: Enviar la confirmación al USUARIO
    await enviarCorreoContacto(correo, nombre, mensaje); 

    res.json({ mensaje: 'Mensaje recibido. Se envió confirmación por correo.' });
  } catch (error) {
    console.error('Error en sendContactMessage:', error);
    res.status(500).json({ error: 'Error enviando correo de contacto' });
  }
};
