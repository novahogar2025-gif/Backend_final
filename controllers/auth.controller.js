// controllers/auth.controller.js (CORREGIDO)
const bcrypt = require('bcryptjs');
const https = require('https');
const { generateToken } = require('../middleware/jwt.middleware');
// ⚠️ Importar las funciones de intentos fallidos de UserModel
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
    
    // 1. Obtener usuario (incluye intentos_fallidos y bloqueo_hasta)
    const user = await UserModel.getUserForLogin(nombre);
    
    if (user) {
        // 2. Verificar bloqueo antes de validar contraseña
        const lockoutTime = user.bloqueo_hasta ? new Date(user.bloqueo_hasta).getTime() : 0;
        
        if (lockoutTime > Date.now()) {
            const minutosRestantes = Math.ceil((lockoutTime - Date.now()) / 60000);
            return res.status(403).json({ 
                error: "Cuenta bloqueada por intentos fallidos",
                mensaje: `Intenta nuevamente en ${minutosRestantes} minuto(s)`
            });
        }
    }

    // 3. Verificar existencia de usuario
    if (!user) {
        // No existe el usuario, no se registra intento
        return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // 4. Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.passwd);

    if (!isMatch) {
        // 5. Registrar intento fallido en la DB
        await UserModel.incrementLoginAttempts(nombre); 
        return res.status(401).json({ error: "Credenciales inválidas" });
    }

    // 6. Login exitoso: Resetear intentos en la DB
    await UserModel.resetLoginAttempts(nombre);

    // Generar JWT (Stateless)
    const token = generateToken(user.id, user.nombre, user.tipo);

    res.json({
        mensaje: "Login exitoso",
        token: token,
        userId: user.id,
        userNombre: user.nombre,
        userTipo: user.tipo,
    });
};


// POST /api/auth/logout
exports.logout = async (req, res) => {
    // Si usas JWT (como en tu middleware), el logout es solo una confirmación en el cliente.
    // Si usas el antiguo middleware de sesiones en memoria (auth.middleware.js), debes eliminar la sesión:
    // deleteSession(req.token); 
    
    // Asumo que estás usando el middleware JWT, por lo que esta acción es cosmética
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
                response.on('data', (chunk) => {
                    data += chunk;
                });
                response.on('end', () => {
                    resolve(JSON.parse(data));
                });
            }).on('error', (err) => {
                reject(err);
            });
        });

        if (data.success && data.score >= 0.5) { // Puedes ajustar el score de confianza
            res.json({ success: true, mensaje: 'Verificación exitosa' });
        } else {
            // console.log('ReCAPTCHA falló:', data); // Útil para depuración
            res.status(401).json({ success: false, mensaje: 'Verificación fallida (bajo score o error)' });
        }
    } catch (error) {
        console.error('Error al verificar reCAPTCHA:', error);
        res.status(500).json({ success: false, mensaje: 'Error interno en la verificación de reCAPTCHA' });
    }
};

// POST /api/auth/newUser
exports.createUser = async (req, res) => {
    const { nombre, correo, password, pais } = req.body;

    if (!nombre || !correo || !password || !pais) {
        return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    try {
        const existente = await UserModel.getUserByCorreo(correo);
        if (existente) {
            return res.status(409).json({ error: "Ya existe un usuario con este correo" });
        }

        const contraseñaHash = await bcrypt.hash(password, 10);
        const id_insertado = await UserModel.createUser(nombre, correo, contraseñaHash, pais);

        res.status(201).json({ 
            mensaje: 'Usuario registrado', 
            id_insertado 
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

        // 1. Generar token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hora de validez

        // 2. Limpiar tokens antiguos del usuario y guardar el nuevo
        await PasswordResetModel.deleteByUserId(user.id);
        await PasswordResetModel.createToken(resetToken, user.id, expiresAt);

        // 3. Enviar correo (puede fallar, pero el usuario no debe saberlo por seguridad)
        try {
            await enviarCorreoReset(correo, user.nombre, resetToken);
        } catch (mailError) {
            console.error('Error enviando correo de recuperación:', mailError);
            // No devolver 500 para evitar enumeración de usuarios
        }

        // Devolver una respuesta genérica por seguridad
        // En entorno de desarrollo se puede devolver el token para prueba:
        if (process.env.NODE_ENV === 'development') {
            return res.json({ mensaje: 'Correo de recuperación enviado', token: resetToken });
        }

        return res.json({ mensaje: 'Correo de recuperación enviado' });
    } catch (error) {
        console.error('Error en forgotPassword, posible fallo de DB o EmailService:', error.message);
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

        // La columna expires_at debe ser un timestamp o datetime
        if (new Date(entry.expires_at).getTime() < Date.now()) {
            await PasswordResetModel.deleteByToken(token);
            return res.status(400).json({ error: 'Token expirado' });
        }

        const hashed = await bcrypt.hash(nuevaPassword, 10);
        const updated = await UserModel.updatePassword(entry.user_id, hashed);

        // Consumir token
        await PasswordResetModel.deleteByToken(token);

        if (updated === 0) return res.status(500).json({ error: 'No se pudo actualizar la contraseña' });

        return res.json({ mensaje: 'Contraseña actualizada con éxito' });
    } catch (error) {
        console.error('Error en resetPassword:', error);
        res.status(500).json({ error: 'Error interno' });
    }
};
