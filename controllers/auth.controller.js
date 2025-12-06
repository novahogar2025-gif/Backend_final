// controllers/auth.controller.js
const bcrypt = require('bcryptjs');
const https = require('https');
const { generateToken } = require('../middleware/jwt.middleware');
const UserModel = require('../models/UserModel'); 
const { enviarCorreoReset } = require('../utils/emailService');
const crypto = require('crypto');
const PasswordResetModel = require('../models/PasswordResetModel');

// Requerimientos de reCAPTCHA
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;

// POST /api/auth/login
exports.login = async (req, res) => {
    const { nombre, password } = req.body;

    if (!nombre || !password) {
        return res.status(400).json({
            error: "Faltan campos obligatorios: 'nombre' y 'password'."
        });
    }
    
    const user = await UserModel.getUserForLogin(nombre);
    
    if (user) {
        const lockoutTime = user.bloqueo_hasta ? new Date(user.bloqueo_hasta).getTime() : 0;
        if (lockoutTime > Date.now()) {
            const minutosRestantes = Math.ceil((lockoutTime - Date.now()) / 60000);
            return res.status(403).json({ 
                error: "Cuenta bloqueada por intentos fallidos",
                mensaje: `Intenta nuevamente en ${minutosRestantes} minuto(s)`
            });
        }
    }

    if (!user) {
        return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const isMatch = await bcrypt.compare(password, user.passwd);

    if (!isMatch) {
        // Registrar intento fallido
        await UserModel.incrementLoginAttempts(nombre); 
        return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // Restablecer intentos al iniciar sesión correctamente
    await UserModel.resetLoginAttempts(nombre);

    const token = generateToken(user.id, user.nombre, user.tipo);

    res.json({
        token,
        userId: user.id,
        nombre: user.nombre,
        tipo: user.tipo,
        correo: user.correo,
        mensaje: "Inicio de sesión exitoso"
    });
};

// POST /api/auth/logout - Implementación de logout básico con invalidación en el cliente
exports.logout = (req, res) => {
    // En un sistema JWT stateless, el logout es un mensaje al cliente para eliminar el token.
    // Opcionalmente, se podría añadir el token a una 'blacklist' en el servidor (no implementado aquí).
    res.json({ mensaje: "Sesión cerrada. Por favor, elimina el token de tu almacenamiento." });
};

// POST /api/auth/captcha - Verifica el token de reCAPTCHA
exports.checkCaptcha = (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ success: false, error: "Token de reCAPTCHA requerido" });
    }

    const verificationURL = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET}&response=${token}`;

    https.get(verificationURL, (response) => {
        let data = '';
        response.on('data', (chunk) => {
            data += chunk;
        });

        response.on('end', () => {
            try {
                const captchaResponse = JSON.parse(data);
                if (captchaResponse.success && captchaResponse.score > 0.5) { // Ajusta el score según tu necesidad
                    res.json({ success: true, mensaje: "reCAPTCHA verificado con éxito" });
                } else {
                    res.status(403).json({ success: false, error: "Fallo en la verificación de reCAPTCHA o score bajo" });
                }
            } catch (e) {
                console.error("Error al parsear respuesta de reCAPTCHA:", e);
                res.status(500).json({ success: false, error: "Error interno en la verificación" });
            }
        });
    }).on('error', (err) => {
        console.error("Error de conexión con reCAPTCHA:", err);
        res.status(500).json({ success: false, error: "Error de conexión con el servicio de reCAPTCHA" });
    });
};

// POST /api/auth/newUser
exports.createUser = async (req, res) => {
    try {
        const { nombre, correo, password, pais, tipo } = req.body;

        if (!nombre || !correo || !password || !pais) {
            return res.status(400).json({ error: 'Faltan datos obligatorios' });
        }
        
        // Validación básica de contraseña (opcional pero recomendado)
        if (password.length < 8) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
        }

        // 1. Verificar si el correo ya existe
        const existingUser = await UserModel.getUserByCorreo(correo);
        if (existingUser) {
            return res.status(409).json({ error: 'El correo ya está registrado' });
        }

        // 2. Encriptar contraseña
        const contraseñaHash = await bcrypt.hash(password, 10);

        // 3. Crear usuario
        const id_insertado = await UserModel.createUser(nombre, correo, contraseñaHash, pais, tipo);

        // 4. Generar token de sesión
        const token = generateToken(id_insertado, nombre, tipo || 'cliente');

        res.status(201).json({ 
            mensaje: 'Usuario registrado con éxito',
            id: id_insertado,
            token,
            nombre,
            tipo: tipo || 'cliente'
        });

    } catch (error) {
        console.error('Error en createUser:', error);
        res.status(500).json({ error: 'Error al registrar nuevo usuario' });
    }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
    try {
        const { correo } = req.body;
        if (!correo) {
            return res.status(400).json({ error: 'Correo es obligatorio' });
        }

        const user = await UserModel.getUserByCorreo(correo);

        // Seguridad: siempre devolver mensaje genérico para no revelar si el correo existe
        if (!user) {
             return res.json({ 
                mensaje: 'Si el correo existe, se enviará un enlace de recuperación.'
            });
        }
        
        // Generar token único (ej: 32 bytes en base64URL)
        const token = crypto.randomBytes(32).toString('hex');
        
        // Establecer expiración (ej: 1 hora)
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); 

        // Limpiar tokens anteriores
        await PasswordResetModel.deleteByUserId(user.id);
        
        // Guardar nuevo token en la BD
        await PasswordResetModel.createToken(token, user.id, expiresAt);

        // Construir URL de reseteo para el frontend (ASUNCIÓN: La URL del frontend está en una variable de entorno)
        const resetURL = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

        // Enviar correo
        const nombreUsuario = user.nombre || 'Estimado Cliente';
        await enviarCorreoReset(correo, nombreUsuario, resetURL);

        res.json({ 
            mensaje: 'Si el correo existe, se enviará un enlace de recuperación.',
            success: true
        });

    } catch (error) {
        console.error('Error en forgotPassword:', error);
        res.status(500).json({ error: 'Error al solicitar recuperación de contraseña' });
    }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
    try {
        const { token, nuevaPassword } = req.body;
        
        if (!token || !nuevaPassword) {
            return res.status(400).json({ error: 'Token y nuevaPassword son obligatorios' });
        }
        
        // Validación básica de contraseña (opcional pero recomendado)
        if (nuevaPassword.length < 8) {
            return res.status(400).json({ 
                error: 'La contraseña debe tener al menos 8 caracteres' 
            });
        }
        
        const entry = await PasswordResetModel.findByToken(token);
        if (!entry) {
            return res.status(400).json({ 
                error: 'Token inválido o expirado. Solicita un nuevo enlace.' 
            });
        }

        if (new Date(entry.expires_at).getTime() < Date.now()) {
            await PasswordResetModel.deleteByToken(token);
            return res.status(400).json({ 
                error: 'Token expirado. Solicita un nuevo enlace de recuperación.' 
            });
        }

        const hashed = await bcrypt.hash(nuevaPassword, 10);
        const updated = await UserModel.updatePassword(entry.user_id, hashed);

        await PasswordResetModel.deleteByToken(token);

        if (updated === 0) {
            return res.status(500).json({ 
                error: 'No se pudo actualizar la contraseña. Contacta al soporte.' 
            });
        }

        return res.json({ 
            mensaje: 'Contraseña actualizada con éxito. Ya puedes iniciar sesión.',
            success: true
        });
        
    } catch (error) {
        console.error('Error en resetPassword:', error);
        res.status(500).json({ error: 'Error interno al procesar el reseteo' });
    }
};
