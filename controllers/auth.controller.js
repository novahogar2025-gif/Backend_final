// controllers/auth.controller.js
const bcrypt = require('bcryptjs');
const https = require('https');
const { generateToken } = require('../middleware/jwt.middleware');
const UserModel = require('../models/UserModel'); 
const { enviarCorreoReset } = require('../utils/emailService');
const crypto = require('crypto');
const PasswordResetModel = require('../models/PasswordResetModel');

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

    if (!user.passwd || !user.passwd.startsWith("$2b$")) {
        return res.status(500).json({ 
            error: "Contraseña inválida en base de datos. Reinsertar usuario con hash correcto." 
        });
    }

    const isMatch = await bcrypt.compare(password, user.passwd);

    if (!isMatch) {
        await UserModel.incrementLoginAttempts(nombre); 
        return res.status(401).json({ error: "Credenciales inválidas" });
    }

    await UserModel.resetLoginAttempts(nombre);

    const token = generateToken(user.id, user.nombre, user.tipo);

    res.json({
        mensaje: "Login exitoso",
        token,
        userId: user.id,
        userNombre: user.nombre,
        userTipo: user.tipo,
    });
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
    res.json({ mensaje: 'Sesión cerrada' });
};

// POST /api/auth/captcha
exports.checkCaptcha = async (req, res) => {
    const { token } = req.body;
    
    if (!token) {
        return res.status(400).json({ mensaje: 'Token de reCAPTCHA no proporcionado' });
    }

    try {
        const secret = process.env.RECAPTCHA_SECRET_KEY;
        const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`;
        
        const data = await new Promise((resolve, reject) => {
            https.get(verificationUrl, (response) => {
                let data = '';
                response.on('data', (chunk) => { data += chunk; });
                response.on('end', () => { resolve(JSON.parse(data)); });
            }).on('error', (err) => { reject(err); });
        });

        if (data.success && (data.score === undefined || data.score >= 0.5)) {
            res.json({ success: true, mensaje: 'Verificación exitosa' });
        } else {
            res.status(401).json({ success: false, mensaje: 'Verificación fallida (bajo score o error)' });
        }
    } catch (error) {
        console.error('Error al verificar reCAPTCHA:', error);
        res.status(500).json({ success: false, mensaje: 'Error interno en la verificación de reCAPTCHA' });
    }
};

// POST /api/auth/newUser
exports.createUser = async (req, res) => {
    const { nombre, correo, password, pais, tipo } = req.body;

    if (!nombre || !correo || !password || !pais) {
        return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    try {
        const existente = await UserModel.getUserByCorreo(correo);
        if (existente) {
            return res.status(409).json({ error: "Ya existe un usuario con este correo" });
        }

        const contraseñaHash = await bcrypt.hash(password, 10);

        if (!contraseñaHash.startsWith("$2b$")) {
            return res.status(500).json({ error: "Error generando hash de contraseña" });
        }

        // 👇 VALIDACIÓN MEJORADA: Solo "admin" se guarda como admin, todo lo demás como "cliente"
        const tipoUsuario = (tipo === "admin") ? "admin" : "cliente";
        
        console.log('DEBUG - Tipo recibido:', tipo);
        console.log('DEBUG - Tipo que se guardará:', tipoUsuario);

        const id_insertado = await UserModel.createUser(
            nombre,
            correo,
            contraseñaHash,
            pais,
            tipoUsuario  // <-- Pasar el tipo validado
        );

        res.status(201).json({ 
            mensaje: 'Usuario registrado', 
            id_insertado,
            tipo: tipoUsuario  // <-- Devolver el tipo que se guardó
        });

    } catch (error) {
        console.error('Error al dar de alta el usuario:', error);
        res.status(500).json({ error: 'Error al dar de alta el usuario' });
    }
};

// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
    try {
        const { correo } = req.body;
        if (!correo) return res.status(400).json({ error: 'Correo es requerido' });

        const user = await UserModel.getUserByCorreo(correo);
        if (!user) return res.status(404).json({ mensaje: 'Si la cuenta existe, se enviará un correo.' });

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + (60 * 60 * 1000);

        await PasswordResetModel.deleteByUserId(user.id);
        await PasswordResetModel.createToken(resetToken, user.id, expiresAt);

        try {
            await enviarCorreoReset(correo, user.nombre, resetToken);
        } catch (mailError) {
            console.error('Error enviando correo de recuperación:', mailError);
        }

        if (process.env.NODE_ENV === 'development') {
            return res.json({ mensaje: 'Correo de recuperación enviado', token: resetToken });
        }

        return res.json({ mensaje: 'Correo de recuperación enviado' });
    } catch (error) {
        console.error('Error en forgotPassword:', error.message);
        return res.status(500).json({ error: 'Error interno del servidor. No se pudo procesar la solicitud.' });
    }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
    try {
        const { token, nuevaPassword } = req.body;
        if (!token || !nuevaPassword) return res.status(400).json({ error: 'Token y nuevaPassword son requeridos' });
        
        const entry = await PasswordResetModel.findByToken(token);
        if (!entry) return res.status(400).json({ error: 'Token inválido o expirado' });

        if (new Date(entry.expires_at).getTime() < Date.now()) {
            await PasswordResetModel.deleteByToken(token);
            return res.status(400).json({ error: 'Token expirado' });
        }

        const hashed = await bcrypt.hash(nuevaPassword, 10);
        const updated = await UserModel.updatePassword(entry.user_id, hashed);

        await PasswordResetModel.deleteByToken(token);

        if (updated === 0) return res.status(500).json({ error: 'No se pudo actualizar la contraseña' });

        return res.json({ mensaje: 'Contraseña actualizada con éxito' });
    } catch (error) {
        console.error('Error en resetPassword:', error);
        res.status(500).json({ error: 'Error interno' });
    }
};

